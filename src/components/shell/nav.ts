export type IconName = "command" | "live" | "matches" | "radar" | "hidden" | "studio" | "pipeline" | "intel" | "alerts" | "coverage" | "settings";
export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  badge?: number;
}
