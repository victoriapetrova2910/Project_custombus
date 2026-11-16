import type { StopShort } from "./stops";

/** API поиска запланированных поездок. */

// Параметры поиска предзаказа
export type TripSearchRequest = {
  from_stop_id: number;
  to_stop_id: number;
  date: string;
  time: string;
  seats_count: number;
  time_window_minutes?: number;
};

// Предложение поездки от backend
export type TripSearchItem = {
  trip_id: number;
  from_stop: StopShort;
  to_stop: StopShort;
  departure_time: string;
  arrival_time: string;
  duration_minutes: number;
  available_seats: number;
  price_per_seat: string | number;
  total_price: string | number;
  vehicle_id: number | null;
};

// Ответ backend
export type TripSearchResponse = {
  requested_departure: string;
  seats_count: number;
  total: number;
  items: TripSearchItem[];
};

// Адрес backend для локальной разработки
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000";

// Путь поиска предзаказов
const SEARCH_PATH = "/api/v1/preorders/search";

export async function searchScheduledTrips(
  params: TripSearchRequest,
  signal?: AbortSignal
): Promise<TripSearchResponse> {
  const response = await fetch(
    `${API_BASE_URL}${SEARCH_PATH}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
      signal,
    }
  );

  if (!response.ok) {
    let message = `Ошибка поиска: HTTP ${response.status}`;

    const data: unknown = await response
      .json()
      .catch(() => null);

    if (
      data &&
      typeof data === "object" &&
      "detail" in data &&
      typeof data.detail === "string"
    ) {
      message = data.detail;
    }

    throw new Error(message);
  }

  return (await response.json()) as TripSearchResponse;
}

export type TripRoute = { tripId: number; fromStopId: number; toStopId: number };

export async function getTripRoute(route: TripRoute, signal: AbortSignal): Promise<StopShort[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/trips/${route.tripId}`, { signal });
  if (!response.ok) throw new Error("Не удалось загрузить маршрут рейса.");

  const { stops } = (await response.json()) as { stops: { sequence: number; stop: StopShort }[] };
  const ordered = [...stops].sort((left, right) => left.sequence - right.sequence);
  const from = ordered.findIndex(({ stop }) => stop.id === route.fromStopId);
  const to = ordered.findIndex(({ stop }) => stop.id === route.toStopId);
  if (from < 0 || to <= from) throw new Error("Маршрут между этими остановками недоступен.");
  return ordered.slice(from, to + 1).map(({ stop }) => stop);
}
