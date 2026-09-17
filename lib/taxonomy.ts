// Fixed category lists, taken directly from the Bankable Bookings
// Bootcamp transcript. This is the one file to edit if categories
// need to change later.

export const WEDDING_TIERS = [
  { value: "budget", label: "Budget (under $40k)" },
  { value: "mid_tier", label: "Mid-tier (~$50k–$80k)" },
  { value: "luxury", label: "Luxury ($100k+)" },
  { value: "ultra_luxury", label: "Ultra Luxury ($250k+)" },
] as const;

export const CORPORATE_CATEGORIES = [
  { value: "networking_event", label: "Networking event" },
  { value: "holiday_party", label: "Holiday party" },
  { value: "employee_event", label: "Employee event" },
  { value: "sporting_event", label: "Sporting event" },
  { value: "trade_show", label: "Trade show" },
  { value: "conference", label: "Conference" },
  { value: "gala", label: "Gala" },
  { value: "charity_event", label: "Charity event" },
  { value: "school_event", label: "School event" },
  { value: "other", label: "Other" },
] as const;

export const WEDDING_DECISION_MAKERS = [
  "Bride",
  "Groom",
  "Wedding planner",
  "Parent of the couple",
  "Other",
] as const;

export const CORPORATE_DECISION_MAKERS = [
  "HR",
  "Marketing team",
  "Internal event planner",
  "External event planner",
  "Other",
] as const;

export const LEAD_SOURCES = [
  "Referral",
  "Instagram",
  "Pinterest",
  "Google search",
  "Wedding/event planner",
  "Venue",
  "Bridal show",
  "LinkedIn",
  "Sponsored event",
  "Other",
] as const;
