/**
 * Client-side helpers for Gmail OAuth endpoints.
 * These use Clerk's session token for authentication.
 */

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

async function getClerkToken(): Promise<string | null> {
  try {
    // window.Clerk is available after ClerkProvider mounts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await (window as any).Clerk?.session?.getToken() ?? null;
  } catch {
    return null;
  }
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await getClerkToken();
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
  });
  if (response.status === 204) return null as T;
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error ?? response.statusText);
  }
  return data as T;
}

export interface GmailStatus {
  connected: boolean;
  email: string | null;
}

export async function getGmailStatus(): Promise<GmailStatus> {
  return apiFetch<GmailStatus>("/api/gmail/status");
}

export async function getGmailAuthUrl(): Promise<{ authUrl: string }> {
  return apiFetch<{ authUrl: string }>("/api/gmail/auth");
}

export async function disconnectGmail(): Promise<void> {
  await apiFetch<void>("/api/gmail/disconnect", { method: "DELETE" });
}

export async function createEmailDraft(emailId: number): Promise<{ draftId: string }> {
  return apiFetch<{ draftId: string }>(`/api/emails/${emailId}/draft`, { method: "POST" });
}
