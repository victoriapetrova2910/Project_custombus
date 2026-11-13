/**
 * API модуль управления предзаказами (Человек 4)
 * Поддерживает работу с реальным FastAPI бэкендом
 * и безопасный демо-фоллбек (localStorage), если сервер оффлайн.
 */

export type PreorderStatus = "pending" | "confirmed" | "cancelled" | "completed";

export type PreorderCreate = {
  user_id: number;
  trip_id: number;
  seats_count: number;
  // Дополнительные параметры для сохранения контекста маршрута
  departure_point?: string;
  destination_point?: string;
  departure_time?: string;
  price_per_seat?: number;
};

export type Preorder = {
  id: number;
  user_id: number;
  trip_id: number | null;
  departure_point: string;
  destination_point: string;
  departure_time: string;
  seats_count: number;
  status: PreorderStatus;
  created_at: string;
  price_per_seat?: number;
  total_price?: number;
  paid_at?: string;
  cancelled_at?: string;
};

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const PREORDERS_KEY = "po_puti_preorders_cache_v1";

// Вспомогательные функции для демо-хранилища
function getLocalPreorders(): Preorder[] {
  try {
    const raw = localStorage.getItem(PREORDERS_KEY);
    if (!raw) return getDefaultDemoPreorders();
    return JSON.parse(raw);
  } catch {
    return getDefaultDemoPreorders();
  }
}

function saveLocalPreorders(list: Preorder[]): void {
  try {
    localStorage.setItem(PREORDERS_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn("Не удалось сохранить предзаказы в localStorage:", e);
  }
}

function getDefaultDemoPreorders(): Preorder[] {
  const now = new Date();
  const futureDate = new Date(now.getTime() + 2 * 60 * 60 * 1000); // через 2 часа
  const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // вчера

  return [
    {
      id: 101,
      user_id: 1,
      trip_id: 1,
      departure_point: "Метро Прокшино",
      destination_point: "Коммунарка",
      departure_time: futureDate.toISOString(),
      seats_count: 2,
      status: "confirmed",
      created_at: new Date(now.getTime() - 15 * 60 * 1000).toISOString(),
      price_per_seat: 150,
      total_price: 300,
      paid_at: new Date(now.getTime() - 14 * 60 * 1000).toISOString(),
    },
    {
      id: 102,
      user_id: 1,
      trip_id: 2,
      departure_point: "Городище",
      destination_point: "ЖК Испанские Кварталы",
      departure_time: pastDate.toISOString(),
      seats_count: 1,
      status: "completed",
      created_at: new Date(pastDate.getTime() - 3 * 60 * 60 * 1000).toISOString(),
      price_per_seat: 150,
      total_price: 150,
      paid_at: new Date(pastDate.getTime() - 3 * 60 * 60 * 1000).toISOString(),
    },
  ];
}

/**
 * Создание предзаказа (POST /api/v1/preorders)
 */
export async function createPreorder(
  data: PreorderCreate,
  signal?: AbortSignal
): Promise<Preorder> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/preorders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: data.user_id,
        trip_id: data.trip_id,
        seats_count: data.seats_count,
      }),
      signal,
    });

    if (res.ok) {
      const serverPreorder = (await res.json()) as Preorder;
      // Обогащаем данными о маршруте и цене для локального кэша
      serverPreorder.departure_point = data.departure_point || serverPreorder.departure_point;
      serverPreorder.destination_point = data.destination_point || serverPreorder.destination_point;
      serverPreorder.departure_time = data.departure_time || serverPreorder.departure_time;
      serverPreorder.price_per_seat = data.price_per_seat || 150;
      serverPreorder.total_price = (data.price_per_seat || 150) * data.seats_count;

      const list = getLocalPreorders();
      saveLocalPreorders([serverPreorder, ...list]);
      return serverPreorder;
    }

    if (res.status === 409) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.detail || "Недостаточно свободных мест в рейсе");
    }

    if (res.status === 404) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.detail || "Рейс не найден");
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    if (err instanceof Error && (err.message.includes("мест") || err.message.includes("Рейс"))) {
      throw err;
    }
    console.warn("Сервер бэкенда недоступен, создаём бронирование в локальном режиме:", err);
  }

  // Fallback: создаем локально
  const newId = Date.now() % 100000;
  const newOrder: Preorder = {
    id: newId,
    user_id: data.user_id,
    trip_id: data.trip_id,
    departure_point: data.departure_point || "Метро Прокшино",
    destination_point: data.destination_point || "Коммунарка",
    departure_time: data.departure_time || new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    seats_count: data.seats_count,
    status: "pending",
    created_at: new Date().toISOString(),
    price_per_seat: data.price_per_seat || 150,
    total_price: (data.price_per_seat || 150) * data.seats_count,
  };

  const list = getLocalPreorders();
  saveLocalPreorders([newOrder, ...list]);
  return newOrder;
}

