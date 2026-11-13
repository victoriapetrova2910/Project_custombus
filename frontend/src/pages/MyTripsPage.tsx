import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getMyPreorders,
  cancelPreorder,
  type Preorder,
} from "../api/preorders";
import PaymentForm from "../components/PaymentForm";
import type { PaymentResponse } from "../api/payments";

type TripFilter = "upcoming" | "completed" | "cancelled" | "all";

export default function MyTripsPage() {
  const [trips, setTrips] = useState<Preorder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<TripFilter>("upcoming");

  // Состояние модального окна отмены поездки
  const [tripToCancel, setTripToCancel] = useState<Preorder | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Состояние модального окна доплаты для pending заказов
  const [tripToPay, setTripToPay] = useState<Preorder | null>(null);

  // Состояние просмотра подробной информации
  const [selectedTripDetails, setSelectedTripDetails] = useState<Preorder | null>(
    null
  );

  const loadTrips = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await getMyPreorders(1);
      setTrips(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Не удалось загрузить историю поездок.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTrips();
  }, []);

  // Расчёт суммы возврата по правилам сервиса (refund.py)
  const calculateRefund = (trip: Preorder) => {
    const price = trip.total_price || (trip.price_per_seat || 150) * trip.seats_count;
    const now = new Date();
    const departure = new Date(trip.departure_time);
    const paidAt = trip.paid_at ? new Date(trip.paid_at) : new Date(trip.created_at);

    // Мгновенная отмена: до 10 минут после оплаты -> 100%
    const minutesSincePaid = (now.getTime() - paidAt.getTime()) / (60 * 1000);
    if (minutesSincePaid <= 10) {
      return { ratio: 1.0, amount: price, note: "Мгновенная отмена (до 10 минут) — возврат 100%" };
    }

    // Время до отправления
    const hoursLeft = (departure.getTime() - now.getTime()) / (60 * 60 * 1000);
    if (hoursLeft <= 0.5) {
      return { ratio: 0, amount: 0, note: "Менее 30 минут до отправления — возврат 0% (место возвращается в продажу)" };
    }
    if (hoursLeft >= 2) {
      return { ratio: 0.5, amount: price * 0.5, note: "Более 2 часов до поездки — возврат 50%" };
    }

    return { ratio: 0.5, amount: price * 0.5, note: "От 30 минут до 2 часов — возврат 50%" };
  };

  const handleConfirmCancel = async () => {
    if (!tripToCancel) return;
    setIsCancelling(true);
    try {
      await cancelPreorder(tripToCancel.id);
      // Реактивно обновляем локальное состояние
      setTrips((prev) =>
        prev.map((t) =>
          t.id === tripToCancel.id
            ? { ...t, status: "cancelled", cancelled_at: new Date().toISOString() }
            : t
        )
      );
      setTripToCancel(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Не удалось отменить заказ");
    } finally {
      setIsCancelling(false);
    }
  };

  const handlePaymentSuccess = (_payment: PaymentResponse) => {
    if (!tripToPay) return;
    setTrips((prev) =>
      prev.map((t) =>
        t.id === tripToPay.id
          ? { ...t, status: "confirmed", paid_at: new Date().toISOString() }
          : t
      )
    );
    setTripToPay(null);
  };

  // Фильтрация поездок
  const filteredTrips = trips.filter((t) => {
    const isPast = new Date(t.departure_time) < new Date();
    if (activeFilter === "upcoming") {
      return (t.status === "confirmed" || t.status === "pending") && !isPast;
    }
    if (activeFilter === "completed") {
      return t.status === "completed" || (t.status === "confirmed" && isPast);
    }
    if (activeFilter === "cancelled") {
      return t.status === "cancelled";
    }
    return true;
  });

  const getStatusBadge = (trip: Preorder) => {
    const isPast = new Date(trip.departure_time) < new Date();
    if (trip.status === "cancelled") {
      return <span className="status-badge status-badge--cancelled">Отменено</span>;
    }
    if (trip.status === "completed" || (trip.status === "confirmed" && isPast)) {
      return <span className="status-badge status-badge--completed">Завершено</span>;
    }
    if (trip.status === "pending") {
      return <span className="status-badge status-badge--pending">Ожидает оплаты</span>;
    }
    return <span className="status-badge status-badge--confirmed">Подтверждено</span>;
  };

  return (
    <main className="my-trips-page">
      <div className="my-trips-container">
        <div className="my-trips-header">
          <div>
            <span className="eyebrow">Личный кабинет пассажира</span>
            <h1>Мои поездки</h1>
            <p>Управление бронированиями, история поездок и статус заказов</p>
          </div>
          <Link to="/" className="btn btn--primary">
            + Новая поездка
          </Link>
        </div>

        {/* Фильтры */}
        <div className="trips-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeFilter === "upcoming"}
            className={`tab-btn ${activeFilter === "upcoming" ? "tab-btn--active" : ""}`}
            onClick={() => setActiveFilter("upcoming")}
          >
            Предстоящие
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeFilter === "completed"}
            className={`tab-btn ${activeFilter === "completed" ? "tab-btn--active" : ""}`}
            onClick={() => setActiveFilter("completed")}
          >
            Завершённые
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeFilter === "cancelled"}
            className={`tab-btn ${activeFilter === "cancelled" ? "tab-btn--active" : ""}`}
            onClick={() => setActiveFilter("cancelled")}
          >
            Отменённые
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeFilter === "all"}
            className={`tab-btn ${activeFilter === "all" ? "tab-btn--active" : ""}`}
            onClick={() => setActiveFilter("all")}
          >
            Все ({trips.length})
          </button>
        </div>

        {isLoading ? (
          <div className="trips-loading">
            <span className="spinner" />
            <p>Загрузка ваших поездок...</p>
          </div>
        ) : errorMessage ? (
          <div className="alert-box alert-box--error">
            <p>{errorMessage}</p>
            <button type="button" onClick={loadTrips} className="btn btn--secondary">
              Повторить запрос
            </button>
          </div>
        ) : filteredTrips.length === 0 ? (
          <div className="trips-empty-state">
            <div className="empty-icon">🚌</div>
            <h3>Поездок в этой категории нет</h3>
            <p>
              {activeFilter === "upcoming"
                ? "У вас пока нет запланированных поездок. Найдите подходящий рейс на главной странице."
                : "В выбранной вкладке нет записей."}
            </p>
            <Link to="/" className="btn btn--primary">
              Найти поездку
            </Link>
          </div>
        ) : (
          <div className="trips-list">
            {filteredTrips.map((trip) => {
              const isPast = new Date(trip.departure_time) < new Date();
              const canCancel = trip.status !== "cancelled" && !isPast;
              const formattedDate = new Date(trip.departure_time).toLocaleString("ru-RU", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <article key={trip.id} className="trip-order-card">
                  <div className="trip-order-card__header">
                    <div className="order-number">
                      <strong>Заказ #{trip.id}</strong>
                      <small>от {new Date(trip.created_at).toLocaleDateString("ru-RU")}</small>
                    </div>
                    {getStatusBadge(trip)}
                  </div>

                  <div className="trip-order-card__route">
                    <div className="ride-summary__point">
                      <span className="route-dot route-dot--start" />
                      <div>
                        <small>Посадка</small>
                        <strong>{trip.departure_point}</strong>
                      </div>
                    </div>

                    <div className="ride-summary__point">
                      <span className="route-dot route-dot--finish" />
                      <div>
                        <small>Высадка</small>
                        <strong>{trip.destination_point}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="trip-order-card__details">
                    <div className="detail-item">
                      <small>Дата и время</small>
                      <strong>{formattedDate}</strong>
                    </div>
                    <div className="detail-item">
                      <small>Пассажиров</small>
                      <strong>{trip.seats_count}</strong>
                    </div>
                    <div className="detail-item">
                      <small>Стоимость</small>
                      <strong>
                        {(trip.total_price || (trip.price_per_seat || 150) * trip.seats_count).toLocaleString(
                          "ru-RU"
                        )}{" "}
                        ₽
                      </strong>
                    </div>
                  </div>

                  <div className="trip-order-card__actions">
                    <button
                      type="button"
                      className="btn btn--text"
                      onClick={() => setSelectedTripDetails(trip)}
                    >
                      Подробнее
                    </button>

                    {trip.status === "pending" && (
                      <button
                        type="button"
                        className="btn btn--primary btn--sm"
                        onClick={() => setTripToPay(trip)}
                      >
                        Оплатить заказ
                      </button>
                    )}

                    {canCancel && (
                      <button
                        type="button"
                        className="btn btn--danger-outline btn--sm"
                        onClick={() => setTripToCancel(trip)}
                      >
                        Отменить поездку
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Модальное окно подтверждения отмены с расчётом возврата (ФТ5) */}
        {tripToCancel && (
          <div className="modal-overlay" onClick={() => setTripToCancel(null)}>
            <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <span className="eyebrow eyebrow--danger">Отмена заказа</span>
                <h2>Отменить поездку #{tripToCancel.id}?</h2>
              </div>

              <div className="cancel-refund-info">
                <p>
                  Вы собираетесь отменить поездку по маршруту:
                  <br />
                  <strong>
                    {tripToCancel.departure_point} → {tripToCancel.destination_point}
                  </strong>
                </p>

                <div className="refund-card">
                  <span className="refund-card__title">Правила возврата средств:</span>
                  <p className="refund-card__calc">
                    Сумма возврата:{" "}
                    <strong>{calculateRefund(tripToCancel).amount.toLocaleString("ru-RU")} ₽</strong>
                  </p>
                  <small>{calculateRefund(tripToCancel).note}</small>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => setTripToCancel(null)}
                  disabled={isCancelling}
                >
                  Оставить заказ
                </button>
                <button
                  type="button"
                  className="btn btn--danger"
                  onClick={handleConfirmCancel}
                  disabled={isCancelling}
                >
                  {isCancelling ? "Отмена..." : "Подтвердить отмену"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Модальное окно оплаты отложенного заказа */}
        {tripToPay && (
          <div className="modal-overlay" onClick={() => setTripToPay(null)}>
            <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close-btn" onClick={() => setTripToPay(null)}>
                ×
              </button>
              <PaymentForm
                preorderId={tripToPay.id}
                amount={
                  tripToPay.total_price ||
                  (tripToPay.price_per_seat || 150) * tripToPay.seats_count
                }
                onSuccess={handlePaymentSuccess}
                onCancel={() => setTripToPay(null)}
              />
            </div>
          </div>
        )}

        {/* Модальное окно полной информации о заказе */}
        {selectedTripDetails && (
          <div className="modal-overlay" onClick={() => setSelectedTripDetails(null)}>
            <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <span className="eyebrow">Информация о бронировании</span>
                <h2>Заказ #{selectedTripDetails.id}</h2>
              </div>

              <div className="full-details-list">
                <div className="detail-row">
                  <span>Статус:</span>
                  {getStatusBadge(selectedTripDetails)}
                </div>
                <div className="detail-row">
                  <span>Отправление:</span>
                  <strong>{selectedTripDetails.departure_point}</strong>
                </div>
                <div className="detail-row">
                  <span>Назначение:</span>
                  <strong>{selectedTripDetails.destination_point}</strong>
                </div>
                <div className="detail-row">
                  <span>Время отправления:</span>
                  <strong>
                    {new Date(selectedTripDetails.departure_time).toLocaleString("ru-RU")}
                  </strong>
                </div>
                <div className="detail-row">
                  <span>Забронировано мест:</span>
                  <strong>{selectedTripDetails.seats_count}</strong>
                </div>
                <div className="detail-row">
                  <span>Сумма:</span>
                  <strong>
                    {(
                      selectedTripDetails.total_price ||
                      (selectedTripDetails.price_per_seat || 150) *
                        selectedTripDetails.seats_count
                    ).toLocaleString("ru-RU")}{" "}
                    ₽
                  </strong>
                </div>
                <div className="detail-row">
                  <span>Дата оформления:</span>
                  <small>
                    {new Date(selectedTripDetails.created_at).toLocaleString("ru-RU")}
                  </small>
                </div>
                {selectedTripDetails.paid_at && (
                  <div className="detail-row">
                    <span>Дата оплаты:</span>
                    <small>
                      {new Date(selectedTripDetails.paid_at).toLocaleString("ru-RU")}
                    </small>
                  </div>
                )}
                {selectedTripDetails.cancelled_at && (
                  <div className="detail-row">
                    <span>Дата отмены:</span>
                    <small>
                      {new Date(selectedTripDetails.cancelled_at).toLocaleString("ru-RU")}
                    </small>
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => setSelectedTripDetails(null)}
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
