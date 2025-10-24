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
import { worldsStore } from "@/stores/worlds-store";
import type { LimitedWorld } from "@/types/bindings";
import { useAuth } from "../context/AuthContext";
import { LoginRequired } from "@/components/LoginRequired";
import { useTranslation } from "react-i18next";
import { CachedImage } from "@/components/CachedImage";

const numberFormatter = new Intl.NumberFormat(undefined, {
  notation: "compact",
  maximumFractionDigits: 1,
});
const dateFormatter = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
});

function formatNumber(value?: number | null): string {
  if (value === undefined || value === null) {
    return "0";
  }
  return numberFormatter.format(value);
}

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
    default:
      return platform;
  }
}

function extractPlatforms(world: LimitedWorld): string[] {
  const platforms = new Set<string>();
  world.unityPackages?.forEach((pkg) => {
    const label = platformLabel(pkg.platform);
    if (label) {
      platforms.add(label);
    }
  });
  return Array.from(platforms);
}

function cleanTag(tag: string): string {
  if (tag.startsWith("author_tag_")) {
    return tag.replace("author_tag_", "");
  }
  if (tag.startsWith("system_")) {
    return tag.replace("system_", "");
  }
  return tag;
}

export function Worlds() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [worlds, setWorlds] = useState<LimitedWorld[] | null>(
    worldsStore.getSnapshot()
  );
  const [loading, setLoading] = useState(!worlds);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const handleUpdate = (value: LimitedWorld[] | null) => {
      if (!mounted) {
        return;
      }
      setWorlds(value);
      setLoading(false);
      if (value) {
        setError(null);
      }
    };

    const unsubscribe = worldsStore.subscribe(handleUpdate);

    const snapshot = worldsStore.getSnapshot();
    setWorlds(snapshot);

    if (!user) {
      setWorlds(null);
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

    worldsStore.ensure().catch((err) => {
      if (!mounted) {
        return;
      }
      const message =
        err instanceof Error ? err.message : "Failed to load worlds";
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
      await worldsStore.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to refresh worlds";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <LoginRequired />;
  }

  const hasWorlds = (worlds?.length ?? 0) > 0;

  return (
    <div className="p-8">
      <div className="w-full space-y-6">
        <div className="flex flex-col-reverse gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {t("page.worlds.title")}
            </h1>
            <p className="text-muted-foreground mt-2">
              {t("page.worlds.description")}
            </p>
            {hasWorlds && !loading && (
              <p className="text-sm text-muted-foreground mt-2">
                {worlds && worlds.length === 1
                  ? t("page.worlds.showingSingle", { count: worlds.length })
                  : t("page.worlds.showingMultiple", {
                      count: worlds?.length ?? 0,
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
              ? t("page.worlds.refresh.loading")
              : t("page.worlds.refresh.label")}
          </Button>
        </div>

        {error && (
          <Card>
            <CardHeader>
              <CardTitle>{t("page.worlds.error.title")}</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button size="sm" onClick={handleRefresh} disabled={loading}>
                {t("page.worlds.error.tryAgain")}
              </Button>
            </CardContent>
          </Card>
        )}

        {loading && (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="overflow-hidden">
                <div className="aspect-video bg-muted animate-pulse" />
                <CardHeader className="gap-2">
                  <div className="h-6 bg-muted animate-pulse rounded" />
                  <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="h-4 bg-muted animate-pulse rounded" />
                  <div className="h-4 bg-muted animate-pulse rounded w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && !error && !hasWorlds && (
          <Card>
            <CardHeader>
              <CardTitle>{t("page.worlds.noItemsTitle")}</CardTitle>
              <CardDescription>
                {t("page.worlds.noItemsDescription")}
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {!loading && !error && hasWorlds && (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {worlds!.map((world) => {
              const platforms = extractPlatforms(world);
              const previewUrl =
                world.imageUrl ?? world.thumbnailImageUrl ?? undefined;
              const updatedLabel = formatDate(
                world.updatedAt ?? world.publicationDate ?? world.createdAt
              );

              return (
                <Card key={world.id} className="overflow-hidden flex flex-col">
                  <div className="relative aspect-video bg-muted">
                    {previewUrl ? (
                      <CachedImage
                        src={previewUrl}
                        alt={world.name}
                        className="absolute inset-0 h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                        {t("page.worlds.noPreview")}
                      </div>
                    )}
                    {world.releaseStatus && (
                      <Badge
                        className="absolute left-4 top-4 uppercase"
                        variant="secondary"
                      >
                        {world.releaseStatus}
                      </Badge>
                    )}
                  </div>

                  <CardHeader className="flex-0 space-y-2">
                    <CardTitle className="leading-tight">
                      {world.name}
                    </CardTitle>
                    <CardDescription>
                      {world.authorName
                        ? t("page.worlds.byAuthor", {
                            author: world.authorName,
                          })
                        : t("page.worlds.authorUnknown")}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="flex-1 space-y-4">
                    {world.description && (
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {world.description}
                      </p>
                    )}

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-xs font-medium uppercase text-muted-foreground">
                          {t("page.worlds.labels.visits")}
                        </p>
                        <p className="font-medium">
                          {formatNumber(world.visits ?? 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase text-muted-foreground">
                          {t("page.worlds.labels.favorites")}
                        </p>
                        <p className="font-medium">
                          {formatNumber(world.favorites ?? 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase text-muted-foreground">
                          {t("page.worlds.labels.capacity")}
                        </p>
                        <p className="font-medium">
                          {world.capacity ?? "—"}
                          {world.recommendedCapacity
                            ? ` / ${world.recommendedCapacity}`
                            : ""}
                        </p>
                      </div>
                    </div>

                    {platforms.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {platforms.map((platform) => (
                          <Badge
                            key={`${world.id}-${platform}`}
                            variant="outline"
                          >
                            {platform}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {world.tags && world.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {world.tags.slice(0, 6).map((tag) => (
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
                      {t("page.worlds.labels.updatedPrefix", {
                        date: updatedLabel,
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
