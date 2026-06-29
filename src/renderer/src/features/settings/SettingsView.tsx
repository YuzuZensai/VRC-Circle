import { useEffect, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Boxes,
  Check,
  Download,
  Droplet,
  FolderOpen,
  Gamepad2,
  Gauge,
  Globe2,
  Info,
  Languages,
  Monitor,
  Moon,
  Palette,
  Search,
  Sun,
  X,
} from "lucide-react";
import { useTheme } from "../../lib/ThemeContext";
import { useI18n } from "../../lib/i18n";
import { useViewState } from "../navigation/NavContext";
import { ACCENT_PRESETS, DEFAULT_ACCENT, type SchemeMode } from "../../lib/theme";
import type { AppConfig, PreferredRegion, RegionPing } from "../../../../shared/types/appConfig";
import type { UnityStatus } from "../../../../shared/types/unity";
import { api, errorMessage } from "../../lib/api";
import { useAsync } from "../../lib/useAsync";
import { regionFlag, regionLabel } from "../../lib/vrchat";
import {
  Button,
  Field,
  Notice,
  PAGE_TITLE,
  SettingsSection as Section,
  Tabs,
} from "../../components/ui";

const SHELL = "mx-auto flex w-full max-w-[760px] flex-col gap-[18px] px-12 pb-16 pt-10";
const SECTIONS = "animate-rise flex flex-col gap-[18px]";

type SettingsTab = "appearance" | "game" | "creator" | "about";

