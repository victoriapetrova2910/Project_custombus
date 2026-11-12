
import SearchForm from "../components/SearchForm";
import ServiceMap from "../components/LazyServiceMap";

export default function HomePage() {
  return (
    <main className="workspace">
      <div className="workspace__sidebar">
        <SearchForm />
      </div>

      <div className="workspace__map">
        <ServiceMap />
      </div>
    </main>
  );
}
