import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { User, LimitedUserFriend } from "@/types/bindings"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Return true when the user should be treated as offline.
 *
 * The logic prefers an explicit `state` when present, falls back to\
 * `status` for web users, and finally inspects `location` for world/traveling/private indicators.
 */
export function isUserOffline(user: User | LimitedUserFriend | null | undefined): boolean {
  if (!user) return true

  const platform = user.platform?.toLowerCase()
  const location = user.location?.toLowerCase()
  const status = user.status?.toLowerCase()

  const state = 'state' in user ? user.state : undefined
  if (state !== undefined) {
    const stateLower = state?.toLowerCase()
    if (stateLower === 'offline') {
      if (status && status !== 'offline') return false
      return true
    }
    return false
  }

  if (platform === 'web' && status && status !== 'offline') return false

  if (!location) return true
  if (location.startsWith('wrld_') || location.startsWith('traveling')) return false
  if (location === 'private') return false

  return location === 'offline' || location === ''
}

/**
 * CSS class for the small status dot.
 */
export function getStatusDotClass(user: User | LimitedUserFriend | null | undefined): string {
  if (!user) return 'bg-gray-500'

  const statusLower = user.status?.toLowerCase()
  const platformLower = user.platform?.toLowerCase()
  const offline = isUserOffline(user)

  if (offline) return 'bg-gray-500'

  if (platformLower === 'web') {
    switch (statusLower) {
      case 'active':
        return 'bg-transparent ring-2 ring-emerald-500 ring-inset'
      case 'join me':
        return 'bg-transparent ring-2 ring-sky-500 ring-inset'
      case 'ask me':
        return 'bg-transparent ring-2 ring-amber-500 ring-inset'
      case 'busy':
        return 'bg-transparent ring-2 ring-red-500 ring-inset'
      default:
        return 'bg-transparent ring-2 ring-gray-400 ring-inset'
    }
  }

  switch (statusLower) {
    case 'active':
      return 'bg-emerald-500'
    case 'join me':
      return 'bg-sky-500'
    case 'ask me':
      return 'bg-amber-500'
    case 'busy':
      return 'bg-red-500'
    default:
      return 'bg-gray-400'
  }
}

/**
 * CSS class for the status badge/chip.
 */
export function getStatusBadgeColor(user: User | LimitedUserFriend | null | undefined): string {
  if (!user) return 'bg-gray-500'

  const statusLower = user.status?.toLowerCase()
  const platformLower = user.platform?.toLowerCase()
  const offline = isUserOffline(user)

  if (offline) return 'bg-gray-500'

  if (platformLower === 'web') {
    switch (statusLower) {
      case 'active':
        return 'bg-transparent ring-2 ring-emerald-500 ring-inset'
      case 'join me':
        return 'bg-transparent ring-2 ring-sky-500 ring-inset'
      case 'ask me':
        return 'bg-transparent ring-2 ring-amber-500 ring-inset'
      case 'busy':
        return 'bg-transparent ring-2 ring-red-500 ring-inset'
      default:
        return 'bg-transparent ring-2 ring-gray-400 ring-inset'
    }
  }

  switch (statusLower) {
    case 'active':
      return 'bg-emerald-500'
    case 'join me':
      return 'bg-sky-500'
    case 'ask me':
      return 'bg-amber-500'
    case 'busy':
      return 'bg-red-500'
    default:
      return 'bg-gray-400'
  }
}
