console.log("[RENDER] Loaded routers.js");

function renderRouters(root) {
  const interfaces = DB.getInterfaces();
  const sites = DB.getSites ? DB.getSites() : [];

  // Pagination state (per render)
  let routersCurrentPage = 1;
  let routersPageSize = 20;
  let routersTotalPages = 1;

  root.innerHTML = "";

  /* HEADER */
  const header = document.createElement("section");
  header.className = "block routers-header-block";

  header.innerHTML = `
    <div class="routers-header">
      <h1 class="block-title">ROUTERS</h1>

      <div class="routers-actions">
        <input id="routerSearchInput" class="search-input" placeholder="Search routers...">
        <button id="btnAddRouter" class="btn-primary">+ Add Router</button>
      </div>
    </div>
  `;
  root.appendChild(header);

  header.querySelector("#btnAddRouter").onclick = () => openRouterCreateModal();

  /* TABLE */
  const section = document.createElement("section");
  section.className = "block";

  section.innerHTML = `
    <div class="table-wrapper routers-table-wrapper">
      <table class="routers-table">
        <thead>
          <tr>
            <th style="width:100px;">ID</th>
            <th>Name</th>
            <th style="width:120px;">Serial</th>
            <th style="width:100px;">Model</th>
            <th style="width:130px;">Tunnel IP</th>
            <th style="width:120px;">Site</th>
            <th style="width:110px;">Interface</th>
            <th style="width:90px;">Status</th>
            <th style="width:110px;">Actions</th>
          </tr>
        </thead>
        <tbody id="routersTableBody"></tbody>
      </table>
    </div>

    <!-- Table footer: page size + pagination controls -->
    <div class="routers-table-footer">
      <div class="routers-page-size">
        <label>
          Rows per page
          <select id="routersPageSize" class="filter-select">
            <option value="20" selected>20</option>
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="200">200</option>
          </select>
        </label>
      </div>
      <div class="routers-pagination" id="routersPagination"></div>
    </div>
  `;

  root.appendChild(section);

  const tbody = section.querySelector("#routersTableBody");
  const searchInput = document.getElementById("routerSearchInput");
  const pageSizeSelect = section.querySelector("#routersPageSize");
  const paginationEl = section.querySelector("#routersPagination");

  function renderPagination(total) {
    const totalPages = Math.max(1, Math.ceil(total / routersPageSize));
    routersTotalPages = totalPages;

    if (total === 0) {
      paginationEl.innerHTML = `<span class="routers-page-info">0 items</span>`;
      return;
    }

    if (routersCurrentPage > totalPages) {
      routersCurrentPage = totalPages;
    }

    const start = (routersCurrentPage - 1) * routersPageSize + 1;
    const end = Math.min(total, routersCurrentPage * routersPageSize);

    paginationEl.innerHTML = `
      <span class="routers-page-info">${start}-${end} of ${total}</span>
      <button class="routers-page-btn" data-page="prev" ${routersCurrentPage === 1 ? "disabled" : ""}>‹</button>
      <span class="routers-page-current">Page ${routersCurrentPage} of ${totalPages}</span>
      <button class="routers-page-btn" data-page="next" ${routersCurrentPage === totalPages ? "disabled" : ""}>›</button>
    `;
  }

  function paint() {
    const q = searchInput.value.trim().toLowerCase();
    let list = DB.getRouters();

    if (q) {
      list = list.filter(r =>
        (r.name || "").toLowerCase().includes(q) ||
        (r.serial || "").toLowerCase().includes(q) ||
        (r.tunnelIP || "").toLowerCase().includes(q)
      );
    }

    // Optional: sort by name for stable ordering
    list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:var(--text-muted);">No routers found.</td></tr>`;
      renderPagination(0);
      return;
    }

    const total = list.length;
    const totalPages = Math.max(1, Math.ceil(total / routersPageSize));
    if (routersCurrentPage > totalPages) routersCurrentPage = totalPages;

    const startIndex = (routersCurrentPage - 1) * routersPageSize;
    const pageItems = list.slice(startIndex, startIndex + routersPageSize);

    tbody.innerHTML = pageItems.map(r => {
      const site = sites.find(s => s.id === r.siteId);
      const iface = interfaces.find(i => i.id === r.interfaceId);

      const isOnline = r.stats && r.stats.online;
      const statusHTML = isOnline
        ? `<span class="status-badge status-online">● Online</span>`
        : `<span class="status-badge status-offline">● Offline</span>`;

      return `
        <tr class="router-row" data-id="${r.id}">
          <td class="mono">${r.id}</td>
          <td>${r.name}</td>
          <td>${r.serial || "-"}</td>
          <td>${r.model || "-"}</td>
          <td class="mono">${r.tunnelIP || "-"}</td>
          <td>${site ? site.name : "-"}</td>
          <td>${iface ? iface.name : "-"}</td>
          <td>${statusHTML}</td>
          <td>
            <div class="router-actions">
              <button class="router-action-btn router-action" data-act="view" data-id="${r.id}">View</button>
              <button class="router-action-btn router-action" data-act="config" data-id="${r.id}">Config</button>
            </div>
          </td>
        </tr>
      `;
    }).join("");

    // wire row actions
    tbody.querySelectorAll(".router-action").forEach(btn => {
      btn.onclick = e => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const act = btn.dataset.act;
        if (act === "view") openRouterDrawer(id);
        if (act === "config") openRouterConfigModal(id);
      };
    });

    tbody.querySelectorAll(".router-row").forEach(row => {
      row.onclick = e => {
        if (e.target.classList.contains("router-action") || e.target.closest(".router-actions")) return;
        openRouterDrawer(row.dataset.id);
      };
    });

    renderPagination(total);
  }

  // Search → reset to page 1
  searchInput.oninput = () => {
    routersCurrentPage = 1;
    paint();
  };

  // Page size change
  pageSizeSelect.addEventListener("change", () => {
    routersPageSize = parseInt(pageSizeSelect.value, 10) || 20;
    routersCurrentPage = 1;
    paint();
  });

  // Prev / Next buttons
  paginationEl.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-page]");
    if (!btn) return;
    const action = btn.dataset.page;
    if (action === "prev" && routersCurrentPage > 1) {
      routersCurrentPage--;
      paint();
    } else if (action === "next" && routersCurrentPage < routersTotalPages) {
      routersCurrentPage++;
      paint();
    }
  });

  paint();
}


