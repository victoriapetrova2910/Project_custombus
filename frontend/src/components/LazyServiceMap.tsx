
import { lazy, Suspense } from "react";

// Загружаем компонент карты отдельным модулем.
const ServiceMap = lazy(() => import("./ServiceMap"));

export default function LazyServiceMap() {
  return (
    <Suspense
      fallback={
        <div className="map-loading" role="status">
          <div className="map-loading__content">
            <span className="map-loading__spinner" />
            <p>Загружаем карту…</p>
          </div>
        </div>
      }
    >
      <ServiceMap />
    </Suspense>
  );
}
