# Design Document: Expense & Budget Visualizer

## Overview

The Expense & Budget Visualizer is a purely client-side single-page application (SPA) built with plain HTML, CSS, and Vanilla JavaScript. There is no backend, no build step, and no framework. The entire application runs in the browser using one HTML entry point, one CSS file (`css/style.css`), and one JavaScript file (`js/app.js`). Chart.js is loaded via CDN to render the spending distribution pie chart.

The design follows a simple **Model-View-Controller (MVC)** pattern contained within the single JS file:

- **Model**: an in-memory array of Transaction objects, always synchronized to Local Storage.
- **View**: idempotent DOM manipulation functions that re-render the Transaction List, Balance Display, and Chart from the current model state.
- **Controller**: event handlers that respond to user interactions (form submit, delete click), orchestrating model mutations, persistence, and view re-renders.

---

## Architecture

### High-Level Component Diagram

```
+---------------------------------------------------------------------+
|                         Browser (index.html)                         |
|                                                                       |
|  +-----------------------------------------------------------------+ |
|  |                      App Shell (HTML/CSS)                        | |
|  |                                                                  | |
|  |  +--------------------+        +--------------------------+     | |
|  |  |  Balance_Display   |        |       Input_Form          |     | |
|  |  |  (total balance)   |        |  (name / amount / cat)    |     | |
|  |  +--------------------+        +-------------+------------+     | |
|  |                                              | submit            | |
|  |  +--------------------+        +-------------v------------+     | |
|  |  |   Spending Chart   |        |    Transaction_List       |     | |
|  |  |   (Chart.js pie)   |        |    (scrollable list)      |     | |
|  |  +--------------------+        +--------------------------+     | |
|  +-----------------------------------------------------------------+ |
|                                                                       |
|  +-----------------------------------------------------------------+ |
|  |                          js/app.js                               | |
|  |                                                                  | |
|  |  +-----------+  +------------+  +---------------------------+   | |
|  |  |   Model   |  | Controller |  |           View             |   | |
|  |  |  (array)  |<-|  (events)  |->|  (DOM + ChartManager)     |   | |
|  |  +-----+-----+  +------------+  +---------------------------+   | |
|  |        |                                                          | |
|  |        v                                                          | |
|  |  +---------------------------+                                   | |
|  |  |  StorageService           |                                   | |
|  |  |  (localStorage JSON)      |                                   | |
|  |  +---------------------------+                                   | |
|  +-----------------------------------------------------------------+ |
+---------------------------------------------------------------------+
```

### Data Flow

**Add Transaction:**
```
User fills Input_Form and submits
        |
        v
Controller intercepts submit event
        |
        v
Validator.validate(formData)
        |
   +----+-------------------+
   | invalid                | valid
   v                        v
View.showErrors(errors)   Model: push new Transaction
                                  |
                                  v
                            StorageService.save(state)
                                  |
                                  v
                            View.renderList(state)
                            View.renderBalance(state)
                            View.renderChart(state)
                            View.resetForm()
```

**Delete Transaction:**
```
User clicks delete button
        |
        v
Controller (event delegation on #transaction-list)
        |
        v
Model: filter out transaction by id
        |
        v
StorageService.save(state)
        |
        v
View.renderList / renderBalance / renderChart
```

**Page Load:**
```
DOMContentLoaded
        |
        v
state.transactions = StorageService.load()
        |
        v
View.renderList / renderBalance / renderChart
```

---

## File / Folder Structure

```
expense-budget-visualizer/
+-- index.html          # Single HTML entry point; loads CSS and JS
+-- css/
|   +-- style.css       # All visual styling
+-- js/
    +-- app.js          # All application logic
```

No build tools, package managers, or additional files are required.

---

## Components and Interfaces

### HTML Structure (index.html)

The page is divided into a header (balance display) and a main content area with three sections: the input form, the spending chart, and the transaction list.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Expense &amp; Budget Visualizer</title>
  <link rel="stylesheet" href="css/style.css" />
