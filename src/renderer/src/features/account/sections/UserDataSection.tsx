import { useState } from "react";
import { api } from "../../../lib/api";
import { useI18n } from "../../../lib/i18n";
import { Button } from "../../../components/ui";
import { Notice, Section, useAction } from "../ui";

export function UserDataSection() {
  const { t } = useI18n();
  const { busy, error, ok, run } = useAction();
  const [armed, setArmed] = useState(false);

  async function reset() {
    await run(api.settings.resetUserData(), {
      okMsg: t("account:userData.done"),
    });
    setArmed(false);
  }

  return (
    <Section title={t("account:userData.title")} description={t("account:userData.description")}>
      {armed ? (
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-[13px] text-muted">{t("account:userData.confirmPrompt")}</span>
          <Button variant="danger" onClick={reset} loading={busy}>
            {t("account:userData.confirm")}
          </Button>
          <Button variant="ghost" onClick={() => setArmed(false)} disabled={busy}>
            {t("account:common.cancel")}
          </Button>
        </div>
      ) : (
        <Button variant="ghost" onClick={() => setArmed(true)}>
          {t("account:userData.reset")}
        </Button>
      )}
      <Notice error={error} ok={ok} />
    </Section>
  );
}
