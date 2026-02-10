import { auth } from "@/lib/firebase";

/**
 * Returns headers with the Firebase ID token for authenticated API calls.
 */
export async function authHeaders(
  extra?: Record<string, string>
): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const token = await user.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
    ...extra,
  };
}

/**
 * Wrapper around fetch that automatically adds Firebase auth headers.
 */
export async function authFetch(
  url: string,
  init?: RequestInit
): Promise<Response> {
  const headers = await authHeaders();
  return fetch(url, {
    ...init,
    headers: {
      ...headers,
      ...(init?.headers as Record<string, string> | undefined),
    },
  });
}

