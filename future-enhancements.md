# Future Enhancements: Asterley Bros Lead Generation Platform

What we'd build with no time constraints. This document serves two purposes:
1. Shows evaluators the full production vision beyond the PoC
2. Acts as a prioritized backlog for continued development

---

## 1. Self-Healing Workflows

The PoC pipeline is linear -- if a step fails, the lead stalls. A production system should recover automatically.

### Enrichment Recovery Chain

When a website scrape fails, the system should cascade through fallback sources before giving up:

```
Website scrape (primary)
  -> fails? Try Google Places reviews + categories
    -> insufficient? Try social media profiles (Instagram bio, Facebook about)
      -> still insufficient? Flag for manual review with partial data
```

Each fallback produces a confidence score. The system proceeds with whatever data it has, adjusting the lead score and email generation accordingly.

### Auto-Retry with Exponential Backoff

Failed API calls (OpenRouter, Google Places, website fetches) should retry automatically:
- 1st retry: 2 seconds
- 2nd retry: 8 seconds
- 3rd retry: 30 seconds
- After 3 failures: move to dead letter queue with error diagnosis

### Dead Letter Queue

Permanently failed leads go to a diagnostic queue that shows:
- Which step failed and why
- How many retries were attempted
- Suggested fix (e.g., "Website uses Cloudflare bot protection -- try manual enrichment")
- One-click retry after the issue is resolved

### Model Fallback

If the primary AI model (DeepSeek) is unavailable, OpenRouter enables automatic fallback:
- DeepSeek V3.2 (primary) -> Gemini 2.5 Flash (secondary) -> Qwen3 80B free tier (emergency)
- Fallback is transparent -- the system logs which model was used and adjusts confidence accordingly

### Email Bounce Detection

- Monitor Gmail for bounce-back replies (NDR parsing)
- Auto-update lead status to "Invalid Contact"
- Remove from follow-up queue
- Flag venue for re-enrichment (find alternative contact)

### Stale Lead Detection

- Auto-archive leads with no status change in 30 days
- Weekly digest: "5 leads have been idle for 20+ days -- archive or follow up?"
- Auto-generate a "breakup email" for leads that never responded after 3 follow-ups

---

## 2. Pipeline Automation (n8n Migration)

For production, the backend pipeline should migrate to n8n for visual workflow management. This allows non-technical team members to modify the pipeline without code changes.

### Cron-Triggered Discovery

- Weekly auto-scan of configured London areas
- New venues compared against existing leads to avoid duplicates
- New discoveries auto-enriched and scored
- High-confidence leads auto-enter the outreach queue

### Webhook-Triggered Enrichment

- Google Places listing update -> auto re-enrich affected leads
- Venue website change detected (via periodic crawl) -> refresh enrichment data
- New Shopify order from a postcode -> bump priority for that area

### Scheduled Follow-ups

- Day 5 after initial email: auto-generate Follow-up 1 draft
- Day 12: auto-generate Follow-up 2 draft (different angle)
- High-confidence follow-ups (score > 90) auto-sent
- Lower confidence held for review with context: "No reply in 5 days. Here's a follow-up draft."

### Pipeline Stage Automation

- Auto-move to "Follow-up 1" after 5 days of no reply
- Auto-move to "Follow-up 2" after 12 days
- Auto-archive after 30 days with no engagement
- Reply detected -> auto-move to "Replied" + notify Rob immediately

---

## 3. Advanced AI Features

### Multi-Model Evaluation

Generate emails with 2 different models (e.g., DeepSeek + Kimi K2.5), then use a third "judge" model to pick the better one based on:
- Brand voice adherence
- Personalization quality
- Natural language flow
- Factual accuracy against enrichment data

### Brand Voice Learning

- Track which emails Rob approves without edits vs. which he modifies
- Fine-tune the prompt template based on Rob's editing patterns
- Monthly "voice audit": compare recent AI output against Rob's approved baseline
- Detect voice drift early: alert if AI output diverges from established patterns

### A/B Testing for Subject Lines

- Track which subject line variant Rob picks most often
- Track reply rates per subject line style (question vs. statement vs. name-drop)
- Feed winning patterns back into the generation prompt
- Dashboard showing subject line performance over time

### Sentiment Analysis on Replies

Auto-categorize venue replies:
- **Interested**: "Sounds great, let's set up a tasting" -> move to Meeting stage
- **Not now**: "We're fully stocked for summer, try again in autumn" -> schedule re-contact in 3 months
- **Never**: "We don't stock non-alcoholic products" -> archive + exclude from future outreach
- **Question**: "What's your wholesale pricing?" -> flag for Rob with suggested response

### Competitor Intelligence

