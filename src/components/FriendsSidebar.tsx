import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn, isUserOffline, getStatusDotClass } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Users, ChevronLeft, User, Loader2 } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/context/AuthContext";
import { userStore } from "@/stores";
import type { LimitedUserFriend, UserStatus } from "@/types/bindings";

const POLL_INTERVAL_MS = 5 * 60 * 1000;

interface FriendsSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function FriendsSidebar({ isOpen, onToggle }: FriendsSidebarProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [friends, setFriends] = useState<LimitedUserFriend[] | null>(
    userStore.getFriendsSnapshot()
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<"loadFailed" | null>(null);

  const describeLocation = useCallback(
    (location: string): string => {
      const normalized = location.toLowerCase();

      if (!location || normalized === "offline") {
        return t("layout.friendsSidebar.location.offline");
      }

      if (normalized === "private") {
        return t("layout.friendsSidebar.location.private");
      }

      if (normalized.startsWith("traveling")) {
        return t("layout.friendsSidebar.location.traveling");
      }

      if (normalized.startsWith("group:")) {
        return t("layout.friendsSidebar.location.group");
      }

      if (normalized.includes(":")) {
        return t("layout.friendsSidebar.location.instance");
      }

      return location;
    },
    [t]
  );

  const getStatusText = useCallback(
    (status?: UserStatus | null) => {
      if (!status) {
        return "";
      }

      switch (status) {
        case "active":
          return t("common.status.active");
        case "join me":
          return t("common.status.joinMe");
        case "ask me":
          return t("common.status.askMe");
        case "busy":
          return t("common.status.busy");
      }

      return status;
    },
    [t]
  );

  useEffect(() => {
    let mounted = true;

    const handleUpdate = (value: LimitedUserFriend[] | null) => {
      if (!mounted) {
        return;
      }
      setFriends(value);
      setLoading(false);
      if (value) {
        setError(null);
      }
    };

    const unsubscribe = userStore.subscribeFriends(handleUpdate);

    if (!user) {
      setFriends(null);
      setLoading(false);
      setError(null);
      return () => {
        mounted = false;
        unsubscribe();
      };
    }

    // Only show loading if we don't already have data
    const snapshot = userStore.getFriendsSnapshot();
    if (!snapshot) {
      setLoading(true);
      setError(null);
    }

    userStore.ensureFriends().catch((err) => {
      console.error("Failed to load friends:", err);
      if (!mounted) {
        return;
      }
      setError("loadFailed");
      setLoading(false);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [user?.id]);

  // Periodic refresh from backend (backend handles WebSocket updates to UserStore)
  useEffect(() => {
    if (!user) {
      return;
    }

    let disposed = false;

    const refreshFriends = async (showLoading = true) => {
      // Don't show loading spinner if we already have data
      const hasData = userStore.getFriendsSnapshot() !== null;
      const shouldShowLoading = showLoading && !hasData;

      if (!disposed && shouldShowLoading) {
        setLoading(true);
        setError(null);
      } else if (!disposed) {
        setError(null);
      }
      try {
        await userStore.refreshFriends();
      } catch (err) {
        console.error("Failed to refresh friends:", err);
        if (!disposed) {
          setError("loadFailed");
          if (shouldShowLoading) {
            setLoading(false);
          }
        }
        return;
      }
      if (!disposed && shouldShowLoading) {
        setLoading(false);
      }
    };

    // Initial load
    void refreshFriends(true);

    // Poll periodically to sync with backend UserStore
    const poller = setInterval(() => {
      void refreshFriends(false);
    }, POLL_INTERVAL_MS);

    return () => {
      disposed = true;
      clearInterval(poller);
    };
  }, [user?.id]);

  const getFriendSecondaryText = (friend: LimitedUserFriend) => {
    const location = friend.location?.trim();
    if (location && location.toLowerCase() !== "offline") {
      return describeLocation(location);
    }
    if (friend.platform?.toLowerCase() === "web") {
      return t("layout.friendsSidebar.status.website");
    }
    if (friend.statusDescription) {
      return friend.statusDescription;
    }
    return getStatusText(friend.status);
  };

  const friendsList = friends ?? [];

  const { sections, onlineCount, compactFriends } = useMemo(() => {
    const inWorld: LimitedUserFriend[] = [];
    const active: LimitedUserFriend[] = [];
    const offline: LimitedUserFriend[] = [];

    const isInWorld = (friend: LimitedUserFriend) => {
      const location = friend.location?.toLowerCase() ?? "";
      if (!location || location === "offline") {
        return false;
      }
      return true;
    };

    for (const friend of friendsList) {
      if (isInWorld(friend)) {
        inWorld.push(friend);
      } else if (!isUserOffline(friend)) {
        active.push(friend);
      } else {
        offline.push(friend);
      }
    }

    const sectionsData = [
      {
        key: "in-world",
        title: t("layout.friendsSidebar.sections.inWorld.title"),
        friends: inWorld,
        emptyMessage: t("layout.friendsSidebar.sections.inWorld.empty"),
      },
      {
        key: "active",
        title: t("layout.friendsSidebar.sections.active.title"),
        friends: active,
        emptyMessage: t("layout.friendsSidebar.sections.active.empty"),
      },
      {
        key: "offline",
        title: t("layout.friendsSidebar.sections.offline.title"),
        friends: offline,
        emptyMessage: t("layout.friendsSidebar.sections.offline.empty"),
      },
    ];

    const online = inWorld.length + active.length;
    // For the collapsed view we want to show all friends (in-world, active, then offline)
    // so the compact list should include offline friends as well.
    const compactList = [...inWorld, ...active, ...offline];

    return {
      sections: sectionsData,
      onlineCount: online,
      compactFriends: compactList,
    };
  }, [friendsList, t]);

  const renderFriendRow = (friend: LimitedUserFriend) => (
    <button
      key={friend.id}
      type="button"
      onClick={() => navigate(`/profile/${friend.id}`)}
      className="w-full rounded-lg border border-border/70 bg-card/60 px-2 py-1.5 text-left transition-all duration-200 hover:border-border hover:bg-card/80 hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
    >
      <div className="flex items-center gap-2.5">
        <UserAvatar
          user={{
            displayName: friend.displayName,
            userIcon: friend.userIcon,
            profilePicOverride: friend.profilePicOverride,
            profilePicOverrideThumbnail: friend.profilePicOverrideThumbnail,
            currentAvatarImageUrl: friend.currentAvatarImageUrl,
            currentAvatarThumbnailImageUrl:
              friend.currentAvatarThumbnailImageUrl,
          }}
          className="h-8 w-8"
          imageClassName="object-cover"
          fallbackClassName="text-xs font-medium bg-muted/50"
          statusClassName={getStatusDotClass(friend)}
          statusSize="45%"
          statusOffset="-10%"
          statusContainerClassName="bg-background/90 shadow-sm"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-tight truncate">
            {friend.displayName}
          </p>
          <p className="text-[11px] text-muted-foreground truncate">
            {getFriendSecondaryText(friend)}
          </p>
        </div>
      </div>
    </button>
  );

  // Show all compact friends when collapsed (no slicing).
  const compactFriendsToShow = compactFriends;
  // Only show sections that actually contain friends in the expanded view
  const visibleSections = sections.filter((s) => s.friends.length > 0);

  return (
    <div
      className={cn(
        "h-full bg-card border-l border-border transition-all duration-300 ease-in-out flex flex-col flex-shrink-0 overflow-hidden",
        isOpen ? "w-64" : "w-16"
      )}
    >
      {/* Header */}
      <div className="h-16 border-b border-border flex items-center justify-between px-4">
        {isOpen && (
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <span className="text-sm font-semibold">
              {t("layout.friendsSidebar.title")}
            </span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-8 w-8"
          title={
            isOpen
              ? t("layout.friendsSidebar.collapse")
              : t("layout.friendsSidebar.expand")
          }
        >
          {isOpen ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <User className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Friends List (uses custom ScrollArea to avoid native scrollbar) */}
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <p className="text-xs text-destructive text-center py-8">
              {t(`layout.friendsSidebar.errors.${error}`)}
            </p>
          ) : isOpen ? (
            visibleSections.length > 0 ? (
              visibleSections.map((section, index) => (
                <div
                  key={section.key}
                  className={cn(
                    "space-y-1.5",
                    index > 0 && "pt-4 border-t border-border/60"
                  )}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {section.title}
                  </p>
                  <div className="space-y-2">
                    {section.friends.map((friend) => renderFriendRow(friend))}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground text-center py-8">
                {t("layout.friendsSidebar.empty.collapsed")}
              </p>
            )
          ) : (
            // Collapsed view - show avatars only with separators between sections
            <div className="space-y-1">
              {compactFriendsToShow.length > 0 ? (
                <>
                  {sections.map((section, sectionIndex) => {
                    if (section.friends.length === 0) return null;

                    return (
                      <div key={section.key}>
                        {sectionIndex > 0 && (
                          <div className="py-1">
                            <div className="h-px bg-border/60" />
                          </div>
                        )}
                        <div className="space-y-1">
                          {section.friends.map((friend) => (
                            <button
                              key={friend.id}
                              type="button"
                              onClick={() => navigate(`/profile/${friend.id}`)}
                              title={friend.displayName}
                              className="mx-auto block rounded-full transition-transform duration-200 hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                            >
                              <UserAvatar
                                user={{
                                  displayName: friend.displayName,
                                  userIcon: friend.userIcon,
                                  profilePicOverride: friend.profilePicOverride,
                                  profilePicOverrideThumbnail:
                                    friend.profilePicOverrideThumbnail,
                                  currentAvatarImageUrl:
                                    friend.currentAvatarImageUrl,
                                  currentAvatarThumbnailImageUrl:
                                    friend.currentAvatarThumbnailImageUrl,
                                }}
                                className="h-8 w-8 mx-auto"
                                imageClassName="object-cover"
                                fallbackClassName="text-xs font-medium bg-muted/50"
                                statusClassName={getStatusDotClass(friend)}
                                statusSize="45%"
                                statusOffset="-10%"
                                statusContainerClassName="bg-background/90 shadow-sm"
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-6">
                  {t("layout.friendsSidebar.empty.collapsed")}
                </p>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer - Online count */}
      {isOpen && !loading && (
        <div className="border-t border-border p-3 text-center text-xs text-muted-foreground">
          {t("layout.friendsSidebar.onlineCount", { count: onlineCount })}
        </div>
      )}
    </div>
  );
}
