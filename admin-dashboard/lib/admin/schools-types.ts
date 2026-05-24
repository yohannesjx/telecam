export type SchoolStatus = "ACTIVE" | "DISABLED" | "UNKNOWN";

export type NormalizedSchool = {
  id: string;
  name: string;
  status: SchoolStatus;
  timezone?: string | null;
  city?: string | null;
  address?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  classroomsCount?: number | null;
  childrenCount?: number | null;
  camerasCount?: number | null;
  parentsCount?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type NormalizedSchoolDetail = NormalizedSchool & {
  notes?: string | null;
};

export type CreateSchoolInput = {
  name: string;
  status?: "ACTIVE" | "DISABLED";
  timezone: string;
  city?: string;
  address?: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  notes?: string;
};

export type UpdateSchoolInput = Partial<CreateSchoolInput>;

export type NormalizedSchoolAdmin = {
  id?: string;
  userId?: string;
  email?: string | null;
  name?: string | null;
  role?: string | null;
  status?: string | null;
  assignedAt?: string | null;
};

export type AssignSchoolAdminInput = {
  user_id: string;
};

export type NormalizedRevenueShare = {
  id?: string;
  schoolId?: string;
  schoolSharePercent?: number | null;
  platformSharePercent?: number | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  notes?: string | null;
};

export type SetRevenueShareInput = {
  percentage: number;
  active_from: string;
};

export type NormalizedClassroomSummary = {
  id: string;
  name: string;
  status?: string;
  childrenCount?: number | null;
  camerasCount?: number | null;
};

export type NormalizedChildSummary = {
  id: string;
  fullName: string;
  classroomId?: string | null;
  classroomName?: string | null;
  status?: string;
};

export type NormalizedStorageUsageRow = {
  schoolId: string;
  schoolName?: string;
  date: string;
  totalBytes: number;
  totalGb: number;
  segmentCount: number;
  estimatedCostUsd?: number | null;
};
