---
quick_id: 260501-acc
slug: archeo-fit-ukrainian-ui
description: Change name of the app to "Archeo-FIT" and all texts on site must be on Ukrainian language
date: 2026-05-01
must_haves:
  truths:
    - App name is "ARCHEO-FIT" everywhere (was "PUZZLE FORGE")
    - All user-visible English strings replaced with Ukrainian equivalents
    - Ukrainian pluralization used for fragments/attempts counts
  artifacts:
    - puzzle-fragments/index.html
    - puzzle-fragments/src/App.jsx
    - puzzle-fragments/src/pages/LoginPage.jsx
    - puzzle-fragments/src/pages/RegisterPage.jsx
    - puzzle-fragments/src/pages/ProjectsPage.jsx
    - puzzle-fragments/src/pages/ProjectDetailPage.jsx
    - puzzle-fragments/src/components/ProjectDropzone.jsx
    - puzzle-fragments/src/components/FragmentCanvas.jsx
---

# Quick Task 260501-acc: Rename to Archeo-FIT + Ukrainian UI

## Task 1 — index.html: title + lang

**File:** `puzzle-fragments/index.html`

**Changes:**
- `<html lang="en">` → `<html lang="uk">`
- `<title>puzzle-fragments</title>` → `<title>Archeo-FIT</title>`

---

## Task 2 — App.jsx (CanvasApp header)

**File:** `puzzle-fragments/src/App.jsx`

**Changes:**
- `"PUZZLE FORGE"` → `"ARCHEO-FIT"`
- `"END SESSION"` → `"ЗАВЕРШИТИ СЕСІЮ"`
- Header hint kbd labels — update surrounding text for clarity:
  `<kbd>drag</kbd> переміщення &nbsp;·&nbsp; <kbd>corner</kbd> масштаб &nbsp;·&nbsp; <kbd>↻</kbd> ротація`
  → keep as-is (already Ukrainian)

---

## Task 3 — LoginPage.jsx

**File:** `puzzle-fragments/src/pages/LoginPage.jsx`

**Changes (all user-visible strings):**
- `"PUZZLE FORGE"` → `"ARCHEO-FIT"`
- `"ACCESS TERMINAL"` → `"ВХІД ДО СИСТЕМИ"`
- label `"email"` → `"Електронна пошта"`
- label `"password"` → `"Пароль"`
- button `"AUTHENTICATING…"` → `"ВХІД…"`
- button `"AUTHENTICATE"` → `"УВІЙТИ"`
- `"Don't have an account?"` → `"Немає акаунту?"`
- link `"Register →"` → `"Реєстрація →"`
- error `'email and password are required'` → `'необхідно вказати пошту та пароль'`
- error `'server unavailable — try again'` → `'сервер недоступний — спробуйте знову'`

---

## Task 4 — RegisterPage.jsx

**File:** `puzzle-fragments/src/pages/RegisterPage.jsx`

**Changes:**
- `"PUZZLE FORGE"` → `"ARCHEO-FIT"`
- `"CREATE ACCOUNT"` → `"РЕЄСТРАЦІЯ"`
- label `"email"` → `"Електронна пошта"`
- label `"password"` → `"Пароль"`
- label `"confirm password"` → `"Підтвердження пароля"`
- button `"REGISTERING…"` → `"РЕЄСТРАЦІЯ…"`
- button `"REGISTER ACCOUNT"` → `"ЗАРЕЄСТРУВАТИСЯ"`
- `"Already have an account?"` → `"Вже маєте акаунт?"`
- link `"Login →"` → `"Увійти →"`
- error `'all fields are required'` → `'усі поля обов'язкові'`
- error `'passwords do not match'` → `'паролі не збігаються'`
- error `'server unavailable — try again'` → `'сервер недоступний — спробуйте знову'`

---

## Task 5 — ProjectsPage.jsx

**File:** `puzzle-fragments/src/pages/ProjectsPage.jsx`

**Changes:**
- `"PUZZLE FORGE"` → `"ARCHEO-FIT"`
- `"END SESSION"` → `"ЗАВЕРШИТИ СЕСІЮ"`
- `"ADMIN"` badge → `"АДМІН"`
- `"Projects"` (h2 title) → `"Проєкти"`
- `'Cancel'` → `'Скасувати'`
- `'+ New Project'` → `'+ Новий проєкт'`
- label `"Project Name"` → `"Назва проєкту"`
- placeholder `"e.g. Amphora Restoration 2024"` → `"напр. Відновлення амфори 2024"`
- label `"Description"` → `"Опис"`
- placeholder `"Brief description of the artifact..."` → `"Короткий опис артефакту..."`
- label `"Reward (pts)"` → `"Нагорода (бали)"`
- placeholder `"e.g. 5"` → `"напр. 5"`
- button `'Creating…'` → `'Створення…'`
- button `'Create Project'` → `'Створити проєкт'`
- `"Loading projects…"` → `"Завантаження проєктів…"`
- `"No projects yet. Create one above."` → `"Проєктів ще немає. Створіть перший вище."`
- `"My Finished Projects"` → `"Мої завершені проєкти"`
- attempt status `'on review'` → `'на перевірці'`
- Fragment/attempt counts: replace English pluralization with Ukrainian using a helper `uaPlural(n, one, few, many)` defined at the top of the component:
  ```js
  function uaPlural(n, one, few, many) {
    const m = n % 100
    const d = n % 10
    if (m >= 11 && m <= 19) return many
    if (d === 1) return one
    if (d >= 2 && d <= 4) return few
    return many
  }
  ```
  - attempts: `` `${n} ${uaPlural(n, 'спроба', 'спроби', 'спроб')}` ``
  - fragments: `` `${n} ${uaPlural(n, 'уламок', 'уламки', 'уламків')}` ``

