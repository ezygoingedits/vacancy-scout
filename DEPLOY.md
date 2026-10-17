# Deployment

## Deploy on Render
1. Connect Render to GitHub and grant it access to ezygoingedits/vacancy-scout.
2. Create a Blueprint using render.yaml and deploy the service.
3. In Render's Environment settings, add RAILRADAR_API_KEY for route lookup.
4. Add GEMINI_API_KEY for optional AI explanations. Set GEMINI_MODEL to gemini-3.8-flash unless you choose another available model.
5. Save and redeploy, then verify the site and /api/health.

## API keys
Keep both RAILRADAR_API_KEY and GEMINI_API_KEY in server-side environment variables. Never commit actual keys or put them in browser JavaScript. Check Gemini's current free-tier limits, data-use terms, and model availability before using it publicly.

## Public release
The website can be public while GitHub remains private. Test route lookup, station selection, and the capture extension on the deployed domain before sharing. The analyzer works without Gemini; Gemini is only for explanations.
