// Updated popup.js
document.addEventListener('DOMContentLoaded', function() {
    const checkDataButton = document.getElementById('checkData');
    
    checkDataButton.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'exportCookies' }, (response) => {
            if (response && response.log) {
                displayAnalysis(response.log);
            } else {
                displayError("Failed to retrieve data.");
            }
        });
    });
});

function displayAnalysis(log) {
    // Parse the log data
    const logLines = log.split('\n');
    const analysisData = parseLogData(logLines);
    
    // Create a new window for the detailed analysis
    const analysisWindow = window.open('', 'Analysis Results', 'width=800,height=600');
    analysisWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Cookie Monster Analysis Results</title>
            <style>
                body {
                    font-family: system-ui, -apple-system, sans-serif;
                    line-height: 1.6;
                    padding: 20px;
                    max-width: 1200px;
                    margin: 0 auto;
                }
                
                .section {
                    margin-bottom: 30px;
                    padding: 20px;
                    border-radius: 8px;
                    background-color: #f8f9fa;
                }
                
                .cookie-item {
                    margin: 10px 0;
                    padding: 15px;
                    background-color: white;
                    border-radius: 4px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
                
                .sensitive {
                    border-left: 4px solid #dc3545;
                }
                
                .decoded {
                    background-color: #e9ecef;
                    padding: 10px;
                    margin: 5px 0;
                    border-radius: 4px;
                    font-family: monospace;
                }
                
                .form-data {
                    margin: 10px 0;
                    padding: 15px;
                    background-color: white;
                    border-radius: 4px;
                }
                
                .session-info {
                    padding: 10px;
                    background-color: #e9ecef;
                    border-radius: 4px;
                    margin-bottom: 20px;
                }
                
                .tag {
                    display: inline-block;
                    padding: 2px 8px;
                    margin: 2px;
                    border-radius: 12px;
                    font-size: 12px;
                    background-color: #6c757d;
                    color: white;
                }
                
                .tag.secure { background-color: #28a745; }
                .tag.session { background-color: #17a2b8; }
                .tag.httponly { background-color: #6610f2; }
                .tag.sensitive { background-color: #dc3545; }
            </style>
        </head>
        <body>
            <h1>Cookie Monster Analysis Results</h1>
            
            <div class="section session-info">
                ${analysisData.sessionInfo}
            </div>
            
            ${analysisData.tabs.map(tab => `
                <div class="section">
                    <h2>Tab ID: ${tab.id}</h2>
                    
                    ${tab.credentials ? `
                        <div class="form-data">
                            <h3>Captured Credentials</h3>
                            <p>User: ${tab.credentials.user || "Not captured"}</p>
                            <p>Password: ${tab.credentials.password ? "[CAPTURED]" : "Not captured"}</p>
                        </div>
                    ` : ''}
                    
                    ${tab.formSubmissions ? `
                        <div class="form-data">
                            <h3>Form Submissions</h3>
                            ${tab.formSubmissions}
                        </div>
                    ` : ''}
                    
                    <h3>Cookies (${tab.cookies.length})</h3>
                    ${tab.cookies.map(cookie => `
                        <div class="cookie-item ${cookie.sensitiveData.length > 0 ? 'sensitive' : ''}">
                            <h4>${cookie.name}</h4>
                            <div>
                                ${cookie.types.map(type => 
                                    `<span class="tag ${type}">${type}</span>`
                                ).join('')}
                                ${cookie.sensitiveData.map(type => 
                                    `<span class="tag sensitive">${type}</span>`
                                ).join('')}
                            </div>
                            <p>Value: ${cookie.value}</p>
                            ${cookie.decodedValue ? `
                                <div class="decoded">
                                    <strong>Decoded (${cookie.decodedValue.method}):</strong>
                                    <pre>${JSON.stringify(cookie.decodedValue.value, null, 2)}</pre>
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            `).join('')}
        </body>
        </html>
    `);
    analysisWindow.document.close();
}

function parseLogData(logLines) {
    const analysisData = {
        sessionInfo: '',
        tabs: []
    };
    
    let currentTab = null;
    let currentSection = null;
    
    logLines.forEach(line => {
        if (line.startsWith('Browsing session:')) {
            analysisData.sessionInfo = line;
        } else if (line.startsWith('Tab ID:')) {
            if (currentTab) {
                analysisData.tabs.push(currentTab);
            }
            currentTab = {
                id: line.split('Tab ID:')[1].trim(),
                cookies: [],
                credentials: null,
                formSubmissions: ''
            };
            currentSection = null;
        } else if (line.includes('Cookie(')) {
            const cookieData = parseCookieData(logLines, line);
            if (currentTab && cookieData) {
                currentTab.cookies.push(cookieData);
            }
        } else if (line.includes('Credentials:')) {
            currentSection = 'credentials';
            if (currentTab) {
                currentTab.credentials = {
                    user: line.includes('User:') ? line.split('User:')[1].trim() : null,
                    password: line.includes('Password:') ? line.split('Password:')[1].trim() : null
                };
            }
        } else if (line.includes('Form Submissions:')) {
            currentSection = 'forms';
            if (currentTab) {
                currentTab.formSubmissions += `<div class="form-submission">${line}</div>`;
            }
        }
    });
    
    if (currentTab) {
        analysisData.tabs.push(currentTab);
    }
    
    return analysisData;
}

function parseCookieData(lines, currentLine) {
    const cookieData = {
        name: '',
        value: '',
        types: [],
        sensitiveData: [],
        decodedValue: null
    };
    
    // Extract cookie information from the following lines
    let i = lines.indexOf(currentLine);
    while (i < lines.length && lines[i] !== '') {
        const line = lines[i];
        if (line.includes('Name:')) cookieData.name = line.split('Name:')[1].trim();
        if (line.includes('Value:')) cookieData.value = line.split('Value:')[1].trim();
        if (line.includes('Types:')) cookieData.types = line.split('Types:')[1].trim().split(',').map(t => t.trim());
        if (line.includes('Sensitive Data Patterns:')) {
            cookieData.sensitiveData = line.split('Sensitive Data Patterns:')[1].trim().split(',').map(t => t.trim());
        }
        if (line.includes('Decoded')) {
            try {
                const decodedMethod = line.match(/Decoded \((.*?)\):/)[1];
                const decodedValue = JSON.parse(lines[i + 1]);
                cookieData.decodedValue = {
                    method: decodedMethod,
                    value: decodedValue
                };
            } catch (e) {
                console.error('Error parsing decoded value:', e);
            }
        }
        i++;
    }
    
    return cookieData;
}

function displayError(message) {
    const statusElement = document.getElementById('status');
    statusElement.innerHTML = `<p style="color: red;">${message}</p>`;
}