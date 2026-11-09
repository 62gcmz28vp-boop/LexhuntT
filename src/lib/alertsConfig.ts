export type AlertKind = "new_trainee" | "intl_graduate" | "watchlist_opens" | "high_match" | "deadline";
export interface AlertRuleSeed {
  id: AlertKind;
  label: string;
  enabled: boolean;
  frequency: "instant" | "daily" | "weekly";
  params: Record<string, unknown>;
}
export const DEFAULT_ALERT_RULES: AlertRuleSeed[] = [
  { id: "new_trainee", label: "New trainee associate / trainee lawyer vacancy in Riyadh", enabled: true, frequency: "instant", params: {} },
  { id: "intl_graduate", label: "International law firm posts a graduate position", enabled: true, frequency: "instant", params: {} },
  { id: "watchlist_opens", label: "A firm on my watchlist opens recruitment / careers page changes", enabled: true, frequency: "daily", params: {} },
  { id: "high_match", label: "Highly relevant graduate position (match ≥ threshold)", enabled: true, frequency: "daily", params: { threshold: 75 } },
  { id: "deadline", label: "Application deadline approaching", enabled: true, frequency: "daily", params: { days: 7 } },
];
