import { BrowserRouter, Routes, Route } from "react-router-dom";

import Header from "./components/Header";
import HomePage from "./pages/HomePage";
import SearchPage from "./pages/SearchPage";
import BookingPage from "./pages/BookingPage";
import MyTripsPage from "./pages/MyTripsPage";
import DispatcherPage from "./pages/DispatcherPage";

function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Header />

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/booking" element={<BookingPage />} />
          <Route path="/my-trips" element={<MyTripsPage />} />
          <Route path="/dispatcher" element={<DispatcherPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
