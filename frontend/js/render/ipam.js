console.log("[RENDER] Loaded ipam.js");

function renderIPAM(root) {
  const pools = state.ipPools;
  const allocs = DB.getIPAllocations();

  root.innerHTML = "";

  // --- NEW: pagination state (per render) ---
  let ipamCurrentPage = 1;
  let ipamPageSize = 20;
  let ipamTotalPages = 1;

  /* HEADER */
  const header = document.createElement("section");
  header.className = "block";
  header.innerHTML = `
    <h1 class="block-title">IP ADDRESS MANAGEMENT (IPAM)</h1>
    <p class="text-muted">Permanent pools & allocations</p>
  `;
  root.appendChild(header);

  /* TOP SUMMARY CARDS */
  const summary = document.createElement("section");
  summary.className = "block";

  summary.innerHTML = `
    <div class="ipam-summary-grid">
      ${Object.entries(pools).map(([key, pool]) => {
        const poolAllocs = allocs.filter(a => a.pool === key);
        return `
          <div class="ipam-summary-card">
            <div class="ipam-summary-title">${pool.name}</div>
            <div class="ipam-summary-cidrs mono">${pool.cidrs.join(" , ")}</div>
            ${
              pool.reserved
                ? `<div class="ipam-summary-reserved">
                     Reserved: <span class="mono">${pool.reserved.join(" , ")}</span>
                   </div>`
                : ""
            }
            <div class="ipam-summary-stats">
              <span class="ipam-summary-count">${poolAllocs.length}</span>
              <span class="ipam-summary-label">Allocations</span>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
  root.appendChild(summary);

  /* MAIN ALLOCATIONS TABLE BLOCK */
  const tableBlock = document.createElement("section");
  tableBlock.className = "block";

  tableBlock.innerHTML = `
    <div class="ipam-table-header">
      <div>
        <div class="ipam-table-title">ALLOCATIONS</div>
        <div class="ipam-table-sub">All assigned IPs and subnets</div>
      </div>
      <div class="ipam-table-filters">
        <input id="ipamSearch" class="search-input" placeholder="Search CIDR or object id...">

        <select id="ipamPoolFilter" class="filter-select">
          <option value="">All Pools</option>
          ${Object.entries(pools).map(([key, pool]) =>
            `<option value="${key}">${pool.name}</option>`
          ).join("")}
        </select>

        <select id="ipamTypeFilter" class="filter-select">
          <option value="">All Types</option>
          <option value="router">Router</option>
          <option value="engineer">Engineer</option>
          <option value="site">Site</option>
        </select>
      </div>
    </div>

    <div class="ipam-table-wrapper">
      <table class="ipam-table">
        <thead>
          <tr>
            <th style="width:190px;">CIDR</th>
            <th style="width:110px;">Pool</th>
            <th style="width:110px;">Type</th>
            <th>Object</th>
            <th style="width:200px;">Allocated At</th>
          </tr>
        </thead>
        <tbody id="ipamTableBody"></tbody>
      </table>
    </div>

    <!-- NEW: table footer with page size + pagination -->
    <div class="ipam-table-footer">
      <div class="ipam-page-size">
        <label>
          Rows per page
          <select id="ipamPageSize" class="filter-select">
            <option value="20" selected>20</option>
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="200">200</option>
          </select>
        </label>
      </div>
      <div class="ipam-pagination" id="ipamPagination"></div>
    </div>
  `;

  root.appendChild(tableBlock);

  const tbody = tableBlock.querySelector("#ipamTableBody");
  const pageSizeSelect = tableBlock.querySelector("#ipamPageSize");  // NEW
  const paginationEl = tableBlock.querySelector("#ipamPagination");   // NEW

  // NEW: render pagination footer
  function renderPagination(total) {
    const totalPages = Math.max(1, Math.ceil(total / ipamPageSize));
    ipamTotalPages = totalPages;

    if (total === 0) {
      paginationEl.innerHTML = `<span class="ipam-page-info">0 items</span>`;
      return;
    }

    const start = (ipamCurrentPage - 1) * ipamPageSize + 1;
    const end = Math.min(total, ipamCurrentPage * ipamPageSize);

    paginationEl.innerHTML = `
      <span class="ipam-page-info">${start}-${end} of ${total}</span>
      <button class="ipam-page-btn" data-page="prev" ${ipamCurrentPage === 1 ? "disabled" : ""}>‹</button>
      <span class="ipam-page-current">Page ${ipamCurrentPage} of ${totalPages}</span>
      <button class="ipam-page-btn" data-page="next" ${ipamCurrentPage === totalPages ? "disabled" : ""}>›</button>
    `;
  }

  function paintTable() {
    const q = document.getElementById("ipamSearch").value.trim().toLowerCase();
    const poolFilter = document.getElementById("ipamPoolFilter").value;
    const typeFilter = document.getElementById("ipamTypeFilter").value;

    let list = DB.getIPAllocations();

    if (poolFilter) {
      list = list.filter(a => a.pool === poolFilter || a.pool_name === poolFilter);
    }

    if (typeFilter) {
      list = list.filter(a => a.type === typeFilter || a.object_type === typeFilter);
    }

    if (q) {
      list = list.filter(a =>
        (a.cidr || "").toLowerCase().includes(q) ||
        (String(a.id) || "").toLowerCase().includes(q) ||
        (String(a.object_id || "")).toLowerCase().includes(q)
      );
    }

    if (!list.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="ipam-empty">No allocations found for current filters.</td>
        </tr>
      `;
      renderPagination(0); // NEW
      return;
    }

    // sort by pool then cidr (demo)
    list.sort((a, b) => {
      const pa = (a.pool || a.pool_name || "").localeCompare(b.pool || b.pool_name || "");
      if (pa !== 0) return pa;
      return (a.cidr || "").localeCompare(b.cidr || "");
    });

    // NEW: apply pagination
    const total = list.length;
    const totalPages = Math.max(1, Math.ceil(total / ipamPageSize));
    if (ipamCurrentPage > totalPages) ipamCurrentPage = totalPages;

    const startIndex = (ipamCurrentPage - 1) * ipamPageSize;
    const pageItems = list.slice(startIndex, startIndex + ipamPageSize);

    tbody.innerHTML = pageItems.map(a => {
      const poolKey = a.pool || a.pool_name || "";
      const poolName = pools[poolKey] ? pools[poolKey].name : poolKey || "-";

      const type = a.type || a.object_type || "-";
      const obj = a.object_id != null ? `${type} → ${a.object_id}` : "-";
      const ts = a.allocatedAt || a.created_at || a.createdAt;
      const tsStr = ts ? new Date(ts).toLocaleString() : "-";

      return `
        <tr>
          <td class="mono">${a.cidr}</td>
          <td>${poolName}</td>
          <td>${type}</td>
          <td>${obj}</td>
          <td class="mono">${tsStr}</td>
        </tr>
      `;
    }).join("");

    renderPagination(total); // NEW
  }

  // Filters change → reset to page 1 + repaint
  document.getElementById("ipamSearch").oninput = () => {
    ipamCurrentPage = 1;
    paintTable();
  };
  document.getElementById("ipamPoolFilter").onchange = () => {
    ipamCurrentPage = 1;
    paintTable();
  };
  document.getElementById("ipamTypeFilter").onchange = () => {
    ipamCurrentPage = 1;
    paintTable();
  };

  // NEW: page size change
  pageSizeSelect.addEventListener("change", () => {
    ipamPageSize = parseInt(pageSizeSelect.value, 10) || 20;
    ipamCurrentPage = 1;
    paintTable();
  });

  // NEW: pagination buttons (Prev / Next)
  paginationEl.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-page]");
    if (!btn) return;
    const action = btn.dataset.page;
    if (action === "prev" && ipamCurrentPage > 1) {
      ipamCurrentPage--;
      paintTable();
    } else if (action === "next" && ipamCurrentPage < ipamTotalPages) {
      ipamCurrentPage++;
      paintTable();
    }
  });

  paintTable();
}
