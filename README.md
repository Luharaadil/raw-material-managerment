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

### Important Note on Base Path

If your repository name is different from `Material-Consumption-Calculator-1.0`, you must update the `base` field in `vite.config.ts`:

```typescript
// vite.config.ts
export default defineConfig(({mode}) => {
  return {
    base: '/YOUR_REPO_NAME/',
    // ...
  };
});
```
