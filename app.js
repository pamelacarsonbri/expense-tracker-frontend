const API = "https://expensetrackerapi-1-x5ss.onrender.com";

const CAT_COLORS = {
  Food: "#3b82f6", Transport: "#8b5cf6", Entertainment: "#ec4899",
  Utilities: "#f59e0b", Health: "#10b981", Other: "#6b7280"
};

// ── Navigation ──────────────────────────────────────────────────────────────
document.querySelectorAll(".nav-item").forEach(link => {
  link.addEventListener("click", e => {
    e.preventDefault();
    const page = link.dataset.page;
    document.querySelectorAll(".nav-item").forEach(l => l.classList.remove("active"));
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    link.classList.add("active");
    document.getElementById("page-" + page).classList.add("active");
    if (page === "dashboard") loadDashboard();
    if (page === "expenses") loadExpenses();
    if (page === "budgets") loadBudgets();
    if (page === "report") loadReport();
  });
});

// ── Dashboard ───────────────────────────────────────────────────────────────
async function loadDashboard() {
  try {
    const res = await fetch(`${API}/report/`);
    const data = await res.json();

    document.getElementById("stat-total").textContent = `GHS ${data.total_spent.toFixed(2)}`;
    document.getElementById("stat-count").textContent = data.number_of_expenses;
    document.getElementById("stat-largest").textContent = data.largest_expense
      ? `GHS ${data.largest_expense.amount.toFixed(2)}`
      : "—";
    document.getElementById("stat-top-cat").textContent = data.highest_spending_category || "—";

    const statusList = document.getElementById("budget-status-list");
    const warningsList = document.getElementById("warnings-list");
    const warningsSection = document.getElementById("warnings-section");

    statusList.innerHTML = "";
    warningsList.innerHTML = "";
    let hasWarnings = false;

    if (!data.category_summaries || data.category_summaries.length === 0) {
      statusList.innerHTML = `<div class="empty-state">No budgets set yet. Go to Budgets to add some.</div>`;
    } else {
      data.category_summaries.forEach(cat => {
        if (cat.budget === 0) return;
        const pct = Math.min((cat.spent / cat.budget) * 100, 100);
        const over = cat.over_budget;
        const warn = pct >= 80 && !over;
        const color = over ? "over" : warn ? "warn" : "";

        statusList.innerHTML += `
          <div class="budget-bar-item ${over ? "over" : ""}">
            <div class="budget-bar-top">
              <span class="budget-cat">${cat.category}</span>
              <span class="budget-nums ${over ? "over" : ""}">
                GHS ${cat.spent.toFixed(2)} / GHS ${cat.budget.toFixed(2)}
              </span>
            </div>
            <div class="bar-track">
              <div class="bar-fill ${color}" style="width:${pct}%"></div>
            </div>
          </div>`;

        if (over) {
          hasWarnings = true;
          warningsList.innerHTML += `
            <div class="warning-item">
              ⚠ Over budget in <strong>${cat.category}</strong> by
              GHS ${(cat.spent - cat.budget).toFixed(2)}
            </div>`;
        }
      });

      if (statusList.innerHTML === "") {
        statusList.innerHTML = `<div class="empty-state">No budgets set yet.</div>`;
      }
    }

    warningsSection.style.display = hasWarnings ? "block" : "none";
  } catch (err) {
    document.getElementById("budget-status-list").innerHTML =
      `<div class="empty-state">Could not load data. Make sure the API is running.</div>`;
  }
}

