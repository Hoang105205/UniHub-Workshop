import { getAccessToken } from "./auth";

export interface WorkshopListItem {
  id: string;
  title: string;
  detail: string;
  capacity: number;
  registeredCount: number;
  availableSeats: number;
  price: string;
  startTime: string;
  endTime: string;
  room: string;
  speaker: string;
}

export interface WorkshopListResponse {
  data: WorkshopListItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000/api";

export async function fetchWorkshops(page: number, limit: number) {
  const token = getAccessToken();

  console.log("Fetching workshops with token:", token);

  const response = await fetch(
    `${API_BASE_URL}/workshops?page=${page}&limit=${limit}`,
    {
      method: "GET",
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
      },
      credentials: "include",
    },
  );

  const data = (await response.json().catch(() => null)) as
    | WorkshopListResponse
    | { message?: string | string[] }
    | null;

  if (!response.ok) {
    const message = Array.isArray((data as { message?: string[] })?.message)
      ? (data as { message?: string[] }).message?.join(", ")
      : (data as { message?: string })?.message || "Unable to load workshops";
    throw new Error(message);
  }

  return data as WorkshopListResponse;
}
