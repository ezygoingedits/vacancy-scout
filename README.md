# Vacancy Scout

A Node.js/Express app for analyzing an IRCTC vacancy-chart snapshot. It has an optional Chrome bridge that captures the user's own vacancy-chart response when explicitly enabled.

## Automatic route lookup
- Enter a train number. The page automatically requests the ordered station list through the server route endpoint.
- The server calls RailRadar's train route API and caches successful routes for 12 hours.
- Configure RAILRADAR_API_KEY on the server. Never put the provider key in browser JavaScript or in a committed file.
- If no key is configured, the app will say so clearly; the route field can still be entered manually.

## Run locally
1. Install Node.js 22 or newer.
2. Run npm install.
3. Copy .env.example to .env.
4. Add your route provider API key to RAILRADAR_API_KEY in .env. Add OPENAI_API_KEY only if you want AI explanations.
5. Run npm start and open http://localhost:3000.

## Chrome bridge
See extension/README.md for installation. Load the Chrome extension locally to pass chart records from the IRCTC tab to the local app.

## Limits
- Route lookup uses a separate third-party timetable provider; availability and quotas depend on that provider.
- The app analyzes a chart snapshot, not subsequent TTE allotments. It does not guarantee a berth will remain available.
- Transfer paths require railway staff confirmation.
- Verify station order for the train and travel date.
- Before public distribution, confirm permissions/terms for processing and using live chart data.
