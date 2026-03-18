# Deployment Guide - AI Discussion Analyzer

## Quick Deploy Options (Choose One)

### Option 1: Vercel (RECOMMENDED) ⭐
Best for Next.js - Takes ~5 minutes

#### Prerequisites:
- GitHub account
- Vercel account (free)

#### Steps:

1. **Create GitHub Repository:**
   ```bash
   # Go to github.com and create a new repository named "discussion-analyzer"
   # Then run these commands in your project folder:
   
   git init
   git add .
   git commit -m "Initial commit - AI Discussion Analyzer"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/discussion-analyzer.git
   git push -u origin main
   ```

2. **Deploy to Vercel:**
   - Go to https://vercel.com
   - Click "Sign Up" → Choose "Continue with GitHub"
   - Authorize Vercel to access your GitHub
   - Click "Add New Project"
   - Find and select your "discussion-analyzer" repository
   - Click "Deploy" (no configuration needed!)
   - Wait 2-3 minutes

3. **Your App is Live!**
   - URL: https://discussion-analyzer.vercel.app (or similar)
   - You'll get a custom URL like: your-project.vercel.app

---

### Option 2: Railway

1. **Push to GitHub** (same as above)

2. **Deploy:**
   - Go to https://railway.app
   - Sign up with GitHub
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository
   - Railway auto-detects Next.js and deploys

3. **Done!** Get your URL from the dashboard

---

### Option 3: Render (Free Tier)

1. **Push to GitHub** (same as above)

2. **Deploy:**
   - Go to https://render.com
   - Sign up with GitHub
   - Click "New" → "Web Service"
   - Connect your repository
   - Settings:
     - Build Command: `npm install && npm run build`
     - Start Command: `npm start`
   - Click "Create Web Service"

---

## Environment Variables

If needed, add these in your hosting platform's dashboard:

| Variable | Value | Required |
|----------|-------|----------|
| (Any API keys from .env) | Copy from your .env file | Check .env |

---

## Demo Day Checklist

- [ ] Test deployed app the night before
- [ ] Save the URL on your phone
- [ ] Take screenshots as backup
- [ ] Keep local version running as fallback
- [ ] Test on tablet/mobile (your target device)

---

## Troubleshooting

### Build Fails?
1. Check the build logs
2. Make sure all dependencies are in package.json
3. Run `npm run build` locally to test

### App Not Loading?
1. Check if deployment is complete
2. Clear browser cache
3. Try incognito mode

### API Not Working?
1. Check environment variables are set
2. Check server logs in dashboard

---

## Need Help?

- Vercel Docs: https://vercel.com/docs
- Railway Docs: https://docs.railway.app
- Render Docs: https://render.com/docs

---

**Recommended: Vercel** - It's made by the Next.js team and offers the best experience!
