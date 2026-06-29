import { app } from "electron";
import { join } from "node:path";
import { copyFileSync, existsSync, rmSync } from "node:fs";
import { jsonFile } from "../lib/jsonFile";
import type { Account, AccountsState } from "../../shared/types/auth";

const dir = () => join(app.getPath("userData"), "sessions");
const registryPath = () => join(dir(), "accounts.json");

export const sessionFile = (id: string) => join(dir(), `${id}.json`);
export const pendingFile = () => join(dir(), "_pending.json");

interface Registry {
  active: string | null;
  accounts: Account[];
}

const registry = jsonFile<Registry>(registryPath, () => ({ active: null, accounts: [] }));
const read = registry.read;
const write = registry.write;

export function listAccounts(): AccountsState {
  const reg = read();
  return { accounts: reg.accounts, activeId: reg.active };
}

export function activeId(): string | null {
  return read().active;
}

export function setActive(id: string | null): void {
  const reg = read();
  reg.active = id;
  write(reg);
}

export function promotePending(account: Account): void {
  if (existsSync(pendingFile())) {
    copyFileSync(pendingFile(), sessionFile(account.id));
    rmSync(pendingFile(), { force: true });
  }
  const reg = read();
  reg.accounts = [account, ...reg.accounts.filter((a) => a.id !== account.id)];
  reg.active = account.id;
  write(reg);
}

export function removeAccount(id: string): AccountsState {
  rmSync(sessionFile(id), { force: true });
  const reg = read();
  reg.accounts = reg.accounts.filter((a) => a.id !== id);
  if (reg.active === id) reg.active = reg.accounts[0]?.id ?? null;
  write(reg);
  return { accounts: reg.accounts, activeId: reg.active };
}

export function clearPending(): void {
  rmSync(pendingFile(), { force: true });
}