---

## Task 6 — ProjectDetailPage.jsx

**File:** `puzzle-fragments/src/pages/ProjectDetailPage.jsx`

Add `uaPlural` helper (same as Task 5) near the top of the file (after imports).

**Changes (all user-visible strings):**
- `"← Projects"` (back button, all occurrences) → `"← Проєкти"`
- `"Loading project…"` → `"Завантаження проєкту…"`
- `'Project not found.'` → `'Проєкт не знайдено.'`
- Canvas toolbar title: `Fragment Canvas · N fragment(s)` → use uaPlural:
  `` `Полотно · ${canvasFragments.length} ${uaPlural(canvasFragments.length, 'уламок', 'уламки', 'уламків')}` ``
- `'Hints ON'` → `'Підказки УВІМК'`
- `'Hints OFF'` → `'Підказки ВИМК'`
- title `'Hide fit hints'` → `'Приховати підказки'`
- title `'Show fit hints'` → `'Показати підказки'`
- `'Saving…'` → `'Збереження…'`
- `'Save Layout'` → `'Зберегти розташування'`
- `'Closing…'` → `'Закриття…'`
- `'Close Project'` → `'Закрити проєкт'`
- `'Save Attempt'` → `'Зберегти спробу'`
- `'Publishing…'` → `'Публікація…'`
- `'Publish Attempt'` → `'Опублікувати спробу'`
- `'READ-ONLY · Approved Solution'` → `'ТІЛЬКИ ПЕРЕГЛЯД · Схвалене рішення'`
- emptyMessage closed: `'No fragments in this project.'` → `'У цьому проєкті немає фрагментів.'`
- emptyMessage admin: `'Upload fragment photos using the panel on the left'` → `'Завантажте фото фрагментів через панель ліворуч'`
- emptyMessage user: `"No fragments loaded. The archaeologist hasn't uploaded any yet."` → `'Фрагменти ще не завантажено.'`
- `'SOLVED BY:'` → `'РОЗГАДАНО:'`
- `window.confirm(...)` → `window.confirm('Закрити проєкт? Він стане доступним лише для перегляду.')`
- `saveMsg` "Publish failed: " → `'Публікація не вдалась: '`
- `"Submitted Attempts"` (h2) → `"Подані спроби"`
- `"No attempts submitted yet."` → `"Жодної спроби ще не подано."`
- table header `"Submitter"` → `"Учасник"`
- table header `"Status"` → `"Статус"`
- table header `"Submitted"` → `"Подано"`
- table header `"Actions"` → `"Дії"`
- `"view →"` → `"переглянути →"`
- `"Attempt by "` → `"Спроба від "`
- `"Loading canvas…"` → `"Завантаження полотна…"`
- `"Approve Attempt"` → `"Схвалити спробу"`
- `'Rejecting…'` → `'Відхилення…'`
- `'Reject Attempt'` → `'Відхилити спробу'`
- `"Close"` (modal close button) → `"Закрити"`
- `"Approve this attempt?"` (h3) → `"Схвалити цю спробу?"`
- `"This will close the project and award N pts to email."` →
  `` `Це закриє проєкт та нарахує ${currentProject?.reward ?? '?'} балів ${attempt.submitter_email}.` ``
- `'Approving…'` → `'Схвалення…'`
- `'Confirm Approve'` → `'Підтвердити'`
- `'Keep reviewing'` → `'Продовжити перегляд'`
- `"Publish attempt?"` (h3) → `"Опублікувати спробу?"`
- publish modal body: `"Once published, your arrangement is locked and cannot be edited."` →
  `"Після публікації ваше розташування буде заблоковано і редагування стане недоступним."`
- `"Publish now"` → `"Опублікувати"`
- `"Keep editing"` → `"Продовжити редагування"`
- `"END SESSION"` → `"ЗАВЕРШИТИ СЕСІЮ"`

---

## Task 7 — ProjectDropzone.jsx

**File:** `puzzle-fragments/src/components/ProjectDropzone.jsx`

**Changes:**
- `"Project closed — uploads disabled"` → `"Проєкт закрито — завантаження вимкнено"`

---

## Task 8 — FragmentCanvas.jsx (hints button)

**File:** `puzzle-fragments/src/components/FragmentCanvas.jsx`

**Changes:**
- `'Hints ON'` → `'Підказки УВІМК'`
- `'Hints OFF'` → `'Підказки ВИМК'`
- title `'Hide fit hints'` → `'Приховати підказки'`
- title `'Show fit hints'` → `'Показати підказки'`
