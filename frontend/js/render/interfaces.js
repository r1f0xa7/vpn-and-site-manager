console.log("[RENDER] Loaded interfaces.js");

/* ------------------------------------------------------------
   MAIN INTERFACES PAGE RENDERER
------------------------------------------------------------ */

function renderInterfaces(root) {
  root.innerHTML = "";

  const interfaces = DB.getInterfaces();
  const peers = DB.getPeers ? DB.getPeers() : [];

  // --------- header + actions ----------
  const header = document.createElement("section");
  header.className = "block interfaces-header-block";

  header.innerHTML = `
    <div class="interfaces-header">
      <div>
        <h1 class="block-title">WIREGUARD INTERFACES</h1>
        <p class="text-muted interfaces-subtitle">
          Core WireGuard endpoints that terminate tunnels for routers and engineers.
        </p>
      </div>

      <div class="interfaces-actions">
        <button class="btn-primary" id="btnAddInterface">+ Add Interface</button>

        <div class="interfaces-view-toggle">
          <button id="btnViewTable" class="view-toggle-btn active">Table View</button>
          <button id="btnViewGrid" class="view-toggle-btn">Grid View</button>
        </div>
      </div>
    </div>
  `;
  root.appendChild(header);

  header.querySelector("#btnAddInterface").onclick = () =>
    openInterfaceCreateModal();

  // --------- summary cards -------------
  const totalIfaces = interfaces.length;
  const totalPeers = peers.length;
  const onlinePeers = peers.filter(
    p => p.stats && p.stats.state === "online"
  ).length;

  const summary = document.createElement("section");
  summary.className = "block";

  summary.innerHTML = `
    <div class="interfaces-summary-grid">
      <div class="interfaces-summary-card">
        <div class="interfaces-summary-label">Interfaces</div>
        <div class="interfaces-summary-value">${totalIfaces}</div>
      </div>
      <div class="interfaces-summary-card">
        <div class="interfaces-summary-label">Total Peers</div>
        <div class="interfaces-summary-value">${totalPeers}</div>
      </div>
      <div class="interfaces-summary-card">
        <div class="interfaces-summary-label">Online Peers</div>
        <div class="interfaces-summary-value interfaces-summary-value-green">
          ${onlinePeers}
        </div>
      </div>
    </div>
  `;
  root.appendChild(summary);

  // --------- view container ------------
  const viewContainer = document.createElement("div");
  viewContainer.id = "interfacesViewContainer";
  root.appendChild(viewContainer);

  // default: table
  renderInterfacesTableView(viewContainer);

  header.querySelector("#btnViewTable").onclick = () => {
    setActiveViewButton("btnViewTable");
    renderInterfacesTableView(viewContainer);
  };
  header.querySelector("#btnViewGrid").onclick = () => {
    setActiveViewButton("btnViewGrid");
    renderInterfacesGridView(viewContainer);
  };
}

/* ------------------------------------------------------------
   Set active view toggle button
------------------------------------------------------------ */

function setActiveViewButton(id) {
  document
    .querySelectorAll(".view-toggle-btn")
    .forEach(btn => btn.classList.remove("active"));
  const el = document.getElementById(id);
  if (el) el.classList.add("active");
}

/* ------------------------------------------------------------
   TABLE VIEW  (search + filter + pagination)
------------------------------------------------------------ */

