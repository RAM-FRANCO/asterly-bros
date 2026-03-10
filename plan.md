# Asterley Bros: AI-Powered Lead Generation & Cold Outreach

## Context

**What:** Paid take-home project for AI Integration Engineer role at Asterley Bros (non-alcoholic aperitif brand).

**Why Option 1:** Ram already demoed a RAG chatbot in interview 1. Option 1 shows range (business workflow automation, not just chatbots) and scores highest on the #1 evaluation criterion: empathy for SME workflows. Sales/distribution is survival for a small beverage brand.

**Deliverables:** 3-5 page write-up + working prototype + diagrams + 5-10 min video walkthrough.

---

## The Core Insight

Rob doesn't need a sales platform. He needs a smart research assistant that does the boring work (finding venues, looking them up, drafting emails) so he can spend time on the human parts (taking meetings, building relationships).

---

## Architecture Overview

### System Flow

```
Discovery (Google Places)
  -> Enrichment (AI reads venue websites)
    -> Scoring (weighted algorithm)
      -> Email Generation (AI + brand voice)
        -> Confidence Check
          |
    ┌─────┴──────┐
    |             |
 Score > 85    Score 60-85
 Data OK       Data incomplete
    |             |
 Auto-send     Hold for review
 (redirected   + In-app notification
  to Gmail     + Email notification
  alias)         to Rob
    |             |
    └──────┬──────┘
           |
     Pipeline Tracking
```

### Tech Stack

| Layer          | Technology                              | Cost       |
| -------------- | --------------------------------------- | ---------- |
| Framework      | Next.js 16 (App Router) + Tailwind 4    | Free       |
| UI Components  | shadcn/ui                               | Free       |
| AI Models      | OpenRouter (`@openrouter/sdk`)           | < $1 total |
| Venue Data     | Google Places API (Essentials)           | Free (10K req/month) |
| Email          | Nodemailer + Gmail SMTP                  | Free       |
| Deployment     | Vercel (Hobby)                           | Free       |
| Persistence    | JSON seed data + in-memory (PoC)         | Free       |
| Auth           | None (single-user demo)                  | Free       |

**Total PoC cost: under $1 in AI API fees. Everything else is free.**

### AI Model Strategy (via OpenRouter)

OpenRouter provides one API key for 400+ models. Model IDs are configured via environment variables -- swap models by changing a string, zero code changes.

| Use Case              | Model                     | Cost (per MTok)        | Notes                          |
| --------------------- | ------------------------- | ---------------------- | ------------------------------ |
| Development/testing    | Qwen3 80B (free tier)     | $0 / $0                | 200 req/day, no API key cost   |
| Enrichment (demo)     | DeepSeek V3.2             | $0.25 in / $0.40 out   | Best value, quality score 79   |
| Email generation      | DeepSeek V3.2 or Kimi K2.5| $0.25-0.45 / $0.40-2.20| Kimi K2.5 quality score 89     |
| Higher quality option | Gemini 2.5 Flash          | $0.30 / $2.50          | Good structured extraction     |
| Premium fallback      | Claude Sonnet 4.5         | $3.00 / $15.00         | 12-37x more expensive          |

---

## Autonomy Model: Hybrid Confidence-Based

Instead of Rob reviewing every email (repetitive) or the AI sending everything (risky), the system uses confidence-based autonomy.

### Auto-approved (no Rob involvement)

- Lead score > 85
- Enrichment data is complete (venue type, contact info, menu data all present)
- Standard venue type (cocktail bar, wine bar, restaurant with bar program)
- Email template matches a known pattern

### Held for review (Rob gets notified)

- Lead score between 60-85 (borderline fit)
- Incomplete enrichment (website scrape failed, missing contact info)
- Unusual venue type (hotel bar, event space, pop-up)
- AI flagged low confidence on its own output
- First email to a new area/category (Rob validates before the AI sends more like it)

### Notifications

- **Real (PoC):** In-app "Needs Review" badge on dashboard + notifications panel with hold reasons
- **Real (PoC):** Email notification to Rob via Nodemailer when a lead is held for review
- **Mocked:** "Would notify via Slack" indicator in UI (no webhook integrated)

---

## Email Implementation

All emails go through Nodemailer + Gmail SMTP. A PoC redirect mode ensures no emails reach real businesses.

**Outreach emails:** The system discovers real contacts (e.g., `info@thebar.co.uk`) but redirects to `rob+thebar-co-uk@gmail.com` using Gmail's `+` alias. Rob sees the full email in his inbox. The UI shows both the intended recipient and the redirect target.