/* ------------------------------------------------------------
   ROUTER DRAWER (right panel)
------------------------------------------------------------ */

function openRouterDrawer(routerId) {
  const router = DB.getRouter(routerId);
  if (!router) return;

  const drawer = document.getElementById("routerDrawer");
  drawer.classList.remove("hidden");
  drawer.innerHTML = "";

  const sites = DB.getSites ? DB.getSites() : [];
  const interfaces = DB.getInterfaces();
  const peers = DB.getPeers();

  const site = sites.find(s => s.id === router.siteId);
  const iface = interfaces.find(i => i.id === router.interfaceId);
  const peer = peers.find(p => p.routerId === router.id);

  const statusLabel = router.stats.online ? "ONLINE" : "OFFLINE";
  const statusClass = router.stats.online ? "router-status-online" : "router-status-offline";

  const lastSeen = router.stats.lastSeen ? new Date(router.stats.lastSeen).toLocaleString() : "-";

  drawer.innerHTML = `
    <div class="router-drawer-header">
      <div>
        <div class="router-drawer-title">${router.name}</div>
        <div class="router-drawer-sub mono">${router.id}</div>
      </div>
      <button class="router-drawer-close" onclick="closeRouterDrawer()">✕</button>
    </div>

    <div class="router-drawer-section">
      <div class="router-sec-title">SUMMARY</div>
      <div class="router-summary-grid">
        <div><strong>Serial:</strong> ${router.serial || "-"}</div>
        <div><strong>Model:</strong> ${router.model || "-"}</div>
        <div><strong>Tunnel IP:</strong> <span class="mono">${router.tunnelIP || "-"}</span></div>
        <div><strong>Interface:</strong> ${iface ? iface.name : "-"}</div>
        <div><strong>Site:</strong> ${site ? site.name : "-"}</div>
        <div><strong>Status:</strong> <span class="${statusClass}">${statusLabel}</span></div>
        <div><strong>Last Seen:</strong> ${lastSeen}</div>
        <div><strong>Created:</strong> ${formatDate(router.createdAt)}</div>
      </div>
    </div>

    <div class="router-drawer-section">
      <div class="router-sec-title">IDENTIFIERS</div>
      <div class="router-summary-grid">
        <div><strong>IMEI:</strong> ${router.imei || "-"}</div>
        <div><strong>MAC:</strong> ${router.mac || "-"}</div>
      </div>
    </div>

    <div class="router-drawer-section">
      <div class="router-sec-title">WIREGUARD PEER</div>
      ${
        peer
          ? `
            <div class="router-peer-block">
              <div><strong>Peer ID:</strong> <span class="mono">${peer.id}</span></div>
              <div><strong>VPN IP:</strong> <span class="mono">${peer.vpnIP}</span></div>
              <div><strong>Peer State:</strong> ${peer.stats.state}</div>
            </div>
          `
          : `<div class="router-empty">No WireGuard peer linked (unexpected).</div>`
      }
    </div>

    <div class="router-drawer-section">
      <div class="router-sec-title">STATS</div>
      <div class="router-summary-grid">
        <div><strong>RX:</strong> ${router.stats.rxBytes} bytes</div>
        <div><strong>TX:</strong> ${router.stats.txBytes} bytes</div>
      </div>
    </div>

    <div class="router-drawer-section">
      <div class="router-sec-title">ACTIONS</div>
      <div class="router-actions-row">
        <button class="btn-secondary" id="btnRouterEdit">Edit Router</button>
        <button class="btn-secondary" id="btnRouterConfig">WG Config</button>
        <button class="btn-danger" id="btnRouterDelete">Delete</button>
      </div>
    </div>
  `;

  drawer.querySelector("#btnRouterEdit").onclick = () => openRouterEditModal(router.id);
  drawer.querySelector("#btnRouterConfig").onclick = () => openRouterConfigModal(router.id);
  drawer.querySelector("#btnRouterDelete").onclick = () => openRouterDeleteModal(router.id);
}

