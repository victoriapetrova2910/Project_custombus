import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import DemoAccountProvider from "./account/DemoAccountProvider";
import { useDemoAccount } from "./account/useDemoAccount";
import Header from "./components/Header";
import AccountPage from "./pages/AccountPage";
import BookingPage from "./pages/BookingPage";
import DispatcherPage from "./pages/DispatcherPage";
import HomePage from "./pages/HomePage";
import MyTripsPage from "./pages/MyTripsPage";
import SearchPage from "./pages/SearchPage";

function BookingRoute() {
  const { profile } = useDemoAccount();
  const location = useLocation();

  if (profile) {
    return <BookingPage />;
  }

  return (
    <Navigate
      to="/login"
      replace
      state={{ from: location.pathname + location.search }}
    />
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <DemoAccountProvider>
        <div className="app-shell">
          <Header />

          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/booking" element={<BookingRoute />} />
            <Route path="/my-trips" element={<MyTripsPage />} />
            <Route path="/login" element={<AccountPage key="login" />} />
            <Route path="/register" element={<AccountPage key="register" />} />
            <Route path="/dispatcher" element={<DispatcherPage />} />
          </Routes>
        </div>
      </DemoAccountProvider>
    </BrowserRouter>
  );
}