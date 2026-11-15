import { Navigate, useNavigate } from "react-router-dom";
import { isDemoAdmin } from "../account/demoProfiles";
import { useDemoAccount } from "../account/useDemoAccount";
import DispatcherPage from "./DispatcherPage";

export default function DispatcherAccess() {
  const { profile, setProfile } = useDemoAccount();
  const navigate = useNavigate();

  if (!profile) return <Navigate to="/login" state={{ from: "/dispatcher" }} replace />;
  if (!isDemoAdmin(profile)) return <Navigate to="/my-trips" replace />;

  return <DispatcherPage onExit={() => {
    setProfile(null);
    navigate("/", { replace: true });
  }} />;
}
