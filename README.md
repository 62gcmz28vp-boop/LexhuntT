# LEXHUNT — My Legal Career Intelligence Platform (Riyadh)

A private, single-owner web application for discovering, researching, tracking and winning entry-level legal roles in Riyadh. Built with Next.js 15 (App Router, TypeScript), Tailwind CSS v4 with shadcn/ui-style components, PostgreSQL (Supabase or any Postgres — embedded PGlite for local development) and Claude for application assistance.

> **Integrity rules built into the product:** no fictional jobs, firms, hiring procedures or statistics; every firm claim carries a label (Verified / Reported / Historical / Not publicly disclosed) and a source link; vacancies are only marked **Open** when confirmed on an official employer source; match scores measure qualification alignment, never hiring probability; AI output uses only facts in your verified profile; nothing is ever submitted or sent to an employer by the app.

---

## 1. What is in the app

| Area | Route | What it does |
|---|---|---|
| **Command Center** | `/` | Daily overview: verified vs unverified vacancies, new finds, trainee/graduate, international vs Saudi vs in-house, programmes accepting, deadlines, top matches, pipeline, follow-ups, notifications, last-run timestamp. |
| **Live Opportunities** | `/opportunities` | Filterable/sortable table (status, employer type, role type, licence requirement, saved), deduplicated sources, last-checked time, save / hide / compare (up to 4), manual "Add a vacancy", and pre-built search links for LinkedIn, Indeed, Bayt, GulfTalent, Naukrigulf, Glassdoor, Google Jobs, X and Jadarat (EN + AR keywords). |
| Vacancy detail | `/opportunities/[id]` | Key facts, 8-criterion match breakdown, why you fit / weaknesses / positioning / strategy, **Apply Smarter**, sources, status history, manual verification. |
| **My Matches** | `/matches` | Opportunities ranked by alignment with your profile; ineligible (student-only) schemes shown separately as signals. |
| **Firm Radar** | `/radar`, `/radar/[slug]` | 56 researched firms (international, affiliates/JVs, Saudi, boutiques) with Riyadh presence, practice areas, graduate recruitment, recruitment process stages (each labelled), signals, sources, watchlist, notes, live careers-page check. |
| **Hidden Market** | `/hidden` | Firms with public hiring signals (new offices, past trainees, graduate pages, lateral moves), approach strategy, and an AI/template speculative email — clearly separated from real vacancies. |
| **Application Studio** | `/studio` | Verified profile editor, CV upload (PDF/DOCX/TXT) with text extraction and AI-assisted, evidence-quoted profile update; practice prep packs (corporate, M&A, projects/PPP, construction/FIDIC, disputes, compliance, regulatory); history of application packs. |
| **Career Pipeline** | `/pipeline` | Kanban of the 10 stages (Discovered → Withdrawn), per-application notes, deadlines, auto-suggested follow-ups, interview/event timeline, document attachments, analytics. |
| **Market Intelligence** | `/intelligence` | Distributions computed from your data (practice areas, skills, licence requirements, who is recruiting, international vs Saudi comparison) + attributable findings with sources. |
| **Alerts** | `/alerts` | Five alert rules (new trainee role, international firm graduate role, watchlist firm opens recruitment, high match ≥ threshold, deadline approaching), frequency (each run / daily / weekly), email toggle, notification center. Alerts only show as *Active* once scheduling has actually run and a test email has been delivered. |
| **Research Coverage** | `/coverage` | Sources searched, failed sources, firms verified, confirmed active vacancies, last successful update, per-run audit log, limitations. |
| **Settings** | `/settings` | Integration status and setup steps. |

Bilingual interface (English / العربية with full RTL), dark and light modes, mobile layout.

---

## 2. What works now vs. what needs credentials

