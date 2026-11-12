
export default function BusLogo() {
  return (
    <svg
      width="45"
      height="36"
      viewBox="0 0 90 70"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Микроавтобус По пути"
    >
      <path
        d="M11 24 Q13 12 29 12 H59 Q69 12 75 24 L83 42 V54 H7 V37 Z"
        fill="#FFDA44"
      />

      <path
        d="M23 18 H56 Q62 18 65 24 L69 34 H17 L19 25 Q20 20 23 18"
        fill="#A9D6F5"
      />

      <path
        d="M44 18 V34"
        stroke="#233F75"
        strokeWidth="3"
      />

      <path
        d="M7 43 H83 V49 H7 Z"
        fill="#315CA6"
      />

      <rect x="9" y="38" width="6" height="6" rx="2" fill="#FFF4BB" />
      <rect x="74" y="38" width="7" height="6" rx="2" fill="#FFF4BB" />

      <circle cx="26" cy="55" r="10" fill="#253449" />
      <circle cx="26" cy="55" r="5" fill="#D6E0ED" />

      <circle cx="66" cy="55" r="10" fill="#253449" />
      <circle cx="66" cy="55" r="5" fill="#D6E0ED" />
    </svg>
  );
}