</head>
<body>
  <header>
    <h1>Expense &amp; Budget Visualizer</h1>
    <div id="balance-display">
      <span>Total Spent:</span>
      <span id="total-amount">$0.00</span>
    </div>
  </header>

  <main>
    <!-- Input Form -->
    <section id="form-section">
      <form id="transaction-form" novalidate>
        <input  id="item-name"     type="text"   placeholder="Item Name"  autocomplete="off" />
        <input  id="item-amount"   type="number" placeholder="Amount"     min="0.01" step="0.01" />
        <select id="item-category">
          <option value="">-- Select Category --</option>
          <option value="Food">Food</option>
          <option value="Transport">Transport</option>
          <option value="Fun">Fun</option>
        </select>
        <span id="error-message" role="alert" aria-live="polite"></span>
        <button type="submit">Add Transaction</button>
      </form>
    </section>

    <!-- Spending Chart -->
    <section id="chart-section">
      <canvas id="spending-chart" aria-label="Spending by category"></canvas>
      <p id="chart-empty-state" hidden>No transactions yet. Add one above!</p>
    </section>

    <!-- Transaction List -->
    <section id="list-section">
      <h2>Transactions</h2>
      <ul id="transaction-list" aria-label="Transaction list"></ul>
    </section>
  </main>

  <script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
  <script src="js/app.js"></script>
