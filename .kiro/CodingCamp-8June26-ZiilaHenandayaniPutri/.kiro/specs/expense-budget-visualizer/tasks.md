# Implementation Plan: Expense & Budget Visualizer

## Overview

Build a purely client-side single-page application using plain HTML, CSS, and Vanilla JavaScript that lets users record, view, and delete expense transactions, see a running balance, and visualize spending by category in a Chart.js pie chart. Data is persisted in `localStorage`. The implementation follows an MVC structure contained in a single `js/app.js` file.

---

## Tasks

- [x] 1. Scaffold project structure and HTML entry point
  - Create `expense-budget-visualizer/index.html` with the full HTML structure: `<header>` containing `#balance-display` and `#total-amount`; `<main>` with `#form-section` (form `#transaction-form`, inputs `#item-name` / `#item-amount` / `#item-category`, `#error-message` span with `role="alert"` and `aria-live="polite"`, submit button), `#chart-section` (`<canvas id="spending-chart" aria-label="Spending by category">` + `<p id="chart-empty-state" hidden>`), and `#list-section` (`<ul id="transaction-list" aria-label="Transaction list">`)
  - Add Chart.js v4 CDN `<script>` tag (`https://cdn.jsdelivr.net/npm/chart.js@4`) before `js/app.js`
  - Add `<link rel="stylesheet" href="css/style.css">` in `<head>` and `<script src="js/app.js">` at end of `<body>`
  - Create empty placeholder files `css/style.css` and `js/app.js`
  - _Requirements: 1.1, 6.1, 6.2_

- [ ] 2. Implement CSS styling and responsive layout
  - [ ] 2.1 Write base CSS — typography, colour palette, reset, and page layout in `css/style.css`
    - Box-sizing reset, font family, line-height, colour custom properties
    - `<header>` layout: title left, `#balance-display` right; `#total-amount` prominent size
    - _Requirements: 6.1, 6.3, 6.4_

  - [ ] 2.2 Implement responsive grid/flex layout for main content sections
    - `#form-section`, `#chart-section`, and `#list-section` reflow from 320 px to 1920 px (stack on narrow, side-by-side on wide)
    - `#transaction-list` scrollable when content overflows (`overflow-y: auto`; max-height capped)
    - Form inputs, select, and submit button full-width on narrow viewports
    - _Requirements: 2.2, 6.3, 6.4_

  - [ ] 2.3 Style interactive elements and visual states
    - Submit button hover/focus/active states; delete button styled with clear affordance and `aria-label`
    - `#error-message` styled prominently (e.g., red/warning colour) with appropriate spacing
    - Visible focus rings on all interactive elements (keyboard navigation support)
    - _Requirements: 1.3, 6.4, 6.5_

- [ ] 3. Implement constants and StorageService in js/app.js
  - [ ] 3.1 Define top-of-file constants and StorageService object
    - Declare `STORAGE_KEY = 'expense_transactions'`, `CATEGORIES = ['Food', 'Transport', 'Fun']`, `CHART_COLORS = { Food: '#FF6384', Transport: '#36A2EB', Fun: '#FFCE56' }`
    - `StorageService.load()` — `JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? []` wrapped in try/catch returning `[]` on error
    - `StorageService.save(items)` — `localStorage.setItem(STORAGE_KEY, JSON.stringify(items))` in try/catch silently catching quota errors
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ]* 3.2 Write property test for StorageService persistence round-trip (Property 1)
    - **Property 1: Transaction Persistence Round-Trip**
    - Use `fast-check`: generate `fc.array(validTransactionArb())`, call `StorageService.save(arr)` then `StorageService.load()`, assert deep equality with original array
    - Run minimum 100 iterations; tag: `// Feature: expense-budget-visualizer, Property 1: Transaction Persistence Round-Trip`
    - **Validates: Requirements 5.1, 5.2, 5.3**

  - [ ]* 3.3 Write unit tests for StorageService edge cases
    - `load()` when key absent → `[]`
    - `load()` when stored value is corrupted JSON → `[]`
    - `save()` + `load()` round-trip with one item, with multiple items
    - _Requirements: 5.3, 5.4_

