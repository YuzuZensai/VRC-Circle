import { Circle, Star, Users } from "lucide-react";
import type { World } from "../../../../shared/types/world";
import { Card, HoverImage, IconLabel, Tag } from "../../components/ui";
import { compactNumber } from "../../lib/format";
import { useT } from "../../lib/i18n";
import { useNav } from "../navigation/NavContext";

export function WorldCard({
  world,
  showAuthor,
  onOpen,
}: {
  world: World;
  showAuthor?: boolean;
  onOpen?: () => void;
}) {
  const t = useT();
  const { openWorld } = useNav();
  const img = world.thumbnailImageUrl || world.imageUrl;
  return (
    <Card onClick={onOpen ?? (() => openWorld(world.id))}>
      <div className="relative aspect-video bg-surface-hover">
        {img ? <HoverImage src={img} loading="lazy" /> : null}
        {world.releaseStatus !== "public" ? (
          <span className="absolute right-1.5 top-1.5">
            <Tag color="var(--status-ask)">{world.releaseStatus}</Tag>
          </span>
        ) : null}
      </div>
      <div className="p-2.5">
        <div className="truncate text-[13px] font-semibold" title={world.name}>
          {world.name}
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
