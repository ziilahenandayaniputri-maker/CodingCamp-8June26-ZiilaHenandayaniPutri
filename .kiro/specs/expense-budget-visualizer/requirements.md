# Requirements Document

## Introduction

The Expense & Budget Visualizer is a client-side web application that allows users to track personal expenses by adding, viewing, and deleting transactions. The application provides a visual summary of spending by category through a pie chart, along with a running total balance. All data is persisted in the browser's Local Storage, requiring no backend server or account setup. The app is built using plain HTML, CSS, and Vanilla JavaScript with a single CSS file and a single JavaScript file.

## Glossary

- **App**: The Expense & Budget Visualizer web application running in the browser.
- **Transaction**: A single expense entry consisting of an item name, amount, and category.
- **Transaction_List**: The scrollable list UI component that displays all saved transactions.
- **Input_Form**: The HTML form through which the user enters a new transaction's details.
- **Category**: A predefined classification for a transaction — one of: Food, Transport, or Fun.
- **Balance_Display**: The UI element at the top of the page that shows the total sum of all transaction amounts.
- **Chart**: The pie chart rendered by Chart.js that visualizes spending distribution by category.
- **Local_Storage**: The browser's Web Storage API used to persist transaction data client-side.
- **Validator**: The client-side logic that checks that all required Input_Form fields are filled before submission.

## Requirements

### Requirement 1: Transaction Input Form

**User Story:** As a user, I want to fill out a form with an item name, amount, and category so that I can record a new expense transaction.

#### Acceptance Criteria

1. THE Input_Form SHALL contain a text field for Item Name, a numeric field for Amount, and a dropdown selector for Category with options Food, Transport, and Fun.
2. WHEN the user submits the Input_Form, THE Validator SHALL check that the Item Name field is not empty, the Amount field contains a positive number, and a Category has been selected.
3. IF the user submits the Input_Form with one or more empty or invalid fields, THEN THE Validator SHALL display an inline error message indicating which fields require attention and SHALL NOT add a transaction.
4. WHEN the Input_Form passes validation, THE App SHALL add the new Transaction to the Transaction_List and persist it to Local_Storage.
5. WHEN a Transaction is successfully added, THE Input_Form SHALL reset all fields to their default empty or placeholder state.

---

### Requirement 2: Transaction List

**User Story:** As a user, I want to see all my recorded transactions in a scrollable list so that I can review my spending history.

#### Acceptance Criteria

1. THE Transaction_List SHALL display each Transaction's item name, amount (formatted as currency), and category.
2. THE Transaction_List SHALL be scrollable when the number of displayed transactions exceeds the visible area.
3. WHEN a Transaction is added or deleted, THE Transaction_List SHALL update immediately to reflect the current set of transactions.
4. WHEN the App loads, THE Transaction_List SHALL render all transactions previously saved in Local_Storage.
5. THE Transaction_List SHALL provide a delete control for each Transaction entry.
6. WHEN the user activates the delete control for a Transaction, THE App SHALL remove that Transaction from the Transaction_List and from Local_Storage.

---

### Requirement 3: Total Balance Display

**User Story:** As a user, I want to see my total spending balance at the top of the page so that I always know how much I have spent in total.

#### Acceptance Criteria

1. THE Balance_Display SHALL show the sum of all Transaction amounts, formatted as currency, at the top of the page.
2. WHEN a Transaction is added, THE Balance_Display SHALL update to reflect the new total without requiring a page reload.
3. WHEN a Transaction is deleted, THE Balance_Display SHALL update to reflect the new total without requiring a page reload.
4. WHEN no transactions exist, THE Balance_Display SHALL show a total of zero formatted as currency.

---

### Requirement 4: Spending Distribution Chart

**User Story:** As a user, I want to see a pie chart of my spending by category so that I can understand where my money is going.

#### Acceptance Criteria

1. THE Chart SHALL render as a pie chart using Chart.js, with each slice representing one Category (Food, Transport, Fun).
2. THE Chart SHALL display each slice proportional to the total amount spent in that Category relative to all transactions.
3. WHEN a Transaction is added or deleted, THE Chart SHALL update automatically to reflect the new spending distribution without requiring a page reload.
4. WHEN the App loads, THE Chart SHALL render based on the transactions currently stored in Local_Storage.
5. IF no transactions exist for a given Category, THEN THE Chart SHALL omit that Category's slice from the rendered chart.
6. IF no transactions exist at all, THEN THE Chart SHALL display an empty state message in place of the chart.

---

### Requirement 5: Data Persistence

**User Story:** As a user, I want my transactions to be saved between sessions so that I do not lose my data when I close or refresh the browser.

#### Acceptance Criteria

1. WHEN a Transaction is added, THE App SHALL write the updated transaction dataset to Local_Storage.
2. WHEN a Transaction is deleted, THE App SHALL write the updated transaction dataset to Local_Storage.
3. WHEN the App initializes, THE App SHALL read all transactions from Local_Storage and restore the Transaction_List, Balance_Display, and Chart to the state matching the persisted data.
4. IF Local_Storage contains no transaction data on initialization, THEN THE App SHALL initialize with an empty Transaction_List, a zero Balance_Display, and an empty Chart state.

---

### Requirement 6: Responsive and Accessible UI

**User Story:** As a user, I want the application to be easy to read and use on different screen sizes so that I can access it from any device.

#### Acceptance Criteria

1. THE App SHALL use a single CSS file located at `css/style.css` for all visual styling.
2. THE App SHALL use a single JavaScript file located at `js/app.js` for all application logic.
3. THE App SHALL render without visual breakage on viewport widths from 320px to 1920px.
4. THE Input_Form, Transaction_List, Balance_Display, and Chart SHALL maintain a clear visual hierarchy with readable typography at all supported viewport widths.
5. WHEN a user interacts with the Input_Form or delete controls, THE App SHALL respond within 100ms to reflect the interaction visually, ensuring no noticeable lag.
