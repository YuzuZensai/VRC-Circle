import { useState, type FormEvent } from "react";
import { ArrowLeft, CircleDot } from "lucide-react";
import type { TwoFactorMethod } from "../../../../shared/types/auth";
import { ApiException } from "../../lib/api";
import { useAuth } from "./AuthContext";
import { Banner, Button, Field } from "../../components/ui";
import { useI18n } from "../../lib/i18n";

export function LoginScreen() {
  const { status, login, verify2fa, cancel2fa, adding, cancelAddAccount, accounts } = useAuth();
  const { t } = useI18n();
  const awaiting2fa = status.state === "awaiting2fa";
  const canGoBack = awaiting2fa || (adding && accounts.accounts.length > 0);
  const goBack = awaiting2fa ? () => void cancel2fa() : cancelAddAccount;

  return (
    <div className="relative grid h-full place-items-center p-6">
      <div className="titlebar absolute left-0 top-0" />
      <main className="animate-rise relative w-full max-w-[380px] rounded-lg border border-border bg-surface px-[30px] pb-6 pt-8 shadow-[var(--shadow-2)]">
        {canGoBack ? (
          <button
            className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-sm px-2 py-[5px] text-[13px] text-muted transition-[color,background] duration-[var(--dur)] ease-[var(--ease)] hover:bg-surface-2 hover:text-text"
            onClick={goBack}
          >
            <ArrowLeft size={15} /> {t("auth:back")}
          </button>
        ) : null}

        <header className="mb-[26px] flex flex-col items-center gap-1 text-center">
          <div className="mb-1.5 grid size-[34px] place-items-center text-accent" aria-hidden>
            <CircleDot size={26} />
          </div>
          <h1 className="text-[21px] font-bold tracking-[-0.2px]">VRC Circle</h1>
          <p className="text-[13.5px] text-muted">
            {adding ? t("auth:addAccount") : t("auth:tagline")}
          </p>
        </header>

        {awaiting2fa ? (
          <TwoFactorForm methods={status.methods} onSubmit={verify2fa} />
        ) : (
          <CredentialForm onSubmit={login} />
        )}

        <footer className="mt-[18px] text-center text-[11.5px] leading-normal text-faint">
          {t("auth:disclaimer")}
        </footer>
      </main>
    </div>
  );
}

function CredentialForm({
  onSubmit,
}: {
  onSubmit: (username: string, password: string) => Promise<void>;
}) {
  const { t } = useI18n();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit(username.trim(), password);
    } catch (err) {
      setError(messageFor(err, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="flex flex-col gap-3.5" onSubmit={submit}>
      <Field
        label={t("auth:username")}
        placeholder={t("auth:usernamePlaceholder")}
        autoFocus
        autoComplete="username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
      />
      <Field
        label={t("auth:password")}
        type="password"
        placeholder="••••••••••"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      {error ? <Banner>{error}</Banner> : null}
      <Button type="submit" block loading={busy} disabled={!username || !password}>
        {t("auth:signIn")}
      </Button>
    </form>
  );
}

function TwoFactorForm({
  methods,
  onSubmit,
}: {
  methods: TwoFactorMethod[];
  onSubmit: (method: TwoFactorMethod, code: string) => Promise<void>;
}) {
  const { t } = useI18n();
  const [method, setMethod] = useState<TwoFactorMethod>(methods[0] ?? "totp");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit(method, code.trim());
    } catch (err) {
      setError(messageFor(err, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="flex flex-col gap-3.5" onSubmit={submit}>
      <p className="mb-0.5 text-center text-[13.5px] text-muted">
        {t("auth:twoFactorPrompt", {
          source: t(
            method === "emailOtp" ? "auth:twoFactorEmailSource" : "auth:twoFactorAppSource",
          ),
        })}
      </p>

      {methods.length > 1 ? (
        <div className="flex gap-1.5 rounded-lg bg-surface-2 p-1" role="tablist">
          {methods.map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={m === method}
              className={`flex-1 rounded-sm p-2 text-[13px] font-semibold transition-[color,background] duration-[var(--dur)] ease-[var(--ease)] ${
                m === method ? "bg-surface text-text shadow-[var(--shadow-1)]" : "text-muted"
              }`}
              onClick={() => setMethod(m)}
            >
              {m === "emailOtp" ? t("auth:tabEmail") : t("auth:tabAuthenticator")}
            </button>
          ))}
        </div>
      ) : null}

      <Field
        label={t("auth:verificationCode")}
        placeholder="000000"
        inputMode="numeric"
        autoFocus
        autoComplete="one-time-code"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
        required
      />
      {error ? <Banner>{error}</Banner> : null}
      <Button type="submit" block loading={busy} disabled={code.length < 6}>
        {t("auth:verify")}
      </Button>
    </form>
  );
}

type Translate = ReturnType<typeof useI18n>["t"];

function messageFor(err: unknown, t: Translate): string {
  if (err instanceof ApiException) {
    switch (err.error.code) {
      case "unauthorized":
        return t("auth:errorUnauthorized");
      case "invalid_2fa":
        return t("auth:errorInvalid2fa");
      case "rate_limited":
        return t("auth:errorRateLimited");
      case "network":
        return t("auth:errorNetwork");
      default:
        return err.error.message || t("auth:errorGeneric");
    }
  }
  return t("auth:errorGeneric");
}
