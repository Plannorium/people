import { z } from "zod";

export const settingsSchema = z.object({
  reviewIntervalMonths: z.coerce
    .number()
    .int("Use a whole number of months")
    .min(1, "Minimum is 1 month")
    .max(24, "Maximum is 24 months"),
  retentionPeriodYears: z.coerce
    .number()
    .int("Use a whole number of years")
    .min(1, "Minimum is 1 year")
    .max(10, "Maximum is 10 years"),
  hrEmail: z.string().trim().toLowerCase().email("Enter a valid email address"),
});

export type SettingsFormData = z.infer<typeof settingsSchema>;
