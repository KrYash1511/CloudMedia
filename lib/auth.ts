import { NextRequest } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";

/**
 * Verify the Firebase ID token from the Authorization header.
 * Returns the user's UID or null if invalid/missing.
 */
export async function verifyAuth(req: NextRequest): Promise<string | null> {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;
    const token = authHeader.split("Bearer ")[1];
    const decoded = await getAdminAuth().verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}
