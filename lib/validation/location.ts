import { z } from "zod";
import { isPostalCodeRequired } from "../countries";

export const locationSchema = z
  .object({
    countryCode: z
      .string()
      .length(2, "Select a valid country")
      .toUpperCase(),
    region: z
      .string()
      .min(1, "State / region / province is required")
      .max(80, "Must be 80 characters or fewer")
      .trim(),
    city: z
      .string()
      .min(1, "City is required")
      .max(80, "Must be 80 characters or fewer")
      .trim(),
    addressLine1: z
      .string()
      .min(1, "Address line 1 is required")
      .max(120, "Must be 120 characters or fewer")
      .trim(),
    addressLine2: z
      .string()
      .max(120, "Must be 120 characters or fewer")
      .trim()
      .optional()
      .or(z.literal("")),
    postalCode: z
      .string()
      .max(20, "Postal code must be 20 characters or fewer")
      .trim()
      .optional()
      .or(z.literal("")),
    timeZone: z.string().min(1, "Time zone is required").trim(),
    workArrangement: z.enum(["Remote", "Office", "Hybrid"], {
      required_error: "Work arrangement is required",
    }),
    officeLocation: z
      .string()
      .max(80, "Office location must be 80 characters or fewer")
      .trim()
      .optional()
      .or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    // Postal code requirement check
    if (isPostalCodeRequired(data.countryCode)) {
      if (!data.postalCode || data.postalCode.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Postal code is required for the selected country",
          path: ["postalCode"],
        });
      }
    }

    // Office location required if Office or Hybrid
    if (data.workArrangement === "Office" || data.workArrangement === "Hybrid") {
      if (!data.officeLocation || data.officeLocation.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Office location is required for Office or Hybrid arrangements",
          path: ["officeLocation"],
        });
      }
    }
  });

export type LocationFormData = z.infer<typeof locationSchema>;
