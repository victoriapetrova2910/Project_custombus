import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Preorder } from "../api/preorders";
import type { DemoProfile } from "../account/demoProfiles";
import { readDemoOrders, updateDemoOrder } from "../account/demoOrders";
import { useDemoAccount } from "../account/useDemoAccount";
import PaymentForm from "../components/PaymentForm";
import QrTicket from "../components/QrTicket";

const filters = [
  ["upcoming", "Предстоящие"],
  ["completed", "Завершённые"],
  ["cancelled", "Отменённые"],
  ["all", "Все"],
] as const;

type TripFilter = (typeof filters)[number][0];
type TripDialog = { kind: "details" | "pay" | "cancel"; trip: Preorder };

const statuses = {
  pending: { label: "Ожидает оплаты", className: "pending" },
  confirmed: { label: "Подтверждено", className: "confirmed" },
  cancelled: { label: "Отменено", className: "cancelled" },
  completed: { label: "Завершено", className: "completed" },
};

const dateTime = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "medium",
  timeStyle: "short",
});

function total(trip: Preorder) {
  return trip.total_price ?? (trip.price_per_seat ?? 150) * trip.seats_count;
}

function getStatus(trip: Preorder, now: number) {
  if (trip.status === "confirmed" && Date.parse(trip.departure_time) <= now) {
    return "completed";
  }

  return trip.status;
}

function calculateRefund(trip: Preorder, now: number) {
  if (!trip.paid_at) {
    return { amount: 0, note: "Демо-заказ не был оплачен." };
  }

  const minutesSincePayment = (now - Date.parse(trip.paid_at)) / 60_000;
  const minutesToTrip = (Date.parse(trip.departure_time) - now) / 60_000;

  if (minutesSincePayment >= 0 && minutesSincePayment <= 10) {
    return {
      amount: total(trip),
      note: "До 10 минут после тестовой оплаты — 100%.",
    };
  }

  if (minutesToTrip < 30) {
    return {
      amount: 0,
      note: "Менее 30 минут до отправления — 0%.",
    };
  }

  return { amount: total(trip) * 0.5, note: "По правилам демонстрации — 50%." };
}

function loadTrips(userId: number) {
  try {
    return { trips: readDemoOrders(userId), error: "" };
  } catch {
    return {
      trips: [],
      error: "Не удалось прочитать демо-заказы в этом браузере.",
    };
  }
}

export default function MyTripsPage() {
  const { profile, setProfile } = useDemoAccount();

  if (profile) {
    return (
      <DemoTrips
        key={profile.id}
        profile={profile}
        onSignOut={() => setProfile(null)}
      />
    );
  }

  const intent = { from: "/my-trips" };

  return (
    <main className="account-page">
      <section className="account-card" aria-labelledby="account-heading">
        <span className="eyebrow">Личный кабинет пассажира</span>
        <h1 id="account-heading">Мои поездки</h1>
        <p>Войдите, чтобы посмотреть свои демо-заказы.</p>

        <div className="account-actions">
          <Link to="/login" state={intent} className="btn btn--primary">
            Войти
          </Link>
          <Link to="/register" state={intent} className="btn btn--secondary">
            Создать аккаунт
          </Link>
        </div>
      </section>
    </main>
  );
}

