# Vacancy Scout Chart Bridge

Install in Chrome with Developer mode → Load unpacked, selecting this folder. Start Vacancy Scout at http://localhost:3000 first, then open the official IRCTC vacancy chart in another tab. Open the extension popup and enable capture BEFORE loading or refreshing the chart. When the official page makes its vacantBerth request, the extension copies only the berth fields into local extension storage and passes them to the app. Return to the app and click Analyze chart.

The extension only observes the chart response made by the user's own browser. It does not read cookies, passwords, authorization headers, request payloads, or transmit chart data to a remote server. Capture is opt-in and can be disabled; saved chart data can be cleared from the popup. It is limited to the local app origins localhost:3000 and 127.0.0.1:3000.

This prototype is not a booking tool, does not bypass login/CAPTCHAs/access controls, and cannot know whether a TTE later assigns a berth. Confirm data-source terms and authorization before public distribution.