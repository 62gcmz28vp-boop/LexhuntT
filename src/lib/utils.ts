import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmtDate(d: Date | string | null | undefined, withTime = false) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-GB", withTime ? { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Riyadh" } : { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Riyadh" });
}

export function daysUntil(d: Date | string | null | undefined) {
  if (!d) return null;
  const ms = new Date(d).getTime() - Date.now();
  return Math.ceil(ms / 86_400_000);
}

export function expLabel(min: number | null, max: number | null) {
  if (min == null && max == null) return "Not stated";
  if (min != null && max != null) return min === max ? `${min} yrs` : `${min}–${max} yrs`;
  if (min != null) return `${min}+ yrs`;
  return `≤${max} yrs`;
}

export const CATEGORY_LABEL: Record<string, string> = {
  law_firm_international: "International law firm",
  law_firm_saudi: "Saudi law firm",
  in_house: "In-house",
  government: "Government / regulator",
  consulting: "Consulting",
  financial: "Financial institution",
  other: "Other",
};

export const KIND_LABEL: Record<string, string> = {
  trainee: "Trainee",
  graduate_programme: "Graduate programme",
  co_op: "Co-op / internship",
  junior: "Junior",
  paralegal: "Paralegal / assistant",
  compliance: "Compliance & governance",
  contracts: "Contracts",
  research: "Research / analyst",
  other: "Other",
};

export const LICENSE_LABEL: Record<string, string> = {
  licensed_required: "Licence required",
  trainee_registration: "MoJ trainee registration",
  not_required: "No licence needed",
  unknown: "Licence: not stated",
};
