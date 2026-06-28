import { useState } from "react";
import { api } from "../../../lib/api";
import { useI18n } from "../../../lib/i18n";
import { Button, Field } from "../../../components/ui";
import {
  ExternalButton,
  Notice,
  Section,
  WEBSITE_ACCOUNT,
  useAction,
  type SectionProps,
} from "../ui";

export function PasswordSection({ settings, onChange }: SectionProps) {
  const { t } = useI18n();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const { busy, error, ok, run } = useAction();
  const mismatch = confirm.length > 0 && next !== confirm;
  const valid = current.length > 0 && next.length >= 8 && next === confirm;

  async function submit() {
    await run(api.settings.password(current, next), {
      onOk: (res) => {
        onChange(res);
        setCurrent("");
        setNext("");
        setConfirm("");
      },
      okMsg: t("account:password.changed"),
    });
  }

  if (settings.usesGeneratedPassword) {
    return (
      <Section
        title={t("account:password.title")}
        description={t("account:password.generatedDescription")}
      >
        <ExternalButton href={WEBSITE_ACCOUNT}>{t("account:password.manageSignIn")}</ExternalButton>
      </Section>
    );
  }

  return (
    <Section title={t("account:password.title")} description={t("account:password.description")}>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field
          label={t("account:common.currentPassword")}
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
        <Field
          label={t("account:password.new")}
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
        />
        <Field
          label={t("account:password.confirm")}
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          hint={mismatch ? t("account:password.mismatch") : undefined}
        />
      </div>
      <div className="mt-3">
        <Button onClick={submit} loading={busy} disabled={!valid}>
          {t("account:password.change")}
        </Button>
      </div>
      <Notice error={error} ok={ok} />
    </Section>
  );
}
