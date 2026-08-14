/* react-loco-storage demo — https://react-loco-storage.lucianlabs.ca
 *
 * Every panel drives the real hook. The "raw localStorage" readout is read
 * straight from window.localStorage each render, so you can see the store and
 * the hook's view of the store side by side — they are not always the same
 * thing, and that is the point of the demo.
 */

import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { useLocoStorage } from '@dank-inc/react-loco-storage'

type Settings = {
  name: string
  gain: number
  monitor: boolean
}

const DEFAULTS: Settings = { name: 'take-01', gain: 0.7, monitor: true }

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  // @ts-expect-error — waveloop custom elements are not in JSX.IntrinsicElements
  <wl-section title={title}>{children}</wl-section>
)

const Readout = ({ label, value }: { label: string; value: string }) => (
  // @ts-expect-error — custom element
  <wl-readout label={label} value={value} />
)

const Code = ({ children }: { children: string }) => <pre className="wl-code">{children}</pre>

/* ── the panel ──────────────────────────────────────────────────────────── */

const StorePanel = () => {
  const [key, setKey] = useState('waveloop.settings')

  // The hook returns a typed tuple: current value, a re-read of the bound key,
  // a write, and the last storage error (null when the slot is healthy).
  const [data, refresh, set, error] = useLocoStorage<Settings>(key, DEFAULTS)

  const [, forceRender] = useState(0)
  const bump = () => forceRender((n) => n + 1)

  const raw = (() => {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  })()

  const patch = (body: Partial<Settings>) => {
    set({ ...DEFAULTS, ...data, ...body })
    bump()
  }

  return (
    <Section title="the store">
      <p className="wl-muted">
        Everything below writes through the hook. Reload the page and the values come back — that is
        the whole product. Change the key to point the hook at a slot that has never been written and
        watch the default land.
      </p>

      <Code>{`const [data, refresh, set, error] = useLocoStorage<Settings>('${key}', DEFAULTS)

set({ ...data, gain: 0.4 })   // writes JSON, updates state
refresh()                     // re-reads '${key}'`}</Code>

      <div className="wl-row" style={{ marginTop: '0.75rem' }}>
        <span className="wl-silk">key</span>
        <input
          value={key}
          spellCheck={false}
          onChange={(e) => setKey(e.target.value)}
          style={{
            flex: 1,
            minWidth: 200,
            padding: '0.55rem 0.75rem',
            border: '1px solid var(--wl-line)',
            background: 'var(--wl-bg-deep)',
            color: 'var(--wl-text)',
            fontFamily: 'var(--wl-font-mono)',
          }}
        />
        <button
          className="wl-btn"
          onClick={() => {
            refresh()
            bump()
          }}
        >
          refresh
        </button>
        <button
          className="wl-btn wl-btn--ghost"
          onClick={() => {
            localStorage.removeItem(key)
            bump()
          }}
        >
          clear slot
        </button>
      </div>

      {/* the controls */}
      <div className="wl-grid" style={{ marginTop: '0.75rem' }}>
        <div className="wl-panel">
          <span className="wl-silk">name</span>
          <input
            value={data?.name ?? ''}
            spellCheck={false}
            onChange={(e) => patch({ name: e.target.value })}
            style={{
              width: '100%',
              marginTop: '0.4rem',
              padding: '0.5rem 0.7rem',
              border: '1px solid var(--wl-line)',
              background: 'var(--wl-bg-deep)',
              color: 'var(--wl-text)',
              fontFamily: 'var(--wl-font-mono)',
            }}
          />
        </div>

        <div className="wl-panel">
          <span className="wl-silk">gain</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={data?.gain ?? 0}
            onChange={(e) => patch({ gain: Number(e.target.value) })}
            style={{ width: '100%', marginTop: '0.6rem', accentColor: 'var(--wl-accent)' }}
          />
          <span className="wl-mono" style={{ color: 'var(--wl-accent-hi)' }}>
            {(data?.gain ?? 0).toFixed(2)}
          </span>
        </div>

        <div className="wl-panel">
          <span className="wl-silk">monitor</span>
          <div style={{ marginTop: '0.6rem' }}>
            <button className="wl-btn" onClick={() => patch({ monitor: !data?.monitor })}>
              {data?.monitor ? 'on' : 'off'}
            </button>
          </div>
        </div>
      </div>

      <div className="wl-grid" style={{ marginTop: '0.75rem' }}>
        <Readout label="hook state (data)" value={JSON.stringify(data)} />
        <Readout label="raw localStorage" value={raw ?? 'null'} />
        <Readout label="error" value={error ? error.message : 'null'} />
      </div>

      <div className="wl-row" style={{ marginTop: '0.75rem' }}>
        <button className="wl-btn wl-btn--ghost" onClick={() => location.reload()}>
          reload the page
        </button>
        <button
          className="wl-btn wl-btn--ghost"
          onClick={() => {
            set(DEFAULTS)
            bump()
          }}
        >
          write defaults
        </button>
      </div>
    </Section>
  )
}

/* ── page ───────────────────────────────────────────────────────────────── */

const Install = () => (
  <Section title="install">
    {/* @ts-expect-error — custom element */}
    <wl-install pkg="@dank-inc/react-loco-storage" />
    <div style={{ marginTop: '0.75rem' }}>
      <Code>{`import { useLocoStorage } from '@dank-inc/react-loco-storage'

type Settings = { name: string; gain: number; monitor: boolean }

const [data, refresh, set, error] = useLocoStorage<Settings>('key', DEFAULTS)`}</Code>
    </div>
  </Section>
)

const Api = () => (
  <Section title="api">
    <div className="wl-api__scroll">
      <table className="wl-api">
        <thead>
          <tr>
            <th>export</th>
            <th>kind</th>
            <th>signature</th>
            <th>what it does</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>useLocoStorage</td>
            <td>hook</td>
            <td>{'<T>(key: string, defaultValue: T) => [data, refresh, set, error]'}</td>
            <td>Reads the key on mount and whenever it changes; writes the default when the slot is empty or unparseable.</td>
          </tr>
          <tr>
            <td>[0] data</td>
            <td>value</td>
            <td>{'T'}</td>
            <td>The hook’s current view of the slot, read synchronously on the first render and on the first render after the key changes — no null frame, no stale frame.</td>
          </tr>
          <tr>
            <td>[1] refresh</td>
            <td>function</td>
            <td>{'() => void'}</td>
            <td>Re-reads the slot this hook is bound to.</td>
          </tr>
          <tr>
            <td>[2] set</td>
            <td>function</td>
            <td>{'(body: T) => void'}</td>
            <td>Serialises and writes, then updates state. Replaces the slot — it does not merge.</td>
          </tr>
          <tr>
            <td>[3] error</td>
            <td>value</td>
            <td>{'Error | null'}</td>
            <td>The last write failure (quota, blocked storage, unserialisable value), or null.</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p className="wl-muted" style={{ marginTop: '0.75rem' }}>
      The return is a declared tuple, so destructuring it type-checks as written — no assertion at
      the call site.
    </p>
  </Section>
)

const App = () => (
  <>
    <Install />
    <StorePanel />
    <Api />
  </>
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
