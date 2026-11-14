import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Preorder } from "../api/preorders";
import { createDemoOrder } from "../account/demoOrders";
import PaymentForm from "./PaymentForm";
import QrTicket from "./QrTicket";

export type BookingRideData = {
  tripId: number;
  from: string;
  to: string;
  departureTime?: string;
  pickupMinutes: number;
  pricePerSeat: number;
  availableSeats: number;
  passengers: number;
  mode: "now" | "scheduled";
};

type BookingModalProps = {
  ride: BookingRideData;
  userId: number;
  onClose: () => void;
};

type Step = "details" | "payment" | "success";

export default function BookingModal({ ride, userId, onClose }: BookingModalProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("details");
  const [passengers, setPassengers] = useState(ride.passengers || 1);
  const [preorder, setPreorder] = useState<Preorder | null>(null);
  const [error, setError] = useState("");

  const total = ride.pricePerSeat * passengers;

  function proceedToPayment() {
    setError("");

    if (!Number.isInteger(passengers) || passengers < 1 || passengers > ride.availableSeats) {
      setError("Укажите количество пассажиров в пределах доступных мест.");
      return;
    }

    try {
      const order = createDemoOrder({
        user_id: userId,
        trip_id: ride.tripId,
        seats_count: passengers,
        departure_point: ride.from,
        destination_point: ride.to,
        departure_time:
          ride.departureTime ??
          new Date(Date.now() + ride.pickupMinutes * 60_000).toISOString(),
        price_per_seat: ride.pricePerSeat,
      });

      setPreorder(order);
      setStep("payment");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось оформить демо-заказ.");
    }
  }

  function paymentSucceeded(order: Preorder) {
    setPreorder(order);
    setStep("success");
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Демо-бронирование поездки"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose();
        }}
      >
        <button
          type="button"
          className="modal-close-btn"
          aria-label="Закрыть окно"
          onClick={onClose}
        >
          ×
        </button>

        {step === "details" && (
          <div className="booking-modal-body">
            <div className="modal-header">
              <span className="eyebrow">Демо-бронирование</span>
              <h2>Подтверждение заказа</h2>
            </div>

            <div className="ride-summary-card">
              <div className="ride-summary__point">
                <span className="route-dot route-dot--start" />
                <div>
                  <small>Откуда</small>
                  <strong>{ride.from}</strong>
                </div>
              </div>

              <div className="ride-summary__point">
                <span className="route-dot route-dot--finish" />
                <div>
                  <small>Куда</small>
                  <strong>{ride.to}</strong>
                </div>
              </div>

              {ride.departureTime && (
                <div className="ride-summary__extra">
                  <span>
                    Отправление:{" "}
                    <strong>
                      {new Date(ride.departureTime).toLocaleString("ru-RU", {
                        day: "numeric",
                        month: "long",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
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
                  aria-label="Уменьшить число пассажиров"
                  disabled={passengers <= 1}
                  onClick={() => setPassengers((count) => Math.max(1, count - 1))}
                >
                  −
                </button>

                <span className="counter-value">{passengers}</span>

                <button
                  type="button"
                  className="counter-btn"
                  aria-label="Увеличить число пассажиров"
                  disabled={passengers >= ride.availableSeats}
                  onClick={() => setPassengers((count) => Math.min(ride.availableSeats, count + 1))}
                >
                  +
                </button>
              </div>

              <small className="counter-hint">
                Доступно мест в демо: {ride.availableSeats}
              </small>
            </div>

            <div className="price-calculation-row">
              <div>
                <span>Тариф за место</span>
                <strong>{ride.pricePerSeat} ₽</strong>
              </div>

              <div className="price-calculation-row__total">
                <span>Итого в демо</span>
                <strong>{total.toLocaleString("ru-RU")} ₽</strong>
              </div>
            </div>

            {error && <p className="account-error" role="alert">{error}</p>}

            <div className="modal-actions">
              <button type="button" className="btn btn--secondary" onClick={onClose}>
                Отмена
              </button>
              <button type="button" className="btn btn--primary" onClick={proceedToPayment}>
                Перейти к оплате
              </button>
            </div>
          </div>
        )}

        {step === "payment" && preorder && (
          <div className="booking-modal-body">
            <PaymentForm
              userId={userId}
              preorderId={preorder.id}
              amount={total}
              onSuccess={paymentSucceeded}
              onCancel={onClose}
            />
          </div>
        )}

        {step === "success" && preorder && (
          <div className="booking-success-view">
            <span className="eyebrow">Демонстрационный режим</span>
            <h2>Демо-заказ подтверждён</h2>

            <p className="order-id-highlight">
              Номер бронирования: <strong>#{preorder.id}</strong>
            </p>

            <div className="success-summary-box">
              <div className="summary-row">
                <span>Маршрут</span>
                <strong>{preorder.departure_point} → {preorder.destination_point}</strong>
              </div>
              <div className="summary-row">
                <span>Пассажиров</span>
                <strong>{preorder.seats_count}</strong>
              </div>
              <div className="summary-row">
                <span>Сумма в демо</span>
                <strong>{total.toLocaleString("ru-RU")} ₽</strong>
              </div>
            </div>

            <QrTicket order={preorder} />

            <p className="success-hint">
              Заказ сохранён в этом браузере. Место в автобусе не резервируется,
              деньги не списываются.
            </p>

            <div className="modal-actions">
              <button type="button" className="btn btn--secondary" onClick={onClose}>
                Закрыть
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => navigate("/my-trips")}
              >
                Перейти в «Мои поездки»
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}