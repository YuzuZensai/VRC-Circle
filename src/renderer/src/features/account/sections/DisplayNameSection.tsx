import { useState } from "react";
import { Clock } from "lucide-react";
import { Trans } from "react-i18next";
import { api } from "../../../lib/api";
import { formatDate } from "../../../lib/format";
import { useI18n } from "../../../lib/i18n";
import { Button, Field, Modal } from "../../../components/ui";
import {
  Notice,
  Section,
  addDays,
  daysSince,
  lastChangedLabel,
  useAction,
  type SectionProps,
} from "../ui";

export function DisplayNameSection({ settings, onChange }: SectionProps) {
  const { t } = useI18n();
  const [name, setName] = useState(settings.displayName);
  const [password, setPassword] = useState("");
  const [confirmRevert, setConfirmRevert] = useState(false);
  const { busy, error, ok, run } = useAction();

  const cooldownDays = settings.supporter ? 30 : 90;
  const changedDaysAgo = daysSince(settings.displayNameChangedAt);
  const inCooldown = changedDaysAgo !== null && changedDaysAgo < cooldownDays;
  const daysLeft = inCooldown ? cooldownDays - changedDaysAgo : 0;
  const canRevert =
    settings.previousDisplayName != null && changedDaysAgo !== null && changedDaysAgo <= 90;
  const dirty = name.trim() !== settings.displayName && name.trim().length > 0;

  async function submit() {
    await run(api.settings.displayName(name.trim(), password), {
      onOk: (next) => {
        onChange(next);
        setName(next.displayName);
        setPassword("");
      },
      okMsg: t("account:displayName.updated"),
    });
  }

  async function revert() {
    setConfirmRevert(false);
    await run(api.settings.revertDisplayName(password), {
      onOk: (next) => {
        onChange(next);
        setName(next.displayName);
        setPassword("");
      },
      okMsg: t("account:displayName.reverted"),
    });
  }

  return (
    <Section
      title={t("account:displayName.title")}
      description={
        settings.supporter
          ? t("account:displayName.descriptionSupporter")
          : t("account:displayName.description")
      }
    >
      {inCooldown ? (
        <CooldownNotice
          changedAt={settings.displayNameChangedAt!}
          changedDaysAgo={changedDaysAgo!}
          cooldownDays={cooldownDays}
          daysLeft={daysLeft}
          supporter={settings.supporter}
          canRevert={canRevert}
        />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label={t("account:displayName.field")}
          value={name}
          disabled={inCooldown}
          onChange={(e) => setName(e.target.value)}
        />
        <Field
          label={t("account:common.currentPassword")}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2.5">
        {!inCooldown ? (
          <Button onClick={submit} loading={busy} disabled={!dirty || !password}>
            {t("account:displayName.save")}
          </Button>
        ) : null}
        {canRevert ? (
          <Button
            variant="ghost"
            onClick={() => setConfirmRevert(true)}
            loading={busy}
            disabled={!password}
            title={!password ? t("account:displayName.revertNeedsPassword") : undefined}
          >
            {t("account:displayName.revertTo", { name: settings.previousDisplayName })}
          </Button>
        ) : null}
        {canRevert && !password ? (
          <span className="text-[12px] text-faint">
            {t("account:displayName.enableRevertHint")}
          </span>
        ) : null}
        {!inCooldown && lastChangedLabel(t, settings.displayNameChangedAt) ? (
          <span className="text-[12px] text-faint">
            {lastChangedLabel(t, settings.displayNameChangedAt)}
          </span>
        ) : null}
      </div>
      <Notice error={error} ok={ok} />
      <Modal
        open={confirmRevert}
        onClose={() => setConfirmRevert(false)}
        title={t("account:displayName.revertModal.title")}
        icon={<Clock size={16} />}
        confirmLabel={t("account:displayName.revertModal.confirm")}
        onConfirm={revert}
        confirmLoading={busy}
      >
        <Trans
          i18nKey="account:displayName.revertModal.body"
          values={{ name: settings.previousDisplayName, days: cooldownDays }}
          components={[
            <span className="font-semibold text-text" />,
            <span className="font-semibold text-text" />,
          ]}
        />
      </Modal>
    </Section>
  );
}

function CooldownNotice({
  changedAt,
  changedDaysAgo,
  cooldownDays,
  daysLeft,
  supporter,
  canRevert,
}: {
  changedAt: string;
  changedDaysAgo: number;
  cooldownDays: number;
  daysLeft: number;
  supporter: boolean;
  canRevert: boolean;
}) {
  const { t } = useI18n();
  const ago =
    changedDaysAgo <= 0
      ? t("account:displayName.cooldown.agoToday")
      : t("account:displayName.cooldown.agoDays", { count: changedDaysAgo });
  const left = t("account:displayName.cooldown.left", { count: daysLeft });
  return (
    <div className="mb-4 flex gap-3 rounded-lg border border-border bg-surface p-3.5">
      <Clock size={16} className="mt-0.5 shrink-0 text-muted" />
      <div className="text-[12.5px] leading-relaxed">
        <div className="font-semibold text-text">{t("account:displayName.cooldown.heading")}</div>
        <p className="mt-1 text-muted">
          <Trans
            i18nKey={
              supporter
                ? "account:displayName.cooldown.bodySupporter"
                : "account:displayName.cooldown.body"
            }
            values={{
              date: formatDate(changedAt),
              ago,
              days: cooldownDays,
              unlockDate: formatDate(addDays(changedAt, cooldownDays)),
              left,
            }}
            components={[
              <span className="font-semibold text-text" />,
              <span className="font-semibold text-text" />,
              <span className="font-semibold text-text" />,
            ]}
          />
        </p>
        {canRevert ? (
          <p className="mt-1.5 text-muted">{t("account:displayName.cooldown.canRevert")}</p>
        ) : null}
        {!supporter ? (
          <p className="mt-1.5 text-muted">{t("account:displayName.cooldown.upsell")}</p>
        ) : null}
      </div>
    </div>
  );
}
