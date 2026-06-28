import { ChevronRight } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { api } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import { useGameLaunch } from "./useGameLaunch";

export function LaunchButton() {
  const { t } = useI18n();
  const { running, supported, launching, markLaunching } = useGameLaunch();

  const onClick = async () => {
    if (launching) return;
    if (!running) markLaunching();
    try {
      await api.game.launch();
    } catch {}
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
