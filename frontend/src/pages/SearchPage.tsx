import { useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import { useDemoAccount } from "../account/useDemoAccount";
import BookingModal from "../components/BookingModal";
import ServiceMap from "../components/LazyServiceMap";
import SearchStatus, { type SearchState } from "../components/SearchStatus";
import TripCard, { type RideMode, type RidePreview } from "../components/TripCard";

const demoRide: RidePreview = {
  pickupMinutes: 12,
  rideMinutes: 25,
  availableSeats: 5,
  pricePerSeat: 150,
};

const demoStates: { label: string; value: SearchState }[] = [
  { label: "Поиск", value: "loading" },
  { label: "Найден", value: "found" },
  { label: "Нет транспорта", value: "empty" },
  { label: "Ошибка", value: "error" },
];

export default function SearchPage() {
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useDemoAccount();

  const [searchState, setSearchState] = useState<SearchState>("found");
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  const searchUrl = location.pathname + location.search;
  const resumeBooking = location.state?.resumeBooking === true;

  const mode: RideMode = params.get("mode") === "scheduled" ? "scheduled" : "now";
  const from = params.get("from")?.trim() ?? "";
  const to = params.get("to")?.trim() ?? "";
  const date = params.get("date") ?? "";
  const time = params.get("time") ?? "";

  const passengerCount = Number(params.get("passengers"));
  const passengers =
    Number.isInteger(passengerCount) && passengerCount > 0 ? passengerCount : 1;

  const validRoute = Boolean(
    from &&
      to &&
      from.toLowerCase() !== to.toLowerCase() &&
      (mode === "now" || (date && time)),
  );

  const formattedDate = date ? date.split("-").reverse().join(".") : "";

  function handleBook() {
    if (profile) {
      setIsBookingModalOpen(true);
      return;
    }

    navigate("/login", {
      state: { from: searchUrl, resumeBooking: true },
    });
  }

  function handleCloseBooking() {
    setIsBookingModalOpen(false);

    if (resumeBooking) {
      navigate(searchUrl, { replace: true, state: null });
    }
  }

  return (
    <main className="workspace">
      <section className="results-panel">
        <Link to="/" className="results-back">
          ← Изменить маршрут
        </Link>

        <div className="results-heading">
          <span className="eyebrow">
            {mode === "now" ? "Поездка сейчас" : "Предварительный заказ"}
          </span>

          <h1>Поиск транспорта</h1>

          <p>
            {mode === "now"
              ? "Подбираем подходящий микроавтобус."
              : "Проверяем возможность поездки на выбранное время."}
          </p>
        </div>

        {validRoute ? (
          <>
            <div className="ride-summary">
              <div className="ride-summary__point">
                <span className="route-dot route-dot--start" />
                <div>
                  <small>Откуда</small>
                  <strong>{from}</strong>
                </div>
              </div>

              <div className="ride-summary__point">
                <span className="route-dot route-dot--finish" />
                <div>
                  <small>Куда</small>
                  <strong>{to}</strong>
                </div>
              </div>

              <div className="ride-summary__extra">
                <span>Пассажиры: {passengers}</span>
                {mode === "scheduled" && (
                  <span>{formattedDate} в {time}</span>
                )}
              </div>
            </div>

            <div className="demo-warning">
              Демонстрация интерфейса. Поиск реального транспорта пока не подключён.
            </div>

            <p className="search-demo-label">Проверить состояние поиска:</p>

            <div
              className="search-demo-controls"
              role="group"
              aria-label="Демонстрационные состояния поиска"
            >
              {demoStates.map(({ label, value }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={searchState === value}
                  onClick={() => setSearchState(value)}
                >
                  {label}
                </button>
              ))}
            </div>

            <SearchStatus state={searchState} />

            {searchState === "found" && (
              <>
                <TripCard
                  ride={demoRide}
                  mode={mode}
                  passengers={passengers}
                  onBook={handleBook}
                />

                {profile && (isBookingModalOpen || resumeBooking) && (
                  <BookingModal
                    userId={profile.id}
                    onClose={handleCloseBooking}
                    ride={{
                      tripId: 1,
                      from,
                      to,
                      departureTime:
                        mode === "scheduled" ? `${date}T${time}:00` : undefined,
                      pickupMinutes: demoRide.pickupMinutes,
                      pricePerSeat: demoRide.pricePerSeat,
                      availableSeats: demoRide.availableSeats,
                      passengers,
                      mode,
                    }}
                  />
                )}
              </>
            )}
          </>
        ) : (
          <div className="demo-warning">
            Параметры поездки не заполнены. Вернитесь на главную страницу
            и выберите маршрут.
          </div>
        )}
      </section>

      <div className="workspace__map">
        <ServiceMap />
      </div>
    </main>
  );
}