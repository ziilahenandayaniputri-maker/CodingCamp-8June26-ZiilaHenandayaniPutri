// --- Constants ---------------------------------------------------------------

const STORAGE_KEY  = 'expense_transactions';
const CATEGORIES   = ['Food', 'Transport', 'Fun'];
const CHART_COLORS = { Food: '#FF6384', Transport: '#36A2EB', Fun: '#FFCE56' };

// --- StorageService ----------------------------------------------------------

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
      // Storage unavailable (e.g. privacy settings or quota exceeded)
    }
  },
};

// --- Validator ---------------------------------------------------------------

const Validator = {
  validate({ name, amount, category, date }) {
    const errors = [];
    if (!name || name.trim().length === 0) {
      errors.push("Please enter a valid item name.");
    }
    if (isNaN(amount) || amount === null || amount === undefined || Number(amount) <= 0) {
      errors.push("Please enter a valid amount greater than 0.");
    }
    if (!CATEGORIES.includes(category)) {
      errors.push("Please select a valid category.");
    }
    if (!date || isNaN(Date.parse(date))) {
      errors.push("Please enter a valid date.");
    }
    return {
      valid: errors.length === 0,
      errors
    };
  }
};

// --- Helper Functions --------------------------------------------------------

function formatCurrency(amount) {
  return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function computeBalance(transactions) {
  return transactions.reduce((sum, t) => sum + Number(t.amount), 0);
}

function aggregateByCategory(transactions) {
  return transactions.reduce((acc, t) => {
    const amount = Number(t.amount);
    if (amount > 0 && CATEGORIES.includes(t.category)) {
      acc[t.category] = (acc[t.category] || 0) + amount;
    }
    return acc;
  }, {});
}

// --- ChartManager ------------------------------------------------------------

const ChartManager = {
  _chart: null,
  
  update(transactions) {
    const canvas = document.getElementById('spending-chart');
    const emptyState = document.getElementById('chart-empty-state');
    
    if (typeof Chart === 'undefined') {
      if (canvas) canvas.hidden = true;
      if (emptyState) emptyState.hidden = false;
      return;
    }

    const dataObj = aggregateByCategory(transactions);
    const labels = Object.keys(dataObj);
    const data = Object.values(dataObj);

    if (labels.length === 0) {
      if (this._chart) {
        this._chart.destroy();
        this._chart = null;
      }
      canvas.hidden = true;
      emptyState.hidden = false;
      return;
    }

    canvas.hidden = false;
    emptyState.hidden = true;

    const backgroundColor = labels.map(cat => CHART_COLORS[cat]);
    const isDarkMode = document.body.classList.contains('dark-mode');
    const legendColor = isDarkMode ? '#cbd5e0' : '#4a5568';
    const borderColor = isDarkMode ? '#1e293b' : '#ffffff';

    if (!this._chart) {
      const ctx = canvas.getContext('2d');
      this._chart = new Chart(ctx, {
        type: 'pie',
        data: {
          labels: labels,
          datasets: [{
            data: data,
            backgroundColor: backgroundColor,
            borderWidth: 1,
            borderColor: borderColor
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: legendColor,
                font: {
                  family: "'Poppins', sans-serif",
                  size: 12
                }
              }
            }
          }
        }
      });
    } else {
      this._chart.data.labels = labels;
      this._chart.data.datasets[0].data = data;
      this._chart.data.datasets[0].backgroundColor = backgroundColor;
      this._chart.data.datasets[0].borderColor = borderColor;
      this._chart.options.plugins.legend.labels.color = legendColor;
      this._chart.update();
    }
  }
};

// --- View --------------------------------------------------------------------

