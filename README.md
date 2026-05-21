# MAK Champions — Cricket Match Fee Tracker

A real-time match fee tracker for the MAK Champions WhatsApp cricket group. Each match records who paid upfront, which players participated, and tracks individual payback status. All 12 players share the same live view — when anyone marks themselves as paid, everyone sees it instantly.

---

## Supabase Setup

1. Go to [supabase.com](https://supabase.com) and create a free project.
2. In the SQL Editor, paste and run the contents of `supabase/schema.sql`.
3. Go to **Project Settings → API** and copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`
4. Create a `.env` file in the project root:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

---

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:5173/mak-cricket/](http://localhost:5173/mak-cricket/)

---

## Deploy to GitHub Pages

1. Create a GitHub repo named `mak-cricket`.
2. Push the code:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/mak-cricket.git
git push -u origin main
```

3. Deploy:

```bash
npm run deploy
```

4. In GitHub repo → **Settings → Pages**, set source to `gh-pages` branch.

Your app will be live at: **https://YOUR_USERNAME.github.io/mak-cricket/**

---

## Share with the Squad

Send the GitHub Pages URL to the WhatsApp group. On first open, each player taps their name — this is saved on their device only. Match data and payment status sync in real time across all devices via Supabase.