export function SettingsView() {
  const { t } = useI18n();
  const [tab, setTab] = useViewState<SettingsTab>("settings:tab", "appearance");
  return (
    <div className={SHELL}>
      <header>
        <h1 className={PAGE_TITLE}>{t("settings:title")}</h1>
        <p className="mt-1 text-[13.5px] text-muted">{t("settings:subtitle")}</p>
      </header>

      <Tabs
        tabs={[
          { id: "appearance", label: t("settings:tabs.appearance") },
          { id: "game", label: t("settings:tabs.game") },
          { id: "creator", label: t("settings:tabs.creator") },
          { id: "about", label: t("settings:tabs.about") },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "appearance" ? (
        <div className={SECTIONS}>
          <AppearanceSection />
          <AccentSection />
          <LanguageSection />
        </div>
      ) : null}

      {tab === "game" ? (
        <div className={SECTIONS}>
          <GameSection />
          <RegionSection />
        </div>
      ) : null}

      {tab === "creator" ? (
        <div className={SECTIONS}>
          <UnitySection />
        </div>
      ) : null}

      {tab === "about" ? (
        <div className={SECTIONS}>
          <AboutSection />
        </div>
      ) : null}
    </div>
  );
}

const SCHEME_OPTIONS: { mode: SchemeMode; labelKey: string; hintKey: string; icon: ReactNode }[] = [
  {
    mode: "auto",
    labelKey: "settings:appearance.scheme.auto",
    hintKey: "settings:appearance.scheme.autoHint",
    icon: <Monitor size={18} />,
  },
  {
    mode: "light",
    labelKey: "settings:appearance.scheme.light",
    hintKey: "settings:appearance.scheme.lightHint",
    icon: <Sun size={18} />,
  },
  {
    mode: "dark",
    labelKey: "settings:appearance.scheme.dark",
    hintKey: "settings:appearance.scheme.darkHint",
    icon: <Moon size={18} />,
  },
];

function AppearanceSection() {
  const { schemeMode, setSchemeMode } = useTheme();
  const { t } = useI18n();
  return (
    <Section
      title={t("settings:appearance.title")}
      icon={<Palette size={16} />}
      description={t("settings:appearance.description")}
    >
      <div className="grid grid-cols-3 gap-3">
        {SCHEME_OPTIONS.map((o) => {
          const active = o.mode === schemeMode;
          return (
            <button
              key={o.mode}
              type="button"
              onClick={() => setSchemeMode(o.mode)}
              aria-pressed={active}
              className={`flex flex-col items-center gap-2 rounded-lg border px-4 py-4 transition-colors ${
                active
                  ? "border-accent bg-[color-mix(in_srgb,var(--accent)_8%,var(--surface-2))]"
                  : "border-border bg-surface-2 hover:border-accent"
              }`}
            >
              <span className={active ? "text-accent" : "text-muted"}>{o.icon}</span>
              <span className="text-[13.5px] font-semibold">{t(o.labelKey)}</span>
              <span className="text-[12px] text-muted">{t(o.hintKey)}</span>
            </button>
          );
        })}
      </div>
    </Section>
  );
}

function AccentSection() {
  const { accent, setAccent } = useTheme();
  const { t } = useI18n();
  const current = (accent ?? DEFAULT_ACCENT).toLowerCase();
  const isPreset = ACCENT_PRESETS.some((p) => p.value.toLowerCase() === current);

  return (
    <Section
      title={t("settings:accent.title")}
      icon={<Droplet size={16} />}
      description={t("settings:accent.description")}
    >
      <div className="flex flex-wrap items-center gap-2.5">
        {ACCENT_PRESETS.map((p) => {
          const active = p.value.toLowerCase() === current;
          const name = t(`settings:accent.colors.${p.key}`, { defaultValue: p.name });
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => setAccent(p.value)}
              title={name}
              aria-label={name}
              aria-pressed={active}
              className={`relative size-9 rounded-full border transition-transform hover:scale-105 ${
                active ? "border-text" : "border-border"
              }`}
              style={{ background: p.value }}
            >
              {active ? (
                <Check size={16} className="absolute inset-0 m-auto text-[var(--on-accent)]" />
              ) : null}
            </button>
          );
        })}

        <label
          className={`relative flex size-9 cursor-pointer items-center justify-center rounded-full border ${
            !isPreset ? "border-text" : "border-border"
          }`}
          title={t("settings:accent.custom")}
          style={!isPreset ? { background: current } : { background: "var(--color-wheel)" }}
        >
          {!isPreset ? (
            <Check size={16} className="text-[var(--on-accent)]" />
          ) : (
            <Palette size={15} className="text-white drop-shadow" />
          )}
          <input
            type="color"
            value={current}
            onChange={(e) => setAccent(e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label={t("settings:accent.pickCustom")}
          />
        </label>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <span className="font-mono text-[12.5px] text-muted">{current}</span>
        {accent ? (
          <button
            type="button"
            onClick={() => setAccent(null)}
            className="text-[12.5px] font-semibold text-accent hover:underline"
          >
            {t("settings:accent.reset")}
          </button>
        ) : (
          <span className="text-[12.5px] text-faint">{t("settings:accent.default")}</span>
        )}
      </div>
    </Section>
  );
}

function LanguageSection() {
  const { locale, locales, setLocale, t } = useI18n();
  return (
    <Section
      title={t("settings:language.title")}
      icon={<Languages size={16} />}
      description={t("settings:language.description")}
    >
      <div className="grid grid-cols-3 gap-3">
        {locales.map((l) => {
          const active = l.meta.code === locale;
          return (
            <button
              key={l.meta.code}
              type="button"
              onClick={() => setLocale(l.meta.code)}
              aria-pressed={active}
              className={`flex flex-col items-center gap-1 rounded-lg border px-4 py-4 transition-colors ${
                active
                  ? "border-accent bg-[color-mix(in_srgb,var(--accent)_8%,var(--surface-2))]"
                  : "border-border bg-surface-2 hover:border-accent"
              }`}
            >
              <span className="text-[14px] font-semibold">{l.meta.nativeName}</span>
              <span className="text-[12px] text-muted">{l.meta.englishName}</span>
            </button>
          );
        })}
      </div>
    </Section>
  );
}

function GameSection() {
  const { t } = useI18n();
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [path, setPath] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    api.config.get().then((c) => {
      setConfig(c);
      setPath(c.gamePath ?? "");
    });
  }, []);

  async function run(p: Promise<AppConfig>, okMsg: string) {
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const next = await p;
      setConfig(next);
      setPath(next.gamePath ?? "");
      setOk(okMsg);
    } catch (e) {
      setError(errorMessage(e, t("settings:game.error")));
    } finally {
      setBusy(false);
    }
  }

  const dirty = (config?.gamePath ?? "") !== path.trim();

  return (
    <Section
      title={t("settings:game.title")}
      icon={<Gamepad2 size={16} />}
      description={t("settings:game.description")}
    >
      <div className="flex items-end gap-2.5">
        <div className="flex-1">
          <Field
            label={t("settings:game.label")}
            placeholder={t("settings:game.placeholder")}
            value={path}
            onChange={(e) => setPath(e.target.value)}
          />
        </div>
        <Button
          variant="ghost"
          onClick={() => void run(api.config.pickGamePath(), t("settings:game.saved"))}
        >
          <FolderOpen size={14} />
          {t("settings:game.browse")}
        </Button>
      </div>

      <div className="mt-3 flex items-center gap-2 text-[12.5px] text-muted">
        <Search size={13} className="shrink-0 text-faint" />
        <span className="shrink-0 font-semibold">{t("settings:game.detected")}:</span>
        {config?.detectedGamePath ? (
          <>
            <span className="truncate font-mono text-[12px]" title={config.detectedGamePath}>
              {config.detectedGamePath}
            </span>
            {config.detectedGamePath !== path.trim() ? (
              <button
                type="button"
                onClick={() => setPath(config.detectedGamePath ?? "")}
                className="ml-auto shrink-0 font-semibold text-accent hover:underline"
              >
                {t("settings:game.useDetected")}
              </button>
            ) : null}
          </>
        ) : (
          <span className="text-faint">{t("settings:game.detectedNone")}</span>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2.5">
        <Button
          onClick={() =>
            void run(api.config.setGamePath(path.trim() || null), t("settings:game.saved"))
          }
          loading={busy}
          disabled={!dirty}
        >
          {t("settings:game.save")}
        </Button>
        {config?.gamePath ? (
          <Button
            variant="ghost"
            onClick={() => void run(api.config.setGamePath(null), t("settings:game.resetDone"))}
            disabled={busy}
          >
            {t("settings:game.reset")}
          </Button>
        ) : null}
      </div>
      <Notice error={error} ok={ok} />
    </Section>
  );
}

const REGION_OPTIONS: PreferredRegion[] = ["auto", "us", "use", "eu", "jp"];

function RegionSection() {
  const { t } = useI18n();
  const [region, setRegion] = useState<PreferredRegion>("auto");
  const [ok, setOk] = useState<string | null>(null);
  const [pings, setPings] = useState<RegionPing[] | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    api.config.get().then((c) => setRegion(c.preferredRegion));
  }, []);

  const choose = async (r: PreferredRegion) => {
    setRegion(r);
    setOk(null);
    const next = await api.config.setPreferredRegion(r);
    setRegion(next.preferredRegion);
    setOk(t("settings:region.saved"));
  };

  const test = async () => {
    setTesting(true);
    setPings(null);
    try {
      setPings(await api.region.ping());
    } finally {
      setTesting(false);
    }
  };

  const best = pings
    ?.filter((p): p is RegionPing & { ms: number } => p.ms !== null)
    .reduce<(RegionPing & { ms: number }) | null>((a, b) => (!a || b.ms < a.ms ? b : a), null);

  const label = (r: PreferredRegion) =>
    r === "auto" ? t("settings:region.auto") : `${regionFlag(r) ?? ""} ${regionLabel(t, r)}`.trim();

  return (
    <Section
      title={t("settings:region.title")}
      icon={<Globe2 size={16} />}
      description={t("settings:region.description")}
    >
      <div className="flex flex-wrap gap-2">
        {REGION_OPTIONS.map((r) => {
          const active = r === region;
          return (
            <button
              key={r}
              type="button"
              onClick={() => void choose(r)}
              aria-pressed={active}
              className={`rounded-lg border px-4 py-2.5 text-[13.5px] font-semibold transition-colors ${
                active
                  ? "border-accent bg-[color-mix(in_srgb,var(--accent)_8%,var(--surface-2))]"
                  : "border-border bg-surface-2 hover:border-accent"
              }`}
            >
              {label(r)}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-2.5">
        <Button variant="ghost" onClick={() => void test()} loading={testing}>
          <Gauge size={14} />
          {testing ? t("settings:region.testing") : t("settings:region.test")}
        </Button>
      </div>

      {pings ? (
        <div className="mt-3 flex flex-col gap-1.5">
          {pings.map((p) => (
            <div key={p.region} className="flex items-center gap-2 text-[13px]">
              <span className="w-28 shrink-0 text-muted">
                {regionFlag(p.region) ?? ""} {regionLabel(t, p.region)}
              </span>
              {p.ms === null ? (
                <span className="text-faint">{t("settings:region.unreachable")}</span>
              ) : (
                <span
                  className="font-mono font-semibold"
                  style={best?.region === p.region ? { color: "var(--status-active)" } : undefined}
                >
                  {p.ms} ms
                </span>
              )}
              {best?.region === p.region ? (
                <span className="text-[11px] font-semibold text-[var(--status-active)]">
                  {t("settings:region.best")}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <Notice ok={ok} />
    </Section>
  );
}

function UnitySection() {
  const { t } = useI18n();
  const status = useAsync(() => api.unity.status(), [], t("settings:unity.error"));

  return (
    <Section
      title={t("settings:unity.title")}
      icon={<Boxes size={16} />}
      description={t("settings:unity.description")}
    >
      {status.status === "loading" ? (
        <p className="text-[13px] text-muted">{t("settings:unity.loading")}</p>
      ) : status.status === "error" ? (
        <p className="text-[12.5px] text-[var(--danger)]">{status.message}</p>
      ) : (
        <UnityStatusBody status={status.data} />
      )}
    </Section>
  );
}

function UnityStatusBody({ status }: { status: UnityStatus }) {
  const { t } = useI18n();
  const verdict = MATCH_META[status.match];
  return (
    <div className="flex flex-col gap-2 text-[13px]">
      <Row
        label={t("settings:unity.hub")}
        value={status.hubInstalled ? t("settings:unity.installed") : t("settings:unity.notFound")}
      />
      <Row label={t("settings:unity.required")} value={status.requiredVersion ?? "—"} />
      <Row
        label={t("settings:unity.installedVersions")}
        value={status.installedVersions.length ? status.installedVersions.join(", ") : "—"}
      />
      <div className="flex items-center justify-between py-2">
        <span className="text-muted">{t("settings:unity.status")}</span>
        <span
          className="inline-flex items-center gap-1.5 font-semibold"
          style={{ color: verdict.color }}
        >
          <verdict.icon size={15} />
          {t(verdict.key)}
        </span>
      </div>
      {!status.hubInstalled ? (
        <div className="mt-1">
          <Button onClick={() => void api.unity.install("https://unity.com/download")}>
            <Download size={14} />
            {t("settings:unity.getHub")}
          </Button>
        </div>
      ) : status.match !== "ok" && status.installUrl ? (
        <div className="mt-1">
          <Button onClick={() => void api.unity.install(status.installUrl as string)}>
            <Download size={14} />
            {t("settings:unity.install", { version: status.requiredVersion ?? "" })}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

const MATCH_META: Record<UnityStatus["match"], { key: string; icon: typeof Check; color: string }> =
  {
    ok: { key: "settings:unity.match.ok", icon: Check, color: "var(--status-active)" },
    missing: {
      key: "settings:unity.match.missing",
      icon: AlertTriangle,
      color: "var(--status-ask)",
    },
    "no-editor": { key: "settings:unity.match.noEditor", icon: X, color: "var(--danger)" },
    unknown: { key: "settings:unity.match.unknown", icon: AlertTriangle, color: "var(--muted)" },
  };

function AboutSection() {
  const { t } = useI18n();
  const [version, setVersion] = useState("");

  useEffect(() => {
    api.config.get().then((c) => setVersion(c.version));
  }, []);

  return (
    <Section title={t("settings:about.title")} icon={<Info size={16} />}>
      <div className="flex flex-col gap-2 text-[13px]">
        <Row label={t("settings:about.app")} value={t("settings:about.appName")} />
        <Row label={t("settings:about.version")} value={version} />
        <p className="mt-1 text-[12px] text-faint">{t("settings:about.disclaimer")}</p>
      </div>
    </Section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2 last:border-0">
      <span className="text-muted">{label}</span>
      <span className="font-semibold text-text">{value}</span>
    </div>
  );
}
