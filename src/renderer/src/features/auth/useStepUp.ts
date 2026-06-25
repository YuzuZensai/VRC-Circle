import { useState } from "react";
import { ApiException, api, errorMessage } from "../../lib/api";

type TwoFactorMethod = "totp" | "emailOtp";

export function useStepUp() {
  const [prompt, setPrompt] = useState<{
    methods: TwoFactorMethod[];
    retry: () => Promise<void>;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<void>): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      if (e instanceof ApiException && e.error.code === "requires_2fa") {
        setPrompt({ methods: e.error.methods ?? ["totp"], retry: action });
        return;
      }
      throw e;
    } finally {
      setBusy(false);
    }
  }

  async function submit(method: TwoFactorMethod, code: string) {
    if (!prompt) return;
    setBusy(true);
    setError(null);
    try {
      const { verified } = await api.settings.reverify2fa(method, code);
      if (!verified) {
        setError("Incorrect code, try again.");
        return;
      }
      const retry = prompt.retry;
      setPrompt(null);
      await retry();
    } catch (e) {
      setError(errorMessage(e, "Something went wrong."));
    } finally {
      setBusy(false);
    }
  }

  return {
    run,
    prompt,
    busy,
    error,
    submit,
    cancel: () => (setPrompt(null), setError(null)),
  };
}
