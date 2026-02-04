# Tech News Aggregator

An AI-powered tech news aggregation system that collects content from various sources, analyzes it using AI, extracts trending topics, and sends curated email digests twice daily.

## Quick Start

### Prerequisites

Before running the setup wizard, have these ready:

1. **Xano account** — Sign up at [xano.com](https://www.xano.com) (free tier available) and create a workspace
2. **Xano Metadata API Key** — From your Instance Card: **Settings** (gear icon) > **Metadata API & MCP Server** > Manage Access Tokens. Create a token with all scopes.
3. **AI API key** — From [Anthropic](https://console.anthropic.com/), [OpenAI](https://platform.openai.com/), or [Google AI](https://aistudio.google.com/)
4. **Gmail app password** (optional, for email digests) — Enable 2FA on your Google account, then generate one at https://myaccount.google.com/apppasswords

### Install & Setup

```bash
git clone https://github.com/drippinrizz/tech-news-aggregator.git
cd tech-news-aggregator
npm install
npm run setup
```

The setup wizard walks you through everything:

1. **Xano configuration** — Enter your Base URL (e.g. `https://x1234567.xano.io`) and Metadata API Key. The wizard fetches your workspaces automatically and lets you pick one.
2. **AI provider** — Choose between Claude, GPT-4, or Gemini and enter your API key.
3. **Email** — Optionally configure Gmail for digest emails. The wizard tests your connection and sends a test email.

After collecting your info, the wizard automatically creates all Xano resources:
- 7 database tables
- 1 API group with 19 endpoints (all secured with API key auth)
- 5 AI tools + 1 AI agent (Blog Post Generator)
- 3 functions (including `auth/verify_api_key`) + 1 scheduled task

It also generates your `.env` file with all the values you entered.

> **Important:** After setup completes, you must add two environment variables in Xano manually. Go to **Your Workspace > Settings > Environment Variables** and add:
> 1. `API_KEY` — set to the value shown in the setup output (used by all endpoints for authentication)
> 2. `AI_PROVIDER_API_KEY` — set to your AI provider key (used by the Blog Post Generator agent)

### Run

The setup wizard handles everything — after configuring your services, it automatically builds the project, installs [PM2](https://pm2.keymetrics.io/), and starts the aggregator in the background. No extra steps needed.

The aggregator runs continuously — scraping every 2 hours and sending digests at 9 AM and 6 PM. You can close the terminal and it keeps running.

Useful commands:

```bash
pm2 logs tech-news-aggregator      # View live output
pm2 status                         # Check if it's running
pm2 restart tech-news-aggregator   # Restart
```

> **Dev mode:** If you're making changes and want to test, use `npm run dev` instead — but the terminal must stay open.

### Wake from Sleep

Your computer needs to be awake for digests to send. The setup wizard automatically configures wake-from-sleep based on your OS:

- **Windows** — Task Scheduler wakes the PC at 8:58 AM and 5:58 PM
- **macOS** — `pmset` wakes the Mac at 8:58 AM and 5:58 PM (requires sudo during setup)
- **Linux** — Not automatic. Use `pm2 startup` for persistence, `rtcwake` for wake scheduling

To re-run platform setup manually:
```bash
# Windows
powershell -File setup-9am-digest-task.ps1

# macOS
bash setup-mac-tasks.sh
```

---

## Features

- **Multi-Source Aggregation** — HackerNews, Tech Blogs (RSS), Reddit, Dev.to, Medium
- **AI-Powered Analysis** — Scores content relevance and identifies discussion-worthy topics
- **Smart Topic Extraction** — Groups articles into major/minor topics for blog generation
- **Automated Email Digests** — Twice-daily emails with curated content (9 AM & 6 PM)
- **Xano Backend** — No-code backend with REST API, AI agent, and scheduled tasks
- **AI Blog Generation** — Automated blog posts based on trending topics

## Architecture

```
Scraping (every 2 hours)
  └─> Fetch from HackerNews, RSS, Reddit, Dev.to, Medium
  └─> Save to Xano articles table

Analysis (after each scrape)
  └─> AI scores relevance (0-10) and suggests responses
  └─> Updates articles with scores, topics, reasoning

Topic Extraction (every 6 hours)
  └─> AI groups high-scoring articles into major/minor topics
  └─> Syncs to Xano topic tables

Digest (9 AM & 6 PM)
  └─> Fetches articles scoring 7+
  └─> Sends email digest
  └─> Marks articles as sent
```

## Manual Commands

```bash
npm run scrape      # Run scraper manually
npm run analyze     # Analyze unscored articles
npm run digest      # Send a digest now
```

## Project Structure

```
tech-news-aggregator/
├── scripts/
│   └── setup.ts                        # Setup wizard (cross-platform)
├── src/
│   ├── aggregators/                    # Source scrapers (HN, RSS, Reddit, Dev.to)
│   ├── analyzers/                      # AI analysis & topic extraction
│   ├── database/                       # Xano API client
│   ├── email/                          # Email templates
│   ├── services/                       # Xano sync service
│   ├── index.ts                        # Main scheduler
│   └── digest.ts                       # Digest generator
├── xano/
│   ├── tables/                         # Table schemas (.xs)
│   ├── endpoints/                      # API endpoints (.xs)
│   ├── tools/                          # AI tools (.xs)
│   ├── agents/                         # AI agents (.xs)
│   ├── functions/                      # Reusable functions (.xs)
│   └── tasks/                          # Scheduled tasks (.xs)
├── com.technews.aggregator.plist       # macOS: launchd agent (PM2 on login)
├── setup-mac-tasks.sh                  # macOS: wake-from-sleep setup
├── setup-task.ps1                      # Windows: login startup task
├── setup-9am-digest-task.ps1           # Windows: wake-from-sleep tasks
├── start-aggregator.bat                # Windows: PM2 resurrect
├── wake.bat                            # Windows: wake event logger
└── .env                                # Generated by setup wizard
```

## Configuration

All configuration lives in `.env`, which the setup wizard generates for you. Key settings:

```env
# Schedules (cron format) — defaults set by wizard
SCRAPE_SCHEDULE=0 */2 * * *        # Every 2 hours
DIGEST_MORNING_SCHEDULE=0 9 * * *  # 9 AM
DIGEST_EVENING_SCHEDULE=0 18 * * * # 6 PM
XANO_SYNC_SCHEDULE=0 */6 * * *    # Every 6 hours

# Filtering
MIN_RELEVANCE_SCORE=7              # Only include articles scoring 7+
DIGEST_LOOKBACK_DAYS=7             # How far back to look for articles
```

### Optional: Xano Topic Sync

To enable automatic topic syncing to Xano, add a `XANO_AUTH_TOKEN` to your `.env`. Create a regular API key in your Xano workspace (separate from the Metadata API key used during setup). Without this, the aggregator still scrapes, analyzes, and sends digests — topic sync is just skipped.

## Troubleshooting

**Setup wizard can't fetch workspaces:**
- Make sure you're using the **Metadata** API key, not a regular API key
- Check that your Base URL is correct (e.g. `https://x1234567.xano.io`)

**Email not sending:**
- Use a Gmail **app password**, not your regular password
- Make sure 2FA is enabled on your Google account
- Check your spam folder

**No articles in digest:**
- Wait for at least one scrape cycle (every 2 hours)
- Check `MIN_RELEVANCE_SCORE` — lower it if too few articles qualify

## License

MIT
