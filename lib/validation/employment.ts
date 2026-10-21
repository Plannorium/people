import { z } from "zod";

const optionalText = (max: number) =>
  z.string().max(max, `Must be ${max} characters or fewer`).trim().optional();

// HR-managed fields. An empty string clears the field; an omitted field is left unchanged.
export const employmentUpdateSchema = z.object({
  jobTitle: optionalText(120),
  department: optionalText(120),
  lineManager: optionalText(120),
  employmentType: optionalText(60),
  employeeId: optionalText(40),
  startDate: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(new Date(val).getTime()), "Enter a valid start date"),
  role: z.enum(["employee", "hr_admin", "owner"]).optional(),
  status: z
    .enum(["incomplete", "complete", "needs_review"], {
      errorMap: () => ({ message: "Invalid status. Use Offboard to remove access." }),
    })
    .optional(),
});

export type EmploymentUpdate = z.infer<typeof employmentUpdateSchema>;
