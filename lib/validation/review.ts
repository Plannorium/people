import { z } from "zod";

export const reviewSchema = z.object({
  accuracyConfirmed: z.boolean().refine((val) => val === true, {
    message: "You must confirm that the information provided is accurate",
  }),
  privacyAcknowledged: z.boolean().refine((val) => val === true, {
    message: "You must confirm that you have read the People Portal privacy notice",
  }),
});

export type ReviewFormData = z.infer<typeof reviewSchema>;