// ── Log Expense ──────────────────────────────────────────────────────────────
async function logExpense() {
  const category = document.getElementById("log-category").value;
  const description = document.getElementById("log-description").value.trim();
  const amount = parseFloat(document.getElementById("log-amount").value);
  const date = document.getElementById("log-date").value;
  const msg = document.getElementById("log-msg");

  if (!category || !description || isNaN(amount) || amount <= 0) {
    msg.className = "form-msg error";
    msg.textContent = "Please fill in all fields with valid values.";
    return;
  }

  const body = { category, description, amount };
  if (date) body.date = date;

  try {
    const res = await fetch(`${API}/expenses/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (res.status === 201) {
      const data = await res.json();
      msg.className = "form-msg success";
      msg.textContent = `Expense logged! GHS ${data.amount.toFixed(2)} for ${data.category}.`;
      document.getElementById("log-category").value = "";
      document.getElementById("log-description").value = "";
      document.getElementById("log-amount").value = "";
      document.getElementById("log-date").value = "";
    } else {
      const err = await res.json();
      msg.className = "form-msg error";
      msg.textContent = err.detail || "Something went wrong.";
    }
  } catch {
    msg.className = "form-msg error";
    msg.textContent = "Could not connect to the API.";
  }
}

// ── All Expenses ─────────────────────────────────────────────────────────────
async function loadExpenses() {
  const list = document.getElementById("expenses-list");
  const cat = document.getElementById("filter-category").value;
  const url = cat ? `${API}/expenses/category/${cat}` : `${API}/expenses/`;
  list.innerHTML = `<div class="empty-state">Loading...</div>`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!data.length) {
      list.innerHTML = `<div class="empty-state">No expenses found.</div>`;
      return;
    }

    list.innerHTML = data.map(e => `
      <div class="expense-item" id="exp-${e.id}">
        <div class="expense-dot cat-${e.category}" style="background:${CAT_COLORS[e.category] || "#6b7280"}"></div>
        <div class="expense-info">
          <div class="expense-desc">${e.description}</div>
          <div class="expense-meta">${e.category} · ${e.date}</div>
        </div>
        <div class="expense-amount">GHS ${e.amount.toFixed(2)}</div>
        <button class="btn-delete" onclick="deleteExpense(${e.id})">Delete</button>
      </div>
    `).join("");
  } catch {
    list.innerHTML = `<div class="empty-state">Could not load expenses.</div>`;
  }
}

async function deleteExpense(id) {
  if (!confirm("Delete this expense?")) return;
  try {
    const res = await fetch(`${API}/expenses/${id}`, { method: "DELETE" });
    if (res.ok) {
      document.getElementById("exp-" + id)?.remove();
      if (!document.querySelector(".expense-item")) {
        document.getElementById("expenses-list").innerHTML =
          `<div class="empty-state">No expenses found.</div>`;
      }
    }
  } catch {
    alert("Could not delete expense.");
  }
}

// ── Budgets ──────────────────────────────────────────────────────────────────
async function setBudget() {
  const category = document.getElementById("budget-category").value;
  const amount = parseFloat(document.getElementById("budget-amount").value);
  const msg = document.getElementById("budget-msg");

  if (!category || isNaN(amount) || amount <= 0) {
    msg.className = "form-msg error";
    msg.textContent = "Please select a category and enter a valid amount.";
    return;
  }

  try {
    const res = await fetch(`${API}/budgets/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, amount })
    });

    if (res.ok) {
      msg.className = "form-msg success";
      msg.textContent = `Budget for ${category} set to GHS ${amount.toFixed(2)}.`;
      document.getElementById("budget-category").value = "";
      document.getElementById("budget-amount").value = "";
      loadBudgets();
    } else {
      msg.className = "form-msg error";
      msg.textContent = "Something went wrong.";
    }
  } catch {
    msg.className = "form-msg error";
    msg.textContent = "Could not connect to the API.";
  }
}

