/* -----------------------------------------------------------
   RENDER: AUDIT LOGS
   Enterprise-style log / event view with filters, sorting,
   and pagination.
----------------------------------------------------------- */

console.log("[RENDER] Loaded logs.js");

function renderLogs(root) {
  const allLogs = DB.getLogs() || [];
  const users = DB.getUsers() || [];

  // Build a quick lookup map: userId -> user
  const userMap = new Map(users.map(u => [u.id, u]));

  // --- local UI state ---
  let currentSortField = "ts";    // "ts" | "severity" | "category"
  let currentSortDir = "desc";    // "asc" | "desc"
  let currentPage = 1;
  let pageSize = 50;

  // --- helpers ---
  const escapeHtml = (str) =>
    (str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const compareStrings = (a = "", b = "") => a.localeCompare(b);

  const compareSeverity = (a, b) => {
    // order: error > warn > info
    const score = { error: 3, warn: 2, info: 1 };
    return (score[a] || 0) - (score[b] || 0);
  };

  // --------------------------------------------------------
  // Layout
  // --------------------------------------------------------

  root.innerHTML = "";

  const block = document.createElement("section");
  block.className = "block";

  // Header + filters
  const header = document.createElement("div");
  header.className = "log-header";

  header.innerHTML = `
    <div>
      <h1 class="block-title">AUDIT LOG</h1>
      <p class="text-muted log-subtitle">
        System, security and configuration events.
      </p>
    </div>

    <div class="log-filters">
      <div class="log-filter-group">
        <label>Severity</label>
        <select id="logFilterSeverity" class="filter-select">
          <option value="">All</option>
          <option value="info">Info</option>
          <option value="warn">Warning</option>
          <option value="error">Error</option>
        </select>
      </div>

      <div class="log-filter-group">
        <label>Category</label>
        <select id="logFilterCategory" class="filter-select">
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

      <div class="log-filter-group log-filter-search">
        <label>Search</label>
        <input id="logFilterSearch" type="text" class="search-input"
               placeholder="Message / object / user…">
      </div>
    </div>
  `;

  block.appendChild(header);

  // Table wrapper
  const wrapper = document.createElement("div");
  wrapper.className = "table-wrapper log-table-wrapper";

  wrapper.innerHTML = `
    <table class="log-table">
      <thead>
        <tr>
          <th class="log-th-sort" data-sort="ts" style="width: 180px;">
            Time <span class="log-sort-indicator"></span>
          </th>
          <th class="log-th-sort" data-sort="severity" style="width: 90px;">
            Severity <span class="log-sort-indicator"></span>
          </th>
          <th class="log-th-sort" data-sort="category" style="width: 110px;">
            Category <span class="log-sort-indicator"></span>
          </th>
          <th>Message</th>
          <th style="width: 200px;">User / Source</th>
        </tr>
      </thead>
      <tbody id="logTableBody"></tbody>
    </table>
  `;

  block.appendChild(wrapper);

  // Footer: pagination + page size
  const footer = document.createElement("div");
  footer.className = "log-table-footer";
  footer.innerHTML = `
    <div class="log-page-size">
      <label>
        Rows per page
        <select id="logPageSize" class="filter-select">
          <option value="20">20</option>
          <option value="50" selected>50</option>
          <option value="100">100</option>
          <option value="200">200</option>
        </select>
      </label>
    </div>
    <div class="log-pagination" id="logPagination"></div>
  `;
  block.appendChild(footer);

  root.appendChild(block);

  // --------------------------------------------------------
  // DOM refs
  // --------------------------------------------------------

  const tbody = wrapper.querySelector("#logTableBody");
  const severityFilterEl = document.getElementById("logFilterSeverity");
  const categoryFilterEl = document.getElementById("logFilterCategory");
  const searchEl = document.getElementById("logFilterSearch");
  const pageSizeSelect = document.getElementById("logPageSize");
  const paginationEl = document.getElementById("logPagination");
  const sortHeaders = wrapper.querySelectorAll(".log-th-sort");

  // --------------------------------------------------------
  // Data pipeline: filter → sort → paginate
  // --------------------------------------------------------

  function getFilteredAndSortedLogs() {
    const sev = severityFilterEl.value;
    const cat = categoryFilterEl.value;
    const q = (searchEl.value || "").trim().toLowerCase();

    let list = allLogs.slice(); // copy so we never mutate DB data

    // Filters
    if (sev) {
      list = list.filter(l => l.severity === sev);
    }
    if (cat) {
      list = list.filter(l => l.category === cat);
    }
    if (q) {
      list = list.filter(l => {
        const user = userMap.get(l.userId);
        const userName = user ? user.name || "" : "";
        const userEmail = user ? user.email || "" : "";
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

    // Sorting
    list.sort((a, b) => {
      let cmp = 0;
      switch (currentSortField) {
        case "severity":
          cmp = compareSeverity(a.severity, b.severity);
          break;
        case "category":
          cmp = compareStrings(a.category, b.category);
          break;
        case "ts":
        default: {
          const ta = a.ts || 0;
          const tb = b.ts || 0;
          cmp = ta - tb;
          break;
        }
      }
      return currentSortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }

  function renderPagination(total) {
    if (!total) {
      paginationEl.innerHTML = `<span class="log-page-info">0 items</span>`;
      return;
    }

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * pageSize + 1;
    const end = Math.min(total, currentPage * pageSize);

    paginationEl.innerHTML = `
      <span class="log-page-info">${start}-${end} of ${total}</span>
      <button class="log-page-btn" data-page="prev" ${currentPage === 1 ? "disabled" : ""}>‹</button>
      <span class="log-page-current">Page ${currentPage} of ${totalPages}</span>
      <button class="log-page-btn" data-page="next" ${currentPage === totalPages ? "disabled" : ""}>›</button>
    `;
  }

  function renderSortIndicators() {
    sortHeaders.forEach(th => {
      const field = th.getAttribute("data-sort");
      const indicator = th.querySelector(".log-sort-indicator");
      if (!indicator) return;

      if (field === currentSortField) {
        indicator.textContent = currentSortDir === "asc" ? "▲" : "▼";
        th.classList.add("log-th-sort-active");
      } else {
        indicator.textContent = "";
        th.classList.remove("log-th-sort-active");
      }
    });
  }

  // --------------------------------------------------------
  // Render rows
  // --------------------------------------------------------

  function renderRows() {
    const list = getFilteredAndSortedLogs();

    if (!list.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="log-empty">
            No log entries match the current filters.
          </td>
        </tr>
      `;
      renderPagination(0);
      renderSortIndicators();
      return;
    }

    const total = list.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;

    const startIndex = (currentPage - 1) * pageSize;
    const pageItems = list.slice(startIndex, startIndex + pageSize);

    tbody.innerHTML = pageItems
      .map(l => {
        const user = userMap.get(l.userId);
        const timeStr = l.ts ? new Date(l.ts).toLocaleString() : "";

        const sev = (l.severity || "").toLowerCase();
        const severityClass =
          sev === "error"
            ? "log-sev-error"
            : sev === "warn"
            ? "log-sev-warn"
            : "log-sev-info";

        const userLabel = user
          ? `${user.name} (${user.email})`
          : (l.source || "unknown");

        return `
          <tr class="log-row" data-log-id="${escapeHtml(String(l.id))}">
            <td class="mono">${escapeHtml(timeStr)}</td>
            <td><span class="log-sev ${severityClass}">${escapeHtml(sev || "info")}</span></td>
            <td>${escapeHtml(l.category || "")}</td>
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
        const entry = allLogs.find(x => String(x.id) === String(id));
        if (!entry) return;
        openLogDetailsModal(entry);
      });
    });

    renderPagination(total);
    renderSortIndicators();
  }

  // --------------------------------------------------------
  // Events
  // --------------------------------------------------------

  severityFilterEl.addEventListener("change", () => {
    currentPage = 1;
    renderRows();
  });

  categoryFilterEl.addEventListener("change", () => {
    currentPage = 1;
    renderRows();
  });

  searchEl.addEventListener("input", () => {
    currentPage = 1;
    renderRows();
  });

  pageSizeSelect.addEventListener("change", () => {
    pageSize = parseInt(pageSizeSelect.value, 10) || 50;
    currentPage = 1;
    renderRows();
  });

  paginationEl.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-page]");
    if (!btn) return;
    const action = btn.dataset.page;
    const list = getFilteredAndSortedLogs();
    const totalPages = Math.max(1, Math.ceil(list.length / pageSize));

    if (action === "prev" && currentPage > 1) {
      currentPage--;
      renderRows();
    } else if (action === "next" && currentPage < totalPages) {
      currentPage++;
      renderRows();
    }
  });

  // Sorting on header click
  sortHeaders.forEach(th => {
    th.addEventListener("click", () => {
      const field = th.getAttribute("data-sort");
      if (!field) return;

      if (currentSortField === field) {
        // toggle direction
        currentSortDir = currentSortDir === "asc" ? "desc" : "asc";
      } else {
        currentSortField = field;
        currentSortDir = field === "ts" ? "desc" : "asc";
      }
      currentPage = 1;
      renderRows();
    });
  });

  // Initial render
  renderRows();
}

/* -----------------------------------------------------------
   LOG DETAILS MODAL
----------------------------------------------------------- */

function openLogDetailsModal(entry) {
  const users = DB.getUsers() || [];
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
