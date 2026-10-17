# Vacancy Scout

Local web app for analyzing an IRCTC vacancy-chart JSON response, with an optional Chrome companion extension that captures the user's own chart response from an IRCTC page they open.

## Run the app
1. Install Node.js 22 or newer.
2. Run npm install in this folder.
3. Copy .env.example to .env and add an OpenAI API key only if you want AI explanations. The local analyzer works without an AI key.
4. Run npm start and open http://localhost:3000.

## Capture chart data without manually uploading JSON
See extension/README.md for Chrome extension installation and setup instructions.

## Limits
- This tool analyzes a chart snapshot. It does not show later TTE allotments or guarantee a berth remains available.
- Transfer paths require railway staff confirmation.
- Verify route station order for the train and travel date.
- No live-data server scraper, login automation, access-control bypass or ticket booking is implemented.
- Before publishing, confirm the permitted method for obtaining and processing live chart data.
