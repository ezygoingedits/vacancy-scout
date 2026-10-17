# Vacancy Scout

A local prototype for analyzing a saved IRCTC vacancy-chart JSON response.

## Features
- Upload or paste a chart response with a vbd array.
- Filter records by an editable station route.
- Rank single-berth paths and exact-station transfer paths.
- Optionally use the OpenAI Responses API for explanations.
- Keep the OpenAI key in the server-side .env file.

## Run on your PC
1. Install Node.js 22 or newer.
2. In this folder, run npm install.
3. Copy .env.example to .env.
4. Add your OpenAI API key to .env if you want AI explanations. Leave it blank to use the analyzer without AI.
5. Run npm start and open http://localhost:3000.

## Limits
The chart is a snapshot. It does not show subsequent TTE allotments or guarantee that a berth is available. Transfer paths need railway staff confirmation. No live IRCTC scraping, access-control bypass or booking is implemented. Verify the route station order before relying on any results.
