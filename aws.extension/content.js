// Form monitoring utilities
console.log("Content script loaded.");

class FormMonitor {
    static initializeFormMonitoring() {
        // Monitor all form submissions
        document.addEventListener('submit', this.handleFormSubmit.bind(this));
        
        // Monitor all input changes for autocomplete
        document.addEventListener('input', this.handleInputChange.bind(this));
        
        // Monitor autocomplete selections
        document.addEventListener('autocompletecomplete', this.handleAutocomplete.bind(this));
    }

    static handleFormSubmit(event) {
        const form = event.target;
        const formData = new FormData(form);
        const data = {
            url: window.location.href,
            timestamp: new Date().toISOString(),
            fields: {}
        };

        for (const [name, value] of formData.entries()) {
            // Don't store passwords directly, just note their presence
            if (name.toLowerCase().includes('password')) {
                data.fields[name] = '[PASSWORD FIELD]';
            } else {
                data.fields[name] = value;
            }
        }

        chrome.runtime.sendMessage({
            action: 'storeFormSubmission',
            data: data
        });
    }

    static handleInputChange(event) {
        const input = event.target;
        if (input.tagName === 'INPUT' && input.value) {
            chrome.runtime.sendMessage({
                action: 'storeFormInput',
                data: {
                    name: input.name,
                    type: input.type,
                    timestamp: new Date().toISOString()
                }
            });
        }
    }

    static handleAutocomplete(event) {
        const input = event.target;
        chrome.runtime.sendMessage({
            action: 'storeAutocomplete',
            data: {
                field: input.name,
                timestamp: new Date().toISOString()
            }
        });
    }
}

// Initialize form monitoring
FormMonitor.initializeFormMonitoring();

// Listen for mutations to catch dynamically added forms
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE && (node.matches('form') || node.querySelector('form'))) {
                console.log("New form detected");
            }
        });
    });
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});