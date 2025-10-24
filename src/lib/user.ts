import type { User } from '@/types/bindings';

export function getUserInitials(displayName?: string | null): string {
  if (!displayName) {
    return '??';
  }

  return displayName
    .split(' ')
    .filter(Boolean)
    .map((segment) => segment[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getUserAvatarUrl(user?: Partial<User> | null): string | null {
  if (!user) {
    return null;
  }

  const isValid = (url?: string | null): url is string => {
    return !!url && url.trim().length > 0;
  };

  // Priority order:
  // 1. userIcon, User's profile icon (preferred)
  if (isValid(user.userIcon)) return user.userIcon;

  // 2. currentAvatarThumbnailImageUrl, Current avatar thumbnail
  if (isValid(user.currentAvatarThumbnailImageUrl)) return user.currentAvatarThumbnailImageUrl;
  
  // 3. currentAvatarImageUrl, Current avatar full image
  if (isValid(user.currentAvatarImageUrl)) return user.currentAvatarImageUrl;

  return null;
}