- [ ] 4. Implement Validator
  - [ ] 4.1 Write `Validator.validate({ name, amount, category })` in js/app.js
    - Check all three rules simultaneously: `name.trim().length > 0`, `!isNaN(amount) && Number(amount) > 0`, `CATEGORIES.includes(category)`
    - Collect error strings into `errors[]`, return `{ valid: errors.length === 0, errors }`
    - _Requirements: 1.2, 1.3_

  - [ ]* 4.2 Write property test for Validator accepting all valid inputs (Property 3)
    - **Property 3: Validator Accepts All Valid Inputs**
    - Generate `fc.record({ name: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0), amount: fc.float({ min: 0.01, max: 1e6, noNaN: true }), category: fc.constantFrom(...CATEGORIES) })`
    - Assert `result.valid === true && result.errors.length === 0`
    - Tag: `// Feature: expense-budget-visualizer, Property 3: Validator Accepts All Valid Inputs`
    - **Validates: Requirements 1.2, 1.4**

  - [ ]* 4.3 Write property test for Validator rejecting all invalid inputs (Property 4)
    - **Property 4: Validator Rejects All Invalid Inputs**
    - Generate objects where at least one field is invalid (empty/whitespace-only name OR amount ≤ 0/NaN OR category not in `CATEGORIES`)
    - Assert `result.valid === false && result.errors.length >= 1` and error count equals number of failing fields
    - Tag: `// Feature: expense-budget-visualizer, Property 4: Validator Rejects All Invalid Inputs`
    - **Validates: Requirements 1.2, 1.3**

  - [ ]* 4.4 Write unit tests for Validator boundary cases
    - Empty string name → error; whitespace-only name → error; amount `0` → error; amount `-1` → error; amount `"abc"` → error; category `""` → error; unknown category string → error
    - Verify exact error message text for each failing rule
    - Valid combination → `{ valid: true, errors: [] }`
    - _Requirements: 1.2, 1.3_

- [ ] 5. Implement pure helper functions
  - [ ] 5.1 Write `formatCurrency()`, `computeBalance()`, and `aggregateByCategory()` in js/app.js
    - `formatCurrency(amount)` — `amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })`
    - `computeBalance(transactions)` — `transactions.reduce((sum, t) => sum + t.amount, 0)`; returns `0` for empty array
    - `aggregateByCategory(transactions)` — `reduce` into `{ [category]: total }`; only include entries where `t.amount > 0`; return `{}`  for empty array
    - _Requirements: 3.1, 3.4, 4.2, 4.5_

  - [ ]* 5.2 Write property test for computeBalance (Property 2)
    - **Property 2: Balance Equals Sum of Amounts**
    - Generate `fc.array(validTransactionArb())` (includes empty array case via `fc.array` default minLength 0)
    - Assert `computeBalance(arr) === arr.reduce((s, t) => s + t.amount, 0)`
    - Tag: `// Feature: expense-budget-visualizer, Property 2: Balance Equals Sum of Amounts`
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**

  - [ ]* 5.3 Write property test for aggregateByCategory (Property 5)
    - **Property 5: Category Aggregation Correctness**
    - Generate `fc.array(validTransactionArb())`
    - Assert (a) each key maps to exact sum of amounts for that category, (b) sum of all category totals equals `computeBalance(arr)`, (c) no category key present for a category with zero transactions
    - Tag: `// Feature: expense-budget-visualizer, Property 5: Category Aggregation Correctness`
    - **Validates: Requirements 4.2, 4.5**

  - [ ]* 5.4 Write unit tests for helper functions
    - `computeBalance([])` → `0`; mixed amounts sum correctly
    - `aggregateByCategory([])` → `{}`; single category; multiple categories; only one category present out of three
    - `formatCurrency(0)` → `"$0.00"`; `formatCurrency(12.5)` → `"$12.50"`; `formatCurrency(1234.56)` → `"$1,234.56"`
    - _Requirements: 3.4, 4.2, 4.5_

