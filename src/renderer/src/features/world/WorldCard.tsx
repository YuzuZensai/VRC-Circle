import type { MouseEvent } from "react";
import { Check, Circle, Star, Users } from "lucide-react";
import type { World } from "../../../../shared/types/world";
import { Card, HoverImage, IconLabel, Tag } from "../../components/ui";
import { compactNumber } from "../../lib/format";
import { useT } from "../../lib/i18n";
import { useNav } from "../navigation/NavContext";

export function WorldCard({
  world,
  showAuthor,
  onOpen,
  selectable,
  selected,
  onToggleSelect,
  onContextMenu,
}: {
  world: World;
  showAuthor?: boolean;
  onOpen?: () => void;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  onContextMenu?: (e: MouseEvent) => void;
}) {
  const t = useT();
  const { openWorld } = useNav();
  const img = world.thumbnailImageUrl || world.imageUrl;
  return (
    <Card
      onClick={
        selectable
          ? onToggleSelect
          : world.deleted
            ? undefined
            : (onOpen ?? (() => openWorld(world.id)))
      }
      onContextMenu={onContextMenu}
      className={`${selected ? "outline outline-[3px] -outline-offset-[3px] outline-accent" : ""} ${
        world.deleted && !selectable ? "opacity-70" : ""
      }`}
    >
      <div className="relative aspect-video overflow-hidden bg-surface-hover">
        <div
          className={`h-full w-full transition-transform duration-200 ease-fluid ${selected ? "scale-90" : ""}`}
        >
          {img ? <HoverImage src={img} loading="lazy" /> : null}
        </div>
        {selectable ? (
          <span
            className={`absolute left-1.5 top-1.5 flex size-5 items-center justify-center rounded-md border transition-colors ${
              selected ? "border-accent bg-accent text-on-accent" : "border-border bg-surface-2/80"
            }`}
          >
            {selected ? <Check size={13} /> : null}
          </span>
        ) : null}
        {world.deleted ? (
          <span className="absolute right-1.5 top-1.5">
            <Tag color="var(--status-busy)">{t("world:deleted.badge")}</Tag>
          </span>
        ) : world.releaseStatus !== "public" ? (
          <span className="absolute right-1.5 top-1.5">
            <Tag color="var(--status-ask)">{t(`world:releaseStatus.${world.releaseStatus}`)}</Tag>
          </span>
        ) : null}
      </div>
      <div className="p-2.5">
        <div
          className={`truncate text-[13px] font-semibold ${world.deleted ? "text-faint italic" : ""}`}
          title={world.name || (world.deleted ? t("world:deleted.name") : "")}
        >
          {world.name || (world.deleted ? t("world:deleted.name") : "")}
        </div>
        {showAuthor ? (
          <div className="truncate text-[11px] text-faint" title={world.authorName}>
            {world.authorName}
          </div>
        ) : null}
        <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] tabular-nums text-faint">
          <IconLabel icon={<Star size={12} />} title={t("profile:worlds.tip.favorites")}>
            {" "}
            {compactNumber(world.favorites)}
          </IconLabel>
          {world.occupants > 0 ? (
            <IconLabel
              icon={<Circle size={9} fill="currentColor" />}
              title={t("profile:worlds.tip.online")}
              style={{ color: "var(--status-active)" }}
            >
              {" "}
              {compactNumber(world.occupants)}
            </IconLabel>
          ) : null}
          {world.visits > 0 ? (
            <span title={t("profile:worlds.tip.visits")}>
              {t("profile:worlds.visitsCount", { formattedCount: compactNumber(world.visits) })}
            </span>
          ) : null}
          <IconLabel icon={<Users size={12} />} title={t("profile:worlds.tip.capacity")}>
            {" "}
            {world.capacity}
          </IconLabel>
        </div>
      </div>
    </Card>
  );
}
