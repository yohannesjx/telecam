export type EntityStatus = "ACTIVE" | "DISABLED" | "UNKNOWN";

export type NormalizedChild = {
  id: string;
  childId?: string | null;
  schoolId?: string | null;
  classroomId?: string | null;
  classroomName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  name: string;
  status: EntityStatus;
  dateOfBirth?: string | null;
  linkedParentsCount?: number | null;
  notes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type CreateChildInput = {
  full_name: string;
  classroom_id: string;
  status?: "ACTIVE" | "DISABLED";
};

export type UpdateChildInput = {
  full_name?: string;
  classroom_id?: string;
  status?: "ACTIVE" | "DISABLED";
};
