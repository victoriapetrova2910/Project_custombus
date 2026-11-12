
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

type SearchMode = "now" | "scheduled";

export default function SearchForm() {
  const navigate = useNavigate();

  const [mode, setMode] = useState<SearchMode>("now");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [passengers, setPassengers] = useState(1);
  const [error, setError] = useState("");

  // Меняем остановки отправления и назначения местами
  function swapStops() {
    setFrom(to);
    setTo(from);
    setError("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!from.trim() || !to.trim()) {
      setError("Выберите остановки отправления и назначения.");
      return;
    }

    if (from.trim().toLowerCase() === to.trim().toLowerCase()) {
      setError("Остановки должны отличаться.");
      return;
    }

    if (!Number.isInteger(passengers) || passengers < 1) {
      setError("Укажите корректное количество пассажиров.");
      return;
    }

    const params = new URLSearchParams({
      mode,
      from: from.trim(),
      to: to.trim(),
      passengers: String(passengers),
    });

    if (mode === "scheduled") {
      if (!date || !time) {
        setError("Укажите дату и время поездки.");
        return;
      }

      const departure = new Date(`${date}T${time}`);
      const minutesUntil =
        (departure.getTime() - Date.now()) / 60000;

      if (!Number.isFinite(minutesUntil)) {
        setError("Некорректная дата или время.");
        return;
      }

      if (minutesUntil < 30) {
        setError("Предзаказ доступен минимум за 30 минут.");
        return;
      }

      if (minutesUntil > 48 * 60) {
        setError("Предзаказ доступен максимум за 48 часов.");
        return;
      }

      if (departure.getMinutes() % 10 !== 0) {
        setError("Выберите время с шагом 10 минут.");
        return;
      }

      params.set("date", date);
      params.set("time", time);
    }

    navigate(`/search?${params.toString()}`);
  }

  return (
    <section className="booking-panel">
      <div className="booking-panel__heading">
        <span className="eyebrow">Сервис «По пути»</span>
        <h1>Куда поедем?</h1>
        <p>Выберите удобный способ поездки</p>
      </div>

      <div
        className="mode-switch"
        role="group"
        aria-label="Режим поездки"
      >
        <button
          type="button"
          className={mode === "now" ? "selected" : ""}
          aria-pressed={mode === "now"}
          onClick={() => {
            setMode("now");
            setError("");
          }}
        >
          Поехать сейчас
        </button>

        <button
          type="button"
          className={mode === "scheduled" ? "selected" : ""}
          aria-pressed={mode === "scheduled"}
          onClick={() => {
            setMode("scheduled");
            setError("");
          }}
        >
          Запланировать
        </button>
      </div>

      <form className="booking-form" onSubmit={handleSubmit}>
        <div className="route-inputs">
          {/* Остановка отправления */}
          <label className="route-input">
            <span className="route-dot route-dot--start" />

            <span className="field-content">
              <span className="field-label">Откуда</span>

              <input
                type="text"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                placeholder="Остановка отправления"
              />
            </span>
          </label>

          <div className="route-divider" />

          {/* Кнопка обмена остановок */}
          <button
            type="button"
            className="route-swap"
            onClick={swapStops}
            aria-label="Поменять остановки местами"
            title="Поменять остановки местами"
          >
            ↕
          </button>

          {/* Остановка назначения */}
          <label className="route-input">
            <span className="route-dot route-dot--finish" />

            <span className="field-content">
              <span className="field-label">Куда</span>

              <input
                type="text"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="Остановка назначения"
              />
            </span>
          </label>
        </div>

        {mode === "scheduled" && (
          <div className="date-time-fields">
            <label className="form-field">
              <span>Дата поездки</span>

              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>

            <label className="form-field">
              <span>Время поездки</span>

              <input
                type="time"
                step={600}
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </label>
          </div>
        )}

        <label className="form-field">
          <span>Количество пассажиров</span>

          <input
            type="number"
            min={1}
            step={1}
            value={passengers}
            onChange={(e) => setPassengers(Number(e.target.value))}
          />
        </label>

        <p className="mode-hint">
          {mode === "now"
            ? "Поиск ближайшей доступной поездки."
            : "Выберите время отправления от 30 минут до 48 часов вперёд."}
        </p>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="search-button">
          {mode === "now"
            ? "Найти поездку сейчас"
            : "Найти поездку на дату"}

          <span aria-hidden="true">→</span>
        </button>
      </form>

      <p className="prototype-note">
        Учебный прототип. Поиск автобусов пока не подключён.
      </p>
    </section>
  );
}
