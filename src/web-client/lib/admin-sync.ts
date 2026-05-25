import { getAccessToken } from "./auth";

export interface SyncHistoryItem {
  id: string;
  filename: string;
  status: "PROCESSING" | "SUCCESS" | "FAILED";
  totalRecordsProcessed: number;
  errorMessage: string | null;
  createdAt: string;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL;

export async function fetchSyncHistory(): Promise<SyncHistoryItem[]> {
  const token = getAccessToken();
  const res = await fetch(`${API_BASE_URL}/csv-sync/history`, {
    headers: { Authorization: token ? `Bearer ${token}` : "" },
    credentials: "include",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.message || "Failed to fetch sync history");
  }

  return res.json();
}
