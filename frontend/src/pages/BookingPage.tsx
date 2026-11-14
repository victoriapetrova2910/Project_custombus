import { useNavigate, useSearchParams } from "react-router-dom";
import { useDemoAccount } from "../account/useDemoAccount";
import BookingModal from "../components/BookingModal";

function positiveInteger(value: string | null, fallback: number) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

export default function BookingPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { profile } = useDemoAccount();

  if (!profile) return null;

  const date = params.get("date");
  const time = params.get("time");
  const seats = positiveInteger(params.get("seats"), 5);
  const passengers = Math.min(positiveInteger(params.get("passengers"), 1), seats);

  return (
    <BookingModal
      userId={profile.id}
      onClose={() => navigate(`/search?${params.toString()}`)}
      ride={{
        tripId: positiveInteger(params.get("trip_id"), 1),
        from: params.get("from") || "Метро Прокшино",
        to: params.get("to") || "Коммунарка",
        departureTime: date && time ? `${date}T${time}:00` : undefined,
        pickupMinutes: 12,
        pricePerSeat: positiveInteger(params.get("price"), 150),
        availableSeats: seats,
        passengers,
        mode: date && time ? "scheduled" : "now",
      }}
    />
  );
}