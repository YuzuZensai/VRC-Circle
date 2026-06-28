import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Trans } from "react-i18next";
import { api } from "../../../lib/api";
import { useI18n } from "../../../lib/i18n";
import { Button, Field } from "../../../components/ui";
import { Notice, Section, useAction, type SectionProps } from "../ui";

export function DangerZoneSection({ settings, onChange }: SectionProps) {
  const { t } = useI18n();
  const { busy, error, run } = useAction();
  const [confirmText, setConfirmText] = useState("");
  const canDelete = confirmText.trim().toUpperCase() === "DELETE";

  async function remove() {
    await run(api.settings.deleteAccount(), {
      onOk: onChange,
      okMsg: t("account:dangerZone.scheduledOk"),
    });
    setConfirmText("");
  }

  if (settings.accountDeletionDate) {
    return (
      <Section title={t("account:dangerZone.title")} icon={<AlertTriangle size={16} />} danger>
        <p className="text-[13px]">
          <Trans
            i18nKey="account:dangerZone.scheduled"
            values={{ date: new Date(settings.accountDeletionDate).toLocaleDateString() }}
            components={[<span className="font-semibold" />]}
          />
        </p>
      </Section>
    );
  }

  return (
    <Section
      title={t("account:dangerZone.title")}
      icon={<AlertTriangle size={16} />}
      description={t("account:dangerZone.description")}
      danger
    >
      <div className="flex flex-wrap items-end gap-2.5">
        <Field
          label={t("account:dangerZone.confirmField")}
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
        />
        <Button variant="danger" onClick={remove} loading={busy} disabled={!canDelete}>
          {t("account:dangerZone.delete")}
        </Button>
      </div>
      <Notice error={error} />
    </Section>
  );
}