- [ ] 6. Checkpoint — core logic complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Implement View module
  - [ ] 7.1 Write `View.renderList(transactions)` in js/app.js
    - Clear `#transaction-list` (set `innerHTML = ''`), then `forEach` append a `<li>` per transaction
    - Each `<li>` displays item name, `formatCurrency(t.amount)`, and `t.category`
    - Each delete button carries `data-id="${t.id}"` and `aria-label="Delete ${t.name}"`
    - _Requirements: 2.1, 2.3, 2.4, 2.5_

  - [ ]* 7.2 Write property test for View.renderList render fidelity (Property 7)
    - **Property 7: Transaction List Render Fidelity**
    - Generate `fc.array(validTransactionArb())`; call `View.renderList(arr)` on a jsdom-backed document
    - Assert `querySelectorAll('#transaction-list li').length === arr.length`
    - Assert each `<li>` text contains the correct `name`, `formatCurrency(amount)`, and `category` for its transaction
    - Tag: `// Feature: expense-budget-visualizer, Property 7: Transaction List Render Fidelity`
    - **Validates: Requirements 2.1, 2.3, 2.4**

  - [ ] 7.3 Write `View.renderBalance()`, `View.showErrors()`, `View.clearErrors()`, and `View.resetForm()` in js/app.js
    - `renderBalance(transactions)` — sets `#total-amount` textContent to `formatCurrency(computeBalance(transactions))`
    - `showErrors(errors)` — sets `#error-message` textContent to `errors.join(' ')`
    - `clearErrors()` — sets `#error-message` textContent to `""`
    - `resetForm()` — calls `document.getElementById('transaction-form').reset()`
    - _Requirements: 1.3, 1.5, 3.1, 3.2, 3.3, 3.4_

  - [ ]* 7.4 Write unit tests for View functions
    - `renderBalance([])` → `#total-amount` shows `"$0.00"`
    - `renderBalance([{amount:12.5,...}])` → `"$12.50"`; multi-item sum → `"$1,234.56"` for appropriate input
    - `showErrors(['err1','err2'])` → `#error-message` shows both; `clearErrors()` → empty
    - `resetForm()` triggers form reset (spy on `form.reset`)
    - _Requirements: 3.1, 3.4, 1.3_

- [ ] 8. Implement ChartManager and Chart.js integration
  - [ ] 8.1 Write `ChartManager.update(transactions)` in js/app.js
    - Empty array branch: destroy `_chart` if not null, set `_chart = null`, set `canvas.hidden = true`, set `emptyState.hidden = false`
    - Non-empty branch: `canvas.hidden = false`, `emptyState.hidden = true`; call `aggregateByCategory`; if `_chart` is null create new `Chart` (type `'pie'`, `responsive: true`, legend `position: 'bottom'`); else mutate `_chart.data.labels`, `_chart.data.datasets[0].data`, `_chart.data.datasets[0].backgroundColor`, call `_chart.update()`
    - CDN guard: check `typeof Chart !== 'undefined'` before instantiating; show empty state if unavailable
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ]* 8.2 Write unit tests for ChartManager
    - Called with `[]`: `#chart-empty-state` not hidden, `<canvas>` hidden, `_chart` is null
    - Called with transactions: `<canvas>` not hidden, empty state hidden, chart data reflects aggregated amounts
    - Second call with updated data: existing chart instance is mutated (not destroyed and recreated)
    - `Chart` undefined (mocked): shows empty state without throwing
    - _Requirements: 4.1, 4.5, 4.6_

