import { NavLink } from "react-router-dom";
import BusLogo from "./BusLogo";

export default function Header() {
  return (
    <header className="site-header">
      <NavLink to="/" className="brand">
        <span className="brand__icon">
          <BusLogo />
        </span>
        <span className="brand__text">
          <strong>По пути</strong>
          <small>Сервис перевозок по требованию</small>
        </span>
      </NavLink>

      <nav className="site-nav" aria-label="Навигация">
        <NavLink to="/" end>
          Главная
        </NavLink>

        <NavLink to="/search">
          Найти поездку
        </NavLink>

        <NavLink to="/my-trips">
          Мои поездки
        </NavLink>
      </nav>
    </header>
  );
}
