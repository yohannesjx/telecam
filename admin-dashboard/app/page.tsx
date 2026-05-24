import { redirect } from "next/navigation";

import { publicRoutes } from "@/lib/routes";

export default function HomePage() {
  redirect(publicRoutes.dashboard);
}
