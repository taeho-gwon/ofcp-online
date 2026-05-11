import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { Entry } from "./pages/Entry";
import { Game } from "./pages/Game";

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors />
      <Routes>
        <Route path="/" element={<Entry />} />
        <Route path="/game/:gameId" element={<Game />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