function DemoTrips({
  profile,
  onSignOut,
}: {
  profile: DemoProfile;
  onSignOut: () => void;
}) {
  const [history, setHistory] = useState(() => loadTrips(profile.id));
  const [filter, setFilter] = useState<TripFilter>("upcoming");
  const [dialog, setDialog] = useState<TripDialog | null>(null);
  const [dialogError, setDialogError] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);

    function refreshTrips(event: StorageEvent) {
      if (event.key !== `po_puti_demo_orders_v1_${profile.id}`) return;
      const fresh = loadTrips(profile.id);
      setHistory(fresh);
      setDialog((current) => {
        if (!current) return null;
        const trip = fresh.trips.find((item) => item.id === current.trip.id);
        return trip ? { ...current, trip } : null;
      });
    }

    window.addEventListener("storage", refreshTrips);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("storage", refreshTrips);
    };
  }, [profile.id]);

  const visibleTrips = history.trips.filter((trip) => {
    const status = getStatus(trip, now);

    if (filter === "all") return true;
    if (filter === "completed" || filter === "cancelled") {
      return status === filter;
    }

    return (
      (status === "pending" || status === "confirmed") &&
      Date.parse(trip.departure_time) > now
    );
  });

  function openDialog(kind: TripDialog["kind"], trip: Preorder) {
    setDialogError("");
    setDialog({ kind, trip });
  }

  function saveUpdatedTrip(updated: Preorder) {
    setHistory((current) => ({
      ...current,
      trips: current.trips.map((trip) =>
        trip.id === updated.id ? updated : trip
      ),
    }));
    setDialog(null);
  }

  function confirmCancel() {
    if (!dialog) return;

    try {
      saveUpdatedTrip(updateDemoOrder(profile.id, dialog.trip.id, "cancel"));
    } catch (error) {
      setDialogError(
        error instanceof Error ? error.message : "Не удалось отменить заказ."
      );
    }
  }

  function statusBadge(trip: Preorder) {
    if (trip.demo_boarded_at) {
      return <span className="status-badge status-badge--confirmed">Посадка отмечена</span>;
    }
    const status = statuses[getStatus(trip, now)];

    return (
      <span className={`status-badge status-badge--${status.className}`}>
        {status.label}
      </span>
    );
  }

  return (
    <main className="my-trips-page">
      <div className="my-trips-container">
        <header className="my-trips-header">
          <div>
            <span className="eyebrow">Демонстрационный режим</span>
            <h1>Мои поездки</h1>
            <p>{profile.name} · Демо-заказы в этом браузере</p>
          </div>

          <div className="account-actions">
            <Link to="/" className="btn btn--primary">
              Новая поездка
            </Link>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={onSignOut}
            >
              Выйти
            </button>
          </div>
        </header>

        <div className="trips-tabs" role="group" aria-label="Фильтр поездок">
          {filters.map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={filter === id}
              className={`tab-btn${filter === id ? " tab-btn--active" : ""}`}
              onClick={() => setFilter(id)}
            >
              {id === "all" ? `${label} (${history.trips.length})` : label}
            </button>
          ))}
        </div>

        {history.error ? (
          <div className="alert-box alert-box--error" role="alert">
            <p>{history.error}</p>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => setHistory(loadTrips(profile.id))}
            >
              Повторить
            </button>
          </div>
        ) : visibleTrips.length === 0 ? (
          <div className="trips-empty-state">
            <h3>Поездок в этой категории нет</h3>
            <Link to="/" className="btn btn--primary">
              Найти поездку
            </Link>
          </div>
        ) : (
          <div className="trips-list">
            {visibleTrips.map((trip) => {
              const isFuture = Date.parse(trip.departure_time) > now;
              const canCancel = isFuture && !trip.demo_boarded_at && ["pending", "confirmed"].includes(trip.status);

              return (
                <article className="trip-order-card" key={trip.id}>
                  <div className="trip-order-card__header">
                    <div className="order-number">
                      <strong>Заказ #{trip.id}</strong>
                      <small>
                        от {new Date(trip.created_at).toLocaleDateString("ru-RU")}
                      </small>
                    </div>
                    {statusBadge(trip)}
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
                      <strong>{dateTime.format(new Date(trip.departure_time))}</strong>
                    </div>
                    <div className="detail-item">
                      <small>Пассажиров</small>
                      <strong>{trip.seats_count}</strong>
                    </div>
                    <div className="detail-item">
                      <small>Стоимость</small>
                      <strong>{total(trip)} ₽</strong>
                    </div>
                  </div>

                  <div className="trip-order-card__actions">
                    <button
                      type="button"
                      className="btn btn--text"
                      onClick={() => openDialog("details", trip)}
                    >
                      {isFuture && trip.status === "confirmed" && trip.demo_ticket_code && !trip.demo_boarded_at ? "QR-билет" : "Подробнее"}
                    </button>

                    {isFuture && trip.status === "pending" && (
                      <button
                        type="button"
                        className="btn btn--primary btn--sm"
                        onClick={() => openDialog("pay", trip)}
                      >
                        Оплатить заказ
                      </button>
                    )}

                    {canCancel && (
                      <button
                        type="button"
                        className="btn btn--danger-outline btn--sm"
                        onClick={() => openDialog("cancel", trip)}
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

        {dialog && (
          <div
            className="modal-overlay"
            onClick={() => setDialog(null)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setDialog(null);
            }}
          >
            <div
              className="modal-dialog"
              role="dialog"
              aria-modal="true"
              aria-label={`Демо-заказ ${dialog.trip.id}`}
              onClick={(event) => event.stopPropagation()}
            >
              {dialog.kind === "pay" ? (
                <PaymentForm
                  userId={profile.id}
                  preorderId={dialog.trip.id}
                  amount={total(dialog.trip)}
                  onSuccess={saveUpdatedTrip}
                  onCancel={() => setDialog(null)}
                />
              ) : dialog.kind === "cancel" ? (
                <>
                  <div className="modal-header">
                    <h2>Отменить поездку #{dialog.trip.id}?</h2>
                  </div>

                  <p>{dialog.trip.departure_point} → {dialog.trip.destination_point}</p>

                  <div className="refund-card">
                    <p>
                      Расчётный возврат в демо —{" "}
                      <strong>{calculateRefund(dialog.trip, now).amount} ₽</strong>
                    </p>
                    <small>{calculateRefund(dialog.trip, now).note}</small>
                  </div>

                  {dialogError && (
                    <p className="account-error" role="alert">
                      {dialogError}
                    </p>
                  )}

                  <div className="modal-actions">
                    <button
                      type="button"
                      className="btn btn--secondary"
                      onClick={() => setDialog(null)}
                    >
                      Оставить заказ
                    </button>
                    <button
                      type="button"
                      className="btn btn--danger"
                      onClick={confirmCancel}
                    >
                      Подтвердить отмену
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="modal-header">
                    <h2>Заказ #{dialog.trip.id}</h2>
                  </div>

                  <div className="full-details-list">
                    <div className="detail-row">
                      <span>Статус</span>
                      {statusBadge(dialog.trip)}
                    </div>
                    <div className="detail-row">
                      <span>Посадка</span>
                      <strong>{dialog.trip.departure_point}</strong>
                    </div>
                    <div className="detail-row">
                      <span>Высадка</span>
                      <strong>{dialog.trip.destination_point}</strong>
                    </div>
                    <div className="detail-row">
                      <span>Отправление</span>
                      <strong>{dateTime.format(new Date(dialog.trip.departure_time))}</strong>
                    </div>
                    <div className="detail-row">
                      <span>Мест</span>
                      <strong>{dialog.trip.seats_count}</strong>
                    </div>
                    <div className="detail-row">
                      <span>Сумма</span>
                      <strong>{total(dialog.trip)} ₽</strong>
                    </div>
                    <div className="detail-row">
                      <span>Оформлен</span>
                      <strong>{dateTime.format(new Date(dialog.trip.created_at))}</strong>
                    </div>

                    {dialog.trip.paid_at && (
                      <div className="detail-row">
                        <span>Тестовая оплата</span>
                        <strong>{dateTime.format(new Date(dialog.trip.paid_at))}</strong>
                      </div>
                    )}

                    {dialog.trip.cancelled_at && (
                      <div className="detail-row">
                        <span>Отменён</span>
                        <strong>{dateTime.format(new Date(dialog.trip.cancelled_at))}</strong>
                      </div>
                    )}
                  </div>

                  {Date.parse(dialog.trip.departure_time) > now && <QrTicket order={dialog.trip} />}

                  <div className="modal-actions">
                    <button
                      type="button"
                      className="btn btn--primary"
                      onClick={() => setDialog(null)}
                    >
                      Закрыть
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}