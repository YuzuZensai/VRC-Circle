import type { UserProfile } from "../../../../shared/types/user";
import { avatarOf, isOnline, statusMeta } from "../../lib/vrchat";
import { Avatar } from "./Avatar";
import { StatusDot } from "./StatusDot";

export function PresenceAvatar({ user, size = 32 }: { user: UserProfile; size?: number }) {
  const status = statusMeta[isOnline(user) ? user.status : "offline"];
  const dot = Math.max(8, Math.round(size * 0.32));
  return (
    <span className="relative shrink-0 leading-none">
      <Avatar src={avatarOf(user)} name={user.displayName} size={size} />
      <StatusDot
        color={status.color}
        size={dot}
        ring="var(--surface)"
        title={status.label}
        className="absolute -bottom-0.5 -right-0.5"
      />
    </span>
  );
}
