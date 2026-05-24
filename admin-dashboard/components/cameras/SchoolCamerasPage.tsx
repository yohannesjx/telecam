"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { CamerasPage } from "@/components/cameras/CamerasPage";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SchoolCamerasPageProps = {
  schoolId: string;
};

export function SchoolCamerasPage({ schoolId }: SchoolCamerasPageProps) {
  return (
    <CamerasPage
      fixedSchoolId={schoolId}
      showSchoolFilter={false}
      title="School cameras"
      subtitle="Cameras configured for this school"
      backLink={
        <Link
          href={`/schools/${schoolId}`}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mb-2 -ml-2")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to school
        </Link>
      }
    />
  );
}
