import { createContext, useContext } from "react";
import type { DemoProfile } from "./demoProfiles";

export const DemoAccountContext = createContext<{
  profile: DemoProfile | null;
  setProfile: (profile: DemoProfile | null) => void;
} | null>(null);

export function useDemoAccount() {
  const account = useContext(DemoAccountContext);
  if (!account) throw new Error("Отсутствует DemoAccountProvider");
  return account;
}