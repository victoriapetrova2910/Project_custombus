import { useState, type FormEvent } from "react";
import type { Preorder } from "../api/preorders";
import { updateDemoOrder } from "../account/demoOrders";

type PaymentFormProps = {
  userId: number;
  preorderId: number;
  amount: number;
  onSuccess: (order: Preorder) => void;
  onCancel?: () => void;
};

export default function PaymentForm({
  userId,
  preorderId,
  amount,
  onSuccess,
  onCancel,
}: PaymentFormProps) {
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [error, setError] = useState("");
  const formattedAmount = `${amount.toLocaleString("ru-RU")} ₽`;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (simulateFailure) {
      setError("Сымитирован отказ банка. Заказ остался в ожидании оплаты.");
      return;
    }

    try {
      onSuccess(updateDemoOrder(userId, preorderId, "pay"));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Не удалось провести тестовую оплату."
      );
    }
  }

  return (
    <div className="payment-card payment-card--demo">
      <div className="payment-card__title">
        <span className="eyebrow">Демо-заказ #{preorderId}</span>
        <h3>Тестовая оплата</h3>
        <p>Деньги не списываются. Реквизиты карты не нужны.</p>
      </div>

      <form className="payment-form" onSubmit={handleSubmit}>
        <div className="demo-pay-total">
          <span>Итого за поездку</span>
          <strong>{formattedAmount}</strong>
        </div>

        <div>
          <p className="demo-pay-method-label">Способ оплаты</p>
          <div className="demo-pay-method">
            <span className="demo-pay-method__icon" aria-hidden="true">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              >
                <rect x="3" y="5" width="18" height="14" rx="3" />
                <path d="M3 10h18M7 15h4" />
              </svg>
            </span>
            <div>
              <strong>Банковская карта</strong>
              <small>Тестовый режим</small>
            </div>
          </div>
        </div>

        <details className="demo-pay-options">
          <summary>Настройки демонстрации</summary>
          <label className="demo-payment-option">
            <input
              type="checkbox"
              checked={simulateFailure}
              onChange={(event) => {
                setSimulateFailure(event.target.checked);
                setError("");
              }}
            />
            Сымитировать отказ банка
          </label>
        </details>

        {error && (
          <p className="account-error" role="alert">
            {error}
          </p>
        )}

        <div className="modal-actions demo-pay-actions">
          {onCancel && (
            <button type="button" className="btn btn--secondary" onClick={onCancel}>
              Закрыть
            </button>
          )}
          <button type="submit" className="btn btn--primary">
            Оплатить {formattedAmount}
          </button>
        </div>
      </form>
    </div>
  );
}