import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPreorder, type Preorder } from "../api/preorders";
import PaymentForm from "./PaymentForm";
import type { PaymentResponse } from "../api/payments";

export type BookingRideData = {
  tripId: number;
  from: string;
  to: string;
  departureTime?: string;
  pricePerSeat: number;
  availableSeats: number;
  passengers: number;
  mode: "now" | "scheduled";
};

type BookingModalProps = {
  ride: BookingRideData;
  isOpen: boolean;
  onClose: () => void;
};

type BookingStep = "details" | "payment" | "success" | "error";

export default function BookingModal({
  ride,
  isOpen,
  onClose,
}: BookingModalProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<BookingStep>("details");
  const [passengers, setPassengers] = useState<number>(ride.passengers || 1);
  const [preorder, setPreorder] = useState<Preorder | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const totalPrice = ride.pricePerSeat * passengers;

  // Шаг 1: Создание предзаказа на бэкенде
  const handleProceedToPayment = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const created = await createPreorder({
        user_id: 1, // тестовый пассажир MVP
        trip_id: ride.tripId,
        seats_count: passengers,
        departure_point: ride.from,
        destination_point: ride.to,
        departure_time: ride.departureTime,
        price_per_seat: ride.pricePerSeat,
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

  // Шаг 2: Обработка успешного платежа
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

  const handleGoToMyTrips = () => {
    onClose();
    navigate("/my-trips");
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <button
          className="modal-close-btn"
          onClick={onClose}
          aria-label="Закрыть окно"
        >
          ×
        </button>

        {step === "details" && (
          <div className="booking-modal-body">
            <div className="modal-header">
              <span className="eyebrow">Бронирование поездки</span>
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
                      {new Date(ride.departureTime).toLocaleTimeString("ru-RU", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </strong>
                  </span>
                </div>
              )}
            </div>

            {/* Выбор и подтверждение количества пассажиров */}
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
                    setPassengers((prev) =>
                      Math.min(ride.availableSeats, prev + 1)
                    )
                  }
                  disabled={passengers >= ride.availableSeats}
                >
                  +
                </button>
              </div>
              <small className="counter-hint">
                Доступно для выбора: {ride.availableSeats} мест
              </small>
            </div>

            <div className="price-calculation-row">
              <div>
                <span>Тариф за 1 место:</span>
                <strong>{ride.pricePerSeat} ₽</strong>
              </div>
              <div className="price-calculation-row__total">
                <span>Итого к оплате:</span>
                <strong>{totalPrice.toLocaleString("ru-RU")} ₽</strong>
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={onClose}
              >
                Отмена
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleProceedToPayment}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Резервирование мест..." : "Перейти к оплате"}
              </button>
            </div>
          </div>
        )}

        {step === "payment" && preorder && (
          <div className="booking-modal-body">
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
            <span className="eyebrow">Заказ успешно оформлен!</span>
            <h2>Поездка забронирована</h2>
            <p className="order-id-highlight">
              Номер бронирования: <strong>#{preorder.id}</strong>
            </p>

            <div className="success-summary-box">
              <div className="summary-row">
                <span>Маршрут:</span>
                <strong>
                  {preorder.departure_point} → {preorder.destination_point}
                </strong>
              </div>
              <div className="summary-row">
                <span>Пассажиров:</span>
                <strong>{preorder.seats_count}</strong>
              </div>
              <div className="summary-row">
                <span>Сумма оплаты:</span>
                <strong>{totalPrice} ₽</strong>
              </div>
              <div className="summary-row">
                <span>Статус:</span>
                <span className="status-pill status-pill--confirmed">
                  Оплачено
                </span>
              </div>
            </div>

            <p className="success-hint">
              Информация о поездке сохранена в вашем личном кабинете. Вы можете
              отслеживать статус или отменить поездку при необходимости.
            </p>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={onClose}
              >
                На главную
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleGoToMyTrips}
              >
                Перейти в «Мои поездки»
              </button>
            </div>
          </div>
        )}

        {step === "error" && (
          <div className="booking-error-view">
            <div className="error-icon-badge">✕</div>
            <h2>Не удалось забронировать</h2>
            <p className="error-description">
              {errorMessage || "Произошла непредвиденная ошибка."}
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={onClose}
              >
                Закрыть
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
    </div>
  );
}