function closeRouterDrawer() {
  const drawer = document.getElementById("routerDrawer");
  if (!drawer) return;
  drawer.classList.add("hidden");
}

function formatDate(d) {
  if (!d) return "-";
  return new Date(d).toLocaleString();
}


/* ------------------------------------------------------------
   ROUTER WIREGUARD CONFIG MODAL
------------------------------------------------------------ */

function openRouterConfigModal(routerId) {
  const router = DB.getRouter(routerId);
  if (!router) return;

  const peers = DB.getPeers();
  const peer = peers.find(p => p.routerId === router.id);
  const iface = DB.getInterface(router.interfaceId);

  const peerConfig = peer ? DB.generatePeerConfig(peer.id) : "# No peer found for this router";
  const ifaceName = iface ? iface.name : "wg0";

  const config = `
# Router: ${router.name} (${router.model})
# Tunnel IP: ${router.tunnelIP}

${peerConfig}
  `.trim();

  Modal.open({
    title: `Router WG Config: ${router.name}`,
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
          showToast("Router config copied", "success");
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


/* ------------------------------------------------------------
   ADD ROUTER MODAL
------------------------------------------------------------ */

function openRouterCreateModal() {
  const interfaces = DB.getInterfaces();
  const sites = DB.getSites ? DB.getSites() : [];

  const ifaceOptions = interfaces.map(i => `<option value="${i.id}">${i.name}</option>`).join("");
  const siteOptions = sites.map(s => `<option value="${s.id}">${s.name}</option>`).join("");

  Modal.open({
    title: "Add Router",
    size: "medium",
    content: `
      <div class="form-group">
        <label>Name</label>
        <input id="routerName" class="form-input" placeholder="RUTX11-0001">
      </div>

      <div class="form-group">
        <label>Serial</label>
        <input id="routerSerial" class="form-input">
      </div>

      <div class="form-group">
        <label>Model</label>
        <input id="routerModel" class="form-input" placeholder="RUTX11 / RUT240">
      </div>

      <div class="form-group">
        <label>IMEI</label>
        <input id="routerIMEI" class="form-input">
      </div>

      <div class="form-group">
        <label>MAC</label>
        <input id="routerMAC" class="form-input" placeholder="00:11:22:33:44:55">
      </div>

      <div class="form-group">
        <label>Interface</label>
        <select id="routerInterfaceSel" class="form-input">
          ${ifaceOptions}
        </select>
      </div>

      <div class="form-group">
        <label>Site</label>
        <select id="routerSiteSel" class="form-input">
          <option value="">(unassigned)</option>
          ${siteOptions}
        </select>
      </div>
    `,
    actions: [
      {
        label: "Cancel",
        className: "btn-secondary",
        onClick: Modal.close
      },
      {
        label: "Create Router",
        className: "btn-primary",
        onClick: () => {
          const name = document.getElementById("routerName").value.trim();
          const serial = document.getElementById("routerSerial").value.trim();
          const model = document.getElementById("routerModel").value.trim();
          const imei = document.getElementById("routerIMEI").value.trim();
          const mac = document.getElementById("routerMAC").value.trim();
          const interfaceId = document.getElementById("routerInterfaceSel").value;
          const siteId = document.getElementById("routerSiteSel").value || null;

          if (!name) {
            showToast("Router name is required", "error");
            return;
          }

          DB.addRouter({
            name,
            serial,
            model,
            imei,
            mac,
            interfaceId,
            siteId
          });

          Modal.close();
          navigateTo("routers");
        }
      }
    ]
  });
}


/* ------------------------------------------------------------
   EDIT ROUTER MODAL
------------------------------------------------------------ */

function openRouterEditModal(routerId) {
  const router = DB.getRouter(routerId);
  if (!router) return;

  const interfaces = DB.getInterfaces();
  const sites = DB.getSites ? DB.getSites() : [];

  const ifaceOptions = interfaces
    .map(i => `<option value="${i.id}" ${i.id === router.interfaceId ? "selected" : ""}>${i.name}</option>`)
    .join("");
  const siteOptions = sites
    .map(s => `<option value="${s.id}" ${s.id === router.siteId ? "selected" : ""}>${s.name}</option>`)
    .join("");

  Modal.open({
    title: `Edit Router: ${router.name}`,
    size: "medium",
    content: `
      <div class="form-group">
        <label>Name</label>
        <input id="editRouterName" class="form-input" value="${router.name}">
      </div>

      <div class="form-group">
        <label>Serial</label>
        <input id="editRouterSerial" class="form-input" value="${router.serial}">
      </div>

      <div class="form-group">
        <label>Model</label>
        <input id="editRouterModel" class="form-input" value="${router.model}">
      </div>

      <div class="form-group">
        <label>IMEI</label>
        <input id="editRouterIMEI" class="form-input" value="${router.imei}">
      </div>

      <div class="form-group">
        <label>MAC</label>
        <input id="editRouterMAC" class="form-input" value="${router.mac}">
      </div>

      <div class="form-group">
        <label>Interface</label>
        <select id="editRouterInterfaceSel" class="form-input">
          ${ifaceOptions}
        </select>
      </div>

      <div class="form-group">
        <label>Site</label>
        <select id="editRouterSiteSel" class="form-input">
          <option value="">(unassigned)</option>
          ${siteOptions}
        </select>
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
          const name = document.getElementById("editRouterName").value.trim();
          const serial = document.getElementById("editRouterSerial").value.trim();
          const model = document.getElementById("editRouterModel").value.trim();
          const imei = document.getElementById("editRouterIMEI").value.trim();
          const mac = document.getElementById("editRouterMAC").value.trim();
          const interfaceId = document.getElementById("editRouterInterfaceSel").value;
          const siteId = document.getElementById("editRouterSiteSel").value || null;

          DB.updateRouter(routerId, {
            name,
            serial,
            model,
            imei,
            mac,
            interfaceId,
            siteId
          });

          Modal.close();
          navigateTo("routers");
        }
      }
    ]
  });
}


/* ------------------------------------------------------------
   DELETE ROUTER MODAL
------------------------------------------------------------ */

function openRouterDeleteModal(routerId) {
  const router = DB.getRouter(routerId);
  if (!router) return;

  Modal.open({
    title: "Delete Router",
    size: "small",
    content: `
      <p>Are you sure you want to delete router <strong>${router.name}</strong>?</p>
      <p>This will also delete its WireGuard peer.</p>
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
          DB.deleteRouter(routerId);
          Modal.close();
          closeRouterDrawer();
          navigateTo("routers");
        }
      }
    ]
  });
}
