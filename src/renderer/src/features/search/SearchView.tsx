import { useState, type FormEvent } from "react";
import { Search as SearchIcon } from "lucide-react";
import type { UserProfile } from "../../../../shared/types/user";
import type { World } from "../../../../shared/types/world";
import { api } from "../../lib/api";
import {
  Avatar,
  Button,
  CardGrid,
  ContextMenu,
  Field,
  PAGE_TITLE,
  Tabs,
  Tag,
} from "../../components/ui";
import { useT } from "../../lib/i18n";
import { useNav } from "../navigation/NavContext";
import { useUserMenu } from "../friends/useUserMenu";
import { WorldCard } from "../world/WorldCard";
import { avatarOf, trustMeta } from "../../lib/vrchat";

interface UserMenu {
  x: number;
  y: number;
  user: UserProfile;
}

type SearchTab = "users" | "worlds";

export function SearchView() {
  const t = useT();
  const { openUser, openWorld } = useNav();
  const { buildItems, modal } = useUserMenu();
  const [tab, setTab] = useState<SearchTab>("users");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [users, setUsers] = useState<UserProfile[] | null>(null);
  const [worlds, setWorlds] = useState<World[] | null>(null);
  const [menu, setMenu] = useState<UserMenu | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q.length < 2) return;
    setBusy(true);
    try {
      if (tab === "users") setUsers(await api.user.search(q));
      else setWorlds(await api.world.search(q));
    } catch {
      if (tab === "users") setUsers([]);
      else setWorlds([]);
    } finally {
      setBusy(false);
    }
  }

  const results = tab === "users" ? users : worlds;

  return (
    <div className="mx-auto w-full max-w-[760px] px-12 py-10">
      <header className="mb-5">
        <h1 className={PAGE_TITLE}>{t("search:title")}</h1>
      </header>

      <Tabs
        tabs={[
          { id: "users", label: t("search:tabs.users") },
          { id: "worlds", label: t("search:tabs.worlds") },
        ]}
        active={tab}
        onChange={setTab}
      />

      <form onSubmit={submit} className="mt-5 flex items-end gap-2.5">
        <div className="flex-1">
          <Field
            label={tab === "users" ? t("search:field.labelUsers") : t("search:field.labelWorlds")}
            placeholder={
              tab === "users"
                ? t("search:field.placeholderUsers")
                : t("search:field.placeholderWorlds")
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>
        <Button type="submit" loading={busy} disabled={query.trim().length < 2}>
          <SearchIcon size={15} />
          {t("search:button")}
        </Button>
      </form>

      <div className="mt-6">
        {results === null ? (
          <p className="text-[13.5px] text-faint">
            {tab === "users" ? t("search:promptUsers") : t("search:promptWorlds")}
          </p>
        ) : results.length === 0 ? (
          <p className="text-[13.5px] text-faint">
            {tab === "users" ? t("search:emptyUsers") : t("search:emptyWorlds")}
          </p>
        ) : tab === "users" ? (
          <div className="flex flex-col gap-1.5">
            {(results as UserProfile[]).map((u) => (
              <UserResult
                key={u.id}
                user={u}
                onOpen={() => openUser(u.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setMenu({ x: e.clientX, y: e.clientY, user: u });
                }}
              />
            ))}
          </div>
        ) : (
          <CardGrid>
            {(results as World[]).map((w) => (
              <WorldCard key={w.id} world={w} showAuthor onOpen={() => openWorld(w.id)} />
            ))}
          </CardGrid>
        )}
      </div>

      {menu ? (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={buildItems(menu.user, { includeProfile: true, onOpen: openUser })}
          onClose={() => setMenu(null)}
        />
      ) : null}

      {modal}
    </div>
  );
}

function UserResult({
  user,
  onOpen,
  onContextMenu,
}: {
  user: UserProfile;
  onOpen: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      onClick={onOpen}
      onContextMenu={onContextMenu}
      className="flex items-center gap-3 rounded-lg border border-border bg-surface p-2.5 text-left transition-colors hover:border-accent"
    >
      <Avatar src={avatarOf(user)} name={user.displayName} size={36} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-semibold">{user.displayName}</span>
        {user.statusDescription ? (
          <span className="block truncate text-[12px] text-muted">{user.statusDescription}</span>
        ) : null}
      </span>
      <Tag color={trustMeta[user.trustRank].color}>{trustMeta[user.trustRank].label}</Tag>
    </button>
  );
}
