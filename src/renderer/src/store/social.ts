import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { SocialSnapshot, UserProfile } from "../../../shared/types/user";
import { api, events } from "../lib/api";

interface SocialState {
  users: Record<string, UserProfile>;
  selfId: string | null;
  seed: (s: SocialSnapshot) => void;
  upsert: (u: UserProfile) => void;
}

export const useSocial = create<SocialState>((set) => ({
  users: {},
  selfId: null,
  seed: (s) => set({ selfId: s.selfId, users: Object.fromEntries(s.users.map((u) => [u.id, u])) }),
  upsert: (u) => set((st) => ({ users: { ...st.users, [u.id]: u } })),
}));

events.on("social:seed", (s) => useSocial.getState().seed(s));
events.on("social:upsert", (u) => useSocial.getState().upsert(u));
api.social
  .snapshot()
  .then((s) => useSocial.getState().seed(s))
  .catch(() => {});

export const useSelf = (): UserProfile | undefined =>
  useSocial((s) => (s.selfId ? s.users[s.selfId] : undefined));

export const useFriends = (): UserProfile[] =>
  useSocial(useShallow((s) => Object.values(s.users).filter((u) => u.isFriend)));
