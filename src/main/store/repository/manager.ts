import { app } from "electron";
import { join } from "node:path";
import { rmSync } from "node:fs";
import type { World } from "../../../shared/types/world";
import type { UserProfile } from "../../../shared/types/user";
import type { Avatar } from "../../../shared/types/avatar";
import type { Group } from "../../../shared/types/group";
import type { RepoStats, StoredEntity } from "../../../shared/types/repository";

interface InspectableRepo {
  entries(): StoredEntity<{ id: string }>[];
  clear(): void;
  flush(): void;
}
import { Repository } from "./repository";
import { JsonlBackend } from "./backend";
import {
  avatarFieldPolicy,
  groupFieldPolicy,
  userFieldPolicy,
  worldFieldPolicy,
} from "./fieldPolicy";

export interface AccountRepos {
  worlds: Repository<World>;
  users: Repository<UserProfile>;
  avatars: Repository<Avatar>;
  groups: Repository<Group>;
}

function dbDir(): string {
  return join(app.getPath("userData"), "entities");
}

function fileFor(accountId: string, type: string): string {
  return join(dbDir(), `${accountId}.${type}`);
}

class RepositoryManager {
  private readonly accounts = new Map<string, AccountRepos>();
  private activeId: string | null = null;

  private open(accountId: string): AccountRepos {
    let repos = this.accounts.get(accountId);
    if (repos) return repos;
    repos = {
      worlds: new Repository<World>({
        name: "worlds",
        policy: worldFieldPolicy,
        backend: new JsonlBackend<World>(fileFor(accountId, "worlds")),
      }),
      users: new Repository<UserProfile>({
        name: "users",
        policy: userFieldPolicy,
        backend: new JsonlBackend<UserProfile>(fileFor(accountId, "users")),
        staleLiveOnLoad: true,
      }),
      avatars: new Repository<Avatar>({
        name: "avatars",
        policy: avatarFieldPolicy,
        backend: new JsonlBackend<Avatar>(fileFor(accountId, "avatars")),
      }),
      groups: new Repository<Group>({
        name: "groups",
        policy: groupFieldPolicy,
        backend: new JsonlBackend<Group>(fileFor(accountId, "groups")),
      }),
    };
    this.accounts.set(accountId, repos);
    return repos;
  }

  setActive(accountId: string | null): void {
    if (accountId === this.activeId) return;
    this.activeId = accountId;
    if (accountId) this.open(accountId);
  }

  get active(): AccountRepos {
    if (!this.activeId) throw new Error("No active account for repositories");
    return this.open(this.activeId);
  }

  get hasActive(): boolean {
    return this.activeId !== null;
  }

  flushAll(): void {
    for (const repos of this.accounts.values()) {
      repos.worlds.flush();
      repos.users.flush();
      repos.avatars.flush();
      repos.groups.flush();
    }
  }

  destroy(accountId: string): void {
    const repos = this.accounts.get(accountId);
    if (repos) {
      repos.worlds.flush();
      repos.users.flush();
      repos.avatars.flush();
      repos.groups.flush();
      this.accounts.delete(accountId);
    }
    for (const type of ["worlds", "users", "avatars", "groups"]) {
      const base = fileFor(accountId, type);
      rmSync(`${base}.json`, { force: true });
      rmSync(`${base}.log`, { force: true });
    }
    if (this.activeId === accountId) this.activeId = null;
  }

  stats(): RepoStats[] {
    if (!this.activeId) return [];
    const repos = this.open(this.activeId);
    return [repos.worlds.stats(), repos.users.stats(), repos.avatars.stats(), repos.groups.stats()];
  }

  private repoByName(name: string): InspectableRepo | null {
    if (!this.activeId) return null;
    const r = this.open(this.activeId);
    if (name === "worlds") return r.worlds;
    if (name === "users") return r.users;
    if (name === "avatars") return r.avatars;
    if (name === "groups") return r.groups;
    return null;
  }

  inspect(name: string): StoredEntity<{ id: string }>[] {
    return this.repoByName(name)?.entries() ?? [];
  }

  clearType(name: string): void {
    this.repoByName(name)?.clear();
  }

  flushType(name: string): void {
    this.repoByName(name)?.flush();
  }
}

export const repos = new RepositoryManager();
