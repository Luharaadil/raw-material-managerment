<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/bc45b761-a30c-4c08-b9aa-58499447e1ce

## Run Locally

**Prerequisites:**  Node.js


## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in `.env.local` to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy to GitHub Pages

This project is configured to deploy automatically to GitHub Pages using GitHub Actions.

1. Go to your repository on GitHub.
2. Navigate to **Settings** > **Pages**.
3. Under **Build and deployment** > **Source**, select **GitHub Actions**.
4. The next time you push to the `main` branch, the deployment will trigger automatically.

### Note on Base Path

The project is pre-configured with a relative base path (`base: './'`) in `vite.config.ts`. This allows the application to resolve all compiled assets (`.js`, `.css`, and images) correctly on GitHub Pages out of the box, regardless of your repository's name or whether you utilize a custom domain. No manual path updates are required!
