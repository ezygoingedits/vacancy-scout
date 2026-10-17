# Vacancy Scout

A Node.js/Express app for analyzing a chart response that the user obtains from the IRCTC chart page. An optional Chrome companion extension captures the vacancy-chart response after the user explicitly enables it and passes normalized berth records to the app.

## Run locally
1. Install Node.js 22 or newer.
2. Run npm install.
3. Copy .env.example to .env. Leave OPENAI_API_KEY blank unless you have reviewed the AI endpoint's costs and abuse controls.
4. Run npm start and open http://localhost:3000.

## Public deployment
See DEPLOY.md and render.yaml. The site can be public while this GitHub repository remains private. The extension's production host must match the actual deployed URL.

## Important limits
The app analyzes a chart snapshot, not live TTE assignments. Transfer paths need railway staff confirmation. Verify station order for the specific train/date. No ticket booking, login automation, access-control bypass or server-side IRCTC scraping is implemented. Confirm the permitted method and terms for public data processing before launch.
