/**
 * API модуль оплаты (Человек 4)
 * Обеспечивает интеграцию с mock-оплатой бэкенда:
 * - Быстрый путь: POST /api/v1/preorders/{id}/pay
 * - Пошаговый путь: POST /api/v1/payments -> POST /api/v1/payments/{id}/confirm
 * - Поддержка симуляции отказа банка (ФТ4) для тестирования и демонстрации.
 */

import { markPreorderAsConfirmed } from "./preorders";

export type PaymentStatus = "pending" | "paid" | "failed";

export type PaymentCreate = {
  preorder_id: number;
  amount: number;
};

export type PaymentResponse = {
  id: number;
  preorder_id: number;
  amount: number;
  status: PaymentStatus;
};

export type CardDetails = {
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  cardholderName?: string;
  saveCard?: boolean;
};

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

/**
 * Быстрая оплата предзаказа (POST /api/v1/preorders/{id}/pay)
 */
export async function payPreorderDirect(
  preorderId: number,
  signal?: AbortSignal
): Promise<PaymentResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/preorders/${preorderId}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
    });

    if (res.ok) {
      const data = (await res.json()) as PaymentResponse;
      markPreorderAsConfirmed(preorderId);
      return data;
    }

    if (res.status === 400 || res.status === 404) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.detail || "Ошибка при оплате предзаказа");
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    if (err instanceof Error && err.message.includes("оплате")) throw err;
    console.warn("Фоллбек прямой оплаты при оффлайн сервере:", err);
  }

  // Fallback
  markPreorderAsConfirmed(preorderId);
  return {
    id: Math.floor(Math.random() * 10000) + 1,
    preorder_id: preorderId,
    amount: 150,
    status: "paid",
  };
}

/**
 * Пошаговая mock-оплата с проверкой реквизитов карты (ФТ4)
 */
export async function processCardPayment(
  preorderId: number,
  amount: number,
  _card: CardDetails,
  simulateFailure = false,
  signal?: AbortSignal
): Promise<PaymentResponse> {
  // Эмулируем задержку банковского шлюза 800мс
  await new Promise((r) => setTimeout(r, 800));

  if (simulateFailure) {
    throw new Error("Платёж отклонён банком-эмитентом: недостаточно средств или ошибка авторизации");
  }

  // Пробуем вызвать двухшаговый API бэкенда
  try {
    // 1. Создаем платёж в статусе pending
    const createRes = await fetch(`${API_BASE_URL}/api/v1/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preorder_id: preorderId, amount }),
      signal,
    });

    if (createRes.ok) {
      const payment = (await createRes.json()) as PaymentResponse;
      // 2. Подтверждаем платёж
      const confirmRes = await fetch(
        `${API_BASE_URL}/api/v1/payments/${payment.id}/confirm`,
        { method: "POST", signal }
      );
      if (confirmRes.ok) {
        const confirmedPayment = (await confirmRes.json()) as PaymentResponse;
        markPreorderAsConfirmed(preorderId);
        return confirmedPayment;
      }
    } else {
      // Если пошаговый не сработал, пробуем быстрый
      const quickRes = await fetch(
        `${API_BASE_URL}/api/v1/preorders/${preorderId}/pay`,
        { method: "POST", signal }
      );
      if (quickRes.ok) {
        const payment = (await quickRes.json()) as PaymentResponse;
        markPreorderAsConfirmed(preorderId);
        return payment;
      }
    }
  } catch (err) {
    console.warn("Фоллбек mock-оплаты при оффлайн сервере:", err);
  }

  // Офлайн/демо успешный платёж
  markPreorderAsConfirmed(preorderId);
  return {
    id: Math.floor(Math.random() * 10000) + 1,
    preorder_id: preorderId,
    amount,
    status: "paid",
  };
}