/**
 * Получить детали предзаказа по ID (GET /api/v1/preorders/{id})
 */
export async function getPreorder(
  preorderId: number,
  signal?: AbortSignal
): Promise<Preorder> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/preorders/${preorderId}`, {
      signal,
    });
    if (res.ok) {
      return (await res.json()) as Preorder;
    }
  } catch (err) {
    console.warn("Фоллбек к локальным данным предзаказа:", err);
  }

  const list = getLocalPreorders();
  const found = list.find((item) => item.id === preorderId);
  if (!found) {
    throw new Error(`Бронирование #${preorderId} не найдено`);
  }
  return found;
}

/**
 * Отмена предзаказа (POST /api/v1/preorders/{id}/cancel)
 */
export async function cancelPreorder(
  preorderId: number,
  signal?: AbortSignal
): Promise<Preorder> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/v1/preorders/${preorderId}/cancel`,
      {
        method: "POST",
        signal,
      }
    );
    if (res.ok) {
      const updated = (await res.json()) as Preorder;
      const list = getLocalPreorders().map((item) =>
        item.id === preorderId ? { ...item, status: "cancelled" as const, cancelled_at: new Date().toISOString() } : item
      );
      saveLocalPreorders(list);
      return updated;
    }
    if (res.status === 400 || res.status === 409) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.detail || "Ошибка при отмене предзаказа");
    }
  } catch (err: unknown) {
    if (err instanceof Error && (err.name === "AbortError" || err.message.includes("отмен"))) {
      throw err;
    }
    console.warn("Фоллбек отмены в локальном хранилище:", err);
  }

  const list = getLocalPreorders();
  const idx = list.findIndex((item) => item.id === preorderId);
  if (idx === -1) {
    throw new Error(`Бронирование #${preorderId} не найдено`);
  }

  const updated: Preorder = {
    ...list[idx],
    status: "cancelled",
    cancelled_at: new Date().toISOString(),
  };
  list[idx] = updated;
  saveLocalPreorders(list);
  return updated;
}

/**
 * Получить список предзаказов пользователя (GET /api/v1/my/preorders?user_id=1)
 */
export async function getMyPreorders(
  userId = 1,
  signal?: AbortSignal
): Promise<Preorder[]> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/v1/my/preorders?user_id=${userId}`,
      { signal }
    );
    if (res.ok) {
      const data = (await res.json()) as Preorder[];
      if (Array.isArray(data) && data.length > 0) {
        // Синхронизируем локальный кэш
        const local = getLocalPreorders();
        const mergedMap = new Map<number, Preorder>();
        local.forEach((o) => mergedMap.set(o.id, o));
        data.forEach((o) => mergedMap.set(o.id, { ...mergedMap.get(o.id), ...o }));
        const merged = Array.from(mergedMap.values()).sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        saveLocalPreorders(merged);
        return merged;
      }
    }
  } catch (err) {
    console.warn("Фоллбек получения списка предзаказов:", err);
  }

  return getLocalPreorders().filter((o) => o.user_id === userId);
}

/**
 * Обновить статус предзаказа локально (например, после успешной оплаты)
 */
export function markPreorderAsConfirmed(preorderId: number): void {
  const list = getLocalPreorders();
  const idx = list.findIndex((p) => p.id === preorderId);
  if (idx !== -1) {
    list[idx] = {
      ...list[idx],
      status: "confirmed",
      paid_at: new Date().toISOString(),
    };
    saveLocalPreorders(list);
  }
}
