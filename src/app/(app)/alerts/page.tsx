import Link from "next/link";
import { q } from "@/lib/db";
import { env } from "@/lib/env";
import { emailConfigured, getSetting } from "@/lib/notify";
import { Card, CardHeader, PageHeader, Badge, Select, Input, Button } from "@/components/ui";
import { updateAlertRule, markAllRead } from "@/app/actions";
import { TestEmailButton } from "@/components/TestEmailButton";
import { fmtDate } from "@/lib/utils";

export default async function Alerts() {
  const rules = await q<{ id: string; label: string; enabled: boolean; frequency: string; channel_email: boolean; params: Record<string, number>; last_sent_at: Date | null }>("SELECT * FROM alert_rules ORDER BY id");
  const notes = await q<{ id: number; title: string; body: string | null; link: string | null; created_at: Date; read_at: Date | null; emailed_at: Date | null }>("SELECT * FROM notifications ORDER BY created_at DESC LIMIT 100");
  const lastCron = await q<{ finished_at: Date }>("SELECT finished_at FROM discovery_runs WHERE trigger = 'cron' AND finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 1");
  const tested = await getSetting<string>("email_tested_at");
  const scheduling = !!env.cronSecret && lastCron.length > 0;
  const email = emailConfigured() && !!tested;

  const status = (ok: boolean, label: string, detail: string) => (
    <div className="flex items-start gap-3 rounded-lg border border-line p-3">
      <Badge tone={ok ? "ok" : "warn"}>{ok ? "Active" : "Not active"}</Badge>
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted">{detail}</div>
      </div>
    </div>
  );

  return (
    <>
      <PageHeader eyebrow="Smart Alerts & Automation" title="Alerts and notification center" subtitle="Alerts are only described as active once their scheduling and delivery integrations are configured and have actually run." />
      <div className="mb-6 grid gap-3 md:grid-cols-3">
        {status(true, "In-app notification center", "Notifications are created on every discovery or reminder run.")}
        {status(scheduling, "Scheduled searches", scheduling ? `Last scheduled run ${fmtDate(lastCron[0].finished_at, true)}` : env.cronSecret ? "CRON_SECRET set — waiting for the first scheduled run (Vercel Cron, daily 07:00 Riyadh)." : "Set CRON_SECRET and deploy on Vercel (vercel.json) or another scheduler.")}
        {status(email, "Email delivery", email ? `Test email delivered ${fmtDate(tested, true)} to ${env.alertTo}` : emailConfigured() ? "Configured but not yet tested — send a test email." : "Set RESEND_API_KEY, ALERT_EMAIL_TO and ALERT_EMAIL_FROM.")}
      </div>
      {emailConfigured() && (
        <div className="mb-6">
          <TestEmailButton />
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader eyebrow="Rules" title="What to alert me about" />
          <ul className="divide-y divide-line">
            {rules.map((r) => (
              <li key={r.id} className="px-5 py-4">
                <form action={updateAlertRule.bind(null, r.id)} className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <input type="checkbox" name="enabled" defaultChecked={r.enabled} className="accent-[var(--gold)]" /> {r.label}
                    </label>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Select name="frequency" defaultValue={r.frequency} className="h-8 w-32 text-xs" aria-label="Frequency">
                      <option value="instant">Each run</option>
                      <option value="daily">Daily digest</option>
                      <option value="weekly">Weekly digest</option>
                    </Select>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" name="email" defaultChecked={r.channel_email} className="accent-[var(--gold)]" /> Email
                    </label>
                    {r.id === "high_match" && (
                      <label className="flex items-center gap-1">
                        Threshold <Input name="threshold" type="number" min={30} max={100} defaultValue={r.params.threshold ?? 75} className="h-8 w-16 text-xs" />
                      </label>
                    )}
                    {r.id === "deadline" && (
                      <label className="flex items-center gap-1">
                        Days before <Input name="days" type="number" min={1} max={30} defaultValue={r.params.days ?? 7} className="h-8 w-16 text-xs" />
                      </label>
                    )}
                    <Button size="sm" variant="outline" type="submit">
                      Save
                    </Button>
                    {r.last_sent_at && <span className="text-muted">last emailed {fmtDate(r.last_sent_at, true)}</span>}
                  </div>
                </form>
              </li>
            ))}
          </ul>
          <p className="border-t border-line px-5 py-3 text-xs text-muted">Watchlist alerts follow the firms you star in Firm Radar.</p>
        </Card>

        <Card>
          <CardHeader
            eyebrow="Notification center"
            title={`${notes.filter((n) => !n.read_at).length} unread`}
            action={
              <form action={markAllRead}>
                <Button size="sm" variant="ghost" type="submit">
                  Mark all read
                </Button>
              </form>
            }
          />
          <ul className="max-h-[640px] divide-y divide-line overflow-y-auto">
            {notes.length === 0 && <li className="px-5 py-4 text-sm text-muted">No notifications yet.</li>}
            {notes.map((n) => (
              <li key={n.id} className={`px-5 py-3 ${n.read_at ? "opacity-60" : ""}`}>
                <Link href={n.link ?? "#"} className="text-sm font-medium hover:text-gold">
                  {!n.read_at && <span className="me-2 inline-block h-2 w-2 rounded-full bg-gold" />}
                  {n.title}
                </Link>
                <div className="text-xs text-muted">
                  {n.body} · {fmtDate(n.created_at, true)}
                  {n.emailed_at ? " · emailed" : ""}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
