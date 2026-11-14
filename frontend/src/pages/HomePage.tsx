import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import SearchForm from "../components/SearchForm";
import ServiceMap from "../components/LazyServiceMap";

export default function HomePage() {
  const formRef = useRef<HTMLElement>(null);
  const location = useLocation();

  useEffect(() => {
    if (location.hash !== "#trip-form") return;

    formRef.current?.focus({ preventScroll: true });
    formRef.current?.scrollIntoView({ block: "nearest" });
  }, [location]);

  return (
    <main className="workspace workspace--home">
      <section
        id="trip-form"
        ref={formRef}
        className="workspace__sidebar"
        tabIndex={-1}
        aria-label="Форма поиска поездки"
      >
        <SearchForm />
      </section>

      <div className="workspace__map">
        <ServiceMap />
      </div>
    </main>
  );
}