import { LayoutDashboard, Briefcase, Target, Radar, Telescope, Sparkles, KanbanSquare, LineChart, Bell, ShieldCheck, Settings } from "lucide-react";
import type { IconName } from "./nav";

const MAP = {
  command: LayoutDashboard,
  live: Briefcase,
  matches: Target,
  radar: Radar,
  hidden: Telescope,
  studio: Sparkles,
  pipeline: KanbanSquare,
  intel: LineChart,
  alerts: Bell,
  coverage: ShieldCheck,
  settings: Settings,
} as const;

export function NavIcon({ name, className }: { name: IconName; className?: string }) {
  const I = MAP[name];
  return <I className={className} aria-hidden />;
}
