import { GoogleOAuthProvider } from "@react-oauth/google";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { Entry } from "./pages/Entry";
import { Game } from "./pages/Game";
import { Login } from "./pages/Login";
import { NicknameSetup } from "./pages/NicknameSetup";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <Toaster position="top-right" richColors />
        <Routes>
          <Route path="/" element={<Entry />} />
          <Route path="/login" element={<Login />} />
          <Route path="/nickname-setup" element={<NicknameSetup />} />
          <Route path="/game/:gameId" element={<Game />} />
        </Routes>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}

export default App;
