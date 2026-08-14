# React Loco Storage

**[Live demo →](https://react-loco-storage.lucianlabs.ca)** · [npm](https://www.npmjs.com/package/@dank-inc/react-loco-storage) · [all packages](https://lucianlabs.ca/packages/)

Ju think, I'm crazy, ese?

Don't you know I'm loco?

## Usage

```tsx
import { useLocoStorage } from '@dank-inc/react-loco-storage'

type Settings = { name: string; gain: number }

const DEFAULTS: Settings = { name: 'take-01', gain: 0.7 }

const Mixer = () => {
  const [settings, refresh, set, error] = useLocoStorage<Settings>('settings', DEFAULTS)

  return (
    <button onClick={() => set({ ...settings, gain: 0.4 })}>
      {settings.gain} {error ? '(not saved)' : ''}
    </button>
  )
}
```

`useLocoStorage<T>(key, defaultValue)` returns `[data, refresh, set, error]`:

- **data** `T` — the slot's value, read synchronously on the first render and again
  on the first render after `key` changes, so it never lags a frame behind the key.
  An empty, corrupt or unreadable slot is seeded with `defaultValue`.
- **refresh** `() => void` — re-read the bound key (this hook does not listen for
  cross-tab `storage` events).
- **set** `(body: T) => void` — serialise and write, then update state. Replaces the
  slot; it does not merge.
- **error** `Error | null` — the last write failure: quota exceeded, storage blocked
  or unavailable, or a value JSON cannot represent.
