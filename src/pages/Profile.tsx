import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  cn,
  isUserOffline,
  getStatusDotClass,
  getStatusBadgeColor,
} from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Award, FileText, Info, Link as LinkIcon } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import { CachedImage } from "@/components/CachedImage";
import { useCachedImage } from "@/hooks/useCachedImage";
import { LoginRequired } from "@/components/LoginRequired";
import { VRChatService } from "@/services/vrchat";
import { userStore } from "@/stores";
import type {
  User,
  LimitedUserFriend,
  Badge as BadgeType,
} from "@/types/bindings";

// TODO: Improve these to less hacky way, might require store refactoring
// Strong type guards for runtime narrowing
function isFullUser(obj: unknown): obj is User {
  return (
    typeof obj === "object" &&
    obj !== null &&
    // "username" is present on full User but not on LimitedUserFriend
    "username" in (obj as Record<string, unknown>) &&
    typeof (obj as any).username === "string"
  );
}

function isLimitedUserFriend(obj: unknown): obj is LimitedUserFriend {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "displayName" in (obj as Record<string, unknown>) &&
    !("username" in (obj as Record<string, unknown>))
  );
}

export function Profile() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const { userId } = useParams<{ userId?: string }>();
  const [activeTab, setActiveTab] = useState("about");

  const viewingSelf = !userId || userId === currentUser?.id;
  const targetUserId = viewingSelf ? currentUser?.id ?? null : userId ?? null;

  const [profile, setProfile] = useState<User | LimitedUserFriend | null>(
    viewingSelf ? currentUser ?? null : null
  );
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab("about");
  }, [targetUserId]);

  useEffect(() => {
    let active = true;

    if (viewingSelf) {
      if (currentUser) {
        setProfile(currentUser);
        setProfileError(null);
      } else if (!authLoading) {
        setProfile(null);
        setProfileError("Profile not available.");
      }
      return () => {
        active = false;
      };
    }

    if (!targetUserId) {
      setProfile(null);
      setProfileError("User not found.");
      return () => {
        active = false;
      };
    }

    setProfileError(null);

    const snapshot = userStore.getFriendsSnapshot();

    // Check if we have friend data to show immediately
    if (snapshot) {
      const cachedFriend = snapshot.find(
        (friend) => friend.id === targetUserId
      );
      if (cachedFriend) {
        setProfile(cachedFriend);
      }
    } else {
      userStore.ensureFriends().catch(() => undefined);
    }

    // Get full user data in the background (from cache if available)
    VRChatService.getUserById(targetUserId)
      .then((result) => {
        if (!active) {
          return;
        }

        setProfile(result);
        setProfileError(null);
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        console.error("Failed to load profile", error);

        if (!profile) {
          setProfileError("User not found.");
        }
      });

    return () => {
      active = false;
    };
  }, [viewingSelf, targetUserId, currentUser, authLoading]);

  useEffect(() => {
    if (!viewingSelf || !currentUser?.id) {
      return;
    }

    let cancelled = false;

    VRChatService.getCurrentUser()
      .then((fresh) => {
        if (!cancelled) {
          setProfile(fresh);
          setProfileError(null);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error("Failed to load current user profile", error);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [viewingSelf, currentUser?.id]);

  // TODO: Refactor to common utility
  const getLanguageName = (tag: string): string | null => {
    if (!tag.startsWith("language_")) {
      return null;
    }

    const langCode = tag.replace("language_", "").toLowerCase();

    const codeToName: Record<string, string> = {
      eng: "English",
      spa: "Spanish",
      fra: "French",
      deu: "German",
      ita: "Italian",
      por: "Portuguese",
      jpn: "Japanese",
      zho: "Chinese",
      kor: "Korean",
      rus: "Russian",
      ukr: "Ukrainian",
      pol: "Polish",
      tur: "Turkish",
      ara: "Arabic",
      hin: "Hindi",
      tha: "Thai",
      vie: "Vietnamese",
      nld: "Dutch",
      swe: "Swedish",
      nor: "Norwegian",
      dan: "Danish",
      fin: "Finnish",
      ell: "Greek",
      ces: "Czech",
      hun: "Hungarian",
      ron: "Romanian",
      bul: "Bulgarian",
      hrv: "Croatian",
      srp: "Serbian",
      slk: "Slovak",
      slv: "Slovenian",
    };

    return codeToName[langCode] || null;
  };

  const getLinkLabel = (link: string): string => {
    try {
      return getLinkLabel(link);
    } catch {
      return link;
    }
  };

  // TODO: Refactor to common utility
  // TODO: Handle nuisance cases, check other places too
  const getHighestTrustRank = (
    tags: string[]
  ): { name: string; color: string } | null => {
    // Order: Veteran (Trusted User) > Trusted (Known User) > Known (User) > New (New User) > Visitor
    if (tags.includes("system_trust_veteran")) {
      return {
        name: "Trusted",
        color: "bg-purple-500 text-white border border-purple-500",
      };
    }
    if (tags.includes("system_trust_trusted")) {
      return {
        name: "Known",
        color: "bg-orange-500 text-white border border-orange-500",
      };
    }
    if (tags.includes("system_trust_known")) {
      return {
        name: "User",
        color: "bg-green-500 text-white border border-green-500",
      };
    }
    if (tags.includes("system_trust_basic")) {
      return {
        name: "New",
        color: "bg-blue-500 text-white border border-blue-500",
      };
    }
    if (!tags.some((tag) => tag.startsWith("system_trust_"))) {
      return {
        name: "Visitor",
        color: "bg-gray-500 text-white border border-gray-500",
      };
    }
    return null;
  };

  const badges = useMemo((): BadgeType[] => {
    if (!profile) return [];
    if (isFullUser(profile) && Array.isArray(profile.badges)) {
      return profile.badges ?? [];
    }
    return [];
  }, [profile]);

  const showcasedBadges = badges.filter((badge: BadgeType) => badge.showcased);
  const otherBadges = badges.filter((badge: BadgeType) => !badge.showcased);
  const profilePronouns = isFullUser(profile) ? profile.pronouns : undefined;
  const profileAgeVerified = isFullUser(profile)
    ? profile.ageVerified
    : undefined;
  const profileDateJoined = isFullUser(profile)
    ? profile.dateJoined
    : undefined;
  const profileLastLogin = isFullUser(profile) ? profile.lastLogin : undefined;
  const profileLastActivity = isFullUser(profile)
    ? profile.lastActivity
    : undefined;
  const profileLastPlatform = isFullUser(profile)
    ? profile.lastPlatform
    : undefined;
  const profileBioLinks = isFullUser(profile)
    ? profile.bioLinks ?? []
    : isLimitedUserFriend(profile)
    ? profile.bioLinks ?? []
    : [];
  const profileTags = isFullUser(profile)
    ? profile.tags ?? []
    : isLimitedUserFriend(profile)
    ? profile.tags ?? []
    : [];
  const highestTrustRank = useMemo(() => {
    if (profileTags.length === 0) {
      return null;
    }
    return getHighestTrustRank(profileTags);
  }, [profileTags]);

  const cachedBannerUrl = useCachedImage(profile?.profilePicOverride);

  if (!authLoading && !currentUser) {
    return <LoginRequired />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="border-border/70 bg-card/80 backdrop-blur">
          <CardContent className="p-6 text-center space-y-2">
            <h2 className="text-lg font-semibold">Profile unavailable</h2>
            <p className="text-sm text-muted-foreground">
              {profileError ?? "We could not load this profile right now."}
            </p>
            <Button variant="outline" onClick={() => window.history.back()}>
              Go back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-background bg-cover bg-center bg-fixed"
      style={{
        backgroundImage:
          cachedBannerUrl || profile.profilePicOverride
            ? `linear-gradient(135deg, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.3)), url(${
                cachedBannerUrl || profile.profilePicOverride
              })`
            : "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 100%)",
      }}
    >
      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Profile Header Card */}
        <div className="relative mb-6">
          <Card className="bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/80 border-white/10">
            <CardContent className="pt-5 pb-5">
              <div className="flex gap-6 items-stretch">
                {/* Avatar */}
                <div className="shrink-0 flex items-center">
                  <div className="h-40 w-40 flex-shrink-0">
                    <UserAvatar
                      user={profile}
                      className="h-full w-full"
                      imageClassName="object-cover"
                      fallbackClassName="text-3xl font-bold text-white bg-gradient-to-br from-primary/80 to-secondary/80"
                      statusClassName={getStatusDotClass(profile)}
                      statusSize="18%"
                      statusOffset="2%"
                      statusContainerClassName="bg-background/95 shadow-sm"
                    />
                  </div>
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  {/* Display Name Row */}
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <h1 className="text-3xl font-bold tracking-tight">
                      {profile.displayName}
                    </h1>

                    {/* Pronouns Chip */}
                    {profilePronouns && (
                      <Badge
                        variant="secondary"
                        className="text-xs font-normal"
                      >
                        {profilePronouns}
                      </Badge>
                    )}
                  </div>

                  {/* Status Chip */}
                  <div className="flex items-center gap-3 text-muted-foreground mb-3 flex-wrap">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge
                            variant="secondary"
                            className="text-xs font-normal gap-1.5 cursor-default"
                          >
                            <div
                              className={cn(
                                "h-2 w-2 rounded-full",
                                getStatusBadgeColor(profile)
                              )}
                            />
                            <span className="capitalize">
                              {isUserOffline(profile)
                                ? profile.statusDescription || "Offline"
                                : profile.statusDescription ||
                                  profile.status ||
                                  "Online"}
                            </span>
                          </Badge>
                        </TooltipTrigger>
                        {profile.status &&
                          (isUserOffline(profile) ||
                            profile.statusDescription) && (
                            <TooltipContent>
                              <p className="text-xs">
                                Status:{" "}
                                <span className="capitalize">
                                  {profile.status}
                                </span>
                              </p>
                            </TooltipContent>
                          )}
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  {/* Languages */}
                  {profileTags.length > 0 && (
                    <div className="flex gap-1 flex-wrap mb-3">
                      {profileTags
                        .filter((tag: string) => tag.startsWith("language_"))
                        .map((tag: string) => {
                          const langName = getLanguageName(tag);
                          if (langName) {
                            return (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="text-xs font-normal"
                              >
                                {langName}
                              </Badge>
                            );
                          }
                          return null;
                        })}
                    </div>
                  )}

                  {/* Featured Badges */}
                  {showcasedBadges.length > 0 && (
                    <div className="flex gap-2">
                      {showcasedBadges.slice(0, 3).map((badge: BadgeType) => (
                        <div
                          key={badge.badgeId}
                          title={badge.badgeName}
                          className="h-8 w-8 rounded overflow-hidden hover:scale-110 transition-transform"
                        >
                          {badge.badgeImageUrl ? (
                            <CachedImage
                              src={badge.badgeImageUrl}
                              alt={badge.badgeName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-primary/10">
                              <Award className="h-4 w-4 text-primary" />
                            </div>
                          )}
                        </div>
                      ))}
                      {showcasedBadges.length > 3 && (
                        <Badge
                          variant="outline"
                          className="text-xs h-8 flex items-center px-2"
                        >
                          +{showcasedBadges.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                {/* Right Side */}
                <div className="shrink-0 flex gap-2 items-start pt-1.5">
                  {/* Age Verified */}
                  {profileAgeVerified !== undefined && (
                    <Badge
                      variant="secondary"
                      className="text-xs font-normal whitespace-nowrap"
                    >
                      {profileAgeVerified ? "Age Verified" : "Not Age Verified"}
                    </Badge>
                  )}

                  {/* Trust Rank */}
                  {highestTrustRank && (
                    <Badge
                      className={cn(
                        "text-xs font-normal",
                        highestTrustRank.color
                      )}
                    >
                      {highestTrustRank.name}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs Section */}
        <Card className="bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/80 border-white/10">
          <CardHeader className="pb-3">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="about">
                  <Info className="h-4 w-4 mr-2" />
                  About
                </TabsTrigger>
                <TabsTrigger value="badges">
                  <Award className="h-4 w-4 mr-2" />
                  Badges
                </TabsTrigger>
                <TabsTrigger value="details">
                  <FileText className="h-4 w-4 mr-2" />
                  Account Details
                </TabsTrigger>
              </TabsList>

              {/* About Tab */}
              <TabsContent value="about" className="mt-6 space-y-4">
                {profile.bio ? (
                  <div>
                    <h3 className="font-semibold mb-2">Bio</h3>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-justify">
                      {profile.bio}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No bio</p>
                )}

                {profileBioLinks.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-semibold flex items-center gap-2 mb-2">
                        <LinkIcon className="h-4 w-4" />
                        Links
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {profileBioLinks.map((link: string, index: number) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            asChild
                            className="text-xs"
                          >
                            <a
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <LinkIcon className="h-3 w-3 mr-1" />
                              {getLinkLabel(link)}
                            </a>
                          </Button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </TabsContent>

              {/* Badges Tab */}
              <TabsContent value="badges" className="mt-6 space-y-4">
                {badges.length > 0 ? (
                  <div>
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold mb-3">
                        Featured Badges ({showcasedBadges.length})
                      </h3>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {showcasedBadges.map((badge: BadgeType) => (
                          <div
                            key={badge.badgeId}
                            className="flex items-start gap-3 p-4 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-lg border border-primary/10 hover:border-primary/20 transition-colors"
                          >
                            {badge.badgeImageUrl ? (
                              <CachedImage
                                src={badge.badgeImageUrl}
                                alt={badge.badgeName}
                                className="h-10 w-10 rounded shrink-0 object-cover"
                              />
                            ) : (
                              <Award className="h-10 w-10 text-primary shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {badge.badgeName}
                              </p>
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                {badge.badgeDescription || "Badge"}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {otherBadges.length > 0 ? (
                      <>
                        <Separator />
                        <div>
                          <h3 className="text-sm font-semibold mb-3">
                            Other Badges ({otherBadges.length})
                          </h3>
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {otherBadges.map((badge: BadgeType) => (
                              <div
                                key={badge.badgeId}
                                className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg border border-border hover:border-foreground/20 transition-colors"
                              >
                                {badge.badgeImageUrl ? (
                                  <CachedImage
                                    src={badge.badgeImageUrl}
                                    alt={badge.badgeName}
                                    className="h-10 w-10 rounded shrink-0 object-cover"
                                  />
                                ) : (
                                  <Award className="h-10 w-10 text-muted-foreground shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">
                                    {badge.badgeName}
                                  </p>
                                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                    {badge.badgeDescription || "Badge"}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No badges yet</p>
                )}
              </TabsContent>

              {/* Account Details Tab */}
              <TabsContent value="details" className="mt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase mb-2">
                      User ID
                    </p>
                    <p className="text-sm font-mono text-primary break-all">
                      {profile.id}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase mb-2">
                      Joined
                    </p>
                    <p className="text-sm">
                      {profileDateJoined
                        ? new Date(profileDateJoined).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            }
                          )
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase mb-2">
                      Last Login
                    </p>
                    <p className="text-sm">
                      {profileLastLogin
                        ? new Date(profileLastLogin).toLocaleString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase mb-2">
                      Last Activity
                    </p>
                    <p className="text-sm">
                      {profileLastActivity
                        ? new Date(profileLastActivity).toLocaleString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase mb-2">
                      Platform
                    </p>
                    <p className="text-sm capitalize">
                      {profileLastPlatform || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase mb-2">
                      Status
                    </p>
                    <p className="text-sm capitalize">
                      {profile.status || "Offline"}
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
