import React, { useState } from "react";
import {
  processCardPayment,
  type CardDetails,
  type PaymentResponse,
} from "../api/payments";

type PaymentFormProps = {
  preorderId: number;
  amount: number;
  onSuccess: (payment: PaymentResponse) => void;
  onCancel?: () => void;
};

export default function PaymentForm({
  preorderId,
  amount,
  onSuccess,
  onCancel,
}: PaymentFormProps) {
  const [selectedMethod, setSelectedMethod] = useState<"saved" | "new">("saved");
  const [cardNumber, setCardNumber] = useState("2200 1234 5678 9012");
  const [expiryDate, setExpiryDate] = useState("12/28");
  const [cvv, setCvv] = useState("777");
  const [saveCard, setSaveCard] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const formatCardNumber = (value: string) => {
    const raw = value.replace(/\D/g, "").slice(0, 16);
    return raw.replace(/(\d{4})(?=\d)/g, "$1 ");
  };

  const formatExpiry = (value: string) => {
    const raw = value.replace(/\D/g, "").slice(0, 4);
    if (raw.length >= 2) {
      return `${raw.slice(0, 2)}/${raw.slice(2)}`;
    }
    return raw;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsProcessing(true);

    const cardDetails: CardDetails = {
      cardNumber: selectedMethod === "saved" ? "2200 •••• •••• 4242" : cardNumber,
      expiryDate: selectedMethod === "saved" ? "12/28" : expiryDate,
      cvv: selectedMethod === "saved" ? "•••" : cvv,
      saveCard,
    };

    try {
      const res = await processCardPayment(
        preorderId,
        amount,
        cardDetails,
        simulateFailure
      );
      onSuccess(res);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Не удалось провести оплату. Попробуйте снова.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="payment-card">
      <div className="payment-card__header">
        <div className="payment-card__title">
          <h3>Оплата поездки</h3>
          <p>Безопасный платёж банковской картой</p>
        </div>
        <div className="payment-card__amount">
          <small>Сумма</small>
          <strong>{amount.toLocaleString("ru-RU")} ₽</strong>
        </div>
      </div>

      {errorMessage && (
        <div className="alert-box alert-box--error" role="alert">
          <span className="alert-icon">⚠️</span>
          <div>
            <strong>Ошибка оплаты</strong>
            <p>{errorMessage}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="payment-form">
        {/* Выбор карты: сохранённая или новая */}
        <div className="payment-methods">
          <label
            className={`payment-method ${
              selectedMethod === "saved" ? "payment-method--active" : ""
            }`}
          >
            <input
              type="radio"
              name="paymentMethod"
              checked={selectedMethod === "saved"}
              onChange={() => setSelectedMethod("saved")}
            />
            <div className="payment-method__content">
              <span className="mir-badge">МИР</span>
              <div>
                <strong>Привязанная карта</strong>
                <small>•••• 4242 (Сбербанк)</small>
              </div>
            </div>
          </label>

          <label
            className={`payment-method ${
              selectedMethod === "new" ? "payment-method--active" : ""
            }`}
          >
            <input
              type="radio"
              name="paymentMethod"
              checked={selectedMethod === "new"}
              onChange={() => setSelectedMethod("new")}
            />
            <div className="payment-method__content">
              <span className="card-icon">💳</span>
              <div>
                <strong>Новая карта</strong>
                <small>МИР, Visa, Mastercard</small>
              </div>
            </div>
          </label>
        </div>

        {selectedMethod === "new" && (
          <div className="new-card-fields">
            <div className="form-group">
              <label htmlFor="card-number">Номер карты</label>
              <div className="input-with-badge">
                <input
                  id="card-number"
                  type="text"
                  inputMode="numeric"
                  placeholder="2200 0000 0000 0000"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  required
                />
                <span className="mir-indicator">МИР</span>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="card-expiry">Срок действия</label>
                <input
                  id="card-expiry"
                  type="text"
                  placeholder="ММ/ГГ"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(formatExpiry(e.target.value))}
                  maxLength={5}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="card-cvv">CVC / CVV</label>
                <input
                  id="card-cvv"
                  type="password"
                  placeholder="•••"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 3))}
                  maxLength={3}
                  required
                />
              </div>
            </div>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={saveCard}
                onChange={(e) => setSaveCard(e.target.checked)}
              />
              <span>Сохранить карту для будущих поездок «По пути»</span>
            </label>
          </div>
        )}

        {/* Переключатель для проверки демонстрационных сценариев (ФТ4) */}
        <div className="demo-toggle-row">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={simulateFailure}
              onChange={(e) => setSimulateFailure(e.target.checked)}
            />
            <span>Смоделировать отказ банка (тест сценария ошибки)</span>
          </label>
        </div>

        <div className="payment-actions">
          {onCancel && (
            <button
              type="button"
              className="btn btn--secondary"
              onClick={onCancel}
              disabled={isProcessing}
            >
              Отмена
            </button>
          )}

          <button
            type="submit"
            className="btn btn--primary btn--pay"
            disabled={isProcessing}
          >
            {isProcessing ? (
              <span className="btn-spinner">Обработка платежа...</span>
            ) : (
              `Оплатить ${amount.toLocaleString("ru-RU")} ₽`
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