- [ ] 9. Implement Controller and initialization
  - [ ] 9.1 Implement in-memory state and form-submit handler in js/app.js
    - Declare `const state = { transactions: [] }`
    - Attach `submit` listener to `#transaction-form`: call `e.preventDefault()`, `View.clearErrors()`, read `#item-name`, `#item-amount`, `#item-category` values, call `Validator.validate()`
    - On invalid: `View.showErrors(result.errors)` and `return`
    - On valid: push `{ id: Date.now().toString(), name: name.trim(), amount: Number(amount), category }` onto `state.transactions`, call `StorageService.save`, then `View.renderList / renderBalance / renderChart`, then `View.resetForm()`
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 5.1_

  - [ ] 9.2 Implement delete event-delegation handler in js/app.js
    - Attach `click` listener on `#transaction-list`
    - `const btn = e.target.closest('[data-id]')` — if null return early
    - `state.transactions = state.transactions.filter(t => t.id !== btn.dataset.id)`
    - Call `StorageService.save(state.transactions)`, then `View.renderList / renderBalance / renderChart`
    - _Requirements: 2.5, 2.6, 5.2_

  - [ ] 9.3 Implement `DOMContentLoaded` initialization in js/app.js
    - `document.addEventListener('DOMContentLoaded', () => { state.transactions = StorageService.load(); View.renderList(state.transactions); View.renderBalance(state.transactions); View.renderChart(state.transactions); })`
    - _Requirements: 2.4, 4.4, 5.3, 5.4_

  - [ ]* 9.4 Write property test for delete removing exactly one transaction (Property 6)
    - **Property 6: Delete Removes Exactly One Transaction**
    - Generate `fc.array(validTransactionArb(), { minLength: 1 })` and a random valid index via `fc.integer`
    - Simulate delete: `filtered = arr.filter(t => t.id !== arr[index].id)`
    - Assert `filtered.length === arr.length - 1`, target id absent, all other items present in original order
    - Tag: `// Feature: expense-budget-visualizer, Property 6: Delete Removes Exactly One Transaction`
    - **Validates: Requirements 2.6, 5.2**

  - [ ]* 9.5 Write integration tests for add, delete, and load flows
    - Add flow: set up DOM, simulate form submit with valid data → assert `#transaction-list` has new `<li>`, `#total-amount` updated, `localStorage` updated, form fields cleared
    - Delete flow: seed `state.transactions`, render list, simulate delete button click → assert item removed from list, balance updated, `localStorage` updated
    - Load flow: seed `localStorage`, trigger `DOMContentLoaded` handler → assert list, balance, and chart all reflect seeded data
    - _Requirements: 1.4, 1.5, 2.3, 2.4, 2.6, 3.2, 3.3, 5.1, 5.2, 5.3_

- [ ] 10. Final checkpoint — all components wired together
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Checkpoints (tasks 6 and 10) ensure incremental validation before proceeding
- All 7 correctness properties from the design document have dedicated property-based test sub-tasks: 3.2 (P1), 5.2 (P2), 4.2 (P3), 4.3 (P4), 5.3 (P5), 9.4 (P6), 7.2 (P7)
- Property tests use **fast-check** with a minimum of 100 iterations per property
- The implementation language is plain JavaScript (ES5/ES6 globals) — no transpilation or bundler required
- `js/app.js` is organized in order: Constants → StorageService → Validator → Helper Functions → View → ChartManager → State + Controller + Initialization

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "3.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.2", "3.3", "4.1"] },
    { "id": 3, "tasks": ["4.2", "4.3", "4.4", "5.1"] },
    { "id": 4, "tasks": ["5.2", "5.3", "5.4", "7.1"] },
    { "id": 5, "tasks": ["7.2", "7.3", "8.1"] },
    { "id": 6, "tasks": ["7.4", "8.2", "9.1"] },
    { "id": 7, "tasks": ["9.2", "9.3"] },
    { "id": 8, "tasks": ["9.4", "9.5"] }
  ]
}
```
