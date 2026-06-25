import { useState, type FormEvent } from "react";
import { Circle, Search as SearchIcon, Star, Users } from "lucide-react";
import type { UserProfile } from "../../../../shared/types/user";
import type { World } from "../../../../shared/types/world";
import { api } from "../../lib/api";
import { compactNumber } from "../../lib/format";
import { Avatar, Button, Field, Tabs, Tag } from "../../components/ui";
import { useNav } from "../navigation/NavContext";
import { avatarOf, trustMeta } from "../../lib/vrchat";

type SearchTab = "users" | "worlds";

export function SearchView() {
  const { openUser, openWorld } = useNav();
  const [tab, setTab] = useState<SearchTab>("users");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [users, setUsers] = useState<UserProfile[] | null>(null);
  const [worlds, setWorlds] = useState<World[] | null>(null);

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
        <h1 className="text-[26px] font-bold tracking-[-0.4px]">Search</h1>
      </header>

      <Tabs
        tabs={[
          { id: "users", label: "Users" },
          { id: "worlds", label: "Worlds" },
        ]}
        active={tab}
        onChange={setTab}
      />

      <form onSubmit={submit} className="mt-5 flex items-end gap-2.5">
        <div className="flex-1">
          <Field
            label={tab === "users" ? "Find a user" : "Find a world"}
            placeholder={tab === "users" ? "Search users by name…" : "Search worlds by name…"}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>
        <Button type="submit" loading={busy} disabled={query.trim().length < 2}>
          <SearchIcon size={15} />
          Search
        </Button>
      </form>

      <div className="mt-6">
        {results === null ? (
          <p className="text-[13.5px] text-faint">
            Search for {tab === "users" ? "someone" : "a world"} to get started.
          </p>
        ) : results.length === 0 ? (
          <p className="text-[13.5px] text-faint">No {tab} found.</p>
        ) : tab === "users" ? (
          <div className="flex flex-col gap-1.5">
            {(results as UserProfile[]).map((u) => (
              <UserResult key={u.id} user={u} onOpen={() => openUser(u.id)} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {(results as World[]).map((w) => (
              <WorldResult key={w.id} world={w} onOpen={() => openWorld(w.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function UserResult({ user, onOpen }: { user: UserProfile; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
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

function WorldResult({ world, onOpen }: { world: World; onOpen: () => void }) {
  const img = world.thumbnailImageUrl || world.imageUrl;
  return (
    <button
      onClick={onOpen}
      className="group block overflow-hidden rounded-lg border border-border bg-surface text-left transition-colors hover:border-accent"
    >
      <div className="relative aspect-video bg-surface-hover">
        {img ? (
          <img
            src={img}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : null}
      </div>
      <div className="p-2.5">
        <div className="truncate text-[13px] font-semibold" title={world.name}>
          {world.name}
        </div>
        <div className="truncate text-[11px] text-faint" title={world.authorName}>
          {world.authorName}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] tabular-nums text-faint">
          <span className="inline-flex items-center gap-1" title="favorites">
            <Star size={12} /> {compactNumber(world.favorites)}
          </span>
          {world.occupants > 0 ? (
            <span
              className="inline-flex items-center gap-1"
              title="players online now"
              style={{ color: "var(--status-active)" }}
            >
              <Circle size={9} fill="currentColor" /> {compactNumber(world.occupants)}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1" title="capacity">
            <Users size={12} /> {world.capacity}
          </span>
        </div>
      </div>
    </button>
  );
}
