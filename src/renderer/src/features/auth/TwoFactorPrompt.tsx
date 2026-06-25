import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Field, Modal } from "../../components/ui";

type TwoFactorMethod = "totp" | "emailOtp";

export function TwoFactorPrompt({
  open,
  methods,
  busy,
  error,
  onSubmit,
  onClose,
}: {
  open: boolean;
  methods: TwoFactorMethod[];
  busy?: boolean;
  error?: string | null;
  onSubmit: (method: TwoFactorMethod, code: string) => void;
  onClose: () => void;
}) {
  const [code, setCode] = useState("");
  const method = methods[0] ?? "totp";
  const label = method === "emailOtp" ? "Email code" : "Authenticator code";

  function submit() {
    if (code.trim().length < 6) return;
    onSubmit(method, code.trim());
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        setCode("");
        onClose();
      }}
      title="Verify it's you"
      icon={<ShieldCheck size={16} />}
      confirmLabel="Verify"
      onConfirm={submit}
      confirmLoading={busy}
      confirmDisabled={code.trim().length < 6}
    >
      <p>
        {method === "emailOtp"
          ? "Enter the code we emailed you to continue."
          : "Enter the code from your authenticator app to continue."}
      </p>
      <div className="mt-3">
        <Field
          label={label}
          inputMode="numeric"
          placeholder="123456"
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
      </div>
      {error ? <p className="mt-2 text-[12.5px] text-danger">{error}</p> : null}
    </Modal>
  );
}
