import { z } from "zod";
import { isValidPhoneNumber } from "libphonenumber-js";

export const singleContactSchema = z.object({
  fullName: z
    .string()
    .min(1, "Full name is required")
    .max(120, "Full name must be 120 characters or fewer")
    .trim(),
  relationship: z
    .string()
    .min(1, "Relationship is required")
    .max(80, "Relationship must be 80 characters or fewer")
    .trim(),
  phoneE164: z
    .string()
    .min(1, "Phone number is required")
    .refine((val) => {
      try {
        return isValidPhoneNumber(val);
      } catch {
        return false;
      }
    }, "Valid phone number with country code is required"),
  altPhoneE164: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((val) => {
      if (!val) return true;
      try {
        return isValidPhoneNumber(val);
      } catch {
        return false;
      }
    }, "Valid alternative phone number is required"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Invalid email address")
    .optional()
    .or(z.literal("")),
  countryCode: z
    .string()
    .length(2, "Select country")
    .toUpperCase(),
  city: z
    .string()
    .min(1, "City is required")
    .max(80, "City must be 80 characters or fewer")
    .trim(),
  speaks: z
    .string()
    .max(80, "Must be 80 characters or fewer")
    .trim()
    .optional()
    .or(z.literal("")),
  priority: z.number().int().min(1).max(3).default(1),
  isNextOfKin: z.boolean().optional().default(false),
});

export const contactsSchema = z.object({
  emergencyContacts: z
    .array(singleContactSchema)
    .min(1, "At least one emergency contact is required")
    .max(3, "Maximum of three emergency contacts allowed"),
  emergencyContactsConfirmed: z
    .boolean()
    .refine((val) => val === true, {
      message: "You must confirm that you have informed your emergency contacts",
    }),
}).superRefine((data, ctx) => {
  // One next of kin per person, so responders know exactly who to inform first
  let seen = false;
  data.emergencyContacts.forEach((contact, index) => {
    if (!contact.isNextOfKin) return;
    if (seen) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Only one contact can be your next of kin",
        path: ["emergencyContacts", index, "isNextOfKin"],
      });
    }
    seen = true;
  });
});

/** Relationship value used before next of kin became its own flag. */
export const LEGACY_NEXT_OF_KIN = "Next of Kin";

export function isNextOfKin(contact: { isNextOfKin?: boolean; relationship?: string }): boolean {
  return Boolean(contact.isNextOfKin) || contact.relationship === LEGACY_NEXT_OF_KIN;
}

/** Relationship to display: hidden for old records where it only said "Next of Kin". */
export function relationshipLabel(contact: { relationship?: string }): string {
  return contact.relationship === LEGACY_NEXT_OF_KIN ? "" : contact.relationship || "";
}

export type ContactItem = z.infer<typeof singleContactSchema>;
export type ContactsFormData = z.infer<typeof contactsSchema>;