</body>
</html>
```

### JavaScript Module Responsibilities (js/app.js)

The file is organized into six logical sections using plain JavaScript (no ES module syntax, no classes):

#### 1. Constants

```js
const STORAGE_KEY  = 'expense_transactions';
const CATEGORIES   = ['Food', 'Transport', 'Fun'];
const CHART_COLORS = { Food: '#FF6384', Transport: '#36A2EB', Fun: '#FFCE56' };
```

#### 2. StorageService

Responsible for all reads from and writes to `localStorage`. Both methods use `try/catch` to handle quota-exceeded errors and corrupted JSON gracefully.

```js
const StorageService = {
  load() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [];
    } catch {
      return [];
    }
  },
  save(items) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Storage unavailable — data lives in memory for the session
    }
  },
};
```

#### 3. Validator

Pure functions with no side effects. Returns `{ valid: boolean, errors: string[] }`. All three rules are checked simultaneously so the user sees all error messages at once.

```js
const Validator = {
  validate({ name, amount, category }) {
    const errors = [];
    if (!name || name.trim().length === 0)
      errors.push('Item Name is required.');
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0)
      errors.push('Amount must be a positive number.');
    if (!CATEGORIES.includes(category))
      errors.push('Please select a valid Category.');
    return { valid: errors.length === 0, errors };
  },
};
```

#### 4. View

All DOM manipulation is isolated here. Functions are idempotent: each wipes and re-renders its target section from the current state array.

```js
const View = {
  renderList(transactions) {
    // Clears #transaction-list and appends one <li> per transaction.
    // Each <li> carries data-id on the delete button for event delegation.
  },
  renderBalance(transactions) {
    // Computes sum of amounts and writes formatted currency to #total-amount.
  },
  renderChart(transactions) {
    ChartManager.update(transactions);
  },
  showErrors(errors) {
    document.getElementById('error-message').textContent = errors.join(' ');
  },
  clearErrors() {
    document.getElementById('error-message').textContent = '';
  },
  resetForm() {
    document.getElementById('transaction-form').reset();
  },
};
```

Each rendered `<li>` uses event delegation — delete buttons carry `data-id` attributes so the controller can identify which transaction to remove without attaching per-item event listeners.

#### 5. ChartManager

Wraps Chart.js, holding a reference to the single Chart instance to enable in-place data updates without flicker.

```js
const ChartManager = {
  _chart: null,
  update(transactions) {
    const canvas     = document.getElementById('spending-chart');
    const emptyState = document.getElementById('chart-empty-state');

    if (transactions.length === 0) {
      if (this._chart) { this._chart.destroy(); this._chart = null; }
      canvas.hidden     = true;
      emptyState.hidden = false;
      return;
    }

    canvas.hidden     = false;
    emptyState.hidden = true;

    const agg    = aggregateByCategory(transactions);
    const labels = Object.keys(agg);
    const data   = Object.values(agg);
    const colors = labels.map(l => CHART_COLORS[l]);

    if (this._chart) {
      // Mutate in place to avoid flicker on every update
      this._chart.data.labels                      = labels;
      this._chart.data.datasets[0].data            = data;
      this._chart.data.datasets[0].backgroundColor = colors;
      this._chart.update();
    } else {
      this._chart = new Chart(canvas, {
        type: 'pie',
        data: { labels, datasets: [{ data, backgroundColor: colors }] },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } },
      });
    }
  },
};
```

#### 6. Helper Functions and Controller

```js
// Pure helper functions
function formatCurrency(amount) {
  return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function computeBalance(transactions) {
  return transactions.reduce((sum, t) => sum + t.amount, 0);
}

function aggregateByCategory(transactions) {
  return transactions.reduce((acc, t) => {
    if (t.amount > 0) acc[t.category] = (acc[t.category] ?? 0) + t.amount;
    return acc;
  }, {});
}

// In-memory state (single source of truth)
const state = { transactions: [] };

// Form submit handler
document.getElementById('transaction-form').addEventListener('submit', e => {
  e.preventDefault();
  View.clearErrors();
  const name     = document.getElementById('item-name').value;
  const amount   = document.getElementById('item-amount').value;
  const category = document.getElementById('item-category').value;
  const result   = Validator.validate({ name, amount, category });
  if (!result.valid) { View.showErrors(result.errors); return; }
  state.transactions.push({
    id: Date.now().toString(),
    name: name.trim(),
    amount: Number(amount),
    category,
  });
  StorageService.save(state.transactions);
  View.renderList(state.transactions);
  View.renderBalance(state.transactions);
  View.renderChart(state.transactions);
  View.resetForm();
});

// Delete handler (event delegation)
document.getElementById('transaction-list').addEventListener('click', e => {
  const btn = e.target.closest('[data-id]');
  if (!btn) return;
  state.transactions = state.transactions.filter(t => t.id !== btn.dataset.id);
  StorageService.save(state.transactions);
  View.renderList(state.transactions);
  View.renderBalance(state.transactions);
  View.renderChart(state.transactions);
});

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  state.transactions = StorageService.load();
  View.renderList(state.transactions);
  View.renderBalance(state.transactions);
  View.renderChart(state.transactions);
});
```

---

## Data Models

### Transaction Object

```js
{
  id:       string,   // unique identifier — Date.now().toString()
  name:     string,   // non-empty item name (trimmed before storage)
  amount:   number,   // positive float, e.g. 12.50
  category: string,   // "Food" | "Transport" | "Fun"
}
```

### In-Memory Application State

```js
const state = {
  transactions: [],  // Transaction[] — always in sync with Local Storage
};
```

### Local Storage Schema

- **Key**: `"expense_transactions"`
- **Value**: JSON-serialized array of Transaction objects

```json
[
  { "id": "1718000000001", "name": "Lunch",    "amount": 12.50, "category": "Food"      },
  { "id": "1718000000002", "name": "Bus pass", "amount": 30.00, "category": "Transport" },
  { "id": "1718000000003", "name": "Concert",  "amount": 45.00, "category": "Fun"       }
]
```

On `load()`, if the key is absent or `JSON.parse` throws, the app defaults to `[]`.

---

## Chart.js Integration Approach

Chart.js v4 is loaded via CDN before `app.js` in `index.html`:

```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
```

**Aggregation** — `aggregateByCategory` groups transactions by category. Only categories with a positive total appear as slices; categories with no transactions are omitted from the labels and data arrays entirely, satisfying Requirement 4.5.

**Update strategy** — Rather than destroying and re-creating the chart on every state change (which causes visual flicker), `ChartManager.update()` mutates the existing chart's `data.labels`, `data.datasets[0].data`, and `data.datasets[0].backgroundColor` in place, then calls `chart.update()`. The chart instance is only destroyed when the transaction list becomes empty, at which point the `<canvas>` is hidden and the empty-state `<p>` is shown.

**CDN failure guard** — `ChartManager.update()` checks `typeof Chart !== 'undefined'` before instantiating; if Chart.js is unavailable, the empty-state message is shown instead of throwing.

---

## Validation Logic Design

Validation is a pure function — no DOM access, no side effects.

```
Validator.validate({ name, amount, category }) -> { valid: boolean, errors: string[] }
```

**Rules (all checked simultaneously):**

| Rule | Condition | Error message |
|------|-----------|---------------|
| Name required | `name.trim().length > 0` | "Item Name is required." |
| Positive amount | `!isNaN(amount) && Number(amount) > 0` | "Amount must be a positive number." |
| Valid category | `CATEGORIES.includes(category)` | "Please select a valid Category." |

All three rules are evaluated before returning. The `errors` array is empty only when all rules pass. The View is responsible for displaying errors; the Validator only produces the result.

---

## State Management Approach

There is a **single source of truth**: `state.transactions` (in-memory array in `app.js`).

**Sync contract — every mutation follows this exact sequence:**

```
1. Mutate state.transactions
2. StorageService.save(state.transactions)    <- persist immediately
3. View.renderList(state.transactions)         <- re-render list
4. View.renderBalance(state.transactions)      <- re-render balance
5. View.renderChart(state.transactions)        <- re-render chart
```

**On initialization:**

```
1. state.transactions = StorageService.load()
2. View.renderList / renderBalance / renderChart
```

There is no lazy sync, no batching, and no dirty-flag mechanism. All re-renders are full re-renders (wipe and rebuild), which is efficient at the expected data volume for a personal expense tracker.

---

## Error Handling

| Scenario | Handling |
|---|---|
| Empty item name | Validator returns error; inline message shown via aria-live; no transaction added |
| Non-positive or non-numeric amount | Validator returns error; inline message shown |
| No category selected | Validator returns error; inline message shown |
| Local Storage quota exceeded | try/catch in StorageService.save(); silently continues — data lives in memory for the session |
| Local Storage contains corrupted JSON | try/catch in StorageService.load() defaults to [] |
| Chart.js CDN unavailable | typeof Chart guard in ChartManager.update(); falls back to empty-state text |
| Delete with non-existent id | state.transactions.filter() is a no-op; no error thrown |

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Transaction Persistence Round-Trip

*For any* array of valid Transaction objects, serializing the array to Local Storage via `StorageService.save()` and then loading it back via `StorageService.load()` should produce an array that is deeply equal to the original.

**Validates: Requirements 5.1, 5.2, 5.3**

---

### Property 2: Balance Equals Sum of Amounts

*For any* array of Transaction objects (including the empty array), the value returned by `computeBalance()` should equal the arithmetic sum of all `amount` fields. For an empty array, the result must be exactly `0`.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

---

### Property 3: Validator Accepts All Valid Inputs

*For any* combination of a non-empty trimmed name string, a positive finite number for amount, and a category drawn from `{Food, Transport, Fun}`, `Validator.validate()` should return `{ valid: true, errors: [] }`.

**Validates: Requirements 1.2, 1.4**

---

### Property 4: Validator Rejects All Invalid Inputs

*For any* combination of form inputs where at least one field is invalid (empty or whitespace-only name, non-positive or non-numeric amount, or absent/unknown category), `Validator.validate()` should return `{ valid: false }` with a non-empty `errors` array whose length equals the number of failing fields.

**Validates: Requirements 1.2, 1.3**

---

### Property 5: Category Aggregation Correctness

*For any* array of Transaction objects, the result of `aggregateByCategory()` should satisfy two invariants simultaneously: (a) each category key maps to the exact sum of `amount` values for transactions in that category, and (b) the sum of all category totals equals the total of all transaction amounts. Categories with no transactions must not appear as keys in the result.

**Validates: Requirements 4.2, 4.5**

---

### Property 6: Delete Removes Exactly One Transaction

*For any* non-empty array of Transaction objects and any `id` present in that array, filtering out the transaction with that `id` should produce an array that is exactly one element shorter, contains no transaction with that `id`, and preserves all other transactions in their original order.

**Validates: Requirements 2.6, 5.2**

---

### Property 7: Transaction List Render Fidelity

*For any* array of Transaction objects rendered by `View.renderList()`, the number of `<li>` elements in `#transaction-list` should equal the number of transactions, and each `<li>` should contain the correct item name, correctly formatted currency amount, and category for the corresponding transaction.

