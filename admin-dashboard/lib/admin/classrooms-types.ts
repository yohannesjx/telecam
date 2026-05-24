export type EntityStatus = "ACTIVE" | "DISABLED" | "UNKNOWN";

export type NormalizedClassroom = {
  id: string;
  schoolId?: string | null;
  name: string;
  status: EntityStatus;
  notes?: string | null;
  ageGroup?: string | null;
  childrenCount?: number | null;
  camerasCount?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type CreateClassroomInput = {
  name: string;
  status?: "ACTIVE" | "DISABLED";
  notes?: string;
};

export type UpdateClassroomInput = {
  name?: string;
  status?: "ACTIVE" | "DISABLED";
  notes?: string;
};
