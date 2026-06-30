import { useCallback, useState } from "react";
import { Check, MoreHorizontal, UserPlus } from "lucide-react";
import { type UserProfile } from "../../../../shared/types/user";
import { api, errorMessage } from "../../lib/api";
import { useT } from "../../lib/i18n";
import {
  Avatar,
  Banner,
  Button,
  ContextMenu,
  Fact,
  IconButton,
  LinkPill,
  PresenceLabel,
  Section,
  Skeleton,
  Tabs,
  Tag,
} from "../../components/ui";
import { useUserMenu } from "../friends/useUserMenu";
import { useViewState } from "../navigation/NavContext";
import {
  avatarOf,
  bannerOf,
  developerLabels,
  languageLabel,
  presenceOf,
  trustMeta,
} from "../../lib/vrchat";
import { useProfile } from "./useProfile";
import { useDemoMode } from "../../lib/debugSettings";
import { anonymizeUserForDemo } from "../../lib/demoMode";
import { WorldsSection, FavoriteWorldsSection, WorldSearch } from "./WorldsSection";
import { GroupsSection } from "./GroupsSection";
import { LocationSection } from "./LocationSection";
import { COL, COL_WIDE } from "../../lib/layout";
import { HeroHeader } from "../shared/HeroHeader";
import { formatDate, formatDateTime, platformLabel, prettyLink, prettyTag } from "../../lib/format";
import "./profile.css";

export function ProfileView({ target }: { target: "me" | string }) {
  const state = useProfile(target);

  if (state.status === "loading") return <ProfileSkeleton />;
  if (state.status === "error")
    return <Banner className="m-10 max-w-[420px]">{state.message}</Banner>;

  return <ProfileCard profile={state.profile} />;
}

