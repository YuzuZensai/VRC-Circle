import { useState } from "react";
import { type UserProfile } from "../../../../shared/types/user";
import { Avatar, Banner, Fact, LinkPill, Section, Skeleton, Tabs, Tag } from "../../components/ui";
import {
  avatarOf,
  bannerOf,
  developerLabels,
  isOnline,
  languageLabel,
  statusMeta,
  trustMeta,
} from "../../lib/vrchat";
import { useProfile } from "./useProfile";
import { WorldsSection, FavoriteWorldsSection } from "./WorldsSection";
import { GroupsSection } from "./GroupsSection";
import { LocationSection } from "./LocationSection";
import { COL, COL_WIDE } from "../../lib/layout";
import { formatDate, formatDateTime, platformLabel, prettyTag } from "../../lib/format";
import "./profile.css";

export function ProfileView({ target }: { target: "me" | string }) {
  const state = useProfile(target);

  if (state.status === "loading") return <ProfileSkeleton />;
  if (state.status === "error")
    return <Banner className="m-10 max-w-[420px]">{state.message}</Banner>;

  return <ProfileCard profile={state.profile} />;
}

function ProfileCard({ profile }: { profile: UserProfile }) {
  const [tab, setTab] = useState<TabId>("overview");
  const trust = trustMeta[profile.trustRank];
  const online = isOnline(profile);
  const status = statusMeta[profile.status];
  const presenceStatus = online ? status : statusMeta.offline;
  const statusLabel =
    !online && profile.status !== "offline" ? `Offline (${status.label})` : status.label;
  const avatar = avatarOf(profile);
  const banner = bannerOf(profile);
  const devLabel = profile.developerType ? developerLabels[profile.developerType] : undefined;
  const bioLinks = (profile.bioLinks ?? []).filter(Boolean);
  const showcasedBadges = (profile.badges ?? []).filter((b) => b.showcased);

  return (
    <article className="profile flex min-h-full w-full flex-col bg-surface pb-12">
      <div
        className="profile__banner"
        style={{ backgroundImage: banner ? `url(${banner})` : undefined }}
      />

      <div className={`${COL_WIDE} relative flex items-end gap-6`} style={{ marginTop: -72 }}>
        <div className="profile__avatar" style={{ "--ring": trust.color } as React.CSSProperties}>
          <Avatar src={avatar} name={profile.displayName} size={116} />
          <span
            className="profile__status-dot"
            style={{ background: presenceStatus.color }}
            title={statusLabel}
          />
        </div>

        <div className="min-w-0 pb-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-[32px] font-bold tracking-[-0.6px]">{profile.displayName}</h2>
            {profile.isSelf ? <Tag color="var(--accent)">You</Tag> : null}
            {profile.isFriend && !profile.isSelf ? (
              <Tag color="var(--status-join)">Friend</Tag>
            ) : null}
            {devLabel ? <Tag color="var(--accent)">{devLabel}</Tag> : null}
            {profile.ageVerified ? <Tag color="var(--trust-trusted)">18+ Verified</Tag> : null}
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-3">
            <Tag color={trust.color}>{trust.label}</Tag>
            <span
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold"
              style={{ color: presenceStatus.color }}
            >
              <span className="size-2 rounded-full" style={{ background: presenceStatus.color }} />
              {statusLabel}
            </span>
            {profile.pronouns ? (
              <span className="text-[13px] text-muted">{profile.pronouns}</span>
            ) : null}
          </div>
          {showcasedBadges.length ? (
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              {showcasedBadges.map((b) => (
                <img
                  key={b.id}
                  src={b.imageUrl}
                  alt={b.name}
                  title={`${b.name} — ${b.description}`}
                  className="size-6 object-contain"
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className={`${COL_WIDE} mt-6 flex flex-col gap-5`}>
        <LocationSection location={profile.location} />

        <Tabs
          tabs={[
            { id: "overview", label: "Overview" },
            { id: "worlds", label: "Worlds" },
            { id: "favorites", label: "Favorite Worlds" },
            { id: "groups", label: "Groups" },
          ]}
          active={tab}
          onChange={setTab}
        />

        {tab === "overview" ? (
          <div className="flex flex-col gap-5 rise-in">
            {profile.note ? (
              <Section title="Your note">
                <p className="text-[14px] leading-relaxed whitespace-pre-wrap text-text">
                  {profile.note}
                </p>
              </Section>
            ) : null}

            {profile.statusDescription || profile.bio || bioLinks.length ? (
              <Section title="About">
                {profile.statusDescription ? (
                  <p className="text-[15px] italic text-text">“{profile.statusDescription}”</p>
                ) : null}
                {profile.bio ? (
                  <p className="text-[14px] leading-relaxed whitespace-pre-wrap text-muted">
                    {profile.bio}
                  </p>
                ) : null}
                {bioLinks.length ? (
                  <div className="flex flex-wrap gap-2">
                    {bioLinks.map((link) => (
                      <LinkPill key={link} href={link}>
                        {prettyLink(link)}
                      </LinkPill>
                    ))}
                  </div>
                ) : null}
              </Section>
            ) : null}

            <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
              <Section title="Details">
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
                  {profile.dateJoined ? (
                    <Fact label="Joined" value={formatDate(profile.dateJoined)} />
                  ) : null}
                  {profile.lastLogin ? (
                    <Fact label="Last login" value={formatDateTime(profile.lastLogin)} />
                  ) : null}
                  {profile.lastActivity ? (
                    <Fact label="Last activity" value={formatDateTime(profile.lastActivity)} />
                  ) : null}
                  {profile.lastPlatform ? (
                    <Fact label="Platform" value={platformLabel(profile.lastPlatform)} />
                  ) : null}
                  {profile.state ? <Fact label="State" value={stateLabel(profile.state)} /> : null}
                  <Fact label="User ID" value={profile.id} mono />
                </dl>
              </Section>

              {profile.languages?.length ? (
                <Section title="Languages">
                  <div className="flex flex-wrap gap-1.5">
                    {profile.languages.map((code) => (
                      <Tag key={code}>{languageLabel(code)}</Tag>
                    ))}
                  </div>
                </Section>
              ) : null}

              {profile.currentAvatarTags?.length ? (
                <Section title="Avatar tags">
                  <div className="flex flex-wrap gap-1.5">
                    {profile.currentAvatarTags.map((t) => (
                      <Tag key={t}>{prettyTag(t, "content_")}</Tag>
                    ))}
                  </div>
                </Section>
              ) : null}

              {profile.badges?.length ? (
                <Section title="Badges">
                  <div className="flex flex-wrap gap-2.5">
                    {[...profile.badges]
                      .sort((a, b) => Number(b.showcased) - Number(a.showcased))
                      .map((b) => (
                        <div
                          key={b.id}
                          title={b.description}
                          className="flex items-center gap-2.5 rounded-lg border border-border bg-surface px-2.5 py-1.5"
                        >
                          {b.imageUrl ? (
                            <img
                              src={b.imageUrl}
                              alt=""
                              className="size-10 shrink-0 object-contain"
                            />
                          ) : null}
                          <span className="text-[13px] font-medium text-text">{b.name}</span>
                        </div>
                      ))}
                  </div>
                </Section>
              ) : null}
            </div>

            {profile.pastDisplayNames?.length ? (
              <Section title="Former names" collapsible>
                <div className="flex flex-wrap gap-2">
                  {profile.pastDisplayNames.map((p) => (
                    <span
                      key={`${p.displayName}-${p.updatedAt}`}
                      className="rounded-lg border border-border bg-surface px-2.5 py-1 text-[13px] text-text"
                    >
                      {p.displayName}
                      {p.updatedAt ? (
                        <em className="text-xs not-italic text-faint">
                          {" "}
                          · until {formatDate(p.updatedAt)}
                        </em>
                      ) : null}
                    </span>
                  ))}
                </div>
              </Section>
            ) : null}
          </div>
        ) : null}

        {/* don't hit tab endpoints until the tab opens */}
        {tab === "worlds" ? (
          <div className="rise-in">
            <WorldsSection userId={profile.id} />
          </div>
        ) : null}

        {tab === "favorites" ? (
          <div className="rise-in">
            <FavoriteWorldsSection userId={profile.id} />
          </div>
        ) : null}

        {tab === "groups" ? (
          <div className="rise-in">
            <GroupsSection userId={profile.id} />
          </div>
        ) : null}
      </div>
    </article>
  );
}

type TabId = "overview" | "worlds" | "favorites" | "groups";

function ProfileSkeleton() {
  return (
    <div
      className="profile profile--skeleton flex min-h-full w-full flex-col bg-surface pb-12"
      aria-busy
    >
      <div className="profile__banner" />
      <div className={`${COL_WIDE} relative flex items-end gap-6`} style={{ marginTop: -72 }}>
        <Skeleton className="profile__avatar" />
        <div className="flex-1 pb-2">
          <Skeleton className="h-[22px] w-3/5 rounded-lg" />
          <Skeleton className="mt-3 h-3 w-2/5 rounded-lg" />
        </div>
      </div>
      <Skeleton className={`${COL} mt-[18px] h-3.5 rounded-lg`} />
      <Skeleton className={`${COL} mt-[18px] h-3.5 w-2/5 rounded-lg`} />
    </div>
  );
}

function prettyLink(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function stateLabel(state: NonNullable<UserProfile["state"]>): string {
  if (state === "online") return "In VRChat";
  if (state === "active") return "On website / mobile";
  return "Offline";
}
