# Cookie Capturing and Credential Monitoring Chrome Extension

## Overview
This Chrome extension serves as a proof-of-concept to demonstrate how cookies and user credentials can be dynamically captured and organized during browsing sessions. The project aims to highlight the potential vulnerabilities posed by malicious extensions that request excessive permissions.

## Features
- **Dynamic Cookie and Credential Capture**:
  - Captures cookies and credentials (usernames and passwords) from login forms during a browsing session.
  - Organizes captured data by `tabId` for clear association with active browser tabs.
- **Session Logging**:
  - Generates a detailed log of all captured cookies and credentials.
  - Includes session metadata such as start time, end time, and tab-specific data.
- **User-Friendly Export**:
  - Displays session logs in a new tab, formatted for easy review.
- **Debugging and Security Insights**:
  - Highlights how extensions with excessive permissions could exploit users.

## Installation
1. Clone or download this repository to your local machine.
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** in the top right corner.
4. Click **Load unpacked** and select the project folder.
5. The extension will appear in your Chrome extensions toolbar.

## Usage
1. **Run the Extension**:
   - Once installed, the extension will automatically monitor cookies and credentials on every webpage you visit.
   - Captured cookies and credentials are securely stored and organized by tab.
2. **View Session Data**:
   - Open the extension popup and click the `Check Cookie Jar` button.
   - A new tab will open displaying a detailed session log.

## Project Motivation
This project was designed to:
- Educate users and developers about the risks associated with excessive permissions in Chrome extensions.
- Demonstrate the potential vulnerabilities posed by malicious extensions.
- Provide a foundation for frameworks to alert users and enterprises to permission abuse.

## Technologies Used
- **JavaScript**: Core logic for cookie and credential monitoring.
- **Chrome Extensions API**: Integration with Chrome for dynamic scripting, cookie monitoring, and session management.
- **HTML/CSS**: UI components for the popup interface and log display.

## Potential Applications
- **User Awareness**: Educating users on extension permission abuse.
- **Enterprise Security**: Offering insights into monitoring and mitigating extension-based vulnerabilities.
- **Developer Frameworks**: Providing a baseline for secure extension development.

## Disclaimer
This project is for educational purposes only. Do not use this extension for malicious or unauthorized activities. Always respect user privacy and adhere to ethical guidelines.
