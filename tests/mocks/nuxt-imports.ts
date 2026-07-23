import { ref, type Ref } from "vue";

type SessionState = {
  ready: Ref<boolean>;
  loggedIn: Ref<boolean>;
  session: Ref<Record<string, unknown> | null>;
  fetch: (...args: unknown[]) => Promise<unknown>;
  clear: (...args: unknown[]) => Promise<unknown>;
};

const states = new Map<string, Ref<unknown>>();

export const testSession: SessionState = {
  ready: ref(true),
  loggedIn: ref(false),
  session: ref(null),
  fetch: () => Promise.resolve(),
  clear: () => Promise.resolve(),
};

export function useState<T>(key: string, init: () => T): Ref<T> {
  if (!states.has(key)) states.set(key, ref(init()));
  return states.get(key) as Ref<T>;
}

export function useUserSession() {
  return testSession;
}

export function resetTestState() {
  states.clear();
  testSession.session.value = null;
}
