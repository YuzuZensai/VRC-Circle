import type { FavoriteVisibility } from "../../shared/types/favorites";

export function normalizeVisibility(v: string): FavoriteVisibility {
  return v === "friends" || v === "public" ? v : "private";
}

export function orderSlots<T extends { name: string }>(groups: T[], prefix: string): T[] {
  const slotNum = (name: string) => {
    const m = new RegExp(`^${prefix}(\\d+)$`).exec(name);
    return m ? Number(m[1]) : null;
  };
  const custom = groups.filter((g) => slotNum(g.name) === null);
  const numbered = groups
    .filter((g) => slotNum(g.name) !== null)
    .sort((a, b) => slotNum(a.name)! - slotNum(b.name)!);
  return [...custom, ...numbered];
}

export function fillSlots<T extends { name: string }>(
  existing: T[],
  prefix: string,
  max: number,
  makeEmpty: (name: string) => T,
): T[] {
  const out = orderSlots(existing, prefix);
  const taken = new Set(out.map((g) => g.name));
  for (let i = 1; out.length < max && i <= max; i++) {
    const name = `${prefix}${i}`;
    if (!taken.has(name)) out.push(makeEmpty(name));
  }
  return out;
}
