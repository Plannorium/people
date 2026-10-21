import { z } from "zod";

export const identificationSchema = z
  .object({
    documentType: z
      .string()
      .min(1, "Document type is required")
      .max(80, "Must be 80 characters or fewer")
      .trim(),
    documentNumber: z
      .string()
      .min(3, "Document number must be at least 3 characters")
      .max(40, "Document number must be 40 characters or fewer")
      .trim(),
    issuingCountry: z
      .string()
      .length(2, "Select issuing country")
      .toUpperCase(),
    expiryDate: z
      .string()
      .min(1, "Expiry date is required")
      .refine((val) => {
        const d = new Date(val);
        if (isNaN(d.getTime())) return false;
        // Must be today or later (ignoring time)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return d >= today;
      }, "Expiry date must be today or in the future"),
    frontFileKey: z
      .string()
      .min(1, "Front document upload is required")
      .trim(),
    backFileKey: z
      .string()
      .trim()
      .optional()
      .or(z.literal("")),
    ukRightToWork: z
      .string()
      .optional()
      .or(z.literal("")),
    visaExpiry: z
      .string()
      .optional()
      .or(z.literal("")),
    residenceCountryCode: z.string().optional(), // Passed context to validate UK right to work
  })
  .superRefine((data, ctx) => {
    if (data.residenceCountryCode === "GB") {
      if (!data.ukRightToWork || data.ukRightToWork.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "UK right to work status is required for UK residents",
          path: ["ukRightToWork"],
        });
      }

      if (data.ukRightToWork === "Visa") {
        if (!data.visaExpiry || data.visaExpiry.trim() === "") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Visa expiry date is required when on a Visa",
            path: ["visaExpiry"],
          });
        }
      }
    }
  });

export type IdentificationFormData = z.infer<typeof identificationSchema>;
