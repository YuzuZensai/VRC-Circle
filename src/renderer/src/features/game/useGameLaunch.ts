import { useEffect, useState } from "react";
import { api, events } from "../../lib/api";

export function useGameLaunch() {
  const [running, setRunning] = useState(false);
  const [supported, setSupported] = useState(true);
  const [launching, setLaunching] = useState(false);

  useEffect(() => {
    void api.game.status().then((s) => {
      setRunning(s.running);
      setSupported(s.supported);
    });
    return events.on("game:changed", (s) => {
      setRunning(s.running);
      if (s.launching) setLaunching(true);
      if (s.running) setLaunching(false);
    });
  }, []);

  return { running, supported, launching, markLaunching: () => setLaunching(true) };
}
