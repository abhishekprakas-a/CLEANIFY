/**
 * The kinds of cleaning service a booking/job can be for. Each maps the generic
 * line-item fields (stored in `tanks[]`) to service-specific labels & options so
 * the booking form can switch its fields by service without a data-model change.
 * `waterTank` is the default so all existing bookings/jobs stay valid.
 */
export const serviceType = {
  waterTank: "waterTank",
  washroom: "washroom",
  interlock: "interlock",
  solarPanel: "solarPanel",
  pressureWashing: "pressureWashing",
  carWash: "carWash",
} as const;

export type ServiceType = (typeof serviceType)[keyof typeof serviceType];

export const allServiceTypes: ServiceType[] = Object.values(serviceType);

export interface ServiceConfig {
  /** Human label, e.g. "Water tank cleaning". */
  label: string;
  /** Singular line-item noun, e.g. "Tank", "Washroom", "Vehicle". */
  itemLabel: string;
  /** Label for the per-item "type" dropdown (stored in `tankType`). */
  variantLabel: string;
  /** Options for that dropdown. */
  variantOptions: string[];
  /** Label for the numeric measure (stored in `capacityLitres`); omit to hide it. */
  measureLabel?: string;
  /** Unit shown next to the measure in read views, e.g. "L", "sq ft". */
  measureUnit?: string;
  /** Label for the quantity field. */
  quantityLabel: string;
  /** Show a 1–10 work-risk rating per line item. */
  hasRisk?: boolean;
  /**
   * Count-driven: a single "Number of …" input generates one card per item
   * (each with its own capacity/risk), instead of manual add/remove rows.
   */
  countDriven?: boolean;
  /**
   * Default estimated on-site duration in minutes. Seeds the schedule form and
   * drives end-time / conflict math; editable per job. Placeholder values —
   * refine with real ops averages.
   */
  defaultDurationMins: number;
}

export const serviceConfig: Record<ServiceType, ServiceConfig> = {
  waterTank: {
    label: "Water tank cleaning",
    itemLabel: "Tank",
    variantLabel: "Tank type",
    variantOptions: ["concrete", "synthetic"],
    measureLabel: "Capacity (litres)",
    measureUnit: "L",
    quantityLabel: "Number of tanks",
    hasRisk: true,
    countDriven: true,
    defaultDurationMins: 120,
  },
  washroom: {
    label: "Washroom cleaning",
    itemLabel: "Washroom",
    variantLabel: "Washroom type",
    variantOptions: ["western", "indian", "common", "urinal", "other"],
    quantityLabel: "Count",
    defaultDurationMins: 90,
  },
  interlock: {
    label: "Interlock cleaning",
    itemLabel: "Area",
    variantLabel: "Surface",
    variantOptions: ["driveway", "parking", "walkway", "courtyard", "other"],
    measureLabel: "Area (sq ft)",
    measureUnit: "sq ft",
    quantityLabel: "Quantity",
    defaultDurationMins: 180,
  },
  solarPanel: {
    label: "Solar panel cleaning",
    itemLabel: "Panel set",
    variantLabel: "Mounting",
    variantOptions: ["rooftop", "ground", "carport", "other"],
    measureLabel: "No. of panels",
    measureUnit: "panels",
    quantityLabel: "Sets",
    defaultDurationMins: 90,
  },
  pressureWashing: {
    label: "Pressure washing",
    itemLabel: "Surface",
    variantLabel: "Surface type",
    variantOptions: ["wall", "floor", "facade", "roof", "vehicle", "other"],
    measureLabel: "Area (sq ft)",
    measureUnit: "sq ft",
    quantityLabel: "Quantity",
    defaultDurationMins: 120,
  },
  carWash: {
    label: "Car wash",
    itemLabel: "Vehicle",
    variantLabel: "Vehicle type",
    variantOptions: [
      "hatchback",
      "sedan",
      "suv",
      "van",
      "bike",
      "truck",
      "other",
    ],
    quantityLabel: "No. of vehicles",
    defaultDurationMins: 60,
  },
};

export function serviceLabel(t?: string): string {
  return (t && serviceConfig[t as ServiceType]?.label) || "Water tank cleaning";
}

/** Default estimated duration (minutes) for a service type. */
export function serviceDefaultDurationMins(t?: string): number {
  return serviceConfig[t as ServiceType]?.defaultDurationMins ?? 120;
}
