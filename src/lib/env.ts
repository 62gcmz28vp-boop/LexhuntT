/** Centralised, typed access to environment configuration. Never import secrets into client components. */
export const env = {
  databaseUrl: process.env.DATABASE_URL || "",
  anthropicKey: process.env.ANTHROPIC_API_KEY || "",
  anthropicModel: process.env.ANTHROPIC_MODEL || "claude-opus-5-5",
  cronSecret: process.env.CRON_SECRET || "",
  rapidApiKey: process.env.RAPIDAPI_KEY || "",
  serpApiKey: process.env.SERPAPI_KEY || "",
  maxQueries: Number(process.env.DISCOVERY_MAX_QUERIES || 12),
  resendKey: process.env.RESEND_API_KEY || "",
  alertTo: process.env.ALERT_EMAIL_TO || "",
  alertFrom: process.env.ALERT_EMAIL_FROM || "",
  appUrl: process.env.APP_URL || "http://localhost:3000",
  isVercel: !!process.env.VERCEL,
};

export type IntegrationStatus = { key: string; label: string; configured: boolean; detail: string };

export function integrationStatus(): IntegrationStatus[] {
  return [
    {
      key: "db",
      label: "Database",
      configured: !!env.databaseUrl,
      detail: env.databaseUrl
        ? "Postgres via DATABASE_URL"
        : env.isVercel
          ? "Embedded PGlite in /tmp — data is NOT persistent on Vercel. Set DATABASE_URL."
          : "Embedded PGlite in ./.data/pglite (local development)",
    },
    { key: "ai", label: "Claude AI", configured: !!env.anthropicKey, detail: env.anthropicKey ? `Model ${env.anthropicModel}` : "Set ANTHROPIC_API_KEY — template fallbacks are used meanwhile" },
    { key: "cron", label: "Scheduled discovery", configured: !!env.cronSecret, detail: env.cronSecret ? "CRON_SECRET set; vercel.json schedules daily runs" : "Set CRON_SECRET and deploy to Vercel to enable schedules" },
    { key: "jsearch", label: "JSearch (Google for Jobs aggregator)", configured: !!env.rapidApiKey, detail: env.rapidApiKey ? "RAPIDAPI_KEY set" : "Set RAPIDAPI_KEY for LinkedIn / Indeed / Bayt coverage via Google for Jobs" },
    { key: "serpapi", label: "SerpApi Google Jobs", configured: !!env.serpApiKey, detail: env.serpApiKey ? "SERPAPI_KEY set" : "Optional second aggregator" },
    { key: "email", label: "Email alerts (Resend)", configured: !!(env.resendKey && env.alertTo && env.alertFrom), detail: env.resendKey ? `To ${env.alertTo || "(ALERT_EMAIL_TO missing)"}` : "Set RESEND_API_KEY, ALERT_EMAIL_TO, ALERT_EMAIL_FROM" },
  ];
}
