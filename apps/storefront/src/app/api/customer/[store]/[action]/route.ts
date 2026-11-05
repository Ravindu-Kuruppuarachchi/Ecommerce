import { NextRequest } from "next/server";
import { customerProxy } from "@/lib/customer-server";

export const dynamic = "force-dynamic";
async function handle(req: NextRequest, { params: pendingParams }: { params: Promise<{ store: string; action: string }> }) {
  const params = await pendingParams;
  return customerProxy(req, params.store, params.action);
}
export { handle as GET, handle as POST, handle as PATCH, handle as DELETE };