function ProfileCard({ profile }: { profile: UserProfile }) {
  const t = useT();
  const demoMode = useDemoMode();
  const displayProfile = demoMode ? anonymizeUserForDemo(profile) : profile;
  const [tab, setTab] = useViewState<TabId>(`profile:${profile.id}:tab`, "overview");
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const canAdd = !profile.isSelf && !profile.isFriend;
  const addFriend = useAddFriend(profile.id);
  const { buildItems, modal } = useUserMenu();
  const trust = trustMeta[displayProfile.trustRank];
  const presence = presenceOf(displayProfile);
  const statusLabel =
    !presence.online && displayProfile.status !== "offline"
      ? t("profile:status.offlineWas", { status: presence.status.label })
      : presence.effective.label;
  const avatar = avatarOf(displayProfile);
  const banner = bannerOf(displayProfile);
  const devLabel = displayProfile.developerType ? developerLabels[displayProfile.developerType] : undefined;
  const bioLinks = (displayProfile.bioLinks ?? []).filter(Boolean);
  const showcasedBadges = (displayProfile.badges ?? []).filter((b) => b.showcased);

  return (
    <HeroHeader
      banner={banner}
      gap="gap-6"
      overlap={-72}
      media={
        <div className="profile__avatar" style={{ "--ring": trust.color } as React.CSSProperties}>
          <Avatar src={avatar} name={displayProfile.displayName} size={116} />
          <span
            className="profile__status-dot"
            style={{ background: presence.color }}
            title={statusLabel}
          />
        </div>
      }
      body={
        <div className="min-w-0 flex-1 pb-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-[32px] font-bold tracking-[-0.6px]">{displayProfile.displayName}</h2>
            {profile.isSelf ? <Tag color="var(--accent)">{t("profile:badge.you")}</Tag> : null}
            {profile.isFriend && !profile.isSelf ? (
              <Tag color="var(--status-join)">{t("profile:badge.friend")}</Tag>
            ) : null}
            {devLabel ? <Tag color="var(--accent)">{devLabel}</Tag> : null}
            {displayProfile.ageVerified ? (
              <Tag color="var(--trust-trusted)">{t("profile:badge.ageVerified")}</Tag>
            ) : null}
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-3">
            <Tag color={trust.color}>{trust.label}</Tag>
            <PresenceLabel label={statusLabel} color={presence.color} />
            {displayProfile.pronouns ? (
              <span className="text-[13px] text-muted">{displayProfile.pronouns}</span>
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
      }
      actions={
        canAdd ? (
          <div className="shrink-0 pb-2">
            <AddFriendButton add={addFriend} />
          </div>
        ) : profile.isFriend && !profile.isSelf ? (
          <div className="shrink-0 pb-2">
            <IconButton
              aria-label={t("nav:friends.contextMenu.actions")}
              onClick={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                setMenu({ x: r.right, y: r.bottom });
              }}
            >
              <MoreHorizontal size={18} />
            </IconButton>
          </div>
        ) : null
      }
    >
      <LocationSection location={displayProfile.location} />

        <Tabs
          tabs={[
            { id: "overview", label: t("profile:tabs.overview") },
            { id: "worlds", label: t("profile:tabs.worlds") },
            { id: "favorites", label: t("profile:tabs.favorites") },
            { id: "groups", label: t("profile:tabs.groups") },
          ]}
          active={tab}
          onChange={setTab}
        />

        {tab === "overview" ? (
          <div className="flex flex-col gap-5 rise-in">
            {displayProfile.note ? (
              <Section title={t("profile:sections.note")}>
                <p className="text-[14px] leading-relaxed whitespace-pre-wrap text-text">
                  {displayProfile.note}
                </p>
              </Section>
            ) : null}

            {displayProfile.statusDescription || displayProfile.bio || bioLinks.length ? (
              <Section title={t("profile:sections.about")}>
                {displayProfile.statusDescription ? (
                  <p className="text-[15px] italic text-text">“{displayProfile.statusDescription}”</p>
                ) : null}
                {displayProfile.bio ? (
                  <p className="text-[14px] leading-relaxed whitespace-pre-wrap text-muted">
                    {displayProfile.bio}
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
              <Section title={t("profile:sections.details")}>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
                  {displayProfile.dateJoined ? (
                    <Fact
                      label={t("profile:facts.joined")}
                      value={formatDate(displayProfile.dateJoined)}
                    />
                  ) : null}
                  {displayProfile.lastLogin ? (
                    <Fact
                      label={t("profile:facts.lastLogin")}
                      value={formatDateTime(displayProfile.lastLogin)}
                    />
                  ) : null}
                  {displayProfile.lastActivity ? (
                    <Fact
                      label={t("profile:facts.lastActivity")}
                      value={formatDateTime(displayProfile.lastActivity)}
                    />
                  ) : null}
                  {displayProfile.lastPlatform ? (
                    <Fact
                      label={t("profile:facts.platform")}
                      value={platformLabel(displayProfile.lastPlatform)}
                    />
                  ) : null}
                  {displayProfile.state ? (
                    <Fact label={t("profile:facts.state")} value={stateLabel(displayProfile.state, t)} />
                  ) : null}
                  {demoMode ? null : <Fact label={t("profile:facts.userId")} value={profile.id} mono />}
                </dl>
              </Section>

              {displayProfile.languages?.length ? (
                <Section title={t("profile:sections.languages")}>
                  <div className="flex flex-wrap gap-1.5">
                    {displayProfile.languages.map((code) => (
                      <Tag key={code}>{languageLabel(code)}</Tag>
                    ))}
                  </div>
                </Section>
              ) : null}

              {displayProfile.currentAvatarTags?.length ? (
                <Section title={t("profile:sections.avatarTags")}>
                  <div className="flex flex-wrap gap-1.5">
                    {displayProfile.currentAvatarTags.map((t) => (
                      <Tag key={t}>{prettyTag(t, "content_")}</Tag>
                    ))}
                  </div>
                </Section>
              ) : null}

              {displayProfile.badges?.length ? (
                <Section title={t("profile:sections.badges")}>
                  <div className="flex flex-wrap gap-2.5">
                    {[...displayProfile.badges]
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

            {displayProfile.pastDisplayNames?.length ? (
              <Section title={t("profile:sections.formerNames")} collapsible>
                <div className="flex flex-wrap gap-2">
                  {displayProfile.pastDisplayNames.map((p) => (
                    <span
                      key={`${p.displayName}-${p.updatedAt}`}
                      className="rounded-lg border border-border bg-surface px-2.5 py-1 text-[13px] text-text"
                    >
                      {p.displayName}
                      {p.updatedAt ? (
                        <em className="text-xs not-italic text-faint">
                          {" "}
                          · {t("profile:formerName.until", { date: formatDate(p.updatedAt) })}
                        </em>
                      ) : null}
                    </span>
                  ))}
                </div>
              </Section>
            ) : null}
          </div>
        ) : null}

        {tab === "worlds" ? (
          <div className="rise-in">
            <WorldSearch>
              {(filter) => <WorldsSection userId={profile.id} filter={filter} />}
            </WorldSearch>
          </div>
        ) : null}

        {tab === "favorites" ? (
          <div className="rise-in">
            <WorldSearch>
              {(filter) => <FavoriteWorldsSection userId={profile.id} filter={filter} />}
            </WorldSearch>
          </div>
        ) : null}

        {tab === "groups" ? (
          <div className="rise-in">
            <GroupsSection userId={profile.id} />
          </div>
        ) : null}

      {menu ? (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={buildItems(displayProfile)}
          onClose={() => setMenu(null)}
        />
      ) : null}

      {modal}
    </HeroHeader>
  );
}

type AddFriendState = "idle" | "sending" | "sent";

interface AddFriend {
  state: AddFriendState;
  error?: string;
  send: () => void;
}

function useAddFriend(userId: string): AddFriend {
  const t = useT();
  const [state, setState] = useState<AddFriendState>("idle");
  const [error, setError] = useState<string>();

  const send = useCallback(() => {
    setState("sending");
    setError(undefined);
    api.friends
      .add(userId)
      .then(() => setState("sent"))
      .catch((err) => {
        setError(errorMessage(err, t("profile:addFriendError")));
        setState("idle");
      });
  }, [userId, t]);

  return { state, error, send };
}

function AddFriendButton({ add }: { add: AddFriend }) {
  const t = useT();

  if (add.state === "sent") {
    return (
      <Button variant="ghost" disabled>
        <Check size={16} />
        {t("nav:friends.contextMenu.requestSent")}
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button onClick={add.send} loading={add.state === "sending"}>
        {add.state === "sending" ? null : <UserPlus size={16} />}
        {t("nav:friends.contextMenu.addFriend")}
      </Button>
      {add.error ? <span className="text-xs text-danger">{add.error}</span> : null}
    </div>
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

function stateLabel(state: NonNullable<UserProfile["state"]>, t: ReturnType<typeof useT>): string {
  if (state === "online") return t("profile:state.online");
  if (state === "active") return t("profile:state.active");
  return t("profile:state.offline");
}
