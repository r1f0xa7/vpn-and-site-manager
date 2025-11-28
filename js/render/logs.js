/* -----------------------------------------------------------
   RENDER: AUDIT LOGS
   Enterprise-style log / event view
----------------------------------------------------------- */

console.log("[RENDER] Loaded logs.js");

function renderLogs(root) {
  const logs = DB.getLogs();
  const users = DB.getUsers();

  // Top header with filters
  const block = document.createElement("section");
  block.className = "block";

  const header = document.createElement("div");
  header.className = "log-header";

  const title = document.createElement("h1");
  title.className = "block-title";
  title.textContent = "AUDIT LOG";
  header.appendChild(title);

  // Filters container
  const filters = document.createElement("div");
  filters.className = "log-filters";

  filters.innerHTML = `
    <div class="log-filter-group">
      <label>Severity</label>
      <select id="logFilterSeverity">
        <option value="">All</option>
        <option value="info">Info</option>
        <option value="warn">Warning</option>
        <option value="error">Error</option>
      </select>
    </div>

    <div class="log-filter-group">
      <label>Category</label>
      <select id="logFilterCategory">
        <option value="">All</option>
        <option value="system">System</option>
        <option value="site">Site</option>
        <option value="router">Router</option>
        <option value="vpn">VPN</option>
        <option value="ipam">IPAM</option>
        <option value="user">User</option>
        <option value="security">Security</option>
      </select>
    </div>

    <div class="log-filter-group">
      <label>Search</label>
      <input id="logFilterSearch" type="text" placeholder="Message / object / user…">
    </div>
  `;

  header.appendChild(filters);
  block.appendChild(header);

  // Table wrapper
  const wrapper = document.createElement("div");
  wrapper.className = "table-wrapper log-table-wrapper";

  wrapper.innerHTML = `
    <table class="log-table">
      <thead>
        <tr>
          <th style="width: 160px;">Time</th>
          <th style="width: 90px;">Severity</th>
          <th style="width: 90px;">Category</th>
          <th>Message</th>
          <th style="width: 160px;">User / Source</th>
        </tr>
      </thead>
      <tbody id="logTableBody"></tbody>
    </table>
  `;

  block.appendChild(wrapper);
  root.appendChild(block);

  const tbody = wrapper.querySelector("#logTableBody");
  const severityFilterEl = document.getElementById("logFilterSeverity");
  const categoryFilterEl = document.getElementById("logFilterCategory");
  const searchEl = document.getElementById("logFilterSearch");

  function renderRows() {
    const sev = severityFilterEl.value;
    const cat = categoryFilterEl.value;
    const q = (searchEl.value || "").trim().toLowerCase();

    let filtered = logs;

    if (sev) {
      filtered = filtered.filter(l => l.severity === sev);
    }
    if (cat) {
      filtered = filtered.filter(l => l.category === cat);
    }
    if (q) {
      filtered = filtered.filter(l => {
        const user = users.find(u => u.id === l.userId);
        const userName = user ? user.name : "";
        const userEmail = user ? user.email : "";
        const message = l.message || "";
        const obj = `${l.objectType || ""} ${l.objectId || ""}`;
        const src = l.source || "";
        return (
          message.toLowerCase().includes(q) ||
          obj.toLowerCase().includes(q) ||
          userName.toLowerCase().includes(q) ||
          userEmail.toLowerCase().includes(q) ||
          src.toLowerCase().includes(q)
        );
      });
    }

    if (!filtered.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="log-empty">
            No log entries match the current filters.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered
      .map(l => {
        const user = users.find(u => u.id === l.userId);
        const severityClass =
          l.severity === "error"
            ? "log-sev-error"
            : l.severity === "warn"
            ? "log-sev-warn"
            : "log-sev-info";

        const timeStr = l.ts
          ? new Date(l.ts).toLocaleString()
          : "";

        const userLabel = user
          ? `${user.name} (${user.email})`
          : (l.source || "unknown");

        return `
          <tr class="log-row" data-log-id="${l.id}">
            <td class="mono">${timeStr}</td>
            <td><span class="log-sev ${severityClass}">${l.severity}</span></td>
            <td>${l.category || ""}</td>
            <td class="log-msg-cell">${escapeHtml(l.message || "")}</td>
            <td class="log-user-cell">
              ${escapeHtml(userLabel)}
            </td>
          </tr>
        `;
      })
      .join("");

    // row click → modal
    tbody.querySelectorAll(".log-row").forEach(tr => {
      tr.addEventListener("click", () => {
        const id = tr.getAttribute("data-log-id");
        const entry = logs.find(x => x.id === id);
        if (!entry) return;
        openLogDetailsModal(entry);
      });
    });
  }

  // basic HTML escape
  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  severityFilterEl.addEventListener("change", renderRows);
  categoryFilterEl.addEventListener("change", renderRows);
  searchEl.addEventListener("input", renderRows);

  renderRows();
}

/* -----------------------------------------------------------
   LOG DETAILS MODAL
----------------------------------------------------------- */

function openLogDetailsModal(entry) {
  const users = DB.getUsers();
  const user = users.find(u => u.id === entry.userId);

  const timeStr = entry.ts ? new Date(entry.ts).toLocaleString() : "";

  const detailsPretty = JSON
    .stringify(entry.details || {}, null, 2)
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const html = `
    <div class="log-detail">
      <div class="log-detail-row">
        <span class="log-detail-label">Time</span>
        <span class="log-detail-value mono">${timeStr}</span>
      </div>
      <div class="log-detail-row">
        <span class="log-detail-label">Severity</span>
        <span class="log-detail-value">${entry.severity}</span>
      </div>
      <div class="log-detail-row">
        <span class="log-detail-label">Category</span>
        <span class="log-detail-value">${entry.category || ""}</span>
      </div>
      <div class="log-detail-row">
        <span class="log-detail-label">User</span>
        <span class="log-detail-value">
          ${
            user
              ? `${user.name} (${user.email})`
              : (entry.source || "unknown")
          }
        </span>
      </div>
      <div class="log-detail-row">
        <span class="log-detail-label">Object</span>
        <span class="log-detail-value mono">
          ${(entry.objectType || "—")} ${(entry.objectId || "")}
        </span>
      </div>
      <div class="log-detail-row log-detail-row-message">
        <span class="log-detail-label">Message</span>
        <span class="log-detail-value">${entry.message || ""}</span>
      </div>
      <div class="log-detail-row">
        <span class="log-detail-label">Details</span>
      </div>
      <pre class="log-detail-json">${detailsPretty}</pre>
    </div>
  `;

  Modal.open({
    title: "Log Entry",
    content: html,
    actions: [
      {
        label: "Close",
        className: "btn-secondary",
        onClick: () => Modal.close()
      }
    ]
  });
}
