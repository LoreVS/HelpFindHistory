# Phase 2: Frontend Auth - Pattern Map

**Mapped:** 2026-04-20
**Files analyzed:** 8 (5 new, 3 modified)
**Analogs found:** 8 / 8

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/store/authStore.js` | store | request-response | `src/store/useFragmentStore.js` | role-match (no persist yet) |
| `src/hooks/useRole.js` | hook | request-response | `src/hooks/useBackgroundRemoval.js` | role-match |
| `src/components/ProtectedRoute.jsx` | component/guard | request-response | `src/components/Dropzone.jsx` | role-match |
| `src/pages/LoginPage.jsx` | page/component | request-response | `src/components/Dropzone.jsx` | role-match |
| `src/pages/RegisterPage.jsx` | page/component | request-response | `src/components/Dropzone.jsx` | role-match |
| `src/main.jsx` | config/entry | — | self (current state) | exact |
| `src/App.jsx` | component/shell | request-response | self (current state) | exact |
| `src/App.css` | styles | — | self (current state) | exact |

---

## Pattern Assignments

### `src/store/authStore.js` (store, request-response)

**Analog:** `src/store/useFragmentStore.js`

**Key difference:** authStore adds `persist` middleware from `zustand/middleware` — the existing store uses bare `create`. The shape is `{ user, token, login(), logout(), init() }`.

**Base store pattern** (`src/store/useFragmentStore.js` lines 1-19):
```js
import { create } from 'zustand'

const useFragmentStore = create((set) => ({
  fragments: [],
  addFragment: (fragment) =>
    set((state) => ({ fragments: [...state.fragments, fragment] })),
  updateFragment: (id, updates) =>
    set((state) => ({
      fragments: state.fragments.map((f) =>
        f.id === id ? { ...f, ...updates } : f
      ),
    })),
  removeFragment: (id) =>
    set((state) => ({
      fragments: state.fragments.filter((f) => f.id !== id),
    })),
  clearAll: () => set({ fragments: [] }),
}))

export default useFragmentStore
```

**Persist middleware addition** (new pattern — no existing analog; use Zustand 5 docs):
```js
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      login(token, user) { set({ token, user }) },
      logout() { set({ token: null, user: null }) },
      init() {
        const { token } = get()
        if (!token) return
        // decode JWT exp claim client-side; clear if expired
        try {
          const payload = JSON.parse(atob(token.split('.')[1]))
          if (payload.exp * 1000 < Date.now()) {
            set({ token: null, user: null })
          }
        } catch {
          set({ token: null, user: null })
        }
      },
    }),
    {
      name: 'auth-storage',       // localStorage key
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
)

export default useAuthStore
```

**Backend token shape** (from `server/routes/auth.js` lines 23-30 and 61/95):
- JWT payload: `{ sub: String(user.id), role: user.role, jti, iat, exp }`
- API success response: `{ token, user: { id, email, role } }`
- API error response: `{ error: '<message string>' }`
- Endpoints: `POST /api/auth/login`, `POST /api/auth/register`, `POST /api/auth/logout`
- Logout requires `Authorization: Bearer <token>` header

---

### `src/hooks/useRole.js` (hook, request-response)

**Analog:** `src/hooks/useBackgroundRemoval.js` (lines 1-2 — import and export pattern)

**Hook import pattern** (`src/hooks/useBackgroundRemoval.js` lines 1-2):
```js
import { useState } from 'react'
import { extractContourSegments } from '../utils/contourAnalysis'
```

**Export pattern** (`src/hooks/useBackgroundRemoval.js`):
```js
// Named export at bottom (function declaration style used):
export function useBackgroundRemoval() { ... }
```

**useRole shape** (trivially thin — reads from authStore):
```js
import useAuthStore from '../store/authStore'

export function useRole() {
  return useAuthStore((state) => state.user?.role ?? null)
}
```

Selector pattern (reading a slice from Zustand) follows the same subscription idiom as `useFragmentStore` consumers in `Dropzone.jsx` line 8:
```js
const { addFragment, fragments, removeFragment, clearAll } = useFragmentStore()
```

---

### `src/components/ProtectedRoute.jsx` (component/guard, request-response)

**Analog:** `src/components/Dropzone.jsx` — default-exported functional component consuming a Zustand store

**Component import pattern** (`src/components/Dropzone.jsx` lines 1-5):
```jsx
import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useBackgroundRemoval } from '../hooks/useBackgroundRemoval'
import useFragmentStore from '../store/useFragmentStore'

