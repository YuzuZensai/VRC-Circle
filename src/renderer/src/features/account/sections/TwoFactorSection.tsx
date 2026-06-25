import { useState } from "react";
import { AlertTriangle, Eye, KeyRound, ShieldCheck } from "lucide-react";
import type { RecoveryCode } from "../../../../../shared/types/settings";
import { api } from "../../../lib/api";
import { useI18n } from "../../../lib/i18n";
import { Badge, Button, Field, Modal } from "../../../components/ui";
import { useStepUp } from "../../auth/useStepUp";
import { TwoFactorPrompt } from "../../auth/TwoFactorPrompt";
import { Notice, Section, useAsync, type SectionProps } from "../ui";

export function TwoFactorSection({ settings, onChange }: SectionProps) {
  const { t } = useI18n();
  const [pending, setPending] = useState<{
    secret: string;
    qrCodeDataUrl: string;
  } | null>(null);
  const [code, setCode] = useState("");
  const [codes, setCodes] = useState<RecoveryCode[] | null>(null);
  const setup = useAsync();
  const verify = useAsync();
  const [confirmDisable, setConfirmDisable] = useState(false);
  const [disabledOk, setDisabledOk] = useState(false);
  const stepUp = useStepUp();

  async function begin() {
    const res = await setup.run(api.settings.enable2fa());
    if (res) setPending(res);
  }

  async function confirm() {
    const res = await verify.run(api.settings.verify2fa(code.trim()));
    if (!res) return;
    if (!res.verified) {
      verify.fail(t("account:twoFactor.incorrectCode"));
      return;
    }
    setPending(null);
    setCode("");
    const fresh = await api.settings.get().catch(() => null);
    if (fresh) onChange(fresh);
  }

  async function turnOff() {
    setConfirmDisable(false);
    await stepUp.run(async () => {
      const next = await api.settings.disable2fa();
      onChange(next);
      setCodes(null);
      setDisabledOk(true);
    });
  }

  async function showCodes() {
    setDisabledOk(false);
    await stepUp.run(async () => {
      setCodes(await api.settings.recoveryCodes());
    });
  }

  function download() {
    if (!codes) return;
    const body = codes.map((c) => c.code).join("\n");
    const url = URL.createObjectURL(new Blob([body], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "vrchat-recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Section
      title={t("account:twoFactor.title")}
      icon={<ShieldCheck size={16} />}
      description={t("account:twoFactor.description")}
    >
      <div className="flex items-center gap-2">
        {settings.twoFactorEnabled ? (
          <Badge tone="success">{t("account:twoFactor.enabled")}</Badge>
        ) : (
          <Badge tone="warn">{t("account:twoFactor.disabled")}</Badge>
        )}
        {settings.twoFactorEnabledDate ? (
          <span className="text-[12px] text-faint">
            {t("account:twoFactor.since", {
              date: new Date(settings.twoFactorEnabledDate).toLocaleDateString(),
            })}
          </span>
        ) : null}
      </div>

      {settings.twoFactorEnabled ? (
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex flex-wrap gap-2.5">
            <Button variant="ghost" onClick={showCodes} loading={stepUp.busy && !confirmDisable}>
              <Eye size={14} />
              {t("account:twoFactor.showCodes")}
            </Button>
            <Button variant="danger" onClick={() => setConfirmDisable(true)}>
              {t("account:twoFactor.disable")}
            </Button>
          </div>
          {codes ? (
            <div className="rounded-lg border border-border bg-surface-2 p-4">
              <div className="mb-2.5 flex items-center justify-between">
                <span className="text-[12px] font-semibold uppercase tracking-wide text-faint">
                  {t("account:twoFactor.recoveryCodes")}
                </span>
                <Button variant="ghost" onClick={download}>
                  {t("account:twoFactor.download")}
                </Button>
              </div>
              <ul className="grid grid-cols-2 gap-x-6 gap-y-1.5 font-mono text-[13px] sm:grid-cols-3">
                {codes.map((c) => (
                  <li
                    key={c.code}
                    className={c.used ? "text-faint line-through" : "text-text"}
                    title={c.used ? t("account:twoFactor.alreadyUsed") : undefined}
                  >
                    {c.code}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[12px] text-muted">{t("account:twoFactor.storeSafely")}</p>
            </div>
          ) : null}
          <Notice
            error={stepUp.prompt ? null : stepUp.error}
            ok={disabledOk ? t("account:twoFactor.disabledOk") : null}
          />
          <Modal
            open={confirmDisable}
            onClose={() => setConfirmDisable(false)}
            title={t("account:twoFactor.disableModal.title")}
            icon={<AlertTriangle size={16} />}
            danger
            confirmLabel={t("account:twoFactor.disableModal.confirm")}
            onConfirm={turnOff}
            confirmLoading={stepUp.busy}
          >
            {t("account:twoFactor.disableModal.body")}
          </Modal>
          <TwoFactorPrompt
            open={!!stepUp.prompt}
            methods={stepUp.prompt?.methods ?? ["totp"]}
            busy={stepUp.busy}
            error={stepUp.error}
            onSubmit={stepUp.submit}
            onClose={stepUp.cancel}
          />
        </div>
      ) : pending ? (
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
          <img
            src={pending.qrCodeDataUrl}
            alt={t("account:twoFactor.qrAlt")}
            className="size-40 shrink-0 rounded-lg border border-border bg-surface p-2"
          />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-muted">{t("account:twoFactor.scanHint")}</p>
            <code className="mt-1.5 block break-all rounded-md border border-border bg-surface-2 px-2.5 py-1.5 font-mono text-[12.5px]">
              {pending.secret}
            </code>
            <div className="mt-3 flex items-end gap-2.5">
              <Field
                label={t("account:twoFactor.codeField")}
                inputMode="numeric"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <Button onClick={confirm} loading={verify.busy} disabled={code.trim().length < 6}>
                {t("account:twoFactor.verifyEnable")}
              </Button>
            </div>
            <Notice error={verify.error} />
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <Button onClick={begin} loading={setup.busy}>
            <KeyRound size={14} />
            {t("account:twoFactor.enable")}
          </Button>
          <Notice error={setup.error} />
        </div>
      )}
    </Section>
  );
}
