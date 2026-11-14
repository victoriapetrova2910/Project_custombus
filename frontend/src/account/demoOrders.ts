import type { Preorder, PreorderCreate } from "../api/preorders";

const hour = 60 * 60 * 1000;
const ordersPrefix = "po_puti_demo_orders_v1_";
const storageKey = (userId: number) => `${ordersPrefix}${userId}`;
const ticketPattern = /^POPUTI-[0-9A-F]{24}$/;

function createTicketCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return "POPUTI-" + Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("").toUpperCase();
}

function seedOrders(userId: number): Preorder[] {
  if (userId !== 1) return [];

  const now = Date.now();
  const examples = [
    {
      id: 101, trip: 1, from: "Метро Прокшино", to: "Коммунарка",
      time: now + 2 * hour, seats: 2, status: "confirmed",
    },
    {
      id: 102, trip: 2, from: "Городище", to: "ЖК Испанские Кварталы",
      time: now - 24 * hour, seats: 1, status: "completed",
    },
  ] as const;

  return examples.map(({ id, trip, from, to, time, seats, status }) => ({
    id,
    user_id: userId,
    trip_id: trip,
    departure_point: from,
    destination_point: to,
    departure_time: new Date(time).toISOString(),
    seats_count: seats,
    status,
    created_at: new Date(time - 3 * hour).toISOString(),
    paid_at: new Date(time - 3 * hour).toISOString(),
    price_per_seat: 150,
    total_price: 150 * seats,
  }));
}

export function readDemoOrders(userId: number): Preorder[] {
  const raw = localStorage.getItem(storageKey(userId));
  if (!raw) return seedOrders(userId);

  const records = JSON.parse(raw);
  if (!Array.isArray(records)) {
    throw new Error("Не удалось прочитать список демо-поездок.");
  }

  return (records as Preorder[]).filter((order) => order.user_id === userId);
}

function writeOrders(userId: number, orders: Preorder[]) {
  localStorage.setItem(storageKey(userId), JSON.stringify(orders));
}

export function createDemoOrder(data: PreorderCreate): Preorder {
  const orders = readDemoOrders(data.user_id);
  const price = data.price_per_seat ?? 150;

  const order: Preorder = {
    id: Math.max(102, ...orders.map((item) => item.id)) + 1,
    user_id: data.user_id,
    trip_id: data.trip_id,
    departure_point: data.departure_point ?? "",
    destination_point: data.destination_point ?? "",
    departure_time: data.departure_time ?? new Date().toISOString(),
    seats_count: data.seats_count,
    status: "pending",
    created_at: new Date().toISOString(),
    price_per_seat: price,
    total_price: price * data.seats_count,
  };

  writeOrders(data.user_id, [order, ...orders]);
  return order;
}

export function updateDemoOrder(userId: number, orderId: number, action: "pay" | "cancel"): Preorder {
  const orders = readDemoOrders(userId);
  const order = orders.find((item) => item.id === orderId);

  if (!order) throw new Error("Заказ не найден в этом демо-профиле.");
  if (action === "pay" && order.status !== "pending") throw new Error("Этот заказ нельзя оплатить.");
  if (action === "cancel" && (order.status === "cancelled" || order.status === "completed" || order.demo_boarded_at)) {
    throw new Error("Этот заказ нельзя отменить.");
  }

  const now = new Date().toISOString();
  const updated: Preorder = action === "pay"
    ? { ...order, status: "confirmed", paid_at: now, demo_ticket_code: createTicketCode() }
    : { ...order, status: "cancelled", cancelled_at: now };

  writeOrders(userId, orders.map((item) => item.id === orderId ? updated : item));
  return updated;
}

export function boardDemoTicket(value: string): Preorder {
  const code = value.trim().toUpperCase();

  if (!ticketPattern.test(code)) {
    throw new Error("Это не код демо-билета «По пути».");
  }

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key?.startsWith(ordersPrefix)) continue;

    const userId = Number(key.slice(ordersPrefix.length));
    if (!Number.isSafeInteger(userId) || userId < 1) continue;

    const orders = readDemoOrders(userId);
    const order = orders.find((item) => item.demo_ticket_code === code);
    if (!order) continue;

    if (order.demo_boarded_at) throw new Error("Этот QR-билет уже использован.");
    if (order.status !== "confirmed" || !order.paid_at) {
      throw new Error("Билет недействителен. Проверьте статус заказа.");
    }

    const now = Date.now();
    const departure = Date.parse(order.departure_time);
    if (!Number.isFinite(departure) || departure <= now) {
      throw new Error("Рейс уже отправился.");
    }

    const updated = { ...order, demo_boarded_at: new Date(now).toISOString() };
    writeOrders(userId, orders.map((item) => item.id === order.id ? updated : item));
    return updated;
  }

  throw new Error("Билет не найден. Проверьте, что заказ оплачен в этом браузере.");
}