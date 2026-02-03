# Quick Setup Guide

Follow these steps to get your tech news aggregator up and running:

## 1. Install Dependencies

```bash
npm install
```

## 2. Set Up PostgreSQL

If you don't have PostgreSQL installed:

**Windows:**
```bash
# Using Scoop (if installed)
scoop install postgresql

# Or download from https://www.postgresql.org/download/windows/
```

**Mac:**
```bash
brew install postgresql
brew services start postgresql
```

**Linux:**
```bash
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

Create a database:
```bash
createdb tech_news_db

# Or use psql:
psql postgres
CREATE DATABASE tech_news_db;
\q
```

## 3. Configure Environment Variables

Copy the example file:
```bash
cp .env.example .env
```

Update `.env` with your credentials:

```env
# Database - Update with your PostgreSQL credentials
DATABASE_URL="postgresql://your_username:your_password@localhost:5432/tech_news_db"

# Claude API - Get from https://console.anthropic.com
ANTHROPIC_API_KEY="sk-ant-..."

# Email - For Gmail
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT=587
EMAIL_USER="your-email@gmail.com"
EMAIL_PASSWORD="your-16-char-app-password"  # See step 4
EMAIL_TO="recipient@example.com"

# Optional: Adjust these if needed
MIN_RELEVANCE_SCORE=7
SCRAPE_SCHEDULE="0 */2 * * *"
DIGEST_MORNING_SCHEDULE="0 8 * * *"
DIGEST_EVENING_SCHEDULE="0 18 * * *"
```

## 4. Set Up Gmail App Password

1. Go to your Google Account: https://myaccount.google.com
2. Select "Security" > "2-Step Verification" (enable if not already)
3. Go to "App passwords": https://myaccount.google.com/apppasswords
4. Select "Mail" and your device
5. Copy the 16-character password
6. Use this password in `EMAIL_PASSWORD` (no spaces)

## 5. Initialize Database

Generate Prisma client and run migrations:

```bash
npm run db:generate
npm run db:migrate
```

When prompted for a migration name, enter: `init`

## 6. Test the Setup

Run a manual scrape to verify everything works:

```bash
npm run build
npm run scrape
```

You should see:
- Articles being fetched from various sources
- Articles being saved to the database

Then test analysis:

```bash
npm run analyze
```

You should see:
- Articles being analyzed by Claude
- Relevance scores being assigned

## 7. Start the Service

Run the full service with automated scheduling:

```bash
npm start
```

This will:
- Perform an initial scrape and analysis
- Schedule regular scraping every 2 hours
- Send morning digests at 8 AM
- Send evening digests at 6 PM

Keep this running in a terminal, or use a process manager like PM2:

```bash
npm install -g pm2
pm2 start dist/index.js --name tech-news-aggregator
pm2 save
pm2 startup
```

## 8. Monitor Activity

View the database in a GUI:

```bash
npm run db:studio
```

This opens Prisma Studio in your browser to browse articles, sources, and digest logs.

## Troubleshooting

### "Connection refused" database error
- Make sure PostgreSQL is running: `pg_isready`
- Check your DATABASE_URL credentials

### "Invalid API key" error
- Verify your ANTHROPIC_API_KEY in .env
- Check it's not expired at https://console.anthropic.com

### Email not sending
- Verify Gmail app password (not regular password)
- Check spam folder
- Try sending a test email manually

### No articles found
- Check your internet connection
- Verify sources are accessible in your region
- Some sources may have rate limits

## Next Steps

- Customize sources in aggregator files
- Adjust AI prompts in `src/analyzers/claude.ts`
- Modify email template in `src/email/digest.ts`
- Set up on a server for 24/7 operation

Enjoy your personalized tech news digests!
