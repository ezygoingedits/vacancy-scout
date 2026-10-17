# Vacancy Scout

A Node.js/Express app for analyzing an IRCTC vacancy-chart snapshot. It has an optional Chrome bridge that captures the user's own vacancy-chart response when explicitly enabled.

## Automatic train route lookup
- Enter a train number; the page requests the ordered station list through the server route endpoint.
- The server calls the RailRadar train-route API and caches successful routes for 12 hours.
- Configure RAILRADAR_API_KEY on the server. Keep it out of browser JavaScript and Git.
- If no key is configured, the route field can still be entered manually.

## Optional Gemini explanations
- Uses Google's official @google/genai JavaScript SDK.
- Set GEMINI_API_KEY in .env for local use, or the server's environment settings when deployed.
- The default model is gemini-3.8-flash; set GEMINI_MODEL to a model available to your API key if needed.
- Chart ranking and route matching are deterministic JavaScript and do not require Gemini.
- Check the current Gemini API pricing, quota and data-use terms before using it in a public app. Free-tier limits vary by model and account.

## Run locally
1. Install Node.js 22 or newer.
2. Run npm install.
3. Copy .env.example to .env.
4. Add GEMINI_API_KEY and RAILRADAR_API_KEY if using AI explanations and automatic route lookup.
5. Run npm start and open http://localhost:3000.

## Chrome bridge
See extension/README.md for installation. The local version passes chart records from the IRCTC tab to the local app.

## Limits
- The app analyzes a chart snapshot, not subsequent TTE allotments. It does not guarantee a berth will remain available.
- Transfer paths require railway staff confirmation.
- Verify station order for the train and journey date.
- Before public distribution, confirm permissions/terms for processing and using live chart data.