function renderInterfacesTableView(container) {
  container.innerHTML = "";

  // local UI state
  let currentPage = 1;
  let pageSize = 20;
  let searchTerm = "";
  let healthFilter = "";

  const section = document.createElement("section");
  section.className = "block";

  section.innerHTML = `
    <div class="interfaces-table-header">
      <div class="interfaces-table-filters">
        <div class="interfaces-filter-group">
          <label>Search</label>
          <input id="ifaceSearchInput" class="search-input"
                 placeholder="Name / ID / port…">
        </div>

        <div class="interfaces-filter-group">
          <label>Health</label>
          <select id="ifaceHealthFilter" class="filter-select">
            <option value="">All</option>
            <option value="good">Good</option>
            <option value="warn">Warn</option>
            <option value="bad">Bad</option>
          </select>
        </div>
      </div>

      <div class="interfaces-table-controls">
        <label class="interfaces-page-size">
          Rows per page
          <select id="ifacePageSize" class="filter-select">
            <option value="10">10</option>
            <option value="20" selected>20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </label>
      </div>
    </div>

    <div class="table-wrapper interfaces-table-wrapper">
      <table class="interfaces-table">
        <thead>
          <tr>
            <th style="width: 80px;">ID</th>
            <th>Name</th>
            <th style="width:120px;">Peers</th>
            <th style="width:120px;">Port</th>
            <th style="width:110px;">Health</th>
            <th style="width:120px;">Actions</th>
          </tr>
        </thead>
        <tbody id="interfacesTableBody"></tbody>
      </table>
    </div>

    <div class="interfaces-table-footer">
      <div id="ifacePageInfo" class="interfaces-page-info"></div>
      <div id="ifacePagination" class="interfaces-pagination"></div>
    </div>
  `;

  container.appendChild(section);

  const tbody = section.querySelector("#interfacesTableBody");
  const searchInput = section.querySelector("#ifaceSearchInput");
  const healthSelect = section.querySelector("#ifaceHealthFilter");
  const pageSizeSelect = section.querySelector("#ifacePageSize");
  const pageInfoEl = section.querySelector("#ifacePageInfo");
  const paginationEl = section.querySelector("#ifacePagination");

  function getFilteredList() {
    let list = DB.getInterfaces() || [];

    // search
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(iface =>
        (iface.name || "").toLowerCase().includes(q) ||
        (iface.id || "").toLowerCase().includes(q) ||
        String(iface.listenPort || "")
          .toLowerCase()
          .includes(q)
      );
    }

    // health filter
    if (healthFilter) {
      list = list.filter(iface => {
        const h = calculateInterfaceHealth(iface);
        return h.class === `health-${healthFilter}`;
      });
    }

    // sort by name
    list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    return list;
  }

  function renderPagination(total) {
    if (!total) {
      pageInfoEl.textContent = "0 interfaces";
      paginationEl.innerHTML = "";
      return;
    }

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * pageSize + 1;
    const end = Math.min(total, currentPage * pageSize);

    pageInfoEl.textContent = `${start}-${end} of ${total} interfaces`;

    paginationEl.innerHTML = `
      <button class="iface-page-btn" data-page="prev"
        ${currentPage === 1 ? "disabled" : ""}>‹</button>
      <span class="iface-page-current">Page ${currentPage} of ${totalPages}</span>
      <button class="iface-page-btn" data-page="next"
        ${currentPage === totalPages ? "disabled" : ""}>›</button>
    `;
  }

  function paintTable() {
    const list = getFilteredList();

    if (!list.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="iface-empty-row">
            No interfaces found for current filters.
          </td>
        </tr>
      `;
      renderPagination(0);
      return;
    }

    const total = list.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;

    const startIndex = (currentPage - 1) * pageSize;
    const pageItems = list.slice(startIndex, startIndex + pageSize);

    tbody.innerHTML = pageItems
      .map(iface => {
        const health = calculateInterfaceHealth(iface);
        const peerCount = (iface.peers || []).length;

        return `
          <tr class="iface-row" data-id="${iface.id}">
            <td class="mono">${iface.id}</td>
            <td>${iface.name}</td>
            <td>${peerCount}</td>
            <td class="mono">${iface.listenPort || "-"}</td>
            <td>
              <span class="iface-health ${health.class}">${health.label}</span>
            </td>
            <td>
              <button class="iface-action" data-act="view" data-id="${iface.id}">View</button>
              <button class="iface-action" data-act="config" data-id="${iface.id}">Config</button>
            </td>
          </tr>
        `;
      })
      .join("");

    // actions
    tbody.querySelectorAll(".iface-action").forEach(btn => {
      btn.onclick = e => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const act = btn.dataset.act;
        if (act === "view") openInterfaceDrawer(id);
        if (act === "config") openInterfaceConfigModal(id);
      };
    });

    // row click = open drawer
    tbody.querySelectorAll(".iface-row").forEach(row => {
      row.onclick = e => {
        if (e.target.classList.contains("iface-action")) return;
        openInterfaceDrawer(row.dataset.id);
      };
    });

    renderPagination(total);
  }

  // events
  searchInput.addEventListener("input", () => {
    searchTerm = searchInput.value.trim();
    currentPage = 1;
    paintTable();
  });

  healthSelect.addEventListener("change", () => {
    healthFilter = healthSelect.value || "";
    currentPage = 1;
    paintTable();
  });

  pageSizeSelect.addEventListener("change", () => {
    pageSize = parseInt(pageSizeSelect.value, 10) || 20;
    currentPage = 1;
    paintTable();
  });

  paginationEl.addEventListener("click", e => {
    const btn = e.target.closest("button[data-page]");
    if (!btn) return;
    const list = getFilteredList();
    const totalPages = Math.max(1, Math.ceil(list.length / pageSize));

    if (btn.dataset.page === "prev" && currentPage > 1) {
      currentPage--;
      paintTable();
    } else if (
      btn.dataset.page === "next" &&
      currentPage < totalPages
    ) {
      currentPage++;
      paintTable();
    }
  });

  paintTable();
}

/* ------------------------------------------------------------
   SIMPLE HEALTH CALCULATION
------------------------------------------------------------ */

function calculateInterfaceHealth(iface) {
  const stats = iface.stats || {};
  const peers = iface.peers || [];

  let score = 0;
  if (peers.length > 0) score += 40;
  if (stats.onlinePeers > 0) score += 40;
  if (iface.privateKey) score += 20;

  if (score >= 80) return { label: "GOOD", class: "health-good" };
  if (score >= 50) return { label: "WARN", class: "health-warn" };
  return { label: "BAD", class: "health-bad" };
}

/* ------------------------------------------------------------
   GRID VIEW
------------------------------------------------------------ */

function renderInterfacesGridView(container) {
  const interfaces = DB.getInterfaces() || [];
  container.innerHTML = "";

  const wrap = document.createElement("section");
  wrap.className = "block";

  if (!interfaces.length) {
    wrap.innerHTML = `
      <div class="interfaces-grid-empty">
        No interfaces created yet.
      </div>
    `;
    container.appendChild(wrap);
    return;
  }

  wrap.innerHTML = `
    <div class="interfaces-grid">
      ${interfaces
        .map(iface => {
          const health = calculateInterfaceHealth(iface);
          const peerCount = (iface.peers || []).length;
          return `
            <div class="iface-grid-card" data-id="${iface.id}">
              <div class="iface-grid-header">
                <div>
                  <div class="iface-grid-name">${iface.name}</div>
                  <div class="iface-grid-sub mono">${iface.id}</div>
                </div>
                <span class="iface-health ${health.class}">${health.label}</span>
              </div>
              <div class="iface-grid-info">
                <div><strong>Peers:</strong> ${peerCount}</div>
                <div><strong>Port:</strong> ${iface.listenPort || "-"}</div>
              </div>
              <button class="iface-grid-btn" data-id="${iface.id}">Open</button>
            </div>
          `;
        })
        .join("")}
    </div>
  `;

  container.appendChild(wrap);

  wrap.querySelectorAll(".iface-grid-btn").forEach(btn => {
    btn.onclick = () => openInterfaceDrawer(btn.dataset.id);
  });
}

/* ------------------------------------------------------------
   INTERFACE DETAIL DRAWER
------------------------------------------------------------ */

function openInterfaceDrawer(interfaceId) {
  const iface = DB.getInterface(interfaceId);
  if (!iface) return;

  const drawer = document.getElementById("interfaceDrawer");
  drawer.innerHTML = "";
  drawer.classList.remove("hidden");

  const routers = DB.getRouters ? DB.getRouters() : [];
  const peers = DB.getPeers ? DB.getPeers() : [];
  const sites = DB.getSites ? DB.getSites() : [];

  const peerObjs = (iface.peers || []).map(id => peers.find(p => p.id === id));
  const routerPeers = peerObjs.filter(p => p && p.type === "router");
  const engineerPeers = peerObjs.filter(p => p && p.type === "engineer");

  const health = calculateInterfaceHealth(iface);
  const stats = iface.stats || {};
  const maskedKey = iface.privateKey
    ? "*".repeat(Math.min(iface.privateKey.length, 44))
    : "—";

  drawer.innerHTML = `
    <div class="iface-drawer-header">
      <div>
        <div class="iface-drawer-title">${iface.name}</div>
        <div class="iface-drawer-sub mono">${iface.id}</div>
      </div>
      <button class="iface-drawer-close" onclick="closeInterfaceDrawer()">✕</button>
    </div>

    <div class="iface-drawer-section">
      <div class="iface-sec-title">SUMMARY</div>
      <div class="iface-summary-grid">
        <div><strong>Interface:</strong> ${iface.name}</div>
        <div><strong>Peers:</strong> ${(iface.peers || []).length}</div>
        <div><strong>Port:</strong> ${iface.listenPort || "-"}</div>
        <div><strong>Health:</strong> <span class="iface-health ${health.class}">${health.label}</span></div>
        <div><strong>Updated:</strong> ${formatDate(iface.updatedAt)}</div>
        <div><strong>Created:</strong> ${formatDate(iface.createdAt)}</div>
      </div>
    </div>

    <div class="iface-drawer-section">
      <div class="iface-sec-title">KEYS</div>
      <div class="iface-key-row">
        <label>Private Key</label>
        <span class="mono" id="ifacePrivKeyTxt">${maskedKey}</span>
        <button class="btn-secondary btn-small" id="btnTogglePrivKey">Show</button>
      </div>
      <div class="iface-key-row">
        <label>Public Key</label>
        <span class="mono">${iface.publicKey || "—"}</span>
      </div>
    </div>

    <div class="iface-drawer-section">
      <div class="iface-sec-title">STATS</div>
      <div class="iface-stats-grid">
        <div><strong>RX:</strong> ${stats.rxBytes || 0} bytes</div>
        <div><strong>TX:</strong> ${stats.txBytes || 0} bytes</div>
        <div><strong>Online Peers:</strong> ${stats.onlinePeers || 0}</div>
        <div><strong>Stale Peers:</strong> ${stats.stalePeers || 0}</div>
        <div><strong>Last Reload:</strong> ${formatDate(stats.lastReload)}</div>
      </div>
    </div>

    <div class="iface-drawer-section">
      <div class="iface-sec-title">ROUTER PEERS</div>
      ${
        !routerPeers.length
          ? `<div class="iface-empty">No router peers.</div>`
          : routerPeers
              .map(p => {
                const router = routers.find(r => r.id === p.routerId);
                const site = sites.find(s => s.id === p.siteId);
                return `
                  <div class="iface-peer-card">
                    <div><strong>${router ? router.name : p.name || p.id}</strong></div>
                    <div class="mono">${p.vpnIP || "-"}</div>
                    <div class="iface-peer-sub">
                      <span>${site ? site.name : "-"}</span>
                    </div>
                    <button class="btn-small" onclick="interfaceOpenPeerDrawer('${p.id}')">View Peer</button>
                  </div>
                `;
              })
              .join("")
      }
    </div>

    <div class="iface-drawer-section">
      <div class="iface-sec-title">ENGINEER PEERS</div>
      ${
        !engineerPeers.length
          ? `<div class="iface-empty">No engineer peers.</div>`
          : engineerPeers
              .map(p => `
                <div class="iface-peer-card">
                  <div><strong>${p.deviceName || p.name || p.id}</strong></div>
                  <div class="mono">${p.vpnIP || "-"}</div>
                  <button class="btn-small" onclick="interfaceOpenPeerDrawer('${p.id}')">View Peer</button>
                </div>
              `)
              .join("")
      }
    </div>

    <div class="iface-drawer-section">
      <div class="iface-sec-title">ACTIONS</div>
      <div class="iface-action-row">
        <button class="btn-secondary" onclick="openInterfaceEditModal('${iface.id}')">Edit</button>
        <button class="btn-secondary" onclick="DB.reloadInterface('${iface.id}')">Reload</button>
        <button class="btn-secondary" onclick="openInterfaceConfigModal('${iface.id}')">Config</button>
        <button class="btn-danger" onclick="openDeleteInterfaceModal('${iface.id}')">Delete</button>
      </div>
    </div>
  `;

  // toggle private key
  const toggle = drawer.querySelector("#btnTogglePrivKey");
  if (toggle) {
    toggle.onclick = () => {
      const span = drawer.querySelector("#ifacePrivKeyTxt");
      if (!span) return;
      if (span.dataset.state === "shown") {
        span.textContent = maskedKey;
        span.dataset.state = "hidden";
        toggle.textContent = "Show";
      } else {
        span.textContent = iface.privateKey || "—";
        span.dataset.state = "shown";
        toggle.textContent = "Hide";
      }
    };
  }
}

function closeInterfaceDrawer() {
  const el = document.getElementById("interfaceDrawer");
  if (el) el.classList.add("hidden");
}

function formatDate(d) {
  if (!d) return "-";
  return new Date(d).toLocaleString();
}

/* ------------------------------------------------------------
   CREATE / EDIT / DELETE / CONFIG  (unchanged logic)
------------------------------------------------------------ */

function openInterfaceCreateModal() {
  Modal.open({
    title: "Create New Interface",
    size: "medium",
    content: `
      <div class="form-group">
        <label>Interface Name</label>
        <input id="newIfaceName" class="form-input" placeholder="wg0 / wg1 / wg-backhaul">
      </div>

      <div class="form-group">
        <label>Listen Port</label>
        <input id="newIfacePort" class="form-input" type="number" value="51820">
      </div>

      <div class="form-group">
        <label>Description (Optional)</label>
        <input id="newIfaceDesc" class="form-input">
      </div>

      <div class="form-group">
        <label>DNS Servers (comma separated)</label>
        <input id="newIfaceDNS" class="form-input" value="1.1.1.1, 8.8.8.8">
      </div>
    `,
    actions: [
      {
        label: "Cancel",
        className: "btn-secondary",
        onClick: Modal.close
      },
      {
        label: "Create",
        className: "btn-primary",
        onClick: () => {
          const name = document.getElementById("newIfaceName").value.trim();
          const port = parseInt(document.getElementById("newIfacePort").value, 10);
          const desc = document.getElementById("newIfaceDesc").value.trim();
          const dns = document
            .getElementById("newIfaceDNS")
            .value.split(",")
            .map(s => s.trim())
            .filter(Boolean);

          if (!name) {
            showToast("Interface name is required", "error");
            return;
          }

          DB.addInterface({
            name,
            listenPort: port,
            description: desc,
            dns
          });

          Modal.close();
          navigateTo("interfaces");
        }
      }
    ]
  });
}

function openInterfaceEditModal(id) {
  const iface = DB.getInterface(id);
  if (!iface) return;

  Modal.open({
    title: `Edit Interface: ${iface.name}`,
    size: "medium",
    content: `
      <div class="form-group">
        <label>Interface Name</label>
        <input id="editIfaceName" class="form-input" value="${iface.name}">
      </div>

      <div class="form-group">
        <label>Listen Port</label>
        <input id="editIfacePort" class="form-input" type="number" value="${iface.listenPort}">
      </div>

      <div class="form-group">
        <label>Description</label>
        <input id="editIfaceDesc" class="form-input" value="${iface.description || ""}">
      </div>

      <div class="form-group">
        <label>DNS Servers (comma separated)</label>
        <input id="editIfaceDNS" class="form-input" value="${(iface.dns || []).join(", ")}">
      </div>

      <div class="form-group">
        <label>MTU</label>
        <input id="editIfaceMTU" class="form-input" type="number" value="${iface.mtu || 1420}">
      </div>
    `,
    actions: [
      {
        label: "Cancel",
        className: "btn-secondary",
        onClick: Modal.close
      },
      {
        label: "Save Changes",
        className: "btn-primary",
        onClick: () => {
          const name = document.getElementById("editIfaceName").value.trim();
          const port = parseInt(document.getElementById("editIfacePort").value, 10);
          const desc = document.getElementById("editIfaceDesc").value.trim();
          const dns = document
            .getElementById("editIfaceDNS")
            .value.split(",")
            .map(s => s.trim())
            .filter(Boolean);
          const mtu = parseInt(document.getElementById("editIfaceMTU").value, 10);

          DB.updateInterface(id, {
            name,
            listenPort: port,
            description: desc,
            dns,
            mtu
          });

          Modal.close();
          navigateTo("interfaces");
        }
      }
    ]
  });
}

function openDeleteInterfaceModal(id) {
  const iface = DB.getInterface(id);
  if (!iface) return;

  Modal.open({
    title: "Delete Interface",
    size: "small",
    content: `
      <p>Are you sure you want to delete <strong>${iface.name}</strong>?</p>
      <p>This cannot be undone.</p>
    `,
    actions: [
      {
        label: "Cancel",
        className: "btn-secondary",
        onClick: Modal.close
      },
      {
        label: "Delete",
        className: "btn-danger",
        onClick: () => {
          DB.deleteInterface(id);
          Modal.close();
          navigateTo("interfaces");
        }
      }
    ]
  });
}

function openInterfaceConfigModal(id) {
  const iface = DB.getInterface(id);
  if (!iface) return;

  const config = DB.generateInterfaceConfig(id);

  Modal.open({
    title: `Interface Config: ${iface.name}`,
    size: "large",
    content: `
      <pre class="config-preview mono">${config.replace(/</g, "&lt;")}</pre>
    `,
    actions: [
      {
        label: "Copy",
        className: "btn-secondary",
        onClick: () => {
          navigator.clipboard.writeText(config);
          showToast("Config copied to clipboard!", "success");
        }
      },
      {
        label: "Close",
        className: "btn-primary",
        onClick: Modal.close
      }
    ]
  });
}

function interfaceOpenPeerDrawer(peerId) {
  // simple: jump to peers view and open drawer from there later if you want
  navigateTo("peers");
}
