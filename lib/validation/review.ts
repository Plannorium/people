import { z } from "zod";

export const reviewSchema = z.object({
  accuracyConfirmed: z.boolean().refine((val) => val === true, {
    message: "You must confirm that the information provided is accurate",
  }),
  privacyAcknowledged: z.boolean().refine((val) => val === true, {
    message: "You must confirm that you have read the People Portal privacy notice",
  }),
  verificationCode: z
    .string({ required_error: "Enter the 6-digit confirmation code" })
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit confirmation code sent to your email"),
});

export type ReviewFormData = z.infer<typeof reviewSchema>;
