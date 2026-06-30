import mongoose, { Schema, type Model } from "mongoose";
import { userStatus } from "@/constants";

export interface CustomerDocument {
  _id: mongoose.Types.ObjectId;
  customerName: string;
  mobileNumber: string;
  address: string;
  googleMapLocation?: string;
  notes?: string;
  status: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const customerSchema = new Schema<CustomerDocument>(
  {
    customerName: { type: String, required: true, trim: true },
    mobileNumber: { type: String, required: true, trim: true, index: true },
    address: { type: String, required: true, trim: true },
    googleMapLocation: { type: String, trim: true },
    notes: { type: String, trim: true },
    status: {
      type: String,
      enum: Object.values(userStatus),
      default: userStatus.active,
      index: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

// Text search across name, mobile and address.
customerSchema.index({
  customerName: "text",
  mobileNumber: "text",
  address: "text",
});

export const customerModel: Model<CustomerDocument> =
  (mongoose.models.Customer as Model<CustomerDocument>) ||
  mongoose.model<CustomerDocument>("Customer", customerSchema);
