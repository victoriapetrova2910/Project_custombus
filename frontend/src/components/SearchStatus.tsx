
export type SearchState =
  | "loading"
  | "found"
  | "empty"
  | "error";

type SearchStatusProps = {
  state: SearchState;
};

const messages = {
  loading: {
    title: "Ищем подходящий микроавтобус",
    description:
      "Проверяем доступность транспорта для вашего маршрута.",
    icon: "",
  },
  found: {
    title: "Подходящий вариант найден",
    description:
      "Ниже показан пример предложения транспорта.",
    icon: "✓",
  },
  empty: {
    title: "Свободного транспорта пока нет",
    description:
      "Попробуйте изменить маршрут или повторить поиск позже.",
    icon: "!",
  },
  error: {
    title: "Не удалось выполнить поиск",
    description:
      "Возникла ошибка подключения. Попробуйте ещё раз позже.",
    icon: "!",
  },
};

export default function SearchStatus({
  state,
}: SearchStatusProps) {
  const message = messages[state];

  return (
    <section
      className={`search-status search-status--${state}`}
      role={state === "error" ? "alert" : "status"}
      aria-live="polite"
    >
      <div
        className="search-status__icon"
        aria-hidden="true"
      >
        {state === "loading" ? (
          <span className="search-status__spinner" />
        ) : (
          message.icon
        )}
      </div>

      <div className="search-status__content">
        <h2>{message.title}</h2>
        <p>{message.description}</p>
      </div>
    </section>
  );
}
