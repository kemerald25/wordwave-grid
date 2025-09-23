import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Providers } from "./providers/Providers";
import { useIsInMiniApp } from "@coinbase/onchainkit/minikit";
import { AuthGate } from "./components/AuthGate";
import Index from "./pages/Index";
import Lobby from "./pages/Lobby";
import GameDemo from "./pages/GameDemo";
import NotFound from "./pages/NotFound";
import { useEffect } from "react";

const AppContent = () => {
  const { isInMiniApp } = useIsInMiniApp();
  const location = useLocation();

  useEffect(() => {
    // Log environment info for debugging
    console.log("App loaded - Location:", location.pathname);
    console.log("Is in mini app:", isInMiniApp);
    console.log("User agent:", navigator.userAgent);
  }, [location.pathname, isInMiniApp]);

  return (
    <BrowserRouter>
      {isInMiniApp}
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
