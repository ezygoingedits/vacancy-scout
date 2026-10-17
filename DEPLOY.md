# Public deployment

## Deploy the web app on Render
1. Keep this GitHub repository private; the website itself can still be public.
2. Create/sign into Render and connect your GitHub account. Grant Render access to the private ezygoingedits/vacancy-scout repository.
3. In Render, use New -> Blueprint and select this repository. Render reads render.yaml. Review the service name, free plan, npm install build command and npm start start command.
4. Deploy. The configured service name is vacancy-scout-ezygoingedits; if Render must assign a different onrender.com hostname, note the actual URL.
5. Test the deployed page and /api/health. Free Render services sleep after 15 minutes without traffic and may take about a minute to wake.
6. Do not add an OpenAI API key to the public service yet. The AI endpoint does not have production abuse controls in this prototype. It returns an AI-not-configured message if the key is blank.

## Connect the browser extension to the hosted app
The extension manifest includes the anticipated URL https://vacancy-scout-ezygoingedits.onrender.com. If Render gives a different hostname, update that hostname in extension/manifest.json (host_permissions and content_scripts matches) and extension/background.js (APP_URL_PATTERNS), then reload the unpacked extension at chrome://extensions. Open the hosted app and your IRCTC chart in separate tabs. Enable capture in the extension popup, then load/select the chart. Only normalized vacancy records are forwarded to the page; no cookies, credentials, request bodies or auth headers are collected.

## Publish the extension for other users
1. Test the entire flow on the exact hosted domain first.
2. Prepare store screenshots, a clear description, and a privacy policy. Explain that the extension reads the vacancy-chart response from the IRCTC chart page only when the user enables capture, and that records are passed to Vacancy Scout for analysis.
3. Register for a Chrome Web Store developer account, accept its terms and pay the one-time registration fee, then upload a ZIP of the extension folder through the Chrome Developer Dashboard.
4. Complete any requested policy/privacy review. Do not promise live data access beyond what the user can load in their own chart page.

## Limits before launch
- This is an early prototype. The data connector, train/date selectors, route ordering, refresh/staleness display and transfer ranking need end-to-end tests.
- The live chart response is observed in the user's browser, not fetched by the hosted Node server.
- A chart snapshot does not confirm the current state of a berth or future TTE allotments.
- Before public distribution, confirm that this way of processing and redistributing chart data complies with the relevant service terms and permissions.
