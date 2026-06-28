import { useEffect, useRef, useState } from "react";
import { Check, Copy, Globe, Play, Send, Sparkles } from "lucide-react";
import { Banner, Button, Modal } from "../../components/ui";
import { api, errorMessage } from "../../lib/api";
import { useCopied } from "../../lib/useCopied";
import { regionFlag } from "../../lib/vrchat";
import { useT } from "../../lib/i18n";
import type {
  CreateInstanceInput,
  CreateInstanceType,
  Instance,
  InstanceRegion,
} from "../../../../shared/types/instance";

const TYPES: CreateInstanceType[] = ["public", "friends+", "friends", "invite+", "invite"];
const REGIONS: InstanceRegion[] = ["us", "use", "eu", "jp"];

function launchLink(inst: Instance, name: string): string {
  const instanceId = inst.location.slice(inst.location.indexOf(":") + 1);
  const params = new URLSearchParams({ worldId: inst.worldId, instanceId, shortName: name });
  return `https://vrchat.com/home/launch?${params.toString()}`;
}

export function CreateInstanceModal({
  worldId,
  open,
  onClose,
}: {
  worldId: string;
  open: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const [type, setType] = useState<CreateInstanceType>("invite");
  const [region, setRegion] = useState<InstanceRegion | null>(null);
  const [autoRegion, setAutoRegion] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [instance, setInstance] = useState<Instance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const touched = useRef(false);

  useEffect(() => {
    if (!open) return;
    touched.current = false;
    let cancelled = false;
    void api.config.get().then(async (cfg) => {
      if (cancelled || touched.current) return;
      if (cfg.preferredRegion !== "auto") {
        setAutoRegion(false);
        setRegion(cfg.preferredRegion);
        return;
      }
      setAutoRegion(true);
      setDetecting(true);
      try {
        const best = await api.region.detect();
        if (!cancelled && !touched.current) setRegion(best);
      } finally {
        if (!cancelled) setDetecting(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const pickRegion = (r: InstanceRegion) => {
    touched.current = true;
    setRegion(r);
  };

  const reset = () => {
    setInstance(null);
    setError(null);
    setCreating(false);
  };

  const close = () => {
    onClose();
    setTimeout(reset, 200);
  };

  const create = async () => {
    if (!region) return;
    setCreating(true);
    setError(null);
    try {
      const input: CreateInstanceInput = { worldId, type, region };
      setInstance(await api.instance.create(input));
    } catch (err) {
      setError(errorMessage(err, "Failed to create instance"));
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={t("world:create.title")}
      icon={<Globe size={18} />}
      confirmLabel={instance ? undefined : t("world:create.submit")}
      onConfirm={instance ? undefined : create}
      confirmLoading={creating}
      confirmDisabled={!instance && !region}
    >
      {instance ? (
        <ResultView instance={instance} />
      ) : (
        <div className="flex flex-col gap-4">
          {error ? <Banner>{error}</Banner> : null}
          <Picker
            label={t("world:create.type")}
            value={type}
            options={TYPES}
            onChange={setType}
            render={(v) => t(`world:create.types.${v}`)}
          />
          <Picker
            label={t("world:create.region")}
            value={region}
            options={REGIONS}
            onChange={pickRegion}
            render={(v) => `${regionFlag(v) ?? ""} ${t(`world:create.regions.${v}`)}`.trim()}
            hint={
              detecting ? (
                <span className="inline-flex items-center gap-1.5 text-accent">
                  <Sparkles size={11} className="animate-pulse" />
                  {t("world:create.detecting")}
                </span>
              ) : autoRegion && region ? (
                <span className="inline-flex items-center gap-1.5 text-faint">
                  <Sparkles size={11} />
                  {t("world:create.autoDetected", {
                    region: t(`world:create.regions.${region}`),
                  })}
                </span>
              ) : undefined
            }
          />
        </div>
      )}
    </Modal>
  );
}

function Picker<T extends string>({
  label,
  value,
  options,
  onChange,
  render,
  hint,
}: {
  label: string;
  value: T | null;
  options: readonly T[];
  onChange: (v: T) => void;
  render: (v: T) => string;
  hint?: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-faint">
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <Button
            key={opt}
            variant={opt === value ? "primary" : "ghost"}
            onClick={() => onChange(opt)}
            className="px-3.5 py-1.5 text-[13px]"
          >
            {render(opt)}
          </Button>
        ))}
      </div>
      {hint ? <div className="mt-1.5 text-[12px]">{hint}</div> : null}
    </div>
  );
}

function ResultView({ instance }: { instance: Instance }) {
  const t = useT();
  const [inviteSent, setInviteSent] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);

  const launch = async () => {
    setLaunching(true);
    setLaunchError(null);
    try {
      await api.game.join(instance.location);
    } catch (err) {
      setLaunchError(errorMessage(err, "Failed to launch VRChat"));
    } finally {
      setLaunching(false);
    }
  };

  const selfInvite = async () => {
    setInviteError(null);
    try {
      await api.instance.inviteSelf(instance.worldId, instance.instanceId);
      setInviteSent(true);
    } catch (err) {
      setInviteError(errorMessage(err, "Failed to send invite"));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-text">{t("world:create.ready")}</p>

      <div className="flex flex-col gap-1.5">
        <Button variant="primary" onClick={launch} loading={launching} block>
          {!launching ? <Play size={15} /> : null}
          {launching ? t("world:create.launching") : t("world:create.launch")}
        </Button>
        {launchError ? <span className="text-[12px] text-danger">{launchError}</span> : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Button variant="ghost" onClick={selfInvite} disabled={inviteSent} block>
          {inviteSent ? <Check size={15} /> : <Send size={15} />}
          {inviteSent ? t("world:create.selfInviteSent") : t("world:create.selfInvite")}
        </Button>
        {inviteError ? <span className="text-[12px] text-danger">{inviteError}</span> : null}
      </div>

      {instance.secureName ? (
        <LinkRow
          label={t("world:create.lockedLink")}
          hint={t("world:create.lockedHint")}
          link={launchLink(instance, instance.secureName)}
        />
      ) : null}

      {instance.shortName ? (
        <LinkRow
          label={t("world:create.unlockedLink")}
          hint={t("world:create.unlockedHint")}
          link={launchLink(instance, instance.shortName)}
          warn
        />
      ) : null}
    </div>
  );
}

function LinkRow({
  label,
  hint,
  link,
  warn,
}: {
  label: string;
  hint: string;
  link: string;
  warn?: boolean;
}) {
  const t = useT();
  const [copied, copy] = useCopied();

  return (
    <div className="flex flex-col gap-1.5">
      <Button variant="ghost" onClick={() => copy(link)} block>
        {copied ? <Check size={15} /> : <Copy size={15} />}
        {copied ? t("world:create.copied") : `${t("world:create.copy")} ${label}`}
      </Button>
      <span
        className={`text-[12px] ${warn ? "" : "text-faint"}`}
        style={warn ? { color: "var(--status-ask)" } : undefined}
      >
        {hint}
      </span>
    </div>
  );
}
