type AccountListener = (accountId: string | null) => void;

let currentAccountId: string | null = null;
const listeners = new Set<AccountListener>();

export function getActiveAccountId(): string | null {
  return currentAccountId;
}

export function setActiveAccountId(accountId: string | null): void {
  if (currentAccountId === accountId) {
    return;
  }

  currentAccountId = accountId;

  for (const listener of listeners) {
    try {
      listener(accountId);
    } catch (error) {
      console.error('Account scope listener error', error);
    }
  }
}

export function subscribeActiveAccount(listener: AccountListener): () => void {
  listeners.add(listener);
  listener(currentAccountId);
  return () => {
    listeners.delete(listener);
  };
}