**Validates: Requirements 2.1, 2.3, 2.4**

---

## Testing Strategy

### Overview

Because this is a Vanilla JS app with no framework, tests target pure functions and logic units by including `app.js` in a test harness that exposes the testable units. The dual approach covers both specific scenarios and universal properties.

- **Unit / example-based tests**: specific scenarios, edge cases, error conditions
- **Property-based tests**: universal properties across generated inputs

### Property-Based Testing Library

Use **fast-check** (https://fast-check.io) for JavaScript — available via npm in the test environment. Each property-based test must run a minimum of **100 iterations**.

Tag format per test:
```js
// Feature: expense-budget-visualizer, Property N: <property_text>
```

### Property Test Specifications

| Property | Generators | What Varies | Assertion |
|---|---|---|---|
| 1 - Persistence round-trip | `fc.array(validTransactionArb())` | Array length, field values | `deepEqual(load(save(arr)), arr)` |
| 2 - Balance equals sum | `fc.array(validTransactionArb())` | Length and amounts, including empty array | `computeBalance(arr) === arr.reduce((s,t) => s+t.amount, 0)` |
| 3 - Validator accepts valid | `fc.record({ name: nonEmptyStringArb, amount: positiveFloatArb, category: fc.constantFrom(...CATEGORIES) })` | All valid field combinations | `result.valid === true && errors.length === 0` |
| 4 - Validator rejects invalid | Generated objects with at least one invalid field | Which field is invalid, how it is invalid | `result.valid === false && errors.length >= 1` |
| 5 - Category aggregation | `fc.array(validTransactionArb())` | Lengths, categories, amounts | Both sum invariants hold; empty categories absent |
| 6 - Delete removes one | `fc.array(validTransactionArb(), {minLength: 1})` + random index | Which transaction is deleted | Length - 1, id absent, order preserved |
| 7 - List render fidelity | `fc.array(validTransactionArb())` | List size and transaction content | `<li>` count matches; name/amount/category text correct per item |

### Example-Based Unit Tests

- `Validator.validate` with concrete valid and invalid inputs (boundary cases: empty string, 0, negative number, whitespace-only name)
- `StorageService.load` when localStorage is empty, has valid JSON, has corrupted JSON
- `aggregateByCategory` with zero, one, and multiple transactions per category
- `ChartManager.update` called with empty array: empty state `<p>` shown, `<canvas>` hidden
- `View.renderBalance` formatting: `$0.00`, `$12.50`, `$1,234.56`
- Add flow end-to-end: form submit -> list updated, balance updated, storage updated, form reset
- Delete flow end-to-end: delete button click -> item removed from list, balance, and storage
- Load flow: seed localStorage -> DOMContentLoaded -> list, balance, chart all reflect seeded data

### Smoke / Integration Tests

- Open `index.html` in browser with seeded Local Storage -> verify full render
- Add a transaction end-to-end -> verify list, balance, chart, and Local Storage all update
- Delete a transaction -> verify same
- Refresh page -> verify data persists and re-renders correctly

### Accessibility Checks

- All interactive elements (form fields, submit button, delete buttons) are keyboard-navigable
- Error messages use `role="alert"` and `aria-live="polite"` so screen readers announce them without moving focus
- Transaction List uses semantic `<ul>` with `aria-label`
- Delete buttons carry `aria-label` including the item name for screen reader context
- Chart `<canvas>` has `aria-label`; Chart.js tooltips provide text labels so color is not the sole distinguishing factor
- Typography and contrast meet WCAG 2.1 AA minimums at all supported viewport widths (320px-1920px)
