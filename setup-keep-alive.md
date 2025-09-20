# Database Keep-Alive Setup

Supabase pauses free tier databases after 7 days of inactivity. Here are 3 ways to keep your database active:

## Option 1: Use a Free Cron Service (Recommended)

1. **Visit:** https://cron-job.org or https://uptimerobot.com
2. **Create a free account**
3. **Set up a new cron job:**
   - URL: `https://your-app-url.vercel.app/api/cron/keep-alive`
   - Schedule: Every 5 days (or twice a week)
   - Method: GET

## Option 2: GitHub Actions (Automatic)

Create `.github/workflows/keep-alive.yml`:

```yaml
name: Keep Database Alive
on:
  schedule:
    - cron: '0 0 */5 * *'  # Every 5 days at midnight
  workflow_dispatch:  # Allow manual trigger

jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Ping Database
        run: |
          curl -X GET https://your-app-url.vercel.app/api/cron/keep-alive
```

## Option 3: Local Node.js Script

Run the `keep-alive.js` script on your computer:

```bash
node keep-alive.js
```

Keep it running in the background or use PM2:

```bash
npm install -g pm2
pm2 start keep-alive.js
pm2 save
pm2 startup
```

## Testing the Keep-Alive Endpoint

Once deployed, test your endpoint:

```bash
curl https://your-app-url.vercel.app/api/cron/keep-alive
```

You should see:
```json
{
  "success": true,
  "message": "Database is active",
  "timestamp": "2024-01-20T10:00:00.000Z"
}
```

## Why This Works

The script makes a simple database query every few days, which counts as "activity" and prevents Supabase from pausing your database. The query is lightweight and won't affect your usage limits.