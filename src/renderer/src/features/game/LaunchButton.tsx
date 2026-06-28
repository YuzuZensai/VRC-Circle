import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { api, events } from "../../lib/api";
import { useI18n } from "../../lib/i18n";

export function LaunchButton() {
  const { t } = useI18n();
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
    });
  }, []);

  useEffect(() => {
    if (running) setLaunching(false);
  }, [running]);

  const onClick = async () => {
    if (launching) return;
    if (!running) setLaunching(true);
    try {
      const s = await api.game.launch();
      setRunning(s.running);
    } catch {
      setLaunching(false);
    }
  };

  if (!supported) {
    return (
      <Button variant="link" disabled title={t("game:unsupported")}>
        {t("game:unsupported")}
      </Button>
    );
  }

  const label = running ? t("game:running") : launching ? t("game:launching") : t("game:launch");

  return (
    <Button variant="link" loading={launching} onClick={onClick} title={label}>
      {label}
      {!launching ? <ChevronRight size={15} /> : null}
    </Button>
  );
}
