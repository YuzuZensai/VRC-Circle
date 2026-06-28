import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  ExternalLink,
  Images,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  UserCog,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ProfileView } from "../features/profile/ProfileView";
import { WorldView } from "../features/world/WorldView";
import { InstanceView } from "../features/world/InstanceView";
import { GroupView } from "../features/group/GroupView";
import { AccountSettingsView } from "../features/account/AccountSettingsView";
import { SearchView } from "../features/search/SearchView";
import { SettingsView } from "../features/settings/SettingsView";
import { EnhancementsView } from "../features/enhancements/EnhancementsView";
import { GalleryView } from "../features/gallery/GalleryView";
import { FriendsSidebar } from "../features/friends/FriendsSidebar";
import { AccountSwitcher } from "../features/auth/AccountSwitcher";
import { LaunchButton } from "../features/game/LaunchButton";
import { NavProvider, useNav, type View } from "../features/navigation/NavContext";
import { useI18n } from "../lib/i18n";
import { api, events } from "../lib/api";
import "../styles/app-shell.css";

export function AppShell() {
  return (
    <NavProvider>
      <Shell />
    </NavProvider>
  );
}

type NavItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  kind?: View["kind"];
  external?: boolean;
};

function Shell() {
  const nav = useNav();
  const { t } = useI18n();
  const [leftOpen, setLeftOpen] = useState(true);
  const [friendsOpen, setFriendsOpen] = useState(true);

  useEffect(
    () =>
      events.on("instance:open", ({ worldId, instanceId, location }) =>
        nav.openInstance(worldId, instanceId, location),
      ),
    [nav],
  );

  const navItems: NavItem[] = [
    {
      id: "search",
      label: t("nav:search"),
      icon: Search,
      kind: "search",
      onClick: () => nav.openSearch(),
    },
    {
      id: "gallery",
      label: t("nav:gallery"),
      icon: Images,
      kind: "gallery",
      onClick: () => nav.openGallery(),
    },
    {
      id: "enhancements",
      label: t("nav:enhancements"),
      icon: Sparkles,
      kind: "enhancements",
      onClick: () => nav.openEnhancements(),
    },
    {
      id: "account",
      label: t("nav:account"),
      icon: UserCog,
      kind: "account",
      onClick: () => nav.openAccount(),
    },
    {
      id: "settings",
      label: t("nav:settings"),
      icon: SlidersHorizontal,
      kind: "settings",
      onClick: () => nav.openSettings(),
    },
    {
      id: "debug",
      label: t("nav:debug"),
      icon: Settings,
      external: true,
      onClick: () => void api.debug.openWindow(),
    },
  ];

  const openProfile = (id: "me" | string) => nav.openUser(id);
  const stageKey =
    nav.current.kind === "user" || nav.current.kind === "world" || nav.current.kind === "group"
      ? `${nav.current.kind}:${nav.current.id}`
      : nav.current.kind;

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar__brand">
          <span className="topbar__mark" aria-hidden>
            <CircleDot size={15} />
          </span>
          VRC Circle
        </div>
        <div className="topbar__actions">
          <LaunchButton />
        </div>
      </header>

      <div
        className={`body ${leftOpen ? "" : "is-left-collapsed"} ${
          friendsOpen ? "" : "is-right-collapsed"
        }`}
      >
        <aside className="leftbar">
          <div className="leftbar__scroll">
            <nav className="leftbar__nav">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = !item.external && nav.current.kind === item.kind;
                return (
                  <button
                    key={item.id}
                    className={`navitem ${active ? "is-active" : ""}`}
                    onClick={item.onClick}
                    title={item.label}
                  >
                    <span className="navitem__ico">
                      <Icon size={16} />
                    </span>
                    <span className="navitem__label">{item.label}</span>
                    {item.external ? (
                      <span className="navitem__hint">
                        <ExternalLink size={13} />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="leftbar__footer">
            <AccountSwitcher />
          </div>
        </aside>

        <main className="stage">
          {nav.canBack ? (
            <button onClick={nav.back} className="stage__back" aria-label="Go back">
              <ArrowLeft size={16} /> Back
            </button>
          ) : null}
          <div key={stageKey} className="stage__inner animate-rise">
            {nav.current.kind === "world" ? (
              <WorldView worldId={nav.current.id} />
            ) : nav.current.kind === "instance" ? (
              <InstanceView worldId={nav.current.worldId} instanceId={nav.current.instanceId} />
            ) : nav.current.kind === "group" ? (
              <GroupView groupId={nav.current.id} />
            ) : nav.current.kind === "account" ? (
              <AccountSettingsView />
            ) : nav.current.kind === "settings" ? (
              <SettingsView />
            ) : nav.current.kind === "enhancements" ? (
              <EnhancementsView />
            ) : nav.current.kind === "gallery" ? (
              <GalleryView />
            ) : nav.current.kind === "search" ? (
              <SearchView />
            ) : (
              <ProfileView target={nav.current.id} />
            )}
          </div>
        </main>

        <FriendsSidebar onOpen={openProfile} />

        <button
          className="edge-toggle edge-toggle--left"
          onClick={() => setLeftOpen((v) => !v)}
          title={leftOpen ? t("nav:hideNav") : t("nav:showNav")}
          aria-label={t("nav:toggleNav")}
        >
          {leftOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>

        <button
          className="edge-toggle edge-toggle--right"
          onClick={() => setFriendsOpen((v) => !v)}
          title={friendsOpen ? "Hide friends" : "Show friends"}
          aria-label="Toggle friends sidebar"
        >
          {friendsOpen ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
    </div>
  );
}
