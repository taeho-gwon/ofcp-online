import { GoogleOAuthProvider } from "@react-oauth/google";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { Footer } from "./components/Footer";
import { RequireAuth } from "./components/RequireAuth";
import { About } from "./pages/About";
import { Game } from "./pages/Game";
import { History } from "./pages/History";
import { Lobby } from "./pages/Lobby";
import { Login } from "./pages/Login";
import { MyPage } from "./pages/MyPage";
import { NicknameSetup } from "./pages/NicknameSetup";
import { Practice } from "./pages/Practice";
import { Replay } from "./pages/Replay";
import { Room } from "./pages/Room";
import { Tutorial } from "./pages/Tutorial";
import { TutorialList } from "./pages/TutorialList";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <Toaster position="top-right" richColors />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/nickname-setup" element={<NicknameSetup />} />
          <Route path="/practice" element={<Practice />} />
          <Route path="/tutorial" element={<TutorialList />} />
          <Route path="/tutorial/:scenarioId" element={<Tutorial />} />
          <Route path="/about" element={<About />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <Lobby />
              </RequireAuth>
            }
          />
          <Route
            path="/room/:code"
            element={
              <RequireAuth>
                <Room />
              </RequireAuth>
            }
          />
          <Route
            path="/game/:gameId"
            element={
              <RequireAuth>
                <Game />
              </RequireAuth>
            }
          />
          <Route
            path="/me"
            element={
              <RequireAuth>
                <MyPage />
              </RequireAuth>
            }
          />
          <Route
            path="/history"
            element={
              <RequireAuth>
                <History />
              </RequireAuth>
            }
          />
          <Route
            path="/replay/:gameId"
            element={
              <RequireAuth>
                <Replay />
              </RequireAuth>
            }
          />
        </Routes>
        <Footer />
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}

export default App;
