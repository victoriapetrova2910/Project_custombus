import { useEffect, useId, useState } from "react";
import { findMapAddress } from "../api/mapAddress";
import { isWithinCoverage } from "../mapCoverage";
import type { ServiceStop } from "../api/stops";
import type { MapPoint } from "./ServiceMap";

type Match = Omit<MapPoint, "isAddress" | "stopId">;
type Lookup = { query: string; items: Match[]; error?: string };

export default function StopSelect({ label, value, selected, stops, onEdit, onSelect }: {
  label: string;
  value: string;
  selected: boolean;
  stops: ServiceStop[];
  onEdit: (value: string) => void;
  onSelect: (point: MapPoint) => void;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [lookup, setLookup] = useState<Lookup>();
  const query = value.trim();
  const searching = open && !selected && query.length >= 1;
  const result = lookup?.query === query ? lookup : undefined;
  const prefix = query.toLocaleLowerCase("ru");
  const matchingStops = searching ? stops.filter((stop) =>
    (" " + stop.name.toLocaleLowerCase("ru")).includes(" " + prefix) &&
    isWithinCoverage(stop.longitude, stop.latitude)
  ).slice(0, 5) : [];
  const matches: MapPoint[] = [
    ...(searching ? (result?.items ?? []).map((item) => ({ ...item, isAddress: true })) : []),
    ...matchingStops.map((stop) => ({ ...stop, label: stop.name, stopId: stop.id, isAddress: false })),
  ];

  useEffect(() => {
    if (!searching) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const items = await findMapAddress(query, 55.61, 37.39, controller.signal);
        if (controller.signal.aborted) return;
        const available = items.filter((item) => isWithinCoverage(item.longitude, item.latitude));
        setLookup({
          query,
          items: available.filter((item, index) => available.findIndex((other) => other.label === item.label) === index),
          error: !available.length && items.length ? "Найденные адреса вне зоны обслуживания." : undefined,
        });
      } catch {
        if (!controller.signal.aborted) setLookup({ query, items: [], error: "Не удалось загрузить адреса. Попробуйте ещё раз или выберите точку на карте." });
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, searching]);

  function choose(match: MapPoint) {
    onSelect(match);
    setHighlight(-1);
    setOpen(false);
  }

  return (
    <div className="address-input">
      <label className="field-label" htmlFor={id}>{label}</label>
      <input
        id={id}
        type="text"
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={matches.length > 0}
        aria-controls={matches.length > 0 ? id + "-suggestions" : undefined}
        aria-activedescendant={matches[highlight] ? id + "-" + highlight : undefined}
        value={value}
        placeholder="Введите остановку или адрес"
        onFocus={() => setOpen(true)}
        onBlur={() => { setOpen(false); setHighlight(-1); }}
        onChange={(event) => {
          setOpen(true);
          setHighlight(-1);
          onEdit(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            setHighlight(-1);
          } else if (matches.length && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
            event.preventDefault();
            setHighlight((index) => event.key === "ArrowDown"
              ? Math.min(index + 1, matches.length - 1)
              : Math.max(0, index - 1));
          } else if (event.key === "Enter" && !selected) {
            event.preventDefault();
            const match = matches[highlight];
            if (match) choose(match);
          }
        }}
      />
      {searching && (matches.length ? (
        <ul className="address-input__suggestions" id={id + "-suggestions"} role="listbox" aria-label={label}>
          {matches.map((match, index) => (
            <li key={match.stopId ?? match.label} id={id + "-" + index} role="option" aria-selected={highlight === index}>
              <button
                type="button"
                tabIndex={-1}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => choose(match)}
              >{match.label}</button>
            </li>
          ))}
        </ul>
      ) : (
        <span className="address-input__status" role="status">
          {result?.error ?? (result ? "Адрес не найден. Уточните запрос." : "Ищем адрес…")}
        </span>
      ))}
    </div>
  );
}
