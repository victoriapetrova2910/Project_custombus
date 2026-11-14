import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  demoCode,
  findProfileByPhone,
  normalizePhone,
  readAuthIntent,
  registerProfile,
  sampleProfile,
  type DemoProfile,
} from "../account/demoProfiles";
import { useDemoAccount } from "../account/useDemoAccount";

type Step = "phone" | "code" | "name";

export default function AccountPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setProfile } = useDemoAccount();
  const intent = readAuthIntent(location.state);

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  function finish(profile: DemoProfile) {
    setProfile(profile);
    navigate(intent.from, {
      replace: true,
      state: { resumeBooking: intent.resumeBooking },
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const fields = new FormData(event.currentTarget);

    try {
      if (step === "phone") {
        setPhone(normalizePhone(phone));
        setStep("code");
        return;
      }

      if (step === "code") {
        if (String(fields.get("code") ?? "").trim() !== demoCode) {
          setError("Неверный код. Проверьте демо-код и попробуйте снова.");
          return;
        }

        const profile = findProfileByPhone(phone);

        if (profile) {
          finish(profile);
        } else {
          setStep("name");
        }
        return;
      }

      finish(registerProfile(String(fields.get("name") ?? ""), phone));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Не удалось открыть демо-профиль."
      );
    }
  }

  function changePhone() {
    setError("");
    setStep("phone");
  }

  return (
    <main className="account-page">
      <section className="account-card" aria-labelledby="account-heading">
        <span className="eyebrow">Демонстрационный режим</span>
        <h1 id="account-heading">Войти или зарегистрироваться</h1>

        {step === "phone" ? (
          <p className="account-note">
            Используйте вымышленный номер. SMS не отправляется, профиль
            сохраняется в этом браузере.
          </p>
        ) : step === "code" ? (
          <p className="account-note">
            Номер <strong>{phone}</strong>. Демо-код <strong>{demoCode}</strong>.
            SMS не отправлено.
          </p>
        ) : (
          <p>Для номера {phone} ещё нет аккаунта. Как к вам обращаться?</p>
        )}

        <form className="account-form" key={step} onSubmit={handleSubmit}>
          {step === "phone" && (
            <label className="account-field">
              Номер телефона
              <input
                name="phone"
                type="tel"
                autoComplete="off"
                placeholder="+7 000 000-00-02"
                value={phone}
                onChange={(event) => {
                  setPhone(event.target.value);
                  setError("");
                }}
                maxLength={24}
                required
              />
            </label>
          )}

          {step === "code" && (
            <label className="account-field">
              Код подтверждения
              <input
                name="code"
                inputMode="numeric"
                autoComplete="off"
                placeholder="4 цифры"
                maxLength={4}
                required
              />
            </label>
          )}

          {step === "name" && (
            <label className="account-field">
              Имя
              <input
                name="name"
                placeholder="Например, Анна"
                maxLength={60}
                required
              />
            </label>
          )}

          {error && <p className="account-error" role="alert">{error}</p>}

          <button type="submit" className="btn btn--primary">
            {step === "phone"
              ? "Получить демо-код"
              : step === "code"
                ? "Подтвердить код"
                : "Создать демо-аккаунт"}
          </button>
        </form>

        <button
          type="button"
          className="btn btn--secondary account-demo-entry"
          onClick={step === "phone" ? () => finish(sampleProfile) : changePhone}
        >
          {step === "phone" ? "Войти как демо-пассажир" : "Изменить номер"}
        </button>
      </section>
    </main>
  );
}