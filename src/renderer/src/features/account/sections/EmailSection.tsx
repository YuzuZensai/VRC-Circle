import { useState } from "react";
import { api } from "../../../lib/api";
import { useI18n } from "../../../lib/i18n";
import { Button, Field } from "../../../components/ui";
import { Notice, Section, useAction, type SectionProps } from "../ui";

export function EmailSection({ settings, onChange }: SectionProps) {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { busy, error, ok, run } = useAction();

  async function submit() {
    await run(api.settings.email(email.trim(), password), {
      onOk: (next) => {
        onChange(next);
        setEmail("");
        setPassword("");
      },
      okMsg: t("account:email.confirmSent"),
    });
  }

  return (
    <Section
      title={t("account:email.title")}
      description={
        <>
          {t("account:email.current")}
          <span className="font-mono text-text">{settings.email || t("account:email.none")}</span>
          {settings.emailVerified ? null : t("account:email.unverified")}
          {settings.pendingEmail ? (
            <>
              {t("account:email.pending")}
              <span className="font-mono text-text">{settings.pendingEmail}</span>
            </>
          ) : null}
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label={t("account:email.field")}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          label={t("account:common.currentPassword")}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div className="mt-3">
        <Button onClick={submit} loading={busy} disabled={!email.includes("@") || !password}>
          {t("account:email.change")}
        </Button>
      </div>
      <Notice error={error} ok={ok} />
    </Section>
  );
}
