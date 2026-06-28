import type { ReactNode } from "react";
import { COL_WIDE } from "../../lib/layout";
import "../profile/profile.css";

export function HeroHeader({
  banner,
  media,
  body,
  actions,
  gap = "gap-5",
  overlap = -64,
  contentClassName = "mt-6 flex flex-col gap-5",
  children,
}: {
  banner?: string;
  media: ReactNode;
  body: ReactNode;
  actions?: ReactNode;
  gap?: string;
  overlap?: number;
  contentClassName?: string;
  children: ReactNode;
}) {
  return (
    <article className="profile flex min-h-full w-full flex-col bg-surface pb-12">
      <div
        className="profile__banner"
        style={{ backgroundImage: banner ? `url(${banner})` : undefined }}
      />

      <div className={`${COL_WIDE} relative flex items-end ${gap}`} style={{ marginTop: overlap }}>
        {media}
        {body}
        {actions}
      </div>

      <div className={`${COL_WIDE} ${contentClassName}`}>{children}</div>
    </article>
  );
}
