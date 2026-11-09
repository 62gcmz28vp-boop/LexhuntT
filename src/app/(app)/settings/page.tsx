import { integrationStatus, env } from "@/lib/env";
import { getDb } from "@/lib/db";
import { Card, CardHeader, PageHeader, Badge } from "@/components/ui";

const GUIDE: Record<string, string[]> = {
  db: ["Create a free Supabase project (or any Postgres 14+).", "Copy the pooled connection string (port 6543) into DATABASE_URL.", "Tables are created automatically on first request."],
  ai: ["Create an API key in the Anthropic Console.", "Set ANTHROPIC_API_KEY. Optional: ANTHROPIC_MODEL (default claude-opus-5-5)."],
  cron: ["Set CRON_SECRET to a long random string.", "Deploy to Vercel — vercel.json schedules /api/cron/discover daily at 07:00 Riyadh and /api/cron/reminders at 08:00.", "Other hosts: call those URLs with header Authorization: Bearer $CRON_SECRET."],
  jsearch: ["Subscribe to JSearch on RapidAPI (free tier available).", "Set RAPIDAPI_KEY. Tune DISCOVERY_MAX_QUERIES to stay within quota."],
  serpapi: ["Create a SerpApi account and set SERPAPI_KEY (optional second aggregator)."],
  email: ["Create a Resend account, verify a sending domain.", "Set RESEND_API_KEY, ALERT_EMAIL_FROM (e.g. LEXHUNT <alerts@yourdomain>) and ALERT_EMAIL_TO.", "Send a test email from Alerts — alerts are only shown as active after a successful test."],
};

export default async function Settings() {
  const db = await getDb();
  return (
    <>
      <PageHeader eyebrow="Settings" title="Integrations & deployment" subtitle="Secrets are read only from server-side environment variables — never stored in the database or sent to the browser." />
      <div className="grid gap-4 lg:grid-cols-2">
        {integrationStatus().map((i) => (
          <Card key={i.key}>
            <CardHeader title={i.label} action={<Badge tone={i.configured ? "ok" : "warn"}>{i.configured ? "Configured" : "Needs credentials"}</Badge>} />
            <div className="space-y-2 p-5 text-sm">
              <p className="text-ink-2">{i.detail}</p>
              <ol className="list-decimal space-y-1 ps-5 text-xs text-muted">{GUIDE[i.key]?.map((g) => <li key={g}>{g}</li>)}</ol>
            </div>
          </Card>
        ))}
      </div>
      <Card className="mt-6 p-5 text-sm text-ink-2">
        <p>
          Database engine in use: <strong>{db.kind === "pglite" ? "Embedded PGlite" : "PostgreSQL"}</strong>
          {db.kind === "pglite" && env.isVercel && <span className="ms-2 text-bad">— not persistent on Vercel. Set DATABASE_URL.</span>}
        </p>
        <p className="mt-2">Public URL: {env.appUrl}</p>
        <p className="mt-2 text-xs text-muted">Full deployment instructions are in README.md in the repository.</p>
      </Card>
    </>
  );
}