- Track which venues stock competing brands (Lyre's, Seedlip, etc.)
- Identify competitor patterns (which areas, which venue types)
- Generate competitive displacement angles in outreach emails
- Alert when a competitor appears in a venue that was previously Asterley-only

---

## 4. Real Integrations (Replace PoC Mocks)

### Gmail API with OAuth2

- Real email sending from rob@asterleybros.com (not Gmail alias redirect)
- Thread tracking: link replies to original outreach
- Reply detection: auto-update pipeline status when venue responds
- Open tracking via tracking pixel (optional, privacy-conscious)
- Unsubscribe handling: auto-remove leads who click unsubscribe

### Google Sheets Bidirectional Sync

- Pipeline table syncs to a Google Sheet in real-time
- Updates in either direction: edit in app or in Sheet, both stay in sync
- Shared Sheet for team visibility without app access
- Formulae and charts in Sheets for ad-hoc reporting

### Slack Integration

- Real webhook notifications (replace mocked indicator)
- Channel: `#leads-pipeline` for all pipeline updates
- DM to Rob for held-for-review items
- Slash command: `/leads search Peckham` triggers discovery from Slack
- Thread replies: Rob can approve/reject leads directly from Slack

### Shopify Integration

- Pull customer order data by postcode
- Identify high-density areas (many Shopify customers = proven demand)
- Prioritize venue discovery in areas where people already buy Asterley Bros
- Track which venue leads convert to wholesale customers

### Google Calendar Integration

- When a venue replies "let's meet", auto-suggest available time slots
- Create calendar events with venue name, address, and context
- Pre-meeting brief: auto-generate talking points from enrichment data
- Post-meeting follow-up: auto-draft thank-you email with agreed next steps

---

## 5. Analytics & Reporting

### Conversion Funnel Dashboard

Visual funnel showing:
- Discovered -> Enriched -> Emailed -> Replied -> Meeting -> Won
- Drop-off rates at each stage
- Average time between stages
- Comparison by area, venue type, and time period

### Area Performance Heatmap

- Interactive London map showing lead density and conversion rates by neighborhood
- Color-coded: green (high conversion), yellow (moderate), red (low)
- Click an area to see all leads, their statuses, and revenue potential
- Identify untapped areas with no outreach yet

### Email Performance Metrics

- Reply rate by email template, subject line style, and AI model used
- Time-to-reply distribution
- Best day/time to send (based on reply patterns)
- Personalization quality score vs. reply rate correlation

### Revenue Attribution

- Track which leads convert to customers
- Estimate monthly order value per won lead
- Calculate ROI: (revenue from won leads) / (time spent + API costs)
- Forecast: "At current conversion rates, 50 more leads in Shoreditch = X revenue"

### Weekly Digest Email

Automated summary sent to Rob every Monday:
- Pipeline snapshot (X new, Y emailed, Z replied this week)
- Top 3 hottest leads (highest score, most engagement)
- 3 leads needing attention (stale, pending review)
- Area recommendation: "Based on this week's data, try discovering in Dalston"

---

## 6. Multi-User & Team Features

### Authentication

- BetterAuth with GitHub OAuth (or email/password)
- Session management for multiple users
- Secure API routes behind auth middleware

### Role-Based Access

| Role       | Permissions                                                   |
| ---------- | ------------------------------------------------------------- |
| Admin      | Full access: config, discovery, outreach, pipeline, analytics |
| Sales Rep  | View leads, send approved emails, update pipeline status      |
| Viewer     | Read-only dashboard and pipeline access                       |

### Team Pipeline

- Lead assignment: assign venues to specific sales reps
- Territory management: each rep owns specific London areas
- Shared vs. personal pipeline views
- Activity feed: who did what, when

### Activity Log

- Full audit trail: every action timestamped and attributed
- "Rob approved email to The Bar on March 5 at 2:15 PM"
- Filter by user, action type, date range
- Export for compliance documentation

---

## 7. Infrastructure & Scale

### Database (Replace JSON Seed Data)

- **Supabase (recommended):** Free tier with 500MB Postgres, real-time subscriptions, Row Level Security
- Schema: leads, enrichments, emails, pipeline_entries, notifications, brand_voice_configs
- Full-text search on lead names and enrichment data
- Real-time updates: pipeline changes reflect instantly across all connected clients

### Caching Layer

- **Upstash Redis (free tier):** Cache enrichment results to avoid re-scraping
- Cache key: `enrichment:{placeId}` with 7-day TTL
- Cache Google Places results with 24-hour TTL
- Invalidate on manual re-enrichment

### Background Job Queue

- **BullMQ** for async processing:
  - Batch enrichment (enrich 20 venues in background, notify when done)
  - Scheduled email sending (queue emails for optimal send times)
  - Follow-up generation (generate drafts at Day 5 and Day 12)
  - Retry failed jobs with exponential backoff

### Rate Limiting

- Google Places API: respect 10K/month free tier, queue excess requests
- OpenRouter: track token usage, alert at 80% of budget
- Gmail SMTP: enforce daily cap (5 outreach emails/day, configurable)
- API routes: rate limit to prevent abuse

### PWA Support

- Service worker for offline access to pipeline data
- Push notifications for held-for-review items
- Mobile-optimized UI for on-the-go pipeline management
- Add to home screen on iOS/Android

### Monitoring & Observability

- **Sentry:** Error tracking with context (which lead, which API call)
- **Vercel Analytics:** Page load times, API route latency
- **Custom dashboard:** API cost tracking, model usage, success rates
- Alerting: Slack notification if error rate exceeds threshold

---

## Priority Ranking

If building incrementally after the PoC, this is the recommended order:

| Priority | Enhancement                  | Impact | Effort |
| -------- | ---------------------------- | ------ | ------ |
| 1        | Supabase persistence         | High   | Low    |
| 2        | Gmail API (real sending)     | High   | Medium |
| 3        | Self-healing enrichment      | High   | Medium |
| 4        | Sentiment analysis on replies| High   | Low    |
| 5        | Conversion funnel analytics  | Medium | Medium |
| 6        | Slack real notifications     | Medium | Low    |
| 7        | Scheduled follow-ups         | Medium | Medium |
| 8        | A/B testing subject lines    | Medium | Medium |
| 9        | Google Sheets sync           | Low    | Medium |
| 10       | n8n migration                | Low    | High   |
| 11       | Multi-user + auth            | Low    | High   |
| 12       | Shopify integration          | Low    | Medium |
