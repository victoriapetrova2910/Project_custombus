
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Header from "./components/Header";
import HomePage from "./pages/HomePage";
import SearchPage from "./pages/SearchPage";

function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Header />

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />

          <Route
            path="/my-trips"
            element={
              <main className="placeholder-page">
                <h1>Мои поездки</h1>
                <p>Раздел находится в разработке.</p>
              </main>
            }
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
