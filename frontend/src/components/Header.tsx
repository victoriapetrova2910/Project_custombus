import { useEffect, useId, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useDemoAccount } from "../account/useDemoAccount";

export default function Header() {
  const { profile } = useDemoAccount();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const initial =
    profile?.name.trim().slice(0, 1).toLocaleUpperCase("ru-RU") || "П";

  useEffect(() => {
    if (!open) return;

    function handleOutsideClick(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !menuRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <header className="site-header site-header--go">
      <Link to="/" className="brand" onClick={() => setOpen(false)}>
        <img src="/favicon.png" alt="" className="brand__logo" />

        <span className="brand__text">
          <strong>По пути</strong>
          <small>Микроавтобус по требованию</small>
        </span>
      </Link>

      <nav className="site-nav" aria-label="Основная навигация">
        <div
          className="nav-disclosure"
          ref={menuRef}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              setOpen(false);
            }
          }}
        >
          <button
            type="button"
            className="site-nav__item site-nav__trigger"
            ref={triggerRef}
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpen((current) => !current)}
          >
            Пассажирам
            <span className="site-nav__chevron" aria-hidden="true" />
          </button>

          <ul className="site-nav__dropdown" id={menuId} hidden={!open}>
            <li>
              <Link to="/#trip-form" onClick={() => setOpen(false)}>
                Выбрать маршрут
                <span aria-hidden="true">›</span>
              </Link>
            </li>

            <li>
              <NavLink to="/my-trips" onClick={() => setOpen(false)}>
                Мои поездки
                <span aria-hidden="true">›</span>
              </NavLink>
            </li>
          </ul>
        </div>

        <NavLink
          to="/dispatcher"
          className="site-nav__item"
          onClick={() => setOpen(false)}
        >
          Диспетчер
        </NavLink>

        {profile && (
          <NavLink
            to="/my-trips"
            className="site-nav__item account-chip"
            onClick={() => setOpen(false)}
            title={profile.name}
          >
            <span className="account-chip__name">{profile.name}</span>
            <span className="account-chip__avatar" aria-hidden="true">
              {initial}
            </span>
          </NavLink>
        )}
      </nav>
    </header>
  );
}