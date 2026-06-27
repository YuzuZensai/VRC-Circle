import { ChevronRight, Globe, Hash, MapPin, Users } from "lucide-react";
import { parseLocation, type Location } from "../../../../shared/types/user";
import { HoverImage } from "../../components/ui";
import { useWorld } from "../../store/worlds";
import { useNav } from "../navigation/NavContext";
import { api } from "../../lib/api";
import { useAsync } from "../../lib/useAsync";
import { locationLabel, regionLabels } from "../../lib/vrchat";

export function LocationSection({ location }: { location?: Location }) {
  const { openWorld } = useNav();
  const parsed = parseLocation(location);
  const world = useWorld(parsed?.worldId);
  const instance = useAsync(
    () => (parsed ? api.instance.get(parsed.worldId, parsed.instance) : Promise.resolve(null)),
    [parsed?.worldId, parsed?.instance],
  );
  const inInstance = instance.status === "ready" ? instance.data : null;

  if (parsed && !world) {
    return (
      <Wrap>
        <div className="flex items-center gap-3.5 p-1">
          <div className="sk size-16 shrink-0 rounded-lg" />
          <div className="flex-1">
            <div className="sk h-4 w-2/5 rounded" />
            <div className="sk mt-2 h-3 w-1/4 rounded" />
          </div>
        </div>
      </Wrap>
    );
  }

  if (parsed && world) {
    const img = world.thumbnailImageUrl || world.imageUrl;
    const region = parsed.region
      ? (regionLabels[parsed.region] ?? parsed.region.toUpperCase())
      : null;
    return (
      <Wrap>
        <button
          onClick={() => openWorld(world.id)}
          className="group flex w-full items-center gap-3.5 rounded-lg p-1 text-left transition-colors hover:bg-surface-hover"
        >
          <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-surface-hover">
            {img ? <HoverImage src={img} /> : null}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[16px] font-semibold leading-tight" title={world.name}>
              {world.name}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-faint">
              <span className="truncate">by {world.authorName}</span>
              <span className="inline-flex items-center gap-1" title="Instance">
                <Hash size={11} />
                {parsed.instanceId}
              </span>
              {region ? (
                <span className="inline-flex items-center gap-1">
                  <Globe size={11} /> {region}
                </span>
              ) : null}
              {inInstance ? (
                <span
                  className="inline-flex items-center gap-1"
                  style={{ color: "var(--status-active)" }}
                >
                  <Users size={11} /> {inInstance.userCount} in instance
                </span>
              ) : null}
              {world.occupants > 0 ? (
                <span className="inline-flex items-center gap-1">
                  <Users size={11} /> {world.occupants} in world
                </span>
              ) : null}
            </div>
          </div>
          <ChevronRight
            size={18}
            className="shrink-0 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-accent"
          />
        </button>
      </Wrap>
    );
  }

  const sentinel = locationLabel(location);
  if (!sentinel) return null;
  return (
    <Wrap>
      <p className="flex items-center gap-1.5 px-1 text-[14px] text-text">
        <MapPin size={15} className="shrink-0 text-faint" />
        {sentinel}
      </p>
    </Wrap>
  );
}

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-surface-2 p-4 shadow-sm">
      <h3 className="mb-2.5 flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-faint">
        <MapPin size={12} /> Currently in
      </h3>
      {children}
    </section>
  );
}
