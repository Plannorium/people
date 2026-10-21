import { z } from "zod";
import { isValidPhoneNumber } from "libphonenumber-js";

export const personalSchema = z
  .object({
    legalFirstName: z
      .string()
      .min(1, "Legal first name is required")
      .max(80, "Must be 80 characters or fewer")
      .trim(),
    legalLastName: z
      .string()
      .min(1, "Legal last name is required")
      .max(80, "Must be 80 characters or fewer")
      .trim(),
    preferredName: z
      .string()
      .max(80, "Must be 80 characters or fewer")
      .trim()
      .optional()
      .or(z.literal("")),
    pronouns: z
      .string()
      .max(50, "Must be 50 characters or fewer")
      .trim()
      .optional()
      .or(z.literal("")),
    workEmail: z
      .string()
      .email("Invalid work email")
      .toLowerCase()
      .trim(),
    personalEmail: z
      .string()
      .email("Valid personal email is required")
      .toLowerCase()
      .trim(),
    mobileE164: z
      .string()
      .min(1, "Mobile phone is required")
      .refine((val) => {
        try {
          return isValidPhoneNumber(val);
        } catch {
          return false;
        }
      }, "Valid mobile phone number with country code is required"),
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
    nationalities: z.array(z.string()).optional().default([]),
    preferredLanguage: z.string().optional().or(z.literal("")),
  })
  .refine(
    (data) => data.personalEmail.toLowerCase() !== data.workEmail.toLowerCase(),
    {
      message: "Personal email must differ from work email",
      path: ["personalEmail"],
    }
  );

export type PersonalFormData = z.infer<typeof personalSchema>;
