export type DemoProfile = {
  id: number;
  name: string;
  phone?: string;
};

export const sampleProfile: DemoProfile = {
  id: 1,
  name: "Демо-пассажир",
  phone: "+70000000001",
};

export const demoCode = "1234";

const profileKey = "po_puti_demo_profiles_v1";
const sessionKey = "po_puti_demo_session_v1";

function readProfiles(): DemoProfile[] {
  try {
    const profiles = JSON.parse(localStorage.getItem(profileKey) ?? "[]");

    return Array.isArray(profiles)
      ? profiles.filter(
          (profile) =>
            profile &&
            Number.isSafeInteger(profile.id) &&
            typeof profile.name === "string"
        )
      : [];
  } catch {
    return [];
  }
}

export function normalizePhone(value: string): string {
  const digits = value.replace(/[+\s()-]/g, "");

  if (/^\d{10}$/.test(digits)) return `+7${digits}`;
  if (/^[78]\d{10}$/.test(digits)) return `+7${digits.slice(1)}`;

  throw new Error("Укажите номер в формате +7 XXX XXX-XX-XX.");
}

export function findProfileByPhone(phone: string): DemoProfile | undefined {
  return [sampleProfile, ...readProfiles()].find(
    (profile) => profile.phone === phone
  );
}

export function registerProfile(name: string, phone: string): DemoProfile {
  const cleanName = name.trim();
  const cleanPhone = normalizePhone(phone);

  if (!cleanName || cleanName.length > 60) {
    throw new Error("Укажите имя длиной до 60 символов.");
  }

  if (findProfileByPhone(cleanPhone)) {
    throw new Error("Аккаунт с таким номером уже есть. Вернитесь к вводу номера.");
  }

  const profiles = readProfiles();
  const id = Math.max(sampleProfile.id, ...profiles.map((profile) => profile.id)) + 1;
  const profile = { id, name: cleanName, phone: cleanPhone };

  localStorage.setItem(profileKey, JSON.stringify([...profiles, profile]));
  return profile;
}

export function readSession(): DemoProfile | null {
  try {
    const id = Number(sessionStorage.getItem(sessionKey));

    return [sampleProfile, ...readProfiles()].find(
      (profile) => profile.id === id
    ) ?? null;
  } catch {
    return null;
  }
}

export function writeSession(profile: DemoProfile | null) {
  try {
    if (profile) {
      sessionStorage.setItem(sessionKey, String(profile.id));
    } else {
      sessionStorage.removeItem(sessionKey);
    }
  } catch {
    // Если браузер запретил хранилище, сессия действует до перезагрузки.
  }
}

type AuthIntent = {
  from: string;
  resumeBooking?: boolean;
};

export function readAuthIntent(state: unknown): AuthIntent {
  const fallback = { from: "/my-trips" };

  if (
    !state ||
    typeof state !== "object" ||
    !("from" in state) ||
    typeof state.from !== "string"
  ) {
    return fallback;
  }

  if (!/^\/(my-trips|search|booking)(\?|$)/.test(state.from)) {
    return fallback;
  }

  return {
    from: state.from,
    resumeBooking:
      "resumeBooking" in state &&
      state.resumeBooking === true &&
      /^\/search(\?|$)/.test(state.from),
  };
}