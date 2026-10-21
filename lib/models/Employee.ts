import mongoose, { Schema, Document, Model } from "mongoose";

export type UserRole = "employee" | "hr_admin" | "owner";
export type EmployeeStatus = "incomplete" | "complete" | "needs_review" | "offboarded";

export interface IEmergencyContact {
  fullName: string;
  relationship: string;
  phoneE164: string;
  altPhoneE164?: string;
  email?: string;
  countryCode: string;
  city: string;
  speaks?: string;
  priority: number;
  isNextOfKin?: boolean;
}

export interface IEmployeePersonal {
  legalFirstName: string;
  legalLastName: string;
  preferredName?: string;
  pronouns?: string;
  personalEmail: string;
  mobileE164: string;
  altPhoneE164?: string;
  nationalities?: string[];
  preferredLanguage?: string;
}

export interface IEmployeeLocation {
  countryCode: string;
  region: string;
  city: string;
  addressLine1: string;
  addressLine2?: string;
  postalCode?: string;
  timeZone: string;
  workArrangement: "Remote" | "Office" | "Hybrid";
  officeLocation?: string;
}

export interface IEmployeeIdentification {
  documentType: string;
  documentNumberEnc: string;
  documentLast4: string;
  issuingCountry: string;
  expiryDate: Date;
  frontFileKey: string;
  backFileKey?: string;
  ukRightToWork?: string;
  visaExpiry?: Date;
}

export interface IEmployeeEmployment {
  jobTitle?: string;
  department?: string;
  lineManager?: string;
  startDate?: Date;
  employmentType?: string;
  employeeId?: string;
}

export interface IEmployee extends Document {
  authSubject: string;
  workEmail: string;
  role: UserRole;
  status: EmployeeStatus;
  personal?: IEmployeePersonal;
  location?: IEmployeeLocation;
  emergencyContacts?: IEmergencyContact[];
  emergencyContactsConfirmed?: boolean;
  identification?: IEmployeeIdentification;
  health?: { enc: string };
  healthConsentAt?: Date;
  employment?: IEmployeeEmployment;
  accuracyConfirmedAt?: Date;
  privacyAcknowledgedAt?: Date;
  lastReviewedAt?: Date;
  offboardedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const EmergencyContactSchema = new Schema<IEmergencyContact>(
  {
    fullName: { type: String, required: true, trim: true },
    relationship: { type: String, required: true, trim: true },
    phoneE164: { type: String, required: true, trim: true },
    altPhoneE164: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    countryCode: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    speaks: { type: String, trim: true },
    priority: { type: Number, required: true, default: 1 },
    isNextOfKin: { type: Boolean, default: false },
  },
  { _id: false }
);

const EmployeeSchema = new Schema<IEmployee>(
  {
    authSubject: { type: String, required: true, unique: true, index: true },
    workEmail: { type: String, required: true, unique: true, lowercase: true, index: true },
    role: {
      type: String,
      enum: ["employee", "hr_admin", "owner"],
      default: "employee",
      required: true,
    },
    status: {
      type: String,
      enum: ["incomplete", "complete", "needs_review", "offboarded"],
      default: "incomplete",
      index: true,
      required: true,
    },
    personal: {
      legalFirstName: { type: String, trim: true },
      legalLastName: { type: String, trim: true },
      preferredName: { type: String, trim: true },
      pronouns: { type: String, trim: true },
      personalEmail: { type: String, lowercase: true, trim: true },
      mobileE164: { type: String, trim: true },
      altPhoneE164: { type: String, trim: true },
      nationalities: [{ type: String, trim: true }],
      preferredLanguage: { type: String, trim: true },
    },
    location: {
      countryCode: { type: String, trim: true, index: true },
      region: { type: String, trim: true },
      city: { type: String, trim: true },
      addressLine1: { type: String, trim: true },
      addressLine2: { type: String, trim: true },
      postalCode: { type: String, trim: true },
      timeZone: { type: String, trim: true },
      workArrangement: { type: String, enum: ["Remote", "Office", "Hybrid"] },
      officeLocation: { type: String, trim: true },
    },
    emergencyContacts: [EmergencyContactSchema],
    emergencyContactsConfirmed: { type: Boolean, default: false },
    identification: {
      documentType: { type: String, trim: true },
      documentNumberEnc: { type: String },
      documentLast4: { type: String, trim: true },
      issuingCountry: { type: String, trim: true },
      expiryDate: { type: Date, index: true },
      frontFileKey: { type: String },
      backFileKey: { type: String },
      ukRightToWork: { type: String, trim: true },
      visaExpiry: { type: Date },
    },
    health: {
      enc: { type: String },
    },
    healthConsentAt: { type: Date },
    employment: {
      jobTitle: { type: String, trim: true },
      department: { type: String, trim: true },
      lineManager: { type: String, trim: true },
      startDate: { type: Date },
      employmentType: { type: String, trim: true },
      employeeId: { type: String, trim: true },
    },
    accuracyConfirmedAt: { type: Date },
    privacyAcknowledgedAt: { type: Date },
    lastReviewedAt: { type: Date },
    offboardedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Explicitly no date of birth anywhere
export const Employee: Model<IEmployee> =
  mongoose.models.Employee || mongoose.model<IEmployee>("Employee", EmployeeSchema);
