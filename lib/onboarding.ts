import type { IEmployee } from "./models/Employee";

export const REQUIRED_STEPS = ["personal", "location", "contacts", "identification"] as const;
export type RequiredStep = (typeof REQUIRED_STEPS)[number];

export const STEP_LABELS: Record<RequiredStep, string> = {
  personal: "Personal details",
  location: "Home address",
  contacts: "Emergency contacts",
  identification: "Identification",
};

type EmployeeLike = Pick<IEmployee, "personal" | "location" | "emergencyContacts" | "emergencyContactsConfirmed" | "identification">;

/**
 * Which required sections have everything the final submission needs.
 * Health and employment are optional / HR-managed, so they never block submission.
 */
export function getStepCompletion(employee: Partial<EmployeeLike> | null | undefined): Record<RequiredStep, boolean> {
  const p = employee?.personal;
  const loc = employee?.location;
  const id = employee?.identification;
  return {
    personal: Boolean(p?.legalFirstName && p?.legalLastName && p?.personalEmail && p?.mobileE164),
    location: Boolean(loc?.countryCode && loc?.region && loc?.city && loc?.addressLine1),
    contacts: Boolean(employee?.emergencyContacts?.length && employee?.emergencyContactsConfirmed),
    identification: Boolean(id?.documentNumberEnc && id?.frontFileKey),
  };
}

export function missingSteps(completion: Record<RequiredStep, boolean>): RequiredStep[] {
  return REQUIRED_STEPS.filter((step) => !completion[step]);
}
