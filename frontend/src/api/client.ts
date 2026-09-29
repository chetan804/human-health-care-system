export interface ApiErrorData {
  code: string;
  message: string;
  details: Record<string, unknown>;
}
export class ApiError extends Error {
  constructor(
    public status: number,
    public error: ApiErrorData,
    public requestId: string,
  ) {
    super(error.message);
  }
}
let token: string | null = null;
let facility: string | null = null;
let refreshPromise: Promise<void> | null = null;
let expired: (() => void) | null = null;
export function setToken(value: string | null) {
  token = value;
}
export function setFacility(value: string | null) {
  facility = value;
}
export function onExpired(callback: () => void) {
  expired = callback;
}

async function send<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (facility) headers.set("X-Facility-ID", facility);
  const result = await fetch(`/api/v1${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
  if (
    result.status === 401 &&
    retry &&
    ![
      "/auth/login",
      "/auth/register",
      "/auth/refresh",
      "/auth/forgot-password",
      "/auth/reset-password",
      "/auth/verification/request",
      "/auth/verification/complete",
    ].includes(path)
  ) {
    try {
      await refresh();
      return await send<T>(path, init, false);
    } catch (error) {
      token = null;
      expired?.();
      throw error;
    }
  }
  const envelope = await result.json();
  if (!result.ok)
    throw new ApiError(
      result.status,
      envelope.error ?? {
        code: "REQUEST_FAILED",
        message: "Request could not be completed",
        details: {},
      },
      envelope.meta?.request_id ?? "",
    );
  return envelope.data as T;
}
export async function refresh() {
  if (!refreshPromise)
    refreshPromise = send<{ access_token: string }>(
      "/auth/refresh",
      { method: "POST" },
      false,
    )
      .then((data) => {
        token = data.access_token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  return refreshPromise;
}
export const api = {
  get: <T>(path: string) => send<T>(path),
  post: <T>(path: string, body?: unknown, key?: string) =>
    send<T>(path, {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
      headers: key ? { "Idempotency-Key": key } : {},
    }),
  put: <T>(path: string, body: unknown, key?: string) =>
    send<T>(path, {
      method: "PUT",
      body: JSON.stringify(body),
      headers: key ? { "Idempotency-Key": key } : {},
    }),
  patch: <T>(path: string, body: unknown) =>
    send<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => send<T>(path, { method: "DELETE" }),
};
export interface Facility {
  id: string;
  name: string;
  timezone: string;
  roles: string[];
}
export interface User {
  id: string;
  display_name: string;
  email: string;
  session_id: string;
  facilities: Facility[];
}
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}
export interface Patient {
  id: string;
  full_name: string;
  date_of_birth: string;
  gender: string;
  contact_number: string;
  email: string;
  address: string;
  version: number;
  insurance_status: string;
  created_at: string;
}
export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  starts_at: string;
  ends_at: string;
  appointment_type: string;
  status: string;
  version: number;
}
export interface Doctor {
  id: string;
  name: string;
  specialty: string;
}
export interface Invoice {
  id: string;
  patient_id: string;
  source_reference: string;
  total: string;
  currency: string;
  status: string;
  items: { service_reference: string; unit_price: string; quantity: number }[];
  notice: string;
}
export interface Integration {
  name: string;
  status: string;
}
export interface Notice {
  id: string;
  kind: string;
  resource_id: string;
  created_at: string;
  read_at: string | null;
}
export interface Session {
  id: string;
  device: string;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
}
export interface Audit {
  id: string;
  created_at: string;
  actor_id: string | null;
  roles: string[];
  action: string;
  resource_type: string;
  resource_id: string | null;
  request_id: string;
  result: string;
  reason: string;
}