| Feature | Without credentials | With credentials |
|---|---|---|
| Login, all pages, tracker, firm radar, matching, manual vacancies, CV upload | ✅ Works (PGlite locally) | Postgres via `DATABASE_URL` for persistence on Vercel |
| Apply Smarter / approach emails | ✅ Deterministic **template** built only from your profile (labelled "Template") | `ANTHROPIC_API_KEY` → Claude-tailored packs (cover letter, email, interview Q&A with model answers, checklist) |
| CV → profile extraction | Text extracted and shown for manual edit | `ANTHROPIC_API_KEY` → structured extraction with evidence quotes and discrepancy check, applied only after you review |
| Official ATS boards (Greenhouse, Lever, Workable, SmartRecruiters, Ashby) | ✅ No key needed — but candidate board tokens are **unconfirmed**; run `npm run probe:ats` | — |
| Law-firm careers-page monitor (robots.txt-respecting) | ✅ No key needed | — |
| LinkedIn / Indeed / Bayt / GulfTalent / Glassdoor coverage | Search links only (scraping these sites is prohibited) | `RAPIDAPI_KEY` (JSearch) and/or `SERPAPI_KEY` (Google Jobs) — licensed aggregators of Google for Jobs |
| Scheduled discovery & reminders | "Run discovery now" button / `npm run discover` | `CRON_SECRET` + Vercel Cron (`vercel.json`) |
| Email alerts | In-app notifications only | `RESEND_API_KEY`, `ALERT_EMAIL_FROM`, `ALERT_EMAIL_TO` + a successful test email |

**Not verified during the build:** the build sandbox could not reach employer websites, ATS APIs, RapidAPI, SerpApi, Resend or the Anthropic API, so those live integrations are implemented and unit/integration-tested with fixtures but have **not** been exercised against the real services. Do one manual "Run discovery now" and one "Send test email" after deploying.

---

## 3. Research included (9 Nov 2026)

* **56 firms** with a Riyadh presence: international licensed firms (e.g. Addleshaw Goddard, A&O Shearman, Akin, Baker McKenzie, Clyde & Co, Freshfields, Gibson Dunn, HSF Kramer, Kirkland, Latham, Morgan Lewis, Pinsent Masons, Reed Smith, Trowers, White & Case …), JVs/affiliates (AS&H Clifford Chance, Dentons Arabia, Eversheds/Aldhabaan, King & Spalding Al Fahad, Squire Patton Boggs Al-Akkas …), Saudi firms (Derayah, Khoshaim, Hammad & Al-Mehdar, Alsabhan & Alajaji, Zamakhchary, Hejailan, Al-Jadaan, AlGhazzawi, STAT …) and boutiques (Nasreen Alissa, AT Law Firm, A&M, SuhailPartners …).
* **14 opportunities** found in the index. None is marked *Open* because no employer page could be fetched directly from the build environment; each is *Unverified* (with the reason) or *Closed* (where the source says the window passed). Student-only co-op schemes are kept as signals and score as ineligible for a graduate.
* **Attributable market findings** (licensing reform, office-opening wave, co-op → trainee pipelines, MoJ trainee requirements, Bar membership, salary-data gap).
* Method and limitations are listed in-app under **Research Coverage**. Research data lives in `src/data/` and is versioned with the code.

---

## 4. Architecture

```
src/
  app/                      Next.js routes (server components + server actions)
    (app)/…                 authenticated pages
    api/cron/discover       scheduled discovery (Bearer CRON_SECRET)
    api/cron/reminders      deadline / follow-up reminders & digests
    api/ai/*                Apply Smarter, approach email, CV extraction
    actions.ts              server actions (save, track, watch, profile, alerts…)
  lib/
    db.ts, schema.ts        Postgres (postgres.js) or PGlite behind one interface; idempotent schema
    seed.ts                 seeds profile, researched opportunities, alert rules
    jobs.ts, dedupe.ts      upsert, cross-source de-duplication, status history, deadline expiry
    matching.ts             transparent 0–100 qualification-alignment score
    taxonomy.ts             EN/AR keyword sets, relevance, seniority, licence & experience parsing
    discovery/              orchestrator + sources (aggregators, ATS boards, career-page monitor), polite HTTP + robots.txt
    ai.ts, templates.ts     Claude (structured JSON output) + no-key fallbacks
    notify.ts               alert rules, in-app notifications, Resend email
  data/                     researched firms, opportunities, market findings, prep packs, research log, ATS boards
tests/                      unit + PGlite integration tests (node:test)
```

**Status lifecycle.** `unverified` (seen on an aggregator/manual) → `open` (seen on an official employer source; sets *last verified*) → `closed` (deadline passed, removed from the official board/page, or manually). Aggregator sightings never re-open a job closed by an official source. Every change is written to `job_status_history`.

