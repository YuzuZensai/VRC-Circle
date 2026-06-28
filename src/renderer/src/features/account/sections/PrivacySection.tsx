import { api } from "../../../lib/api";
import { useI18n } from "../../../lib/i18n";
import { Notice, Section, ToggleRow, useAction, type SectionProps } from "../ui";

export function PrivacySection({ settings, onChange }: SectionProps) {
  const { t } = useI18n();
  const { busy, error, run } = useAction();

  function setShared(show: boolean) {
    void run(api.settings.privacy({ sharedConnectionsHidden: !show }), { onOk: onChange });
  }

  function setDiscord(show: boolean) {
    void run(api.settings.privacy({ discordFriendsHidden: !show }), { onOk: onChange });
  }

  return (
    <Section title={t("account:privacy.title")} description={t("account:privacy.description")}>
      <div className="divide-y divide-border">
        <ToggleRow
          label={t("account:privacy.mutual")}
          hint={t("account:privacy.mutualHint")}
          checked={!settings.sharedConnectionsHidden}
          onChange={setShared}
          disabled={busy}
        />
        <ToggleRow
          label={t("account:privacy.discord")}
          hint={t("account:privacy.discordHint")}
          checked={!settings.discordFriendsHidden}
          onChange={setDiscord}
          disabled={busy}
        />
      </div>
      <Notice error={error} />
    </Section>
  );
}
