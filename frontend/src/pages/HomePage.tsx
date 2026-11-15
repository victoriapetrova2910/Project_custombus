import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import SearchForm from "../components/SearchForm";
import ServiceMap from "../components/LazyServiceMap";
import type { MapPicker } from "../components/ServiceMap";

export default function HomePage() {
  const formRef = useRef<HTMLElement>(null);
  const location = useLocation();
  const [picker, setPicker] = useState<MapPicker>();

  function openPicker(next: MapPicker) {
    setPicker({
      ...next,
      onSelect(point) {
        next.onSelect(point);
        setPicker(undefined);
        requestAnimationFrame(() => formRef.current?.focus({ preventScroll: true }));
      },
    });
  }

  useEffect(() => {
    if (location.hash !== "#trip-form") return;

    formRef.current?.focus({ preventScroll: true });
    formRef.current?.scrollIntoView({ block: "nearest" });
  }, [location]);

  return (
    <main className={"workspace workspace--home workspace--map-overlay" + (picker ? " workspace--picking" : "")}>
      <section
        id="trip-form"
        ref={formRef}
        className="workspace__sidebar"
        tabIndex={-1}
        aria-label="Форма поиска поездки"
        inert={Boolean(picker)}
      >
        <SearchForm onPick={openPicker} onCancelPick={() => setPicker(undefined)} />
      </section>

      <div className="workspace__map">
        <ServiceMap picker={picker} onCancelPick={() => {
          setPicker(undefined);
          requestAnimationFrame(() => formRef.current?.focus({ preventScroll: true }));
        }} />
      </div>
    </main>
  );
}