export type Role = "student" | "staff" | "admin";

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  studentId: string;
}

interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL;

const ACCESS_TOKEN_KEY = "accessToken";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

function setAccessToken(token: string) {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
}

function clearAccessToken() {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
}

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

export async function login(email: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });

  const result = await handleJsonResponse<AuthResponse>(response);
  setAccessToken(result.accessToken);
  return result;
}

export async function register(payload: {
  email: string;
  password: string;
  studentId: string;
}) {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const result = await handleJsonResponse<AuthResponse>(response);
  setAccessToken(result.accessToken);
  return result;
}

export async function logout() {
  const response = await fetch(`${API_BASE_URL}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });

  const result = await handleJsonResponse<{ message: string }>(response);
  clearAccessToken();
  return result;
}

export async function fetchProfile() {
  const token = getAccessToken();

  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: "GET",
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
    },
    credentials: "include",
  });

  return handleJsonResponse<AuthUser>(response);
}
