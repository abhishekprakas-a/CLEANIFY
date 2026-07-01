import { Schema } from "mongoose";
import { allTankTypes } from "@/constants";

/** One tank within a job/booking (a property can have several). */
export interface TankEntryDocument {
  name?: string;
  tankType: string;
  capacityLitres: number;
  quantity?: number;
  cleaningCharge?: number;
}

export const tankEntrySchema = new Schema<TankEntryDocument>(
  {
    name: { type: String, trim: true },
    tankType: { type: String, enum: allTankTypes, required: true },
    capacityLitres: { type: Number, required: true, min: 1 },
    quantity: { type: Number, min: 1, default: 1 },
    cleaningCharge: { type: Number, min: 0 },
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
