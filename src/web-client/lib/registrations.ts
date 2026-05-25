import { getAccessToken } from "./auth";

export type RegistrationStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "checked_in";

export interface RegisterFreeResponse {
  id: string;
  workshopId: string;
  userId: string;
  status: RegistrationStatus;
  qrCode: string;
  registeredAt: string;
  workshop: {
    title: string;
    startTime: string;
  };
}

export interface RegisterPaidResponse {
  id: string;
  status: RegistrationStatus;
  paymentId: string;
  expiresAt: string;
  message: string;
}

export type RegisterTicketResponse =
  | RegisterFreeResponse
  | RegisterPaidResponse;

export interface RegistrationListItem {
  id: string;
  status: RegistrationStatus;
  registeredAt: string;
  expiresAt: string | null;
  qrCode: string;
  workshop: {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    room: string;
    speaker: string;
    price: string;
  };
  payment: {
    id: string;
    status: "pending" | "success" | "failed";
  } | null;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL;

async function handleJsonResponse<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => null)) as {
    message?: string | string[];
  } | null;

  if (!response.ok) {
    const message = Array.isArray(data?.message)
      ? data.message.join(", ")
      : data?.message || "Request failed";
    throw new Error(message);
  }

  return data as T;
}

export async function createRegistration(
  workshopId: string,
): Promise<RegisterTicketResponse> {
  const token = getAccessToken();

  const response = await fetch(`${API_BASE_URL}/registrations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    },
    credentials: "include",
    body: JSON.stringify({ workshopId }),
  });

  return handleJsonResponse<RegisterTicketResponse>(response);
}

export async function fetchMyConfirmedRegistrations(): Promise<
  RegistrationListItem[]
> {
  const token = getAccessToken();

  const response = await fetch(`${API_BASE_URL}/registrations/confirm`, {
    method: "GET",
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
    },
    credentials: "include",
  });

  return handleJsonResponse<RegistrationListItem[]>(response);
}

export async function fetchMyPendingRegistrations(): Promise<
  RegistrationListItem[]
> {
  const token = getAccessToken();

  const response = await fetch(`${API_BASE_URL}/registrations/pending`, {
    method: "GET",
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
    },
    credentials: "include",
  });

  return handleJsonResponse<RegistrationListItem[]>(response);
}

export async function fetchRegistrationDetail(
  registrationId: string,
): Promise<RegistrationListItem> {
  const token = getAccessToken();

  const response = await fetch(
    `${API_BASE_URL}/registrations/${registrationId}`,
    {
      method: "GET",
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
      },
      credentials: "include",
    },
  );

  return handleJsonResponse<RegistrationListItem>(response);
}

export async function chargeRegistration(
  registrationId: string,
  idempotencyKey: string,
) {
  const token = getAccessToken();

  const response = await fetch(`${API_BASE_URL}/mock-gateway/charge`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    },
    credentials: 'include',
    body: JSON.stringify({ registrationId, idempotencyKey }),
  });

  return handleJsonResponse<{ message: string; status: string }>(response);
}

export async function cancelRegistration(registrationId: string) {
  const token = getAccessToken();

  const response = await fetch(`${API_BASE_URL}/mock-gateway/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    },
    credentials: 'include',
    body: JSON.stringify({ registrationId }),
  });

  return handleJsonResponse<{ message: string; status: string }>(response);
}
