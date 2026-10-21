import "next-auth";
import { UserRole, EmployeeStatus } from "@/lib/models/Employee";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: UserRole;
      status: EmployeeStatus;
      employeeRecordId?: string;
    };
  }

  interface User {
    id: string;
    role?: UserRole;
    status?: EmployeeStatus;
    employeeRecordId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sub?: string;
    role?: UserRole;
    status?: EmployeeStatus;
    employeeRecordId?: string;
  }
}
