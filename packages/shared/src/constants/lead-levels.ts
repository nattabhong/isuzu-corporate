export const LEAD_LEVELS = ['hot', 'warm', 'future', 'maintain', 'inactive'] as const
export type LeadLevel = (typeof LEAD_LEVELS)[number]

export const LEAD_LEVEL_LABELS: Record<LeadLevel, string> = {
  hot: 'Hot — มีแผนซื้อภายใน 3 เดือน',
  warm: 'Warm — มีโอกาสภายใน 4–12 เดือน',
  future: 'Future — มีโอกาสใน 1–2 ปี',
  maintain: 'Maintain — ควรรักษาความสัมพันธ์',
  inactive: 'Inactive — ติดต่อไม่ได้',
}
