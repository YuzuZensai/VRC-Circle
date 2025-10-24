import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { avatarsStore } from "@/stores/avatars-store";
import type { LimitedAvatar } from "@/types/bindings";
import { useAuth } from "../context/AuthContext";
import { LoginRequired } from "@/components/LoginRequired";
import { useTranslation } from "react-i18next";
import { CachedImage } from "@/components/CachedImage";

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
});

function formatDate(value?: string | null): string {
  if (!value) {
    return "Unknown";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Unknown";
  }
  return dateFormatter.format(parsed);
}

function platformLabel(platform?: string | null): string | null {
  if (!platform) {
    return null;
  }
  const normalized = platform.toLowerCase();
  switch (normalized) {
    case "standalonewindows":
    case "standalonewindows64":
      return "PC";
    case "android":
      return "Quest";
    case "ios":
      return "iOS";
    default:
      return platform;
  }
}

function extractPlatforms(avatar: LimitedAvatar): string[] {
  const platforms = new Set<string>();
  avatar.unityPackages?.forEach((pkg) => {
    const label = platformLabel(pkg.platform);
    if (label) {
      platforms.add(label);
    }
  });
  return Array.from(platforms);
}

function performanceEntries(avatar: LimitedAvatar): string[] {
  const entries: string[] = [];
  const performance = avatar.performance;
  if (!performance) {
    return entries;
  }

  const mapping: Array<[keyof typeof performance, string]> = [
    ["standalonewindows", "PC"],
    ["android", "Quest"],
    ["ios", "iOS"],
  ];

  for (const [key, label] of mapping) {
    const value = performance[key];
    if (value) {
      entries.push(`${label}: ${value}`);
    }
  }
  return entries;
}

function cleanTag(tag: string): string {
  if (tag.startsWith("author_tag_")) {
    return tag.replace("author_tag_", "");
  }
  if (tag.startsWith("system_")) {
    return tag.replace("system_", "");
  }
  if (tag.startsWith("admin_")) {
    return tag.replace("admin_", "");
  }
  return tag;
}