async function loadBudgets() {
  const list = document.getElementById("budgets-list");
  list.innerHTML = `<div class="empty-state">Loading...</div>`;

  try {
    const res = await fetch(`${API}/budgets/`);
    const data = await res.json();

    if (!data.length) {
      list.innerHTML = `<div class="empty-state">No budgets set yet.</div>`;
      return;
    }

    list.innerHTML = data.map(b => `
      <div class="budget-item" id="budget-${b.category}">
        <div class="budget-item-cat">
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${CAT_COLORS[b.category] || "#6b7280"};margin-right:8px;"></span>
          ${b.category}
        </div>
        <div style="display:flex;align-items:center;gap:12px;">
          <div class="budget-item-amt">GHS ${b.amount.toFixed(2)} / month</div>
          <button class="btn-delete" onclick="resetBudget('${b.category}')">Reset</button>
        </div>
      </div>
    `).join("");
  } catch {
    list.innerHTML = `<div class="empty-state">Could not load budgets.</div>`;
  }
}

async function resetBudget(category) {
  if (!confirm(`Reset budget for ${category} to GHS 0.00?`)) return;
  try {
    const res = await fetch(`${API}/budgets/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, amount: 0.01 })
    });
    if (res.ok) {
      loadBudgets();
      loadDashboard();
    } else {
      alert("Could not reset budget.");
    }
  } catch {
    alert("Could not connect to the API.");
  }
}

// ── Report ───────────────────────────────────────────────────────────────────
async function loadReport() {
  const content = document.getElementById("report-content");
  content.innerHTML = `<div class="empty-state">Loading report...</div>`;

  try {
    const res = await fetch(`${API}/report/`);
    const d = await res.json();

    const largestName = d.largest_expense ? d.largest_expense.description : "—";
    const largestAmt = d.largest_expense ? `GHS ${d.largest_expense.amount.toFixed(2)}` : "—";

    const summaryRows = d.category_summaries
      .filter(c => c.budget > 0 || c.spent > 0)
      .map(c => {
        const pct = c.budget > 0 ? Math.min((c.spent / c.budget) * 100, 100) : 0;
        const over = c.over_budget;
        return `
          <div class="budget-bar-item ${over ? "over" : ""}">
            <div class="budget-bar-top">
              <span class="budget-cat">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${CAT_COLORS[c.category]};margin-right:8px;"></span>
                ${c.category}
              </span>
              <span class="budget-nums ${over ? "over" : ""}">
                GHS ${c.spent.toFixed(2)} / GHS ${c.budget.toFixed(2)}
                ${over ? `<span style="margin-left:8px;font-size:11px;background:#fdf2f2;color:#c0392b;padding:2px 6px;border-radius:4px;">Over budget</span>` : ""}
              </span>
            </div>
            <div class="bar-track">
              <div class="bar-fill ${over ? "over" : pct >= 80 ? "warn" : ""}" style="width:${pct}%"></div>
            </div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:6px;">
              Remaining: GHS ${c.remaining.toFixed(2)}
            </div>
          </div>`;
      }).join("") || `<div class="empty-state">No category data yet.</div>`;

    content.innerHTML = `
      <div class="report-grid">
        <div class="report-stat">
          <div class="label">Total spent</div>
          <div class="value">GHS ${d.total_spent.toFixed(2)}</div>
        </div>
        <div class="report-stat">
          <div class="label">Expenses logged</div>
          <div class="value">${d.number_of_expenses}</div>
        </div>
        <div class="report-stat">
          <div class="label">Top category</div>
          <div class="value">${d.highest_spending_category || "—"}</div>
        </div>
      </div>
      <div class="report-stat" style="margin-bottom:24px;display:flex;justify-content:space-between;align-items:center">
        <div>
          <div class="label" style="font-size:12px;font-weight:500;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">Largest single expense</div>
          <div style="font-weight:500">${largestName}</div>
        </div>
        <div style="font-family:'DM Mono',monospace;font-size:18px;font-weight:600;color:var(--blue)">${largestAmt}</div>
      </div>
      <div class="section-title">Category breakdown</div>
      <div class="report-categories">${summaryRows}</div>`;
  } catch {
    content.innerHTML = `<div class="empty-state">Could not load report.</div>`;
  }
}

// ── Init ─────────────────────────────────────────────────────────────────────
loadDashboard();
