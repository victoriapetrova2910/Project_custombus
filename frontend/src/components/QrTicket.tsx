import { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import type { Preorder } from "../api/preorders";

export default function QrTicket({ order }: { order: Preorder }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const code = order.demo_ticket_code;

  if (order.status !== "confirmed" || !code) return null;
  if (order.demo_boarded_at) {
    return <p className="qr-ticket">Посадка по этому билету уже отмечена.</p>;
  }

  function downloadTicket() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `po-puti-ticket-${order.id}.png`;
    link.click();
  }

  return (
    <section className="qr-ticket" aria-label="Демонстрационный билет">
      <strong>QR-билет · Мест в заказе — {order.seats_count}</strong>
      <p>Покажите QR при посадке. Один код на весь заказ.</p>
      <QRCodeCanvas
        ref={canvasRef}
        value={code}
        size={192}
        marginSize={4}
        level="M"
        role="img"
        aria-label={`QR-билет заказа №${order.id}`}
      />
      <code>{code}</code>
      <button type="button" className="btn btn--secondary btn--sm" onClick={downloadTicket}>
        Скачать QR-билет
      </button>
    </section>
  );
}