export function Avatars() {
  const { user } = useAuth();
  const [avatars, setAvatars] = useState<LimitedAvatar[] | null>(
    avatarsStore.getSnapshot()
  );
  const [loading, setLoading] = useState(!avatars);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const handleUpdate = (value: LimitedAvatar[] | null) => {
      if (!mounted) {
        return;
      }
      setAvatars(value);
      setLoading(false);
      if (value) {
        setError(null);
      }
    };

    const unsubscribe = avatarsStore.subscribe(handleUpdate);

    const snapshot = avatarsStore.getSnapshot();
    setAvatars(snapshot);

    if (!user) {
      setAvatars(null);
      setLoading(false);
      setError(null);
      return () => {
        mounted = false;
        unsubscribe();
      };
    }

    if (!snapshot) {
      setLoading(true);
      setError(null);
    } else {
      setLoading(false);
    }

    avatarsStore.ensure().catch((err) => {
      if (!mounted) {
        return;
      }
      const message =
        err instanceof Error ? err.message : "Failed to load avatars";
      setError(message);
      setLoading(false);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [user?.id]);

  const handleRefresh = async () => {
    setLoading(true);
    setError(null);
    try {
      await avatarsStore.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to refresh avatars";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const { t } = useTranslation();

  if (!user) {
    return <LoginRequired />;
  }

  const hasAvatars = (avatars?.length ?? 0) > 0;

  return (
    <div className="p-8 w-full flex flex-col gap-8">
      <div className="w-full space-y-6">
        <div className="flex flex-col-reverse gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {t("page.avatars.title")}
            </h1>
            <p className="text-muted-foreground mt-2">
              {t("page.avatars.description")}
            </p>
            {hasAvatars && !loading && (
              <p className="text-sm text-muted-foreground mt-2">
                {avatars && avatars.length === 1
                  ? t("page.avatars.showingSingle", { count: avatars.length })
                  : t("page.avatars.showingMultiple", {
                      count: avatars?.length ?? 0,
                    })}
              </p>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading
              ? t("page.avatars.refresh.loading")
              : t("page.avatars.refresh.label")}
          </Button>
        </div>

        {error && (
          <Card className="w-full">
            <CardHeader>
              <CardTitle>{t("page.avatars.error.title")}</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button size="sm" onClick={handleRefresh} disabled={loading}>
                {t("page.avatars.error.tryAgain")}
              </Button>
            </CardContent>
          </Card>
        )}

        {loading && (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 w-full">
            {Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="overflow-hidden">
                <CardContent>{t("page.avatars.refresh.loading")}</CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && !error && !hasAvatars && (
          <Card>
            <CardHeader>
              <CardTitle>{t("page.avatars.noItemsTitle")}</CardTitle>
              <CardDescription>
                {t("page.avatars.noItemsDescription")}
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {!loading && !error && hasAvatars && (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {avatars!.map((avatar) => {
              const platforms = extractPlatforms(avatar);
              const performance = performanceEntries(avatar);
              const previewUrl =
                avatar.imageUrl ?? avatar.thumbnailImageUrl ?? undefined;
              const updatedLabel = formatDate(
                avatar.updatedAt ?? avatar.createdAt
              );
              const isFeatured = Boolean(avatar.featured);
              const styles = avatar.styles ?? null;

              return (
                <Card key={avatar.id} className="overflow-hidden flex flex-col">
                  <div className="relative aspect-video bg-muted">
                    {previewUrl ? (
                      <CachedImage
                        src={previewUrl}
                        alt={avatar.name}
                        className="absolute inset-0 h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                        {t("page.avatars.noPreview")}
                      </div>
                    )}
                    {avatar.releaseStatus && (
                      <Badge
                        className="absolute left-4 top-4 uppercase"
                        variant="secondary"
                      >
                        {t(`page.avatars.status.${avatar.releaseStatus}`, {
                          defaultValue: avatar.releaseStatus,
                        })}
                      </Badge>
                    )}
                    {isFeatured && (
                      <Badge
                        className="absolute right-4 top-4 uppercase"
                        variant="default"
                      >
                        Featured
                      </Badge>
                    )}
                  </div>

                  <CardHeader className="flex-0 space-y-2">
                    <CardTitle className="leading-tight">
                      {avatar.name}
                    </CardTitle>
                    <CardDescription>
                      {avatar.authorName
                        ? t("page.avatars.byAuthor", {
                            author: avatar.authorName,
                          })
                        : t("page.avatars.authorUnknown")}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="flex-1 space-y-4">
                    {avatar.description && (
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {avatar.description}
                      </p>
                    )}

                    {platforms.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {platforms.map((platform) => (
                          <Badge
                            key={`${avatar.id}-${platform}`}
                            variant="outline"
                          >
                            {platform}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {performance.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium uppercase text-muted-foreground">
                          {t("page.avatars.labels.performance")}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {performance.map((entry) => (
                            <Badge
                              key={`${avatar.id}-${entry}`}
                              variant="secondary"
                            >
                              {entry}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs font-medium uppercase text-muted-foreground">
                          {t("page.avatars.labels.release")}
                        </p>
                        <p className="font-medium capitalize">
                          {avatar.releaseStatus
                            ? t(`page.avatars.status.${avatar.releaseStatus}`, {
                                defaultValue: avatar.releaseStatus,
                              })
                            : t("page.avatars.labels.unknown")}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase text-muted-foreground">
                          {t("page.avatars.labels.updated")}
                        </p>
                        <p className="font-medium">{updatedLabel}</p>
                      </div>
                      {avatar.version !== undefined &&
                        avatar.version !== null && (
                          <div>
                            <p className="text-xs font-medium uppercase text-muted-foreground">
                              {t("page.avatars.labels.version")}
                            </p>
                            <p className="font-medium">{avatar.version}</p>
                          </div>
                        )}
                      {styles && (styles.primary || styles.secondary) && (
                        <div>
                          <p className="text-xs font-medium uppercase text-muted-foreground">
                            {t("page.avatars.labels.style")}
                          </p>
                          <p className="font-medium">
                            {[styles.primary, styles.secondary]
                              .filter((value): value is string =>
                                Boolean(value)
                              )
                              .join(" / ") || "N/A"}
                          </p>
                        </div>
                      )}
                    </div>

                    {avatar.tags && avatar.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {avatar.tags.slice(0, 6).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-muted px-2 py-1"
                          >
                            #{cleanTag(tag)}
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground">
                      {t("page.avatars.labels.createdPrefix", {
                        date: formatDate(avatar.createdAt),
                      })}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
