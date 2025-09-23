import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { Providers } from "./providers/Providers";
import { AuthGate } from "./components/AuthGate";
import Index from "./pages/Index";
import Lobby from "./pages/Lobby";
import GameDemo from "./pages/GameDemo";
import NotFound from "./pages/NotFound";

const AppContent = () => {
  const { isFrameReady, setFrameReady } = useMiniKit();

  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [setFrameReady, isFrameReady]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route
          path="/lobby"
          element={
            <AuthGate showGuestOption={true}>
              <Lobby />
            </AuthGate>
          }
        />
        <Route path="/demo" element={<GameDemo />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

const App = () => (
  <Providers>
    <AppContent />
  </Providers>
);

export default App;
