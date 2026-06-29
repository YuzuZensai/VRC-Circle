import { useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, Camera, Link2 } from "lucide-react";
import type {
  EnhancementId,
  EnhancementState,
  EnhancementsSnapshot,
  OsPlatform,
} from "../../../../shared/types/enhancements";
import { api, errorMessage } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import { Badge, Banner, Loader, PAGE_TITLE, Toggle } from "../../components/ui";

const SHELL = "mx-auto flex w-full max-w-[760px] flex-col gap-[18px] px-12 pb-16 pt-10";

type Meta = {
  id: EnhancementId;
  icon: ReactNode;
  platforms: OsPlatform[];
};

const CATALOG: Meta[] = [
  {
    id: "linux-screenshot-symlink",
    icon: <Camera size={18} />,
    platforms: ["linux"],
  },
  {
    id: "vrchat-protocol-handler",
    icon: <Link2 size={18} />,
    platforms: ["linux", "win32", "darwin"],
  },
];

const OS_LABEL: Record<OsPlatform, string> = {
  linux: "Linux",
  win32: "Windows",
  darwin: "macOS",
};

export function EnhancementsView() {
  const { t } = useI18n();
  const [snap, setSnap] = useState<EnhancementsSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.enhancements
      .snapshot()
      .then(setSnap)
      .catch((e) => setError(errorMessage(e, t("enhancements:loadError"))));
  }, [t]);

  if (error)
    return (
      <div className={SHELL}>
        <Banner>{error}</Banner>
      </div>
    );
  if (!snap) return <Loader className="absolute inset-0" />;

  const byId = new Map(snap.states.map((s) => [s.id, s]));

  return (
    <div className={SHELL}>
      <header>
        <h1 className={PAGE_TITLE}>{t("enhancements:title")}</h1>
        <p className="mt-1 text-[13.5px] text-muted">{t("enhancements:subtitle")}</p>
      </header>

      <div className="flex flex-col gap-3">
        {CATALOG.map((meta) => (
          <EnhancementCard
            key={meta.id}
            meta={meta}
            state={byId.get(meta.id)}
            platform={snap.platform}
            onChange={setSnap}
          />
        ))}
      </div>
    </div>
  );
}

function EnhancementCard({
  meta,
  state,
  platform,
  onChange,
}: {
  meta: Meta;
  state: EnhancementState | undefined;
  platform: OsPlatform;
  onChange: (snap: EnhancementsSnapshot) => void;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const supported = meta.platforms.includes(platform);
  const enabled = state?.enabled ?? false;

  async function toggle(next: boolean) {
    setBusy(true);
    setErr(null);
    try {
      onChange(await api.enhancements.setEnabled(meta.id, next));
    } catch (e) {
      setErr(errorMessage(e, t("enhancements:genericError")));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className={`rounded-DEFAULT border border-border bg-surface-2 px-6 py-[18px] shadow-[var(--shadow-1)] ${
        supported ? "" : "opacity-60"
      }`}
    >
      <div className="flex items-start gap-4">
        <span className="mt-0.5 text-muted">{meta.icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[15px] font-bold">{t(`enhancements:items.${meta.id}.title`)}</h2>
            {meta.platforms.map((p) => (
              <Badge key={p} tone={supported ? "neutral" : "warn"}>
                {OS_LABEL[p]}
              </Badge>
            ))}
          </div>
          <p className="mt-1.5 text-[13px] text-muted">
            {t(`enhancements:items.${meta.id}.blurb`)}
          </p>
          {supported && state?.detail ? (
            <p className="mt-2 break-all font-mono text-[12px] text-faint">
              {t(`enhancements:items.${meta.id}.detail.${state.detail.key}`, {
                path: state.detail.path,
              })}
            </p>
          ) : null}
          {!supported ? (
            <p className="mt-2 text-[12px] text-faint">
              {t("enhancements:onlyAvailable", {
                platforms: meta.platforms.map((p) => OS_LABEL[p]).join(", "),
              })}
            </p>
          ) : null}
          {err ? (
            <p className="mt-2 flex items-center gap-1.5 text-[12.5px] text-[var(--danger)]">
              <AlertTriangle size={14} /> {err}
            </p>
          ) : null}
        </div>
        <Toggle
          checked={enabled}
          onChange={toggle}
          disabled={!supported || busy}
          icon
          className="mt-1"
        />
      </div>
    </section>
  );
}
