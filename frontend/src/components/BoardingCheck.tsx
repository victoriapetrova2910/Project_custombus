import { useState, type FormEvent } from "react";
import { boardDemoTicket } from "../account/demoOrders";

type Result = { ok: boolean; text: string };

async function readQr(file: File) {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    throw new Error("Выберите изображение PNG, JPEG или WebP.");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("Выберите изображение размером до 10 МБ.");
  }

  const { default: jsQR } = await import("jsqr");
  const image = await createImageBitmap(file);

  try {
    const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Не удалось открыть изображение.");

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    const qr = jsQR(pixels.data, pixels.width, pixels.height);
    if (!qr) throw new Error("QR-код не распознан. Попробуйте файл билета или введите код вручную.");
    return qr.data;
  } finally {
    image.close();
  }
}

export default function BoardingCheck() {
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const form = event.currentTarget;
    const data = new FormData(form);
    const text = String(data.get("code") ?? "").trim();
    const file = data.get("qr");
    setBusy(true);
    setResult(null);

    try {
      const code = text || (file instanceof File && file.size ? await readQr(file) : "");
      if (!code) throw new Error("Загрузите QR-билет или введите код под ним.");

      const order = boardDemoTicket(code);
      setResult({
        ok: true,
        text: `Посадка отмечена. Заказ №${order.id} · Мест — ${order.seats_count} · ${order.departure_point} → ${order.destination_point}`,
      });
      form.reset();
    } catch (cause) {
      setResult({
        ok: false,
        text: cause instanceof Error ? cause.message : "Не удалось проверить билет.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="dispatcher-section">
      <div className="table-card">
        <div className="table-card__header">
          <div>
            <h2>Посадка по QR-билету</h2>
            <p>Демо-проверка работает с билетами, купленными в этом браузере.</p>
          </div>
        </div>
        <form className="boarding-form" onSubmit={submit}>
          <label className="account-field">
            Изображение QR-билета
            <input name="qr" type="file" accept="image/png,image/jpeg,image/webp" />
          </label>
          <label className="account-field">
            Или код под QR
            <input name="code" placeholder="POPUTI-…" autoComplete="off" maxLength={40} />
          </label>
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? "Проверяем…" : "Проверить и отметить посадку"}
          </button>
        </form>
        {result && (
          <p className={result.ok ? "boarding-success" : "account-error"} role={result.ok ? "status" : "alert"}>
            {result.text}
          </p>
        )}
      </div>
    </section>
  );
}
