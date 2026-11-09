export const STAGES = [
  { key: "discovered", label: "Discovered", ar: "مكتشفة" },
  { key: "saved", label: "Saved", ar: "محفوظة" },
  { key: "preparing", label: "Preparing application", ar: "قيد التحضير" },
  { key: "applied", label: "Applied", ar: "تم التقديم" },
  { key: "assessment", label: "Assessment", ar: "تقييم" },
  { key: "interview", label: "Interview", ar: "مقابلة" },
  { key: "final_interview", label: "Final interview", ar: "مقابلة نهائية" },
  { key: "offer", label: "Offer", ar: "عرض" },
  { key: "rejected", label: "Rejected", ar: "مرفوض" },
  { key: "withdrawn", label: "Withdrawn", ar: "منسحب" },
] as const;

export type StageKey = (typeof STAGES)[number]["key"];
export const ACTIVE_STAGES = ["discovered", "saved", "preparing", "applied", "assessment", "interview", "final_interview"];
