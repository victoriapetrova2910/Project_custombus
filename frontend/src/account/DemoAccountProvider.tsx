import { useState, type ReactNode } from "react";
import { readSession, writeSession, type DemoProfile } from "./demoProfiles";
import { DemoAccountContext } from "./useDemoAccount";

export default function DemoAccountProvider({ children }: { children: ReactNode }) {
  const [profile, setActiveProfile] = useState(readSession);

  function setProfile(next: DemoProfile | null) {
    writeSession(next);
    setActiveProfile(next);
  }

  return (
    <DemoAccountContext.Provider value={{ profile, setProfile }}>
      {children}
    </DemoAccountContext.Provider>
  );
}