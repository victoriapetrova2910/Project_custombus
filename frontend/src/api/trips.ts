
/**
 * API поиска запланированных поездок.
 *
 * ВАЖНО:
 * HTTP-эндпоинт поиска ещё должен быть
 * реализован и проверен в backend.
 */

// Остановка, полученная от сервера
export type StopShort = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
};

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

// Планируемый путь поиска предзаказов
const SEARCH_PATH = "/api/v1/preorders/search";

/**
 * Поиск запланированной поездки.
 * Пока не вызываем из SearchPage:
 * серверный эндпоинт ещё не готов.
 */
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
