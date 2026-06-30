import { create } from "zustand";

interface UiState {
  collapsed: Record<string, boolean>;
  toggleCollapsed: (key: string) => void;
}

export const useUi = create<UiState>((set) => ({
  collapsed: {},
  toggleCollapsed: (key) =>
    set((st) => ({ collapsed: { ...st.collapsed, [key]: !st.collapsed[key] } })),
}));

export function useCollapsed(key: string, defaultOpen: boolean): [boolean, () => void] {
  const open = useUi((s) => (key in s.collapsed ? !s.collapsed[key] : defaultOpen));
  const toggle = useUi((s) => s.toggleCollapsed);
  return [open, () => toggle(key)];
}
