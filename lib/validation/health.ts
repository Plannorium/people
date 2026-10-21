import { z } from "zod";

export const healthSchema = z
  .object({
    bloodType: z.string().optional().or(z.literal("")),
    allergies: z.string().max(500, "Must be 500 characters or fewer").trim().optional().or(z.literal("")),
    medicalInfo: z.string().max(1000, "Must be 1000 characters or fewer").trim().optional().or(z.literal("")),
    accessibilityNeeds: z.string().max(1000, "Must be 1000 characters or fewer").trim().optional().or(z.literal("")),
    healthConsent: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    const hasData =
      (data.bloodType && data.bloodType.trim() !== "" && data.bloodType !== "Don't know") ||
      (data.allergies && data.allergies.trim() !== "") ||
      (data.medicalInfo && data.medicalInfo.trim() !== "") ||
      (data.accessibilityNeeds && data.accessibilityNeeds.trim() !== "");

    if (hasData && !data.healthConsent) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Explicit consent is required if you provide health or accessibility information",
        path: ["healthConsent"],
      });
    }
  });

export type HealthFormData = z.infer<typeof healthSchema>;
