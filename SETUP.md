# Setting Up the AI Assistant in Production

This guide walks you through setting up the Gemini AI Assistant for **Deadline Rescue** in plain language.

---

## 1. Get Your Free Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Sign in with your Google account.
3. Click **Get API key** in the top navigation or sidebar.
4. Click **Create API key** and select a Google Cloud project (or create a new default one in one click).
5. Copy the generated API key.
   > **Note:** Keep your key private. Never commit it to GitHub or paste it into shared chats.

---

## 2. Add the Key in Vercel (Production)

1. Open your project dashboard at [vercel.com](https://vercel.com).
2. Click the **Settings** tab at the top.
3. In the left sidebar, click **Environment Variables**.
4. Add the following variable:
   - **Key / Name:** `GEMINI_API_KEY`
   - **Value:** Paste your API key here
   - **Environments:** Check **Production**, **Preview**, and **Development**
5. *(Optional)* You can also add:
   - **Key / Name:** `GEMINI_MODEL`
   - **Value:** `gemini-3.5-flash-lite` (default)
6. Click **Save**.

---

## 3. Redeploy to Activate

Environment variables take effect on your next deployment:

- **Via Vercel Web Dashboard:**
  1. Go to the **Deployments** tab.
  2. Click the three dots (`...`) next to your latest deployment.
  3. Select **Redeploy**.
- **Via Vercel CLI (terminal):**
  ```bash
  npx vercel --prod
  ```

Once deployed, click **Ask** in the top navigation and click **Check AI status** to verify that your key is recognized.

---

## 4. Running Locally with AI Features

To test the serverless API routes locally on your computer:

1. Create a file named `.env.local` in the project root (this file is already in `.gitignore` so git will never commit it):
   ```bash
   cp .env.example .env.local
   ```
2. Open `.env.local` and paste your key:
   ```env
   GEMINI_API_KEY=your_actual_key_here
   GEMINI_MODEL=gemini-3.5-flash-lite
   ```
3. Run the Vercel local development server (which executes both Vite and the `/api` serverless endpoints):
   ```bash
   npx vercel dev
   ```
4. Open the local URL (usually `http://localhost:3000`).

---

## 5. Offline Fallback

If no API key is provided, Deadline Rescue continues to work 100% privately using its built-in rule-based offline triage engine.