export default function Dropzone() {
```

**ProtectedRoute shape** (React Router v7 `<Navigate>` redirect pattern):
```jsx
import { Navigate, Outlet } from 'react-router-dom'
import useAuthStore from '../store/authStore'

export default function ProtectedRoute() {
  const token = useAuthStore((state) => state.token)
  return token ? <Outlet /> : <Navigate to="/login" replace />
}
```

No conditional-render patterns exist in the current codebase — this is the first guard. The `Navigate` + `Outlet` idiom is standard React Router v7.

---

### `src/pages/LoginPage.jsx` (page/component, request-response)

**Analog:** `src/components/Dropzone.jsx` — the closest interactive component with state-driven UI

**Component structure pattern** (`src/components/Dropzone.jsx` lines 6-9):
```jsx
export default function Dropzone() {
  const { queue, processFiles } = useBackgroundRemoval()
  const { addFragment, fragments, removeFragment, clearAll } = useFragmentStore()
```

**CSS variables to use** (`src/App.css` lines 3-15) — all auth form elements draw from these:
```css
:root {
  --bg: #0f0f0f;
  --surface: #c6e4eb;
  --surface-2: #151d65;
  --border: #2a2a2a;
  --border-bright: #3a3a3a;
  --accent: #e8b84b;
  --accent-glow: rgba(232, 184, 75, 0.12);
  --text: #dedad3;
  --text-dim: #555;
  --green: #4ecb71;
  --red: #e05252;
}
```

**Typography classes to reuse** (`src/App.css` lines 43-57):
```css
.logo {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 28px;
  letter-spacing: 0.12em;
  color: var(--accent);
}

.tagline {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--text-dim);
  letter-spacing: 0.04em;
}
```

**Button pattern to copy** (`src/App.css` lines 208-220 `.btn-clear`):
```css
.btn-clear {
  background: transparent;
  border: 1px solid var(--border-bright);
  color: var(--text-dim);
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  padding: 3px 8px;
  cursor: pointer;
  border-radius: 4px;
  transition: color 0.15s, border-color 0.15s;
}
.btn-clear:hover { color: var(--red); border-color: var(--red); }
```

**LoginPage shape** (API call pattern from `server/routes/auth.js`):
- POST to `/api/auth/login` with `{ email, password }`
- On success: call `useAuthStore.getState().login(token, user)` then `navigate('/')`
- On failure: display `response.error` string in red using `--red` var
- Loading state: disable submit button during fetch
- Link to `/register` per D-09

---

### `src/pages/RegisterPage.jsx` (page/component, request-response)

**Analog:** `src/pages/LoginPage.jsx` (sibling, same pattern)

Identical structure to LoginPage. Differences:
- POST to `/api/auth/register` with `{ email, password }`
- On success (201): same `login()` + `navigate('/')` per D-10
- Error messages come from the server `{ error }` field
- Link to `/login` per D-09

---

## Modified Files: Current State and What Changes

### `src/main.jsx` — wrap in BrowserRouter

**Current state** (lines 1-10):
```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

**Change:** Add `BrowserRouter` (or `RouterProvider`) import from `react-router-dom` and wrap `<App />`. Also add `useAuthStore.getState().init()` call before render to rehydrate + validate token expiry on boot (D-07).

**Pattern to follow:** The existing wrapper is bare — just add one more wrapper element. Keep `StrictMode` outermost.

---

### `src/App.jsx` — add Routes, ProtectedRoute, header additions

**Current state** (lines 1-20 — full file):
```jsx
import Dropzone from './components/Dropzone'
import FragmentCanvas from './components/FragmentCanvas'
import './App.css'

export default function App() {
  return (
    <div className="app">
      <header className="header">
        <h1 className="logo">PUZZLE FORGE</h1>
        <span className="tagline">// відновлення форми з уламків</span>
        <div className="header-hint">
          <kbd>drag</kbd> переміщення &nbsp;·&nbsp; <kbd>corner</kbd> масштаб &nbsp;·&nbsp; <kbd>↻</kbd> ротація
        </div>
      </header>
      <main className="main">
        <Dropzone />
        <FragmentCanvas />
      </main>
    </div>
  )
}
```

**Changes:**
1. Add imports: `Routes`, `Route` from `react-router-dom`; `useRole` hook; `ProtectedRoute`, `LoginPage`, `RegisterPage`
2. Wrap canvas content in a `ProtectedRoute` route at `/`
3. Add `/login` and `/register` routes
4. In header: conditionally render admin badge using `useRole()` (D-12, D-13)
5. Add END SESSION button in header that calls `logout()` + `navigate('/login')` (D-11)

**Header hint pattern to keep** (`src/App.jsx` lines 11-14):
```jsx
<div className="header-hint">
  <kbd>drag</kbd> переміщення &nbsp;·&nbsp; <kbd>corner</kbd> масштаб &nbsp;·&nbsp; <kbd>↻</kbd> ротація
</div>
```
The admin badge and END SESSION button slot into `.header` alongside existing children — the flexbox layout (`display:flex; gap:20px`) absorbs them.

---

### `src/App.css` — add auth page and admin badge styles

**Existing layout anchor** (`src/App.css` lines 29-85): `.app`, `.header`, `.logo`, `.tagline`, `.header-hint`, `.main` — all stay unchanged.

**New CSS sections to append:**

1. **Admin badge** — inline chip in header next to `.logo`:
   - Background: `var(--accent)`, color: `var(--bg)`, monospace font, small caps
   - Draw from `.header-hint kbd` pattern (lines 69-77) for the pill shape

2. **END SESSION button** — header button, danger hover:
   - Base: same as `.btn-clear` (lines 208-220) — transparent, monospace, `var(--border-bright)`
   - Hover: `var(--red)` border + text (already the `.btn-clear:hover` pattern)
   - Position: pushed to far right via `margin-left: auto` (same as `.header-hint` line 61)

3. **Auth page layout** — full-viewport centered form:
   - Background: `var(--bg)` (matches body)
   - Form card: `var(--surface)` background or subtle `var(--border)` border, matching `.sidebar` (lines 88-96)
   - Inputs: dark background `var(--surface-2)`, `var(--border-bright)` border, `var(--text)` color, JetBrains Mono
   - Submit button: `var(--accent)` background, `var(--bg)` color — accent CTA
   - Error message: `var(--red)` color, monospace

---

## Shared Patterns

### Store consumption
**Source:** `src/components/Dropzone.jsx` line 8
**Apply to:** `ProtectedRoute.jsx`, `LoginPage.jsx`, `RegisterPage.jsx`, `App.jsx`
```jsx
// Selector pattern — subscribe to a specific slice:
const token = useAuthStore((state) => state.token)
// Or destructure multiple values (when all needed):
const { login, logout } = useAuthStore()
```

### Default export functional component
**Source:** Every file in `src/components/` and `src/App.jsx`
**Apply to:** All new `.jsx` files
```jsx
export default function ComponentName() {
  // ...
}
```

### CSS variable usage
**Source:** `src/App.css` lines 3-15
**Apply to:** All new CSS rules in `App.css` and any inline styles
Use `var(--bg)`, `var(--accent)`, `var(--red)`, `var(--text-dim)`, `var(--border-bright)` — never hardcode hex values.

### Font families
**Source:** `src/App.css` (Google Fonts import line 1, used throughout)
**Apply to:** All new UI text in auth forms and header additions
- Body/labels: `'IBM Plex Sans', sans-serif`
- Code/hints/badges: `'JetBrains Mono', monospace`
- Brand heading: `'Bebas Neue', sans-serif`

### API error display
**Source:** `server/routes/auth.js` — all error responses return `{ error: '<string>' }`
**Apply to:** `LoginPage.jsx`, `RegisterPage.jsx`
```jsx
// After failed fetch:
const data = await res.json()
setError(data.error ?? 'Something went wrong.')
// Render:
{error && <p className="auth-error">{error}</p>}
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `src/store/authStore.js` (persist) | store | — | No persisted Zustand store exists yet; `persist` middleware is new to this codebase |
| `src/components/ProtectedRoute.jsx` | guard | — | No route guards or conditional navigation exist yet |

These two rely on React Router v7 and Zustand `persist` docs rather than codebase analogs. The base patterns (functional component, Zustand `create`) do have analogs; only the specific APIs are new.

---

## Metadata

**Analog search scope:** `puzzle-fragments/src/` (store/, hooks/, components/, App.jsx, main.jsx, App.css)
**Backend read:** `server/routes/auth.js`, `server/middleware/auth.js` — for API contract
**Files scanned:** 8 source files
**Pattern extraction date:** 2026-04-20
