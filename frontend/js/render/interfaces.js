console.log("[RENDER] Loaded interfaces.js");

/* ------------------------------------------------------------
   MAIN INTERFACES PAGE RENDERER
------------------------------------------------------------ */

function renderInterfaces(root) {
  const interfaces = DB.getInterfaces();

  // --------------------
  // Header + action bar
  // --------------------

  const header = document.createElement("section");
  header.className = "block interfaces-header-block";

  header.innerHTML = `
    <div class="interfaces-header">
      <h1 class="block-title">WIREGUARD INTERFACES</h1>

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

  // Event: Add Interface
  header.querySelector("#btnAddInterface").onclick = () => openInterfaceCreateModal();

  // -------------------------------------------------------------------
  // Container where either TABLE VIEW or GRID VIEW will be inserted
  // -------------------------------------------------------------------

  const viewContainer = document.createElement("div");
  viewContainer.id = "interfacesViewContainer";
  root.appendChild(viewContainer);

  // Default = TABLE VIEW
  renderInterfacesTableView(viewContainer);

  // Toggle buttons
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
   Set active view (toggle button highlight)
------------------------------------------------------------ */

function setActiveViewButton(id) {
  document.querySelectorAll(".view-toggle-btn").forEach(btn => btn.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

/* ------------------------------------------------------------
   TABLE VIEW
------------------------------------------------------------ */

function renderInterfacesTableView(container) {
  const interfaces = DB.getInterfaces();
  container.innerHTML = "";

  const wrap = document.createElement("section");
  wrap.className = "block";

  wrap.innerHTML = `
    <div class="table-wrapper interfaces-table-wrapper">
      <table class="interfaces-table">
        <thead>
          <tr>
            <th style="width: 60px;">ID</th>
            <th>Name</th>
            <th style="width:120px;">Peers</th>
            <th style="width:120px;">Port</th>
            <th style="width:100px;">Health</th>
            <th style="width:110px;">Actions</th>
          </tr>
        </thead>
        <tbody id="interfacesTableBody"></tbody>
      </table>
    </div>
  `;

  container.appendChild(wrap);

  const tbody = wrap.querySelector("#interfacesTableBody");

  if (interfaces.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="6" style="text-align:center;color:var(--text-muted);">No interfaces created yet.</td></tr>
    `;
    return;
  }

  tbody.innerHTML = interfaces
    .map(iface => {
      const health = calculateInterfaceHealth(iface);
      return `
        <tr class="iface-row" data-id="${iface.id}">
          <td class="mono">${iface.id}</td>
          <td>${iface.name}</td>
          <td>${iface.peers.length}</td>
          <td>${iface.listenPort}</td>
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

  // ------------------------------
  // Row + action handlers
  // ------------------------------
  tbody.querySelectorAll(".iface-action").forEach(btn => {
    btn.onclick = e => {
      const id = btn.dataset.id;
      const act = btn.dataset.act;

      if (act === "view") openInterfaceDrawer(id);
      if (act === "config") openInterfaceConfigModal(id);
    };
  });

  // Clicking row (except buttons)
  tbody.querySelectorAll(".iface-row").forEach(row => {
    row.onclick = e => {
      if (e.target.classList.contains("iface-action")) return; // ignore button clicks
      openInterfaceDrawer(row.dataset.id);
    };
  });
}

/* ------------------------------------------------------------
   SIMPLE HEALTH CALCULATION (placeholder)
------------------------------------------------------------ */

function calculateInterfaceHealth(iface) {
  let score = 0;

  if (iface.peers.length > 0) score += 40;
  if (iface.stats.onlinePeers > 0) score += 40;
  if (iface.privateKey) score += 20;

  if (score >= 80) return { label: "GOOD", class: "health-good" };
  if (score >= 50) return { label: "WARN", class: "health-warn" };
  return { label: "BAD", class: "health-bad" };
}

/* ------------------------------------------------------------
   GRID VIEW (Placeholder — Section B will finish it)
------------------------------------------------------------ */

function renderInterfacesGridView(container) {
  const interfaces = DB.getInterfaces();
  container.innerHTML = "";

  const wrap = document.createElement("section");
  wrap.className = "block";

  wrap.innerHTML = `
    <div class="interfaces-grid">
      ${interfaces
        .map(iface => {
          const health = calculateInterfaceHealth(iface);
          return `
            <div class="iface-grid-card" data-id="${iface.id}">
              <div class="iface-grid-header">
                <div class="iface-grid-name">${iface.name}</div>
                <div class="iface-health ${health.class}">${health.label}</div>
              </div>
              <div class="iface-grid-info">
                <div><strong>Peers:</strong> ${iface.peers.length}</div>
                <div><strong>Port:</strong> ${iface.listenPort}</div>
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
   INTERFACE DETAIL DRAWER (Right Slide Panel)
------------------------------------------------------------ */

function openInterfaceDrawer(interfaceId) {
  const iface = DB.getInterface(interfaceId);
  if (!iface) return;

  const drawer = document.getElementById("interfaceDrawer");
  drawer.innerHTML = ""; // clear previous content
  drawer.classList.remove("hidden");

  const companies = DB.getCompanies();
  const routers = DB.getRouters();
  const cameras = DB.getCameras();
  const peers = DB.getPeers();

  // Split peers into router + engineer
  const peerObjs = iface.peers.map(id => peers.find(p => p.id === id));
  const routerPeers = peerObjs.filter(p => p && p.type === "router");
  const engineerPeers = peerObjs.filter(p => p && p.type === "engineer");

  const health = calculateInterfaceHealth(iface);

  // Mask private key
  const maskedKey = "*".repeat(iface.privateKey.length || 32);

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
        <div><strong>Peers:</strong> ${iface.peers.length}</div>
        <div><strong>Port:</strong> ${iface.listenPort}</div>
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
        <button class="btn-secondary" id="btnTogglePrivKey">Show</button>
      </div>
      <div class="iface-key-row">
        <label>Public Key</label>
        <span class="mono">${iface.publicKey}</span>
      </div>
    </div>

    <div class="iface-drawer-section">
      <div class="iface-sec-title">STATS</div>
      <div class="iface-stats-grid">
        <div><strong>RX:</strong> ${iface.stats.rxBytes} bytes</div>
        <div><strong>TX:</strong> ${iface.stats.txBytes} bytes</div>
        <div><strong>Online Peers:</strong> ${iface.stats.onlinePeers}</div>
        <div><strong>Stale Peers:</strong> ${iface.stats.stalePeers}</div>
        <div><strong>Last Reload:</strong> ${formatDate(iface.stats.lastReload)}</div>
      </div>
    </div>

    <div class="iface-drawer-section">
      <div class="iface-sec-title">ROUTER PEERS</div>
      ${routerPeers.length === 0 ? `<div class="iface-empty">No router peers.</div>` :
        routerPeers.map(p => `
          <div class="iface-peer-card">
            <div><strong>${p.name || p.serial || p.id}</strong></div>
            <div class="mono">${p.vpnIP || "-"}</div>
            <button class="btn-small" onclick="interfaceOpenPeerDrawer('${p.id}')">View</button>
          </div>
        `).join("")
      }
    </div>

    <div class="iface-drawer-section">
      <div class="iface-sec-title">ENGINEER PEERS</div>
      ${engineerPeers.length === 0 ? `<div class="iface-empty">No engineer peers.</div>` :
        engineerPeers.map(p => `
          <div class="iface-peer-card">
            <div><strong>${p.deviceName || p.name || p.id}</strong></div>
            <div class="mono">${p.vpnIP || "-"}</div>
            <button class="btn-small" onclick="interfaceOpenPeerDrawer('${p.id}')">View</button>
          </div>
        `).join("")
      }
    </div>

    <div class="iface-drawer-section">
      <div class="iface-sec-title">ACTIONS</div>
      <div class="iface-action-row">
        <button class="btn-primary" onclick="openInterfaceEditModal('${iface.id}')">Edit Interface</button>
        <button class="btn-secondary" onclick="DB.reloadInterface('${iface.id}')">Reload</button>
        <button class="btn-secondary" onclick="openInterfaceConfigModal('${iface.id}')">Generate Config</button>
        <button class="btn-danger" onclick="openDeleteInterfaceModal('${iface.id}')">Delete</button>
      </div>
    </div>
  `;

  // Toggle private key
  drawer.querySelector("#btnTogglePrivKey").onclick = () => {
    const txt = drawer.querySelector("#ifacePrivKeyTxt");
    if (txt.dataset.state === "shown") {
      txt.textContent = maskedKey;
      txt.dataset.state = "hidden";
      drawer.querySelector("#btnTogglePrivKey").textContent = "Show";
    } else {
      txt.textContent = iface.privateKey;
      txt.dataset.state = "shown";
      drawer.querySelector("#btnTogglePrivKey").textContent = "Hide";
    }
  };
}

function closeInterfaceDrawer() {
  document.getElementById("interfaceDrawer").classList.add("hidden");
}

/* Format date */
function formatDate(d) {
  if (!d) return "-";
  return new Date(d).toLocaleString();
}



/* ------------------------------------------------------------
   ADD NEW INTERFACE MODAL
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
          const port = parseInt(document.getElementById("newIfacePort").value);
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


/* ------------------------------------------------------------
   EDIT INTERFACE MODAL
------------------------------------------------------------ */

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
        <input id="editIfaceDesc" class="form-input" value="${iface.description}">
      </div>

      <div class="form-group">
        <label>DNS Servers (comma separated)</label>
        <input id="editIfaceDNS" class="form-input" value="${iface.dns.join(", ")}">
      </div>

      <div class="form-group">
        <label>MTU</label>
        <input id="editIfaceMTU" class="form-input" type="number" value="${iface.mtu}">
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
          const port = parseInt(document.getElementById("editIfacePort").value);
          const desc = document.getElementById("editIfaceDesc").value.trim();
          const dns = document
            .getElementById("editIfaceDNS")
            .value.split(",")
            .map(s => s.trim());
          const mtu = parseInt(document.getElementById("editIfaceMTU").value);

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


/* ------------------------------------------------------------
   DELETE INTERFACE CONFIRMATION
------------------------------------------------------------ */

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


/* ------------------------------------------------------------
   CONFIG GENERATOR MODAL
------------------------------------------------------------ */

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
  navigateTo("peers"); // Or your peer view page
}
