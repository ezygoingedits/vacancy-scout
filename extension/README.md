# Vacancy Scout Chart Bridge (Chrome extension)

This companion extension observes the vacant-berth API response made by the IRCTC page after the user explicitly enables capture. It copies only the chart's berth fields into local extension storage and passes the snapshot to a running local Vacancy Scout page.

## Install locally
1. Run Vacancy Scout with npm start at http://localhost:3000.
2. In Chrome, open chrome://extensions.
3. Turn on Developer mode.
4. Select Load unpacked and choose this extension folder.
5. Open Vacancy Scout in one tab and the official IRCTC vacancy chart in another.
6. Click the extension icon on the IRCTC tab and choose Enable capture.
7. With capture enabled, use the chart normally. If the request already happened, reload the chart or select the train/date again so the page makes the request while capture is enabled.
8. Return to the Vacancy Scout tab. The JSON input should populate; click Analyze chart.

## Scope and privacy
- Capture is disabled by default and can be switched off in the popup.
- The extension only looks for the exact /online-charts/api/vacantBerth response from the official IRCTC origin.
- It does not read or send cookies, passwords, authorization headers or request bodies.
- It normalizes vacancy rows and keeps them in chrome.storage.local. It sends the captured rows to the app only over the local extension messaging channel.
- Clear the saved snapshot from the popup when finished.
- This first version targets localhost:3000. Before deploying the app on a hosted domain, add the selected hosted origin to the extension manifest and update/test the bridge.

## Known limitations
- Website/browser changes may affect capture; verify it against the Network response in DevTools during testing.
- Capture works only when the user opens the chart normally and the matching response occurs while capture is enabled.
- This does not bypass login, CAPTCHAs, authorization or other access controls, and does not guarantee a berth is available later or assigned by a TTE.
- Confirm the permitted method and terms for public distribution of any live-data integration.
