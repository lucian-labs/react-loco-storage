import { act, createElement, useLayoutEffect } from "react";
import { createRoot, Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useLocoStorage } from "../src/lib";

type Settings = { name: string; gain: number };

const DEFAULTS: Settings = { name: "take-01", gain: 0.7 };

type Hook = [Settings, () => void, (body: Settings) => void, Error | null];

let hook: Hook;
let container: HTMLDivElement;
let root: Root;

const Probe = ({
  storageKey,
  defaultValue,
}: {
  storageKey: string;
  defaultValue: Settings;
}) => {
  hook = useLocoStorage<Settings>(storageKey, defaultValue);
  return null;
};

const render = (storageKey: string, defaultValue: Settings = DEFAULTS) =>
  act(() => {
    root.render(createElement(Probe, { storageKey, defaultValue }));
  });

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
    true;
  localStorage.clear();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

describe("useLocoStorage", () => {
  it("seeds an empty slot with the default", () => {
    render("settings");

    expect(hook[0]).toEqual(DEFAULTS);
    expect(localStorage.getItem("settings")).toBe(JSON.stringify(DEFAULTS));
  });

  it("has the stored value on the first render, not after an effect", () => {
    const stored: Settings = { name: "warm", gain: 0.1 };
    localStorage.setItem("settings", JSON.stringify(stored));

    const seen: Settings[] = [];
    const Recorder = () => {
      seen.push(useLocoStorage<Settings>("settings", DEFAULTS)[0]);
      return null;
    };
    act(() => {
      root.render(createElement(Recorder));
    });

    expect(seen[0]).toEqual(stored);
  });

  it("leaves a healthy slot untouched on mount", () => {
    // Formatted differently to what the hook would write, so a rewrite shows up
    // as changed bytes rather than an identical-looking string.
    const raw = '{ "gain": 0.9, "name": "mine" }';
    localStorage.setItem("settings", raw);
    const spy = vi.spyOn(Storage.prototype, "setItem");

    render("settings");

    expect(spy).not.toHaveBeenCalled();
    expect(localStorage.getItem("settings")).toBe(raw);
  });

  it("round-trips through set", () => {
    render("settings");
    act(() => hook[2]({ name: "take-02", gain: 0.4 }));

    expect(hook[0]).toEqual({ name: "take-02", gain: 0.4 });
    expect(localStorage.getItem("settings")).toBe(
      JSON.stringify({ name: "take-02", gain: 0.4 })
    );
  });

  it("has the new key's value on the first render after the key changes", () => {
    const profile: Settings = { name: "mine", gain: 0.9 };
    const other: Settings = { name: "theirs", gain: 0.2 };
    const otherRaw = '{ "gain": 0.2, "name": "theirs" }';
    localStorage.setItem("profile", JSON.stringify(profile));
    localStorage.setItem("other", otherRaw);

    // Recorded from a layout effect, which only runs for renders React actually
    // commits - so this is what the user could have seen, not every attempt.
    const painted: Settings[] = [];
    const Recorder = ({ storageKey }: { storageKey: string }) => {
      const [data] = useLocoStorage<Settings>(storageKey, DEFAULTS);
      useLayoutEffect(() => {
        painted.push(data);
      });
      return null;
    };
    const show = (storageKey: string) =>
      act(() => {
        root.render(createElement(Recorder, { storageKey }));
      });

    show("profile");
    const before = painted.length;
    show("other");

    expect(painted.slice(before)).not.toContainEqual(profile);
    expect(painted[painted.length - 1]).toEqual(other);
    // Rebinding reads; it must not rewrite the slot it just adopted.
    expect(localStorage.getItem("other")).toBe(otherRaw);
  });

  it("does not clobber the previous key when the key changes", () => {
    const profile: Settings = { name: "mine", gain: 0.9 };
    localStorage.setItem("profile", JSON.stringify(profile));

    render("profile");
    render("fresh");

    expect(localStorage.getItem("profile")).toBe(JSON.stringify(profile));
    expect(localStorage.getItem("fresh")).toBe(JSON.stringify(DEFAULTS));
    expect(hook[0]).toEqual(DEFAULTS);
  });

  it("recovers a slot poisoned with the literal string undefined", () => {
    localStorage.setItem("settings", "undefined");
    render("settings");

    expect(localStorage.getItem("settings")).toBe(JSON.stringify(DEFAULTS));
    expect(hook[0]).toEqual(DEFAULTS);
  });

  it("never writes a non-serialisable value", () => {
    const Undef = () => {
      useLocoStorage<Settings | undefined>("settings", undefined);
      return null;
    };
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    act(() => {
      root.render(createElement(Undef));
    });

    expect(localStorage.getItem("settings")).toBeNull();
    expect(spy).toHaveBeenCalled();
  });

  it("reports a failed write instead of blaming the json", () => {
    render("settings");
    const quota = new Error("QuotaExceededError");
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw quota;
    });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    act(() => hook[2]({ name: "too-big", gain: 1 }));

    expect(hook[3]).toBe(quota);
    expect(spy).toHaveBeenCalledWith(expect.any(String), quota);
    // The caller's value still drives the UI even though it did not persist.
    expect(hook[0]).toEqual({ name: "too-big", gain: 1 });
  });

  it("re-reads the bound key on refresh", () => {
    render("settings");
    localStorage.setItem(
      "settings",
      JSON.stringify({ name: "elsewhere", gain: 0.2 })
    );

    act(() => hook[1]());

    expect(hook[0]).toEqual({ name: "elsewhere", gain: 0.2 });
  });

  it("uses the latest default without re-running on identity churn", () => {
    render("settings", { name: "first", gain: 0.1 });
    // Same key, new default object: nothing should be rewritten.
    render("settings", { name: "second", gain: 0.2 });

    expect(localStorage.getItem("settings")).toBe(
      JSON.stringify({ name: "first", gain: 0.1 })
    );

    localStorage.removeItem("settings");
    act(() => hook[1]());

    expect(localStorage.getItem("settings")).toBe(
      JSON.stringify({ name: "second", gain: 0.2 })
    );
  });
});
