# Deployment

## Deploy on Render
1. Connect Render to GitHub and grant it access to ezygoingedits/vacancy-scout.
2. Create a Blueprint using render.yaml and deploy the service.
3. In the Render service, open Environment and add RAILRADAR_API_KEY with your private route provider key. Save and redeploy.
4. Verify the site and /api/health. The health response should report routeLookupConfigured: true.
5. Do not add OPENAI_API_KEY to the public service until the AI endpoint has rate limiting and abuse controls.

## Route API
The frontend automatically calls /api/train-route/:number after a valid 4–6 digit train number is entered. The server calls the fixed RailRadar route endpoint and caches successful results for 12 hours. The key is kept server-side.

## Public release
The site may be public while the GitHub repository stays private. Test route lookup, boarding/destination selection, and the chart capture extension on the deployed domain before sharing it. Confirm route-provider quota and the permitted method for public use of chart data before launch.