**Notification emails:** Sent directly to Rob's Gmail when a lead is held for review. Contains the venue name, hold reason, and a link to the dashboard.

**PoC mode toggle:** `POC_MODE=true` env var controls redirect behavior. Set to `false` for production -- emails go to actual venues. Zero code changes.

### Email Content Strategy

- Template + Personalization approach (NOT fully AI-generated)
- AI writes: Hook (1-2 sentences, venue-specific) + Bridge (1 sentence connecting to Asterley Bros)
- Human writes: Offer + Close (fixed templates in Rob's actual voice)
- Result: 60% Rob's words, 40% AI personalization = authentic + scalable
- 3 subject line options per email

---

## Key Components

### 1. Lead Discovery & Enrichment Pipeline

- **Google Places API:** Search bars, restaurants, bottle shops, delis by area (e.g., "Peckham", "Shoreditch")
- **AI Enrichment:** Fetch venue website -> strip HTML to text (cheerio/readability) -> AI extracts structured data (venue type, existing brands, cocktail menu, vibe, contact info)
- **Fallback:** If website scrape fails, use Google Places data (reviews, categories, photos) as enrichment source
- **Scoring Algorithm:** Transparent, weighted scoring (serves Negroni/Spritz +30, stocks competitor aperitifs +20, premium price level +15, independent +10, etc.)

### 2. AI Outreach Engine

- Brand voice config: editable tone, personality, avoid-words, key selling points
- Email generation via OpenRouter with configurable model
- Confidence scoring determines auto-send vs. hold-for-review

### 3. Pipeline & Follow-up Tracking

- Table UI showing all leads with status: New > Emailed > Follow-up 1/2 > Replied > Meeting > Won > Lost
- Auto-generated follow-up drafts at Day 5 and Day 12
- Export to CSV (Google Sheets integration described but mocked in prototype)

---

## Prototype Scope

### Real (live API calls + functional UI)

- Google Places venue discovery for London areas
- AI website enrichment (fetch + extract via OpenRouter)
- AI email generation with brand voice
- Lead scoring algorithm
- Confidence-based auto-send / hold-for-review
- Outreach emails redirected to Gmail alias (Rob sees them)
- Notification emails to Rob for held leads
- Dashboard, lead list, email preview, pipeline table UI

### Mocked (shown in UI, not wired)

- Google Sheets sync (table view IS the CRM, CSV export available)
- Follow-up scheduling (drafts generated, timing shown, not automated)
- Shopify customer density data
- Slack notifications ("would notify via Slack" indicator)

---

## Project File Structure

```
app/
  page.tsx                         # Dashboard
  leads/
    page.tsx                       # Discovery + lead list
    [placeId]/
      page.tsx                     # Lead detail + enrichment
  outreach/
    page.tsx                       # Email drafts queue
  pipeline/
    page.tsx                       # Pipeline tracker
  settings/
    page.tsx                       # Brand voice config
  api/
    leads/
      discover/route.ts            # Google Places search
      enrich/route.ts              # Website fetch + AI extraction
    outreach/
      generate/route.ts            # AI email generation
      send/route.ts                # Nodemailer send (redirect in PoC mode)
    pipeline/
      route.ts                     # Pipeline CRUD
    notifications/
      route.ts                     # Email notification to Rob
components/
  ui/                              # shadcn components
  features/
    leads/                         # lead-card, lead-list, discovery-form, score-badge
    outreach/                      # email-preview, email-editor, subject-line-picker
    pipeline/                      # pipeline-table, status-column, follow-up-reminder
    settings/                      # brand-voice-editor
    notifications/                 # notification-badge, notification-panel
lib/
  ai.ts                            # OpenRouter wrapper with model env vars
  google-places.ts                 # Places API client
  scoring.ts                       # Scoring algorithm
  enrichment.ts                    # Website fetch + AI extraction
  email.ts                         # Nodemailer wrapper with PoC redirect
constants/
  brand-voice.ts                   # Default brand voice config
  scoring-weights.ts               # Scoring weight definitions
  venue-types.ts                   # Venue type categorization
types/
  lead.ts                          # Lead, EnrichmentData interfaces
  outreach.ts                      # Email, SubjectLine interfaces
  pipeline.ts                      # PipelineStage, PipelineEntry interfaces
data/
  seed-leads.json                  # 10-15 pre-enriched London venues
```

---

## Environment Variables

```bash
# .env.local
OPENROUTER_API_KEY=sk-or-...
ENRICHMENT_MODEL=deepseek/deepseek-chat-v3-0324
EMAIL_MODEL=deepseek/deepseek-chat-v3-0324
GOOGLE_PLACES_API_KEY=AIza...
GMAIL_USER=rob@gmail.com
GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
POC_MODE=true
POC_REDIRECT_EMAIL=rob@gmail.com
```

---

## Rob's Weekly Workflow (What We Demo in the Video)

| Day     | Action                                                                          | Time   |
| ------- | ------------------------------------------------------------------------------- | ------ |
| Monday  | Open app -> "Discover Leads" in Peckham -> system scores 20 venues auto         | 15 min |
| Tuesday | Check dashboard -> 2 emails held for review -> approve -> rest auto-sent        | 10 min |
| Friday  | Check pipeline -> approve 1 follow-up draft -> update statuses for replies      | 10 min |
| **Total** |                                                                               | **~35 min/week** |

Down from ~75 min/week with full human-in-the-loop.

---

## Risk Mitigation

| Risk                       | Mitigation                                                                                      |
| -------------------------- | ----------------------------------------------------------------------------------------------- |
| AI hallucination in emails | Structured enrichment step separate from generation; source data shown alongside draft           |
| Emails sent to real venues | PoC redirect mode sends to Gmail alias; `POC_MODE` env var; UI clearly shows redirect status    |
| Spam/deliverability        | Low volume (10-15/week), genuinely personalized, daily cap of 5                                 |
| GDPR                       | All data from public sources; B2B legitimate interest basis; unsubscribe in every email         |
| Brand voice drift          | Editable voice config; 60% of email is fixed template; confidence threshold for auto-send       |
| AI model downtime          | OpenRouter supports model switching via env var; fallback to alternative model in seconds        |
| Website scrape failures    | Fallback to Google Places data (reviews, categories) when website is blocked or unavailable      |

---

## Write-up Structure (Maps to 5 Assessment Sections)

1. **Understanding the SME workflow** -- Rob's Monday morning story, pain point table, what "good enough" looks like
2. **AI workflow design** -- Architecture diagram, data pipeline, outreach engine, autonomy model, tracking system
3. **Implementation plan (weeks 1-4)** -- Week 1-2: working v1, Week 3-4: real integrations, analytics, feedback loops
4. **Risks, limits, iteration** -- Hallucination, spam, GDPR, brand voice, confidence calibration
5. **AI tools usage** -- Claude Code for planning/coding, OpenRouter in the product, what was manually decided

---

## Implementation Steps (Build Order)

1. Install deps: `@openrouter/sdk`, `nodemailer`, `cheerio`, shadcn/ui components
2. Build types + constants (lead, outreach, pipeline interfaces; brand voice config; scoring weights)
3. Build `lib/` layer (ai.ts, google-places.ts, scoring.ts, enrichment.ts, email.ts)
4. Create seed data (10-15 pre-enriched London venues as JSON)
5. Build API routes (discover, enrich, generate, send, pipeline, notifications)
6. Build UI pages: Dashboard -> Leads Discovery -> Lead Detail -> Outreach Queue -> Pipeline -> Settings
7. Build confidence-based autonomy (scoring threshold + auto-approve/hold logic)
8. Build notification system (in-app badge + email via Nodemailer)
9. Polish: loading states, error fallbacks, responsive design
10. Deploy to Vercel
11. Write assessment document + record Loom video

---

## Verification Checklist

- [ ] Google Places API returns real London venues by area search
- [ ] AI enrichment extracts structured data from venue websites
- [ ] Fallback works when website scrape fails (uses Google Places data)
- [ ] Scoring produces sensible rankings (cocktail bars > pubs)
- [ ] Email generation produces personalized, on-brand copy
- [ ] High-confidence leads are auto-approved (score > 85 + complete data)
- [ ] Low-confidence leads are held with notification to Rob
- [ ] Outreach emails redirect to Gmail alias in PoC mode
- [ ] Rob receives notification emails for held leads
- [ ] Pipeline table tracks status correctly
- [ ] Brand voice config is editable and affects generation
- [ ] Model can be swapped via env var without code changes
- [ ] App is deployed and accessible via Vercel URL
- [ ] Write-up covers all 5 required sections
- [ ] Video walkthrough is 5-10 minutes, clear, non-technical
