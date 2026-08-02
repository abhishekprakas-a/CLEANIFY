import { Schema } from "mongoose";

/**
 * One line item within a job/booking. Generic across service types: `tankType`
 * holds the item variant (tank type / surface / vehicle type …) and
 * `capacityLitres` holds the numeric measure (litres / sq ft / panels …).
 */
export interface TankEntryDocument {
  name?: string;
  tankType: string;
  capacityLitres?: number;
  quantity?: number;
  cleaningCharge?: number;
  /** Work risk rating, 1 (low) – 10 (high). */
  risk?: number;
}

export const tankEntrySchema = new Schema<TankEntryDocument>(
  {
    name: { type: String, trim: true },
    tankType: { type: String, required: true },
    capacityLitres: { type: Number, min: 1 },
    quantity: { type: Number, min: 1, default: 1 },
    cleaningCharge: { type: Number, min: 0 },
    risk: { type: Number, min: 1, max: 10 },
  },
  { _id: false },
);

/** Sum of (cleaningCharge × quantity) across tanks. */
export function totalChargeOf(tanks: TankEntryDocument[]): number {
  return tanks.reduce(
    (sum, t) => sum + (t.cleaningCharge ?? 0) * (t.quantity ?? 1),
    0,
  );
}
