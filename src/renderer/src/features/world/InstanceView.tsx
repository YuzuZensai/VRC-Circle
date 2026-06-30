import { useState } from "react";
import { Check, ChevronRight, Globe, Play, Send, Users } from "lucide-react";
import type { Instance } from "../../../../shared/types/instance";
import { Banner, Button, Fact, Section, Skeleton, StatTile } from "../../components/ui";
import { api, errorMessage } from "../../lib/api";
import { useAsync } from "../../lib/useAsync";
import { useWorld } from "../../store/worlds";
import { useNav } from "../navigation/NavContext";
import { useT } from "../../lib/i18n";
import { COL_WIDE } from "../../lib/layout";
import { accessLabel, regionFlag, regionLabel } from "../../lib/vrchat";
import { useGameLaunch } from "../game/useGameLaunch";
import "../profile/profile.css";

export function InstanceView({ worldId, instanceId }: { worldId: string; instanceId: string }) {
  const t = useT();
  const world = useWorld(worldId);
  const load = useAsync(
    () => api.instance.get(worldId, instanceId),
    [worldId, instanceId],
    t("world:instance.unavailable"),
  );

  if (load.status === "error") {
    return <Banner className="m-10 max-w-[420px]">{load.message}</Banner>;
  }
  if (load.status !== "ready") return <InstanceSkeleton />;
  return <InstanceCard instance={load.data} world={world} worldId={worldId} />;
}

function InstanceCard({
  instance,
  world,
  worldId,
}: {
  instance: Instance;
  world: ReturnType<typeof useWorld>;
  worldId: string;
}) {
  const t = useT();
  const { openWorld } = useNav();
  const banner = world?.imageUrl || world?.thumbnailImageUrl;
  const thumb = world?.thumbnailImageUrl || world?.imageUrl;
  const region = regionLabel(t, instance.region);
  const access = accessLabel(t, instance.type);
  const flag = regionFlag(instance.region);

  return (
    <article className="profile flex min-h-full w-full flex-col bg-surface pb-12">
      <div
        className="profile__banner"
        style={{ backgroundImage: banner ? `url(${banner})` : undefined }}
      />

      <div className={`${COL_WIDE} relative flex items-end gap-5`} style={{ marginTop: -64 }}>
        <div className="world__thumb">{thumb ? <img src={thumb} alt="" /> : null}</div>
        <div className="min-w-0 pb-1">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-faint">
            {t("world:instance.title")}
          </p>
          <h2 className="text-[30px] font-bold leading-tight tracking-[-0.6px]">
            {world?.name ?? worldId}
          </h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-muted">
            <span>{access}</span>
            {region ? (
              <span className="inline-flex items-center gap-1">
                {flag ? (
                  <span className="text-[15px] leading-none">{flag}</span>
                ) : (
                  <Globe size={13} />
                )}
                {region}
              </span>
            ) : null}
            <span className="font-mono text-[12px] text-faint">#{instance.instanceId}</span>
          </p>
        </div>
        <JoinActions instance={instance} />
      </div>

      <div className={`${COL_WIDE} mt-6 flex flex-col gap-5`}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile
            icon={<Users size={15} />}
            label={t("world:instance.players")}
            value={`${instance.userCount}`}
            live={instance.userCount > 0}
          />
          <StatTile
            icon={<Users size={15} />}
            label={t("world:instance.capacity")}
            value={`${instance.capacity}`}
          />
          <StatTile
            icon={<Globe size={15} />}
            label={t("world:instance.region")}
            value={region ? `${flag ?? ""} ${region}`.trim() : "—"}
          />
          <StatTile
            icon={<Users size={15} />}
            label={t("world:instance.queue")}
            value={`${instance.queueSize ?? 0}`}
          />
        </div>

        <button
          onClick={() => openWorld(worldId)}
          className="group flex w-full items-center gap-2 rounded-xl border border-border bg-surface-2 px-5 py-4 text-left shadow-sm transition-colors hover:bg-surface-hover"
        >
          <Globe size={16} className="shrink-0 text-faint" />
          <span className="flex-1 text-[14px] font-semibold">
            {t("world:instance.worldDetails")}
          </span>
          <ChevronRight
            size={18}
            className="shrink-0 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-accent"
          />
        </button>

        <Section title={t("world:instance.title")}>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
            <Fact label={t("world:instance.access")} value={access} />
            {region ? <Fact label={t("world:instance.region")} value={region} /> : null}
            <Fact label={t("world:instance.instanceId")} value={instance.instanceId} mono />
          </dl>
        </Section>
      </div>
    </article>
  );
}

function JoinActions({ instance }: { instance: Instance }) {
  const t = useT();
  const { running, launching, markLaunching } = useGameLaunch();
  const [joinError, setJoinError] = useState<string | null>(null);
  const [inviteSent, setInviteSent] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const join = async () => {
    if (!running) markLaunching();
    setJoinError(null);
    try {
      await api.game.join(instance.location, instance.shortName);
    } catch (err) {
      setJoinError(errorMessage(err, "Failed to launch VRChat"));
    }
  };

  const inviteMe = async () => {
    setInviteError(null);
    try {
      await api.instance.inviteSelf(instance.worldId, instance.instanceId);
      setInviteSent(true);
    } catch (err) {
      setInviteError(errorMessage(err, "Failed to send invite"));
    }
  };

  const canLaunch = window.api.platform !== "darwin";

  return (
    <div className="mb-1 ml-auto flex shrink-0 flex-col items-end gap-1.5">
      <div className="flex gap-1.5">
        <Button variant="ghost" onClick={inviteMe} disabled={inviteSent}>
          {inviteSent ? <Check size={15} /> : <Send size={15} />}
          {inviteSent ? t("world:instance.inviteSent") : t("world:instance.inviteMe")}
        </Button>
        {canLaunch ? (
          <Button variant="primary" onClick={join} loading={launching} disabled={running}>
            {!launching ? <Play size={15} /> : null}
            {running
              ? t("world:instance.running")
              : launching
                ? t("world:instance.joining")
                : t("world:instance.join")}
          </Button>
        ) : null}
      </div>
      {joinError ? <span className="text-[12px] text-danger">{joinError}</span> : null}
      {inviteError ? <span className="text-[12px] text-danger">{inviteError}</span> : null}
    </div>
  );
}

function InstanceSkeleton() {
  return (
    <div
      className="profile profile--skeleton flex min-h-full w-full flex-col bg-surface pb-12"
      aria-busy
    >
      <div className="profile__banner" />
      <div className={`${COL_WIDE} relative flex items-end gap-5`} style={{ marginTop: -64 }}>
        <Skeleton className="world__thumb" />
        <div className="flex-1 pb-1">
          <Skeleton className="h-[22px] w-2/5 rounded-lg" />
          <Skeleton className="mt-3 h-3 w-1/4 rounded-lg" />
        </div>
      </div>
      <div className={`${COL_WIDE} mt-6 grid grid-cols-4 gap-3`}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[72px] rounded-xl" />
        ))}
      </div>
    </div>
  );
}
