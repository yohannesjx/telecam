"use client";

import { SELECT_CLASS } from "@/components/cameras/CamerasFilters";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { NormalizedClassroom } from "@/lib/admin/classrooms-types";

type ChildrenFiltersProps = {
  classrooms: NormalizedClassroom[];
  search: string;
  status: string;
  classroomId: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onClassroomIdChange: (value: string) => void;
};

export function ChildrenFilters({
  classrooms,
  search,
  status,
  classroomId,
  onSearchChange,
  onStatusChange,
  onClassroomIdChange,
}: ChildrenFiltersProps) {
  return (
    <div className="surface-filter grid gap-4 md:grid-cols-3">
      <div className="space-y-2">
        <Label htmlFor="children-search">Search</Label>
        <Input
          id="children-search"
          placeholder="Child name..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="children-classroom">Classroom</Label>
        <select
          id="children-classroom"
          className={SELECT_CLASS}
          value={classroomId}
          onChange={(e) => onClassroomIdChange(e.target.value)}
        >
          <option value="">All classrooms</option>
          {classrooms.map((room) => (
            <option key={room.id} value={room.id}>
              {room.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="children-status">Status</Label>
        <select
          id="children-status"
          className={SELECT_CLASS}
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
        >
          <option value="all">All</option>
          <option value="ACTIVE">Active</option>
          <option value="DISABLED">Disabled</option>
        </select>
      </div>
    </div>
  );
}
