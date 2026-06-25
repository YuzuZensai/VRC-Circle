import { useEffect, useState } from "react";
import { Check, ChevronDown, LogOut, Plus, Users, X } from "lucide-react";
import { useAuth } from "./AuthContext";
import { Avatar, StatusDot } from "../../components/ui";
import { useSelf } from "../../store/social";
import { statusMeta } from "../../lib/vrchat";
import { api } from "../../lib/api";
import type { UserStatus } from "../../../../shared/types/user";

const STATUS_CHOICES: UserStatus[] = ["join me", "active", "ask me", "busy"];

const MENU_ROW =
  "flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-[12.5px] font-semibold text-muted text-left transition-[background,color] duration-[var(--dur)] ease-[var(--ease)] hover:bg-surface-2 hover:text-text";

export function AccountSwitcher() {
  const { accounts, switchAccount, removeAccount, beginAddAccount, logout } = useAuth();
  const self = useSelf();
  const [open, setOpen] = useState(false);
  const [showAccounts, setShowAccounts] = useState(false);

  const active = accounts.accounts.find((a) => a.id === accounts.activeId);
  const others = accounts.accounts.filter((a) => a.id !== accounts.activeId);
  const status = self?.status ?? "offline";

  function close() {
    setOpen(false);
    setShowAccounts(false);
  }

  return (
    <div className="relative">
      {open ? <div className="fixed inset-0 z-40" onClick={close} /> : null}

      <button
        className={`acct__current group/trigger flex w-full items-center gap-2.5 rounded-DEFAULT border bg-surface-2 py-1.5 pl-1.5 pr-2.5 transition-[background,border-color,box-shadow] duration-[var(--dur)] ease-[var(--ease)] hover:border-border-strong hover:bg-surface-hover ${
          open
            ? "border-accent bg-surface-hover shadow-[0_0_0_3px_var(--accent-weak)]"
            : "border-border"
        }`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="acct__current relative shrink-0 leading-[0]">
          <Avatar src={active?.userIcon} name={active?.displayName} size={32} />
          <StatusDot
            color={statusMeta[status].color}
            ring="var(--surface-2)"
            title={statusMeta[status].label}
            className="absolute -bottom-px -right-px transition-[border-color] duration-[var(--dur)] group-hover/trigger:border-[var(--surface-hover)] group-aria-expanded/trigger:border-[var(--surface-hover)]"
          />
        </span>
        <span className="acct__current-text flex min-w-0 flex-1 flex-col">
          <span className="truncate text-left text-[13.5px] font-semibold leading-[1.25]">
            {active?.displayName ?? "Account"}
          </span>
          <span className="truncate text-left text-[11px] font-medium text-faint">
            {self?.statusDescription || statusMeta[status].label}
          </span>
        </span>
        <span
          className={`acct__chevron shrink-0 text-faint transition-transform duration-[var(--dur)] ease-[var(--ease)] ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        >
          <ChevronDown size={16} />
        </span>
      </button>

      {open ? (
        <div className="animate-rise absolute bottom-[calc(100%+8px)] left-0 z-50 flex w-[300px] origin-bottom-left flex-col rounded-DEFAULT border border-border bg-surface p-2 shadow-[var(--shadow-2)]">
          <StatusPicker />

          {others.length && showAccounts ? (
            <>
              <Separator />
              <div className="flex flex-col gap-px">
                {others.map((a) => (
                  <div
                    key={a.id}
                    className="group/row flex items-center rounded-sm transition-colors hover:bg-surface-2"
                  >
                    <button
                      className="flex min-w-0 flex-1 items-center gap-2.5 px-2 py-[7px]"
                      onClick={() => {
                        void switchAccount(a.id);
                        close();
                      }}
                    >
                      <Avatar src={a.userIcon} name={a.displayName} size={28} />
                      <span className="truncate text-[13px] font-semibold">{a.displayName}</span>
                    </button>
                    <button
                      className="grid w-[30px] shrink-0 self-stretch place-items-center rounded-sm text-faint opacity-0 transition-[opacity,color,background] duration-[var(--dur)] ease-[var(--ease)] hover:bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] hover:text-danger group-hover/row:opacity-100"
                      title="Remove account"
                      aria-label={`Remove ${a.displayName}`}
                      onClick={() => void removeAccount(a.id)}
                    >
                      <X size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          <Separator />
          <div className="flex flex-col gap-px">
            {others.length ? (
              <button
                className={`${MENU_ROW} ${showAccounts ? "text-text" : ""}`}
                onClick={() => setShowAccounts((v) => !v)}
              >
                <Users size={15} />
                Switch account
                <span className="ml-auto min-w-[18px] rounded-full bg-surface-hover px-1.5 py-px text-center text-[11px] font-bold text-faint">
                  {accounts.accounts.length}
                </span>
              </button>
            ) : null}
            <button
              className={MENU_ROW}
              onClick={() => {
                beginAddAccount();
                close();
              }}
            >
              <Plus size={15} />
              Add account
            </button>
            <button
              className={`${MENU_ROW} text-danger hover:bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] hover:text-danger`}
              onClick={() => {
                void logout();
                close();
              }}
            >
              <LogOut size={15} />
              Sign out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Separator() {
  return <div className="mx-0.5 my-1.5 h-px bg-border" />;
}

function StatusPicker() {
  const self = useSelf();
  const current = self?.status ?? "offline";
  const [desc, setDesc] = useState(self?.statusDescription ?? "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDesc(self?.statusDescription ?? "");
  }, [self?.id, self?.statusDescription]);

  async function apply(status: UserStatus, description: string) {
    setBusy(true);
    try {
      await api.settings.setStatus(status, description.trim());
    } catch {
    } finally {
      setBusy(false);
    }
  }

  const dirty = desc.trim() !== (self?.statusDescription ?? "");

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-col gap-px">
        {STATUS_CHOICES.map((s) => (
          <button
            key={s}
            className={`flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-left text-[12.5px] font-semibold transition-[background,color] duration-[var(--dur)] ease-[var(--ease)] hover:bg-surface-2 ${
              current === s ? "text-accent" : "text-text"
            }`}
            onClick={() => apply(s, desc)}
            disabled={busy}
          >
            <StatusDot color={statusMeta[s].color} size={9} />
            <span className="min-w-0 flex-1">{statusMeta[s].label}</span>
            {current === s ? <Check size={15} className="shrink-0 text-accent" /> : null}
          </button>
        ))}
      </div>
      <form
        className="flex gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          if (current !== "offline" && dirty) void apply(current, desc);
        }}
      >
        <input
          className="min-w-0 flex-1 rounded-sm border border-border bg-surface-2 px-[11px] py-2 text-[12.5px] text-text outline-none transition-[border-color] duration-[var(--dur)] ease-[var(--ease)] focus:border-accent"
          placeholder="Set a custom status…"
          value={desc}
          maxLength={32}
          onChange={(e) => setDesc(e.target.value)}
        />
        <button
          type="submit"
          className="grid w-[34px] shrink-0 place-items-center rounded-sm bg-accent text-on-accent transition-[filter,opacity] duration-[var(--dur)] ease-[var(--ease)] hover:not-disabled:brightness-105 disabled:cursor-default disabled:opacity-40"
          aria-label="Save status"
          disabled={busy || !dirty || current === "offline"}
        >
          <Check size={15} />
        </button>
      </form>
    </div>
  );
}
