import { useCallback, useEffect, useRef, useState } from "react";

type Slot<T> =
  | { kind: "value"; value: T; raw: string }
  | { kind: "empty" }
  | { kind: "error"; error: Error };

const toError = (err: unknown): Error =>
  err instanceof Error ? err : new Error(String(err));

/**
 * `JSON.stringify` returns undefined - not a string - for undefined, functions
 * and symbols, and throws on circular structures. Handing either to setItem
 * would store the literal text "undefined", which never parses back.
 */
const serialize = (body: unknown): string | null => {
  try {
    const json = JSON.stringify(body);
    return typeof json === "string" ? json : null;
  } catch {
    return null;
  }
};

/**
 * A slot that exists but does not parse is removed rather than kept: leaving it
 * means every future read trips over the same bad bytes.
 */
const readSlot = <T>(key: string): Slot<T> => {
  let raw: string | null;

  try {
    raw = localStorage.getItem(key);
  } catch (err) {
    // No localStorage at all - SSR, React Native, storage blocked by the user.
    return { kind: "error", error: toError(err) };
  }

  if (raw === null) return { kind: "empty" };

  try {
    return { kind: "value", value: JSON.parse(raw) as T, raw };
  } catch (err) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Nothing else to try - the slot stays corrupt until the caller clears it.
    }
    return { kind: "error", error: toError(err) };
  }
};

export const useLocoStorage = <T>(
  key: string,
  defaultValue: T
): [T, () => void, (body: T) => void, Error | null] => {
  // Tracks the exact JSON currently reflected in state, so a re-read that finds
  // nothing new does not hand the caller a fresh object identity.
  const storedRaw = useRef<string | null>(null);

  // Read synchronously so a stored value is on screen for the first paint. The
  // initialiser stays side-effect free apart from the ref it seeds; writing an
  // empty slot is the effect's job.
  const [data, setData] = useState<T>(() => {
    const slot = readSlot<T>(key);
    if (slot.kind !== "value") return defaultValue;

    storedRaw.current = slot.raw;
    return slot.value;
  });

  const [error, setError] = useState<Error | null>(null);

  // Held in a ref so a caller passing an inline default (a new object every
  // render) does not re-trigger the effect, while a *changed* default is still
  // the one that gets written.
  const latestDefault = useRef(defaultValue);
  latestDefault.current = defaultValue;

  // The key the state above currently describes. Rebinding has to happen during
  // render: an effect only runs after paint, so the caller would otherwise get
  // one frame of the *previous* key's value under the new key.
  const [boundKey, setBoundKey] = useState(key);

  if (key !== boundKey) {
    const slot = readSlot<T>(key);

    // Only reads here - an empty or corrupt slot is seeded by the effect below,
    // because writing to storage mid-render is a side effect React is free to
    // throw away along with the render itself.
    storedRaw.current = slot.kind === "value" ? slot.raw : null;

    setBoundKey(key);
    setData(slot.kind === "value" ? slot.value : defaultValue);
    // The old key's failure says nothing about the new one; the effect reports
    // afresh if this slot also refuses to take a write.
    setError(null);
  }

  const set = useCallback(
    (body: T): void => {
      const json = serialize(body);

      if (json === null) {
        const err = new Error(
          `useLocoStorage: value for "${key}" is not JSON-serialisable`
        );
        console.error(err.message, body);
        setError(err);
        return;
      }

      try {
        localStorage.setItem(key, json);
        storedRaw.current = json;
        setError(null);
      } catch (err) {
        // Quota exceeded, or storage unavailable. The value itself is valid, so
        // keep it in state for this session and report the real failure instead
        // of guessing at the cause.
        console.error(`useLocoStorage: could not write "${key}"`, err);
        setError(toError(err));
        // State now holds something storage does not, so drop the fingerprint:
        // the next refresh must resync rather than short-circuit.
        storedRaw.current = null;
      }

      setData(body);
    },
    [key]
  );

  const refresh = useCallback((): void => {
    const slot = readSlot<T>(key);

    if (slot.kind === "value") {
      if (slot.raw !== storedRaw.current) {
        storedRaw.current = slot.raw;
        setData(slot.value);
      }
      setError(null);
      return;
    }

    // Empty, corrupt or unreadable - seed the slot with the current default.
    // `set` reports anything that goes wrong on the way.
    set(latestDefault.current);
  }, [key, set]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return [data, refresh, set, error];
};
