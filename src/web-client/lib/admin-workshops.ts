import { getAccessToken } from './auth';
import type { WorkshopDetailResponse, WorkshopListItem, WorkshopListResponse } from './workshops';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL;

type AdminWorkshopResponse = WorkshopListItem & {
  registeredCount: number;
};

function buildAuthHeaders() {
  const token = getAccessToken();
  const headers = new Headers();

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return headers;
}

async function parseResponse<T>(response: Response, fallbackMessage: string) {
  const data = (await response.json().catch(() => null)) as
    | T
    | { message?: string | string[] }
    | null;

  if (!response.ok) {
    const message = Array.isArray((data as { message?: string[] })?.message)
      ? (data as { message?: string[] }).message?.join(', ')
      : (data as { message?: string })?.message || fallbackMessage;
    throw new Error(message);
  }

  return data as T;
}

export async function fetchAdminWorkshops(page = 1, limit = 12) {
  const response = await fetch(
    `${API_BASE_URL}/workshops?page=${page}&limit=${limit}`,
    {
      method: 'GET',
        headers: buildAuthHeaders(),
      credentials: 'include',
    },
  );

  return parseResponse<WorkshopListResponse>(
    response,
    'Unable to load workshops',
  );
}

export async function createWorkshop(formData: FormData) {
  const response = await fetch(`${API_BASE_URL}/workshops`, {
    method: 'POST',
    headers: buildAuthHeaders(),
    body: formData,
    credentials: 'include',
  });

  return parseResponse<AdminWorkshopResponse>(
    response,
    'Unable to create workshop',
  );
}

export async function updateWorkshop(id: string, formData: FormData) {
  const response = await fetch(`${API_BASE_URL}/workshops/${id}`, {
    method: 'PATCH',
    headers: buildAuthHeaders(),
    body: formData,
    credentials: 'include',
  });

  return parseResponse<AdminWorkshopResponse>(
    response,
    'Unable to update workshop',
  );
}

export async function deleteWorkshop(id: string) {
  const response = await fetch(`${API_BASE_URL}/workshops/${id}`, {
    method: 'DELETE',
    headers: buildAuthHeaders(),
    credentials: 'include',
  });

  return parseResponse<{ id: string; deleted: boolean }>(
    response,
    'Unable to delete workshop',
  );
}

export async function fetchAdminWorkshopDetail(id: string) {
  const response = await fetch(`${API_BASE_URL}/workshops/${id}`, {
    method: 'GET',
    headers: buildAuthHeaders(),
    credentials: 'include',
  });

  return parseResponse<WorkshopDetailResponse>(
    response,
    'Unable to load workshop',
  );
}