const View = {
  renderList(transactions) {
    const list = document.getElementById('transaction-list');
    if (!list) return;
    list.innerHTML = '';

    if (transactions.length === 0) {
      list.innerHTML = '<li style="color: var(--label-color); text-align: center; padding: 2rem 0; list-style: none;">No transactions yet.</li>';
      return;
    }

    // Sort a copy of the transactions list based on state.sortBy
    const sorted = [...transactions];
    const sortType = state.sortBy || 'date-desc';

    if (sortType === 'date-desc') {
      sorted.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
    } else if (sortType === 'date-asc') {
      sorted.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    } else if (sortType === 'amount-desc') {
      sorted.sort((a, b) => b.amount - a.amount);
    } else if (sortType === 'amount-asc') {
      sorted.sort((a, b) => a.amount - b.amount);
    } else if (sortType === 'category-asc') {
      sorted.sort((a, b) => a.category.localeCompare(b.category));
    }
    
    sorted.forEach(t => {
      const li = document.createElement('li');
      li.className = 'transaction-item';
      
      li.innerHTML = `
        <div class="transaction-info">
          <div class="transaction-name">${escapeHtml(t.name)}</div>
          <div class="transaction-amount-row">
            <span class="transaction-amount">${formatCurrency(t.amount)}</span>
            <span class="transaction-date">${escapeHtml(t.date)}</span>
          </div>
          <span class="category-badge">${escapeHtml(t.category)}</span>
        </div>
        <button class="delete-btn" data-id="${t.id}" aria-label="Delete ${t.name}">Delete</button>
      `;
      list.appendChild(li);
    });
  },

  renderBalance(transactions) {
    const totalEl = document.getElementById('total-amount');
    if (totalEl) {
      totalEl.textContent = formatCurrency(computeBalance(transactions));
    }
  },

  renderMonthlySummary(transactions) {
    const container = document.getElementById('monthly-summary-list');
    if (!container) return;
    container.innerHTML = '';

    if (transactions.length === 0) {
      container.innerHTML = '<p class="summary-item" style="color: var(--label-color); border: none; justify-content: center;">No monthly data available.</p>';
      return;
    }

    const monthlyTotals = {};
    transactions.forEach(t => {
      const monthKey = t.date.substring(0, 7); // "YYYY-MM"
      monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + Number(t.amount);
    });

    const sortedMonths = Object.keys(monthlyTotals).sort().reverse(); // newest first
    
    sortedMonths.forEach(key => {
      const [year, month] = key.split('-');
      const date = new Date(Number(year), Number(month) - 1, 1);
      const displayMonth = date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      
      const div = document.createElement('div');
      div.className = 'summary-item';
      div.innerHTML = `
        <span class="summary-month">${escapeHtml(displayMonth)}</span>
        <span class="summary-amount">${formatCurrency(monthlyTotals[key])}</span>
      `;
      container.appendChild(div);
    });
  },

  showErrors(errors) {
    const errEl = document.getElementById('error-message');
    if (errEl) {
      errEl.textContent = errors.join(' ');
    }
  },

  clearErrors() {
    const errEl = document.getElementById('error-message');
    if (errEl) {
      errEl.textContent = '';
    }
  },

  resetForm() {
    const form = document.getElementById('transaction-form');
    if (form) {
      form.reset();
      const dateInput = document.getElementById('item-date');
      if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
      }
    }
  },

  renderChart(transactions) {
    ChartManager.update(transactions);
  }
};

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// --- Controller & Initialization --------------------------------------------

const state = {
  transactions: [],
  sortBy: 'date-desc'
};

function handleFormSubmit(e) {
  e.preventDefault();
  View.clearErrors();

  const nameEl = document.getElementById('item-name');
  const amountEl = document.getElementById('item-amount');
  const categoryEl = document.getElementById('item-category');
  const dateEl = document.getElementById('item-date');

  const name = nameEl ? nameEl.value : '';
  const amountRaw = amountEl ? amountEl.value : '';
  const category = categoryEl ? categoryEl.value : '';
  let date = dateEl ? dateEl.value : '';

  if (!date) {
    date = new Date().toISOString().split('T')[0];
  }

  const amount = Number(amountRaw);
  const result = Validator.validate({ name, amount, category, date });

  if (!result.valid) {
    View.showErrors(result.errors);
    return;
  }

  const newTransaction = {
    id: Date.now().toString(),
    name: name.trim(),
    amount: amount,
    category: category,
    date: date
  };

  state.transactions.push(newTransaction);
  StorageService.save(state.transactions);

  View.renderList(state.transactions);
  View.renderBalance(state.transactions);
  View.renderMonthlySummary(state.transactions);
  View.renderChart(state.transactions);
  View.resetForm();
}

function handleDeleteClick(e) {
  const btn = e.target.closest('[data-id]');
  if (!btn) return;

  const targetId = btn.dataset.id;
  state.transactions = state.transactions.filter(t => t.id !== targetId);
  StorageService.save(state.transactions);

  View.renderList(state.transactions);
  View.renderBalance(state.transactions);
  View.renderMonthlySummary(state.transactions);
  View.renderChart(state.transactions);
}

document.addEventListener('DOMContentLoaded', () => {
  // Load transactions and migrate legacy items without date property
  state.transactions = StorageService.load().map(t => {
    if (!t.date) {
      const timestamp = Number(t.id);
      const parsedDate = isNaN(timestamp) ? new Date() : new Date(timestamp);
      t.date = parsedDate.toISOString().split('T')[0];
    }
    return t;
  });

  const form = document.getElementById('transaction-form');
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }

  const list = document.getElementById('transaction-list');
  if (list) {
    list.addEventListener('click', handleDeleteClick);
  }

  // Set default sorting in select element
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.value = state.sortBy;
    sortSelect.addEventListener('change', (e) => {
      state.sortBy = e.target.value;
      View.renderList(state.transactions);
    });
  }

  // Load and apply theme selection
  const savedTheme = localStorage.getItem('theme');
  const themeToggle = document.getElementById('theme-toggle');
  const isDark = savedTheme === 'dark';
  if (isDark) {
    document.body.classList.add('dark-mode');
    if (themeToggle) themeToggle.textContent = '☀️ Light Mode';
  } else {
    document.body.classList.remove('dark-mode');
    if (themeToggle) themeToggle.textContent = '🌙 Dark Mode';
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const bodyClass = document.body.classList;
      bodyClass.toggle('dark-mode');
      const isDarkNow = bodyClass.contains('dark-mode');
      localStorage.setItem('theme', isDarkNow ? 'dark' : 'light');
      themeToggle.textContent = isDarkNow ? '☀️ Light Mode' : '🌙 Dark Mode';
      View.renderChart(state.transactions);
    });
  }

  // Set default date input value to today
  const dateInput = document.getElementById('item-date');
  if (dateInput) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }

  View.renderList(state.transactions);
  View.renderBalance(state.transactions);
  View.renderMonthlySummary(state.transactions);
  View.renderChart(state.transactions);
});
