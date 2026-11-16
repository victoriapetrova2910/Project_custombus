export type StopShort = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
};

export type ServiceStop = StopShort & {
  stop_code: string | null;
  zone: string | null;
  subzone: string | null;
  service_active: boolean;
  is_drt_hub: boolean;
};

type StopScope = "scheduled" | "map";

export type StopFilters = {
  q?: string;
  zone?: string;
  subzone?: string;
  service_active?: boolean;
  catalog_query?: boolean;
  scope?: StopScope;
  lat?: number;
  lon?: number;
  limit?: number;
  offset?: number;
};

export type StopPage = {
  total: number;
  limit: number;
  offset: number;
  items: ServiceStop[];
};

const baseUrl = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

async function request<T>(path: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(baseUrl + "/api/v1/stops" + path, { signal });
  if (!response.ok) {
    throw new Error(response.status === 404
      ? "Остановка не найдена."
      : `Не удалось загрузить остановки (HTTP ${response.status}).`);
  }
  return response.json() as Promise<T>;
}

export function getStops(filters: StopFilters, signal: AbortSignal): Promise<StopPage> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  return request<StopPage>("?" + query, signal);
}

export function getStop(id: number, signal: AbortSignal): Promise<ServiceStop> {
  return request<ServiceStop>("/" + id, signal);
}

export async function listServiceStops(
  signal: AbortSignal,
  scope?: StopScope,
): Promise<ServiceStop[]> {
  const stops: ServiceStop[] = [];
  const limit = 500;

  for (let offset = 0; ; offset += limit) {
    const page = await getStops({ service_active: true, scope, limit, offset }, signal);
    stops.push(...page.items);
    if (stops.length >= page.total || page.items.length === 0) return stops;
  }
}
