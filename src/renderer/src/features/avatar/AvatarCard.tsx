import { Star } from "lucide-react";
import type { Avatar } from "../../../../shared/types/avatar";
import { Card, HoverImage, IconLabel, Tag } from "../../components/ui";
import { compactNumber } from "../../lib/format";
import { useT } from "../../lib/i18n";
import { useNav } from "../navigation/NavContext";

export function AvatarCard({
  avatar,
  showAuthor,
  current,
}: {
  avatar: Avatar;
  showAuthor?: boolean;
  current?: boolean;
}) {
  const t = useT();
  const { openAvatar } = useNav();
  const img = avatar.thumbnailImageUrl || avatar.imageUrl;
  return (
    <Card onClick={() => openAvatar(avatar.id)}>
      <div className="relative aspect-[4/3] bg-surface-hover">
        {img ? <HoverImage src={img} loading="lazy" /> : null}
        {current ? (
          <span className="absolute left-1.5 top-1.5">
            <Tag color="var(--accent)">{t("avatar:current")}</Tag>
          </span>
        ) : null}
        {avatar.releaseStatus !== "public" ? (
          <span className="absolute right-1.5 top-1.5">
            <Tag color="var(--status-ask)">{avatar.releaseStatus}</Tag>
          </span>
        ) : null}
      </div>
      <div className="p-2.5">
        <div className="truncate text-[13px] font-semibold" title={avatar.name}>
          {avatar.name}
        </div>
        {showAuthor ? (
          <div className="truncate text-[11px] text-faint" title={avatar.authorName}>
            {avatar.authorName}
          </div>
        ) : null}
        {avatar.favorites > 0 ? (
          <div className="mt-1 flex items-center gap-3 text-[11px] tabular-nums text-faint">
            <IconLabel icon={<Star size={12} />} title={t("avatar:tip.favorites")}>
              {" "}
              {compactNumber(avatar.favorites)}
            </IconLabel>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
