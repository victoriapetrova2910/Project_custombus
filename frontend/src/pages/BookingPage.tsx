import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { createPreorder, type Preorder } from "../api/preorders";
import PaymentForm from "../components/PaymentForm";
import type { PaymentResponse } from "../api/payments";

export default function BookingPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const tripId = Number(params.get("trip_id")) || 1;
  const from = params.get("from") || "Метро Прокшино";
  const to = params.get("to") || "Коммунарка";
  const date = params.get("date") || "";
  const time = params.get("time") || "";
  const pricePerSeat = Number(params.get("price")) || 150;
  const initialPassengers = Number(params.get("passengers")) || 1;
  const availableSeats = Number(params.get("seats")) || 5;

  const [passengers, setPassengers] = useState(initialPassengers);
  const [step, setStep] = useState<"details" | "payment" | "success" | "error">(
    "details"
  );
  const [preorder, setPreorder] = useState<Preorder | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalPrice = pricePerSeat * passengers;

  const handleCreateBooking = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    const departureTime = date && time ? `${date}T${time}:00` : new Date().toISOString();

    try {
      const created = await createPreorder({
        user_id: 1,
        trip_id: tripId,
        seats_count: passengers,
        departure_point: from,
        destination_point: to,
        departure_time: departureTime,
        price_per_seat: pricePerSeat,
      });

      setPreorder(created);
      setStep("payment");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Не удалось оформить бронирование.");
      }
      setStep("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentSuccess = (_payment: PaymentResponse) => {
    if (preorder) {
      setPreorder({
        ...preorder,
        status: "confirmed",
        paid_at: new Date().toISOString(),
      });
    }
    setStep("success");
  };

  return (
    <main className="booking-page-container">
      <div className="booking-page-card">
        <Link to="/search" className="results-back">
          ← Вернуться к результатам поиска
        </Link>

        {step === "details" && (
          <div className="booking-page-content">
            <div className="booking-header">
              <span className="eyebrow">Шаг 1 из 2</span>
              <h1>Оформление предзаказа</h1>
              <p>Проверьте данные рейса и укажите количество пассажиров</p>
            </div>

            <div className="ride-summary-card">
              <div className="ride-summary__point">
                <span className="route-dot route-dot--start" />
                <div>
                  <small>Остановка отправления</small>
                  <strong>{from}</strong>
                </div>
              </div>

              <div className="ride-summary__point">
                <span className="route-dot route-dot--finish" />
                <div>
                  <small>Остановка назначения</small>
                  <strong>{to}</strong>
                </div>
              </div>

              {(date || time) && (
                <div className="ride-summary__extra">
                  <span>
                    Дата и время:{" "}
                    <strong>
                      {date ? date.split("-").reverse().join(".") : "Сегодня"}{" "}
                      {time ? `в ${time}` : ""}
                    </strong>
                  </span>
                </div>
              )}
            </div>

            <div className="passengers-counter-block">
              <label>Количество пассажиров</label>
              <div className="counter-controls">
                <button
                  type="button"
                  className="counter-btn"
                  onClick={() => setPassengers((prev) => Math.max(1, prev - 1))}
                  disabled={passengers <= 1}
                >
                  −
                </button>
                <span className="counter-value">{passengers}</span>
                <button
                  type="button"
                  className="counter-btn"
                  onClick={() =>
                    setPassengers((prev) => Math.min(availableSeats, prev + 1))
                  }
                  disabled={passengers >= availableSeats}
                >
                  +
                </button>
              </div>
              <small className="counter-hint">
                В автобусе свободно {availableSeats} мест
              </small>
            </div>

            <div className="price-calculation-row">
              <div>
                <span>Тариф за 1 место:</span>
                <strong>{pricePerSeat} ₽</strong>
              </div>
              <div className="price-calculation-row__total">
                <span>Итого к оплате:</span>
                <strong>{totalPrice.toLocaleString("ru-RU")} ₽</strong>
              </div>
            </div>

            <div className="booking-page-actions">
              <button
                type="button"
                className="btn btn--primary btn--large"
                onClick={handleCreateBooking}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Резервирование..." : "Подтвердить и оплатить"}
              </button>
            </div>
          </div>
        )}

        {step === "payment" && preorder && (
          <div className="booking-page-content">
            <div className="booking-header">
              <span className="eyebrow">Шаг 2 из 2</span>
              <h1>Оплата заказа #{preorder.id}</h1>
              <p>
                Места временно зарезервированы. Завершите оплату для
                подтверждения.
              </p>
            </div>

            <PaymentForm
              preorderId={preorder.id}
              amount={totalPrice}
              onSuccess={handlePaymentSuccess}
              onCancel={() => setStep("details")}
            />
          </div>
        )}

        {step === "success" && preorder && (
          <div className="booking-success-view">
            <div className="success-icon-badge">✓</div>
            <span className="eyebrow">Оплата прошла успешно!</span>
            <h1>Заказ #{preorder.id} подтверждён</h1>
            <p className="order-id-highlight">
              Рейс зарезервирован за вами. Ожидайте микроавтобус вовремя.
            </p>

            <div className="success-summary-box">
              <div className="summary-row">
                <span>Маршрут:</span>
                <strong>
                  {preorder.departure_point} → {preorder.destination_point}
                </strong>
              </div>
              <div className="summary-row">
                <span>Количество мест:</span>
                <strong>{preorder.seats_count}</strong>
              </div>
              <div className="summary-row">
                <span>Оплаченная сумма:</span>
                <strong>{totalPrice} ₽</strong>
              </div>
              <div className="summary-row">
                <span>Статус:</span>
                <span className="status-pill status-pill--confirmed">
                  Оплачено
                </span>
              </div>
            </div>

            <div className="booking-page-actions">
              <Link to="/my-trips" className="btn btn--primary btn--large">
                Перейти в «Мои поездки»
              </Link>
              <Link to="/" className="btn btn--secondary btn--large">
                На главную страницу
              </Link>
            </div>
          </div>
        )}

        {step === "error" && (
          <div className="booking-error-view">
            <div className="error-icon-badge">✕</div>
            <h2>Ошибка бронирования</h2>
            <p className="error-description">
              {errorMessage || "Не удалось оформить рейс."}
            </p>
            <div className="booking-page-actions">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => navigate("/search")}
              >
                К результатам поиска
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => setStep("details")}
              >
                Попробовать снова
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
