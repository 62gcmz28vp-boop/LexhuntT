import type { Firm } from "./types";

export const CLASS_LABEL: Record<Firm["classification"], string> = {
  international: "International",
  international_affiliate: "Int'l affiliate / JV",
  saudi: "Saudi",
  boutique: "Boutique",
};
export const HIRING_LABEL: Record<Firm["hiringStatus"], { label: string; tone: "ok" | "gold" | "info" | "neutral" }> = {
  confirmed_vacancy: { label: "Vacancy listed", tone: "ok" },
  programme_listed: { label: "Programme page", tone: "gold" },
  intake_closed: { label: "Intake closed", tone: "info" },
  no_public_vacancy: { label: "No public vacancy", tone: "neutral" },
  unknown: { label: "Status unknown", tone: "neutral" },
};
