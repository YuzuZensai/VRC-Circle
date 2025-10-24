import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { getUserAvatarUrl, getUserInitials } from "@/lib/user";
import type { User } from "@/types/bindings";
import type { CSSProperties } from "react";
import { useCachedImage } from "@/hooks/useCachedImage";

type MinimalUser = Pick<
  User,
  | "displayName"
  | "userIcon"
  | "profilePicOverride"
  | "profilePicOverrideThumbnail"
  | "currentAvatarImageUrl"
  | "currentAvatarThumbnailImageUrl"
>;

interface UserAvatarProps {
  user: MinimalUser;
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
  fallbackText?: string;
  statusClassName?: string;
  avatarClassName?: string;
  statusSize?: string;
  statusOffset?: string;
  statusContainerClassName?: string;
}

export function UserAvatar({
  user,
  className,
  imageClassName,
  fallbackClassName,
  fallbackText,
  statusClassName,
  avatarClassName,
  statusSize,
  statusOffset,
  statusContainerClassName,
}: UserAvatarProps) {
  const avatarUrl = getUserAvatarUrl(user);
  const cachedSrc = useCachedImage(avatarUrl);
  const displaySrc = cachedSrc ?? undefined;
  const initials = fallbackText ?? getUserInitials(user.displayName);
  const indicatorSize = statusSize ?? "38%";
  const indicatorOffset = statusOffset ?? "4%";
  const indicatorStyle: CSSProperties = {
    width: indicatorSize,
    height: indicatorSize,
    bottom: indicatorOffset,
    right: indicatorOffset,
  };

  return (
    <div className={cn("relative inline-flex", className)}>
      <Avatar className={cn("h-full w-full", avatarClassName)}>
        {displaySrc ? (
          <AvatarImage
            src={displaySrc}
            alt={user.displayName ?? "User avatar"}
            className={cn("object-cover", imageClassName)}
          />
        ) : null}
        <AvatarFallback
          className={cn("text-sm font-medium uppercase", fallbackClassName)}
        >
          {initials}
        </AvatarFallback>
      </Avatar>
      {statusClassName ? (
        <span
          className={cn(
            "pointer-events-none absolute flex items-center justify-center rounded-full bg-background shadow-sm",
            statusContainerClassName
          )}
          style={indicatorStyle}
        >
          <span
            className={cn(
              "block h-[68%] w-[68%] rounded-full",
              statusClassName
            )}
          />
        </span>
      ) : null}
    </div>
  );
}
