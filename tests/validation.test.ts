import { describe, it, expect } from "vitest";
import { personalSchema } from "../lib/validation/personal";
import { locationSchema } from "../lib/validation/location";
import { contactsSchema, isNextOfKin, relationshipLabel } from "../lib/validation/contacts";
import { identificationSchema } from "../lib/validation/identification";
import { healthSchema } from "../lib/validation/health";

describe("Validation - Section 5 Compliance", () => {
  describe("Personal Schema", () => {
    it("validates correct personal details with valid phone", () => {
      const valid = {
        legalFirstName: "Amina",
        legalLastName: "Al-Mansoor",
        preferredName: "Amina",
        pronouns: "she/her",
        workEmail: "amina@plannorium.com",
        personalEmail: "amina.personal@example.com",
        mobileE164: "+447911123456",
        altPhoneE164: "",
        nationalities: ["GB", "SA"],
        preferredLanguage: "Arabic",
      };

      const result = personalSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects when personal email equals work email", () => {
      const invalid = {
        legalFirstName: "Amina",
        legalLastName: "Al-Mansoor",
        workEmail: "amina@plannorium.com",
        personalEmail: "amina@plannorium.com",
        mobileE164: "+447911123456",
      };

      const result = personalSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        const emailIssue = result.error.issues.find((i) => i.path.includes("personalEmail"));
        expect(emailIssue?.message).toContain("must differ");
      }
    });

    it("rejects invalid mobile phone number", () => {
      const invalid = {
        legalFirstName: "Amina",
        legalLastName: "Al-Mansoor",
        workEmail: "amina@plannorium.com",
        personalEmail: "amina.personal@example.com",
        mobileE164: "12345", // invalid
      };

      const result = personalSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("Location Schema", () => {
    it("requires postal code for postal-code-required countries (e.g. GB)", () => {
      const invalid = {
        countryCode: "GB",
        region: "Greater London",
        city: "London",
        addressLine1: "71-75 Shelton Street",
        postalCode: "",
        timeZone: "Europe/London",
        workArrangement: "Office" as const,
        officeLocation: "London",
      };

      const result = locationSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        const paths = result.error.issues.map((i) => i.path[0]);
        expect(paths).toContain("postalCode");
      }
    });

    it("allows optional postal code for postal-code-optional countries (e.g. NG)", () => {
      const valid = {
        countryCode: "NG",
        region: "FCT",
        city: "Abuja",
        addressLine1: "Central Business District",
        postalCode: "",
        timeZone: "Africa/Lagos",
        workArrangement: "Remote" as const,
      };

      const result = locationSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("requires office location when arrangement is Office or Hybrid", () => {
      const invalid = {
        countryCode: "GB",
        region: "Greater London",
        city: "London",
        addressLine1: "71-75 Shelton Street",
        postalCode: "WC2H 9JQ",
        timeZone: "Europe/London",
        workArrangement: "Hybrid" as const,
        officeLocation: "",
      };

      const result = locationSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        const paths = result.error.issues.map((i) => i.path[0]);
        expect(paths).toContain("officeLocation");
      }
    });
  });

  describe("Emergency Contacts Schema", () => {
    it("requires at least one emergency contact and confirmation", () => {
      const invalid = {
        emergencyContacts: [],
        emergencyContactsConfirmed: true,
      };

      const result = contactsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("rejects if confirmation checkbox is not checked", () => {
      const invalid = {
        emergencyContacts: [
          {
            fullName: "Zaid Al-Mansoor",
            relationship: "Parent",
            phoneE164: "+447911123456",
            countryCode: "GB",
            city: "London",
            priority: 1,
          },
        ],
        emergencyContactsConfirmed: false,
      };

      const result = contactsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("accepts valid emergency contacts with confirmation", () => {
      const valid = {
        emergencyContacts: [
          {
            fullName: "Zaid Al-Mansoor",
            relationship: "Spouse / Partner",
            isNextOfKin: true,
            phoneE164: "+447911123456",
            email: "zaid@example.com",
            countryCode: "GB",
            city: "London",
            priority: 1,
          },
        ],
        emergencyContactsConfirmed: true,
      };

      const result = contactsSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("allows only one next of kin", () => {
      const contact = {
        fullName: "Zaid Al-Mansoor",
        relationship: "Sibling",
        phoneE164: "+447911123456",
        countryCode: "GB",
        city: "London",
        isNextOfKin: true,
      };
      const twoKin = contactsSchema.safeParse({
        emergencyContacts: [contact, { ...contact, fullName: "Huda Al-Mansoor", priority: 2 }],
        emergencyContactsConfirmed: true,
      });
      expect(twoKin.success).toBe(false);
      expect(twoKin.error?.issues[0].path).toEqual(["emergencyContacts", 1, "isNextOfKin"]);

      const oneKin = contactsSchema.safeParse({
        emergencyContacts: [contact, { ...contact, fullName: "Huda Al-Mansoor", priority: 2, isNextOfKin: false }],
        emergencyContactsConfirmed: true,
      });
      expect(oneKin.success).toBe(true);
    });

    it("still recognises next of kin saved as a relationship by older versions", () => {
      expect(isNextOfKin({ relationship: "Next of Kin" })).toBe(true);
      expect(relationshipLabel({ relationship: "Next of Kin" })).toBe("");
      expect(isNextOfKin({ relationship: "Parent", isNextOfKin: false })).toBe(false);
      expect(relationshipLabel({ relationship: "Parent" })).toBe("Parent");
    });

    it("rejects invalid emergency contact email", () => {
      const invalid = {
        emergencyContacts: [
          {
            fullName: "Zaid Al-Mansoor",
            relationship: "Spouse / Partner",
            isNextOfKin: true,
            phoneE164: "+447911123456",
            email: "not-an-email",
            countryCode: "GB",
            city: "London",
            priority: 1,
          },
        ],
        emergencyContactsConfirmed: true,
      };

      const result = contactsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("Identification Schema", () => {
    it("rejects expired document dates", () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      const invalid = {
        documentType: "Passport",
        documentNumber: "A12345678",
        issuingCountry: "GB",
        expiryDate: pastDate.toISOString().split("T")[0],
        frontFileKey: "documents/uuid-front.pdf",
      };

      const result = identificationSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("requires right to work when residence is GB", () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 2);

      const invalid = {
        documentType: "Passport",
        documentNumber: "A12345678",
        issuingCountry: "GB",
        expiryDate: futureDate.toISOString().split("T")[0],
        frontFileKey: "documents/uuid-front.pdf",
        residenceCountryCode: "GB",
        ukRightToWork: "",
      };

      const result = identificationSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("requires visa expiry when right to work is Visa in GB", () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 2);

      const invalid = {
        documentType: "Passport",
        documentNumber: "A12345678",
        issuingCountry: "SA",
        expiryDate: futureDate.toISOString().split("T")[0],
        frontFileKey: "documents/uuid-front.pdf",
        residenceCountryCode: "GB",
        ukRightToWork: "Visa",
        visaExpiry: "",
      };

      const result = identificationSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("Health & Accessibility Schema", () => {
    it("accepts completely empty health details without requiring consent", () => {
      const valid = {
        bloodType: "",
        allergies: "",
        medicalInfo: "",
        accessibilityNeeds: "",
        healthConsent: false,
      };

      const result = healthSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("requires explicit consent checkbox if any health data is provided", () => {
      const invalid = {
        bloodType: "O+",
        allergies: "Penicillin",
        medicalInfo: "",
        accessibilityNeeds: "",
        healthConsent: false,
      };

      const result = healthSchema.safeParse(invalid);
      expect(result.success).toBe(false);

      const valid = {
        ...invalid,
        healthConsent: true,
      };
      expect(healthSchema.safeParse(valid).success).toBe(true);
    });
  });
});