**De-duplication.** Normalised employer + title + city key, then a same-employer title Jaccard ≥ 0.75 fuzzy match; all sources are kept in `job_sources`.

**Match score (100).** Eligibility 20 (licence, nationality, student-only), practice-area relevance 20, experience 15, similarity to your Addleshaw Goddard work 15, legal skills 10, Arabic/English 8, Riyadh location 7, graduate accessibility 5. Hard eligibility failures cap the score at 35.

**Responsible collection.** Honest User-Agent, robots.txt honoured for HTML pages, ≥1.5 s per-host spacing, timeouts, no login/CAPTCHA/paywall bypass, no scraping of LinkedIn/Indeed/Bayt etc. (licensed aggregators or manual links instead).

---

## 5. Run locally

```bash
npm install
cp .env.example .env.local
# set a password (dev):  LEXHUNT_PASSWORD=choose-one   and a SESSION_SECRET (32+ chars)
npm run dev            # http://localhost:3000
npm test               # 18 unit + integration tests
npm run discover       # one discovery pass from the CLI
npm run probe:ats      # check which ATS board tokens exist
```

Without `DATABASE_URL` an embedded Postgres (PGlite) is created in `./.data/pglite`.

---

## 6. Deploy (Vercel + Supabase)

1. **Database:** create a Supabase project → *Project Settings → Database → Connection string → Transaction pooler* (port 6543). Tables are created automatically on first request (or run `DATABASE_URL=… npm run db:migrate`).
2. **Password:** `npm run hash-password -- "your strong password"` → copy the `LEXHUNT_PASSWORD_HASH=…` line.
3. **Secrets:** `openssl rand -base64 48` for `SESSION_SECRET` and again for `CRON_SECRET`.
4. **Vercel:** import the repository, framework *Next.js*, add the environment variables below, deploy. `vercel.json` schedules discovery daily at 04:00 UTC (07:00 Riyadh) and reminders at 05:00 UTC. Cron functions use up to 300 s (`maxDuration`); on the Hobby plan reduce `DISCOVERY_MAX_QUERIES` if runs time out.
5. **After the first deploy:** sign in → *Run discovery now* → check **Research Coverage**; run `npm run probe:ats` locally and prune `src/data/atsBoards.ts`; send a test email from **Alerts**.

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `LEXHUNT_PASSWORD_HASH` | ✅ (or `LEXHUNT_PASSWORD` in dev) | scrypt hash of your password |
| `SESSION_SECRET` | ✅ in production | signs the HTTP-only session cookie (≥32 chars) |
| `DATABASE_URL` | ✅ on Vercel | Postgres / Supabase pooled URL |
| `ANTHROPIC_API_KEY` | optional | Claude for Apply Smarter, CV extraction, approach emails |
| `ANTHROPIC_MODEL` | optional | defaults to `claude-opus-5-5` |
| `CRON_SECRET` | for schedules | authorises `/api/cron/*` |
| `RAPIDAPI_KEY` | optional | JSearch (Google for Jobs: LinkedIn, Indeed, Bayt, GulfTalent, employer sites) |
| `SERPAPI_KEY` | optional | SerpApi Google Jobs |
| `DISCOVERY_MAX_QUERIES` | optional | provider queries per run (default 12) |
| `RESEND_API_KEY`, `ALERT_EMAIL_FROM`, `ALERT_EMAIL_TO` | optional | email alerts |
| `APP_URL` | recommended | links in emails and crawler User-Agent |

Other hosts: any Node 20+ host works (`npm run build && npm start`); call `/api/cron/discover` and `/api/cron/reminders` with `Authorization: Bearer $CRON_SECRET` from any scheduler (GitHub Actions, cron-job.org…).

---

## 7. Maintaining the research

* Add or correct a firm in `src/data/firms.ts` — every claim needs a `status` and `sources` index; the test suite rejects broken source references and duplicate slugs.
* Add employer ATS boards in `src/data/atsBoards.ts` (verify with `npm run probe:ats`).
* Add market findings in `src/data/market.ts` with their sources.

## 8. Information I still need from you

Fill these in **Application Studio → Profile** (or upload your CV): university, degree, graduation year, Saudi nationality (many trainee roles require it), MoJ trainee-registration / licence status, co-op dates and office, language levels. Until then, eligibility scoring is deliberately conservative and generated documents contain `[placeholders]`.
