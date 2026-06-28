import { createContext, useContext, useMemo, useState } from "react";

export type View =
  | { kind: "user"; id: "me" | string }
  | { kind: "world"; id: string }
  | { kind: "instance"; worldId: string; instanceId: string; location: string }
  | { kind: "group"; id: string }
  | { kind: "account" }
  | { kind: "settings" }
  | { kind: "enhancements" }
  | { kind: "gallery" }
  | { kind: "search" };

interface Nav {
  current: View;
  canBack: boolean;
  openUser: (id: "me" | string) => void;
  openWorld: (id: string) => void;
  openInstance: (worldId: string, instanceId: string, location: string) => void;
  openGroup: (id: string) => void;
  openAccount: () => void;
  openSettings: () => void;
  openEnhancements: () => void;
  openGallery: () => void;
  openSearch: () => void;
  back: () => void;
}

const NavCtx = createContext<Nav | null>(null);

export function NavProvider({ children }: { children: React.ReactNode }) {
  const [stack, setStack] = useState<View[]>([{ kind: "user", id: "me" }]);

  const push = (view: View) =>
    setStack((s) => {
      const top = s[s.length - 1];
      if (sameView(top, view)) return s;
      return [...s, view];
    });

  const root = (view: View) => setStack((s) => (sameView(s[s.length - 1], view) ? s : [view]));

  const value = useMemo<Nav>(
    () => ({
      current: stack[stack.length - 1],
      canBack: stack.length > 1,
      openUser: (id) => push({ kind: "user", id }),
      openWorld: (id) => push({ kind: "world", id }),
      openInstance: (worldId, instanceId, location) =>
        push({ kind: "instance", worldId, instanceId, location }),
      openGroup: (id) => push({ kind: "group", id }),
      openAccount: () => root({ kind: "account" }),
      openSettings: () => root({ kind: "settings" }),
      openEnhancements: () => root({ kind: "enhancements" }),
      openGallery: () => root({ kind: "gallery" }),
      openSearch: () => root({ kind: "search" }),
      back: () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)),
    }),
    [stack],
  );

  return <NavCtx.Provider value={value}>{children}</NavCtx.Provider>;
}

function sameView(a: View, b: View): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "user" && b.kind === "user") return a.id === b.id;
  if (a.kind === "world" && b.kind === "world") return a.id === b.id;
  if (a.kind === "instance" && b.kind === "instance") return a.location === b.location;
  if (a.kind === "group" && b.kind === "group") return a.id === b.id;
  return true;
}

export function useNav(): Nav {
  const ctx = useContext(NavCtx);
  if (!ctx) throw new Error("useNav must be used within NavProvider");
  return ctx;
}
