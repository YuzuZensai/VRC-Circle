import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "./lib/ThemeContext";
import { I18nProvider } from "./lib/i18n";
import { AuthProvider } from "./features/auth/AuthContext";
import { App } from "./App";
import { MAC_CONTENT_INSET } from "../../shared/window";
import { DebugWindow } from "./features/debug/DebugWindow";
import "./styles/global.css";
import "./styles/boot.css";

const isDebugWindow = window.location.hash.replace(/^#/, "") === "debug";

// macOS draws traffic-light buttons over the top-left of the titlebar
if (window.api.platform === "darwin") {
  document.documentElement.classList.add("is-mac");
  document.documentElement.style.setProperty("--mac-content-inset", `${MAC_CONTENT_INSET}px`);
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <I18nProvider>
        {isDebugWindow ? (
          <DebugWindow />
        ) : (
          <AuthProvider>
            <App />
          </AuthProvider>
        )}
      </I18nProvider>
    </ThemeProvider>
  </StrictMode>,
);
