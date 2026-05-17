import axios, { AxiosError, AxiosInstance } from 'axios';

import { CheckInPayload } from './checkin';
import { getAuthToken } from './auth';

const DEFAULT_TIMEOUT_MS = 8000;

export interface BatchCheckInItem extends CheckInPayload {
  local_id: number;
}

export interface BatchCheckInResult {
  local_id: number;
  status: 'ok' | 'conflict' | 'error';
  message?: string;
}

export interface ApiOptions {
  baseUrl?: string;
  timeoutMs?: number;
  apiClient?: AxiosInstance;
}

export function createApiClient(options?: ApiOptions): AxiosInstance {
  console.log("Đang gọi API tại:", process.env.EXPO_PUBLIC_API_URL);
  if (options?.apiClient) {
    return options.apiClient;
  }

  const baseUrl = withApiPrefix(
    options?.baseUrl ?? process.env.EXPO_PUBLIC_API_URL,
  );
  const client = axios.create({
    baseURL: baseUrl,
    timeout: options?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  });

  client.interceptors.request.use(async (config) => {
    const token = await getAuthToken();
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
    }
    return config;
  });

  return client;
}

function withApiPrefix(baseUrl?: string): string | undefined {
  if (!baseUrl) {
    return baseUrl;
  }

  const normalized = baseUrl.replace(/\/+$/, '');
  if (normalized.endsWith('/api')) {
    return normalized;
  }

  return `${normalized}/api`;
}

export async function postCheckIn(
  payload: CheckInPayload,
  options?: ApiOptions
): Promise<{ status?: string; message?: string } | undefined> {
  const client = createApiClient(options);
  const response = await client.post('/check-ins', payload);
  return response.data as { status?: string; message?: string } | undefined;
}

export async function postBatchCheckIns(
  payload: BatchCheckInItem[],
  options?: ApiOptions
): Promise<BatchCheckInResult[]> {
  const client = createApiClient(options);
  const response = await client.post('/check-ins/batch', payload);
  const data = response.data as BatchCheckInResult[] | { results: BatchCheckInResult[] };
  if (Array.isArray(data)) {
    return data;
  }
  return data.results ?? [];
}

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message?: string }>;
    return (
      axiosError.response?.data?.message ||
      axiosError.message ||
      'Request failed.'
    );
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error.';
}
