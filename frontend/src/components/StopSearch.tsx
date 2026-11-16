import type { FormEvent } from "react";

export default function StopSearch({ value, pending, onChange, onFindAddress }: {
  value: string;
  pending: boolean;
  onChange: (value: string) => void;
  onFindAddress: () => void;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (value.trim() && !pending) onFindAddress();
  }

  return (
    <form className="stop-directory__search" onSubmit={submit}>
      <label>
        Остановка или адрес
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Название, улица или номер дома"
        />
      </label>
      <button type="submit" disabled={!value.trim() || pending}>
        {pending ? "Ищем адрес…" : "Найти по адресу"}
      </button>
    </form>
  );
}
