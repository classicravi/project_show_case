export const SERVICE_CATEGORIES = [
  "Plumbing",
  "Electrical",
  "Carpentry",
  "Home Cleaning",
  "Appliance Repair",
  "Painting",
  "Pest Control",
  "Salon & Spa",
  "AC Service",
  "Moving & Packing",
] as const;

export const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
};

export const PAGE_SIZE = 6;
