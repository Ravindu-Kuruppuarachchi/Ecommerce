import { redirect } from "next/navigation";

/** The bare platform address opens the company site. Tenant routes stay on this app. */
export default function Root() {
  redirect(process.env.NEXT_PUBLIC_DASHBOARD_URL || "http://localhost:3002");
}
