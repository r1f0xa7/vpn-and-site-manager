console.log("[RENDER] Loaded peers.js");

/* ------------------------------------------------------------
   MAIN PEER MANAGER PAGE
------------------------------------------------------------ */

function renderPeers(root) {
  const peers = DB.getPeers();

  /* -------------------------------
     HEADER + ACTION BAR
  --------------------------------*/
  const header = document.createElement("section");
  header.className = "block peers-header-block";

  header.innerHTML = `
    <div class="peers-header">
      <h1 class="block-title">WIREGUARD PEERS</h1>

      <div class="peers-actions">
        <input id="peerSearchInput" class="search-input" placeholder="Search peers...">

        <select id="peerTypeFilter" class="filter-select">
          <option value="">All Types</option>
          <option value="router">Router</option>
          <option value="engineer">Engineer</option>
        </select>

        <select id="peerStateFilter" class="filter-select">
          <option value="">All States</option>
          <option value="online">Online</option>
          <option value="stale">Stale</option>
          <option value="offline">Offline</option>
        </select>

        <button id="btnAddPeer" class="btn-primary">+ Add Peer</button>
      </div>
    </div>
  `;

  root.appendChild(header);

  // Add Peer (opens modal in Part C)
  header.querySelector("#btnAddPeer").onclick = () => openPeerCreateModal();

  /* -------------------------------
     TABLE CONTAINER
  --------------------------------*/
  const tableSection = document.createElement("section");
  tableSection.className = "block";

  tableSection.innerHTML = `
    <div class="table-wrapper peers-table-wrapper">
      <table class="peers-table">
        <thead>
          <tr>
            <th style="width: 70px;">ID</th>
            <th>Name</th>
            <th style="width:100px;">Type</th>
            <th style="width:110px;">VPN IP</th>
            <th style="width:110px;">Interface</th>
            <th style="width:110px;">Site/User</th>
            <th style="width:120px;">Last Handshake</th>
            <th style="width:90px;">Status</th>
            <th style="width:110px;">Traffic</th>
            <th style="width:100px;">Actions</th>
          </tr>
        </thead>
        <tbody id="peersTableBody"></tbody>
      </table>
    </div>
  `;

  root.appendChild(tableSection);

  /* -------------------------------
     TABLE POPULATION FUNCTION
  --------------------------------*/
  const tbody = tableSection.querySelector("#peersTableBody");

  function paintPeers() {
    const q = document.getElementById("peerSearchInput").value.trim().toLowerCase();
    const fType = document.getElementById("peerTypeFilter").value;
    const fState = document.getElementById("peerStateFilter").value;

    let list = DB.getPeers();

    // Search filter
    if (q) {
      list = list.filter(p =>
        (p.name || "").toLowerCase().includes(q) ||
        (p.id || "").toLowerCase().includes(q) ||
        (p.vpnIP || "").toLowerCase().includes(q)
      );
    }

    // Type filter
    if (fType) list = list.filter(p => p.type === fType);

    // State filter
    if (fState) list = list.filter(p => p.stats.state === fState);

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="10" style="text-align:center;color:var(--text-muted);">No peers found.</td></tr>
      `;
      return;
    }

    tbody.innerHTML = list
      .map(p => {
        const stateBadge = renderPeerStatusBadge(p);
        const lastHS = p.stats.lastHandshake ? new Date(p.stats.lastHandshake).toLocaleString() : "-";
        const iface = DB.getInterface(p.interfaceId);
        const sites = DB.getSites ? DB.getSites() : [];
        const users = DB.getUsers ? DB.getUsers() : [];

        let siteOrUser = "-";
        if (p.type === "router") {
          const s = sites.find(s => s.id === p.siteId);
          siteOrUser = s ? s.name : (p.siteId || "-");
        } else {
          const u = users.find(u => u.id === p.userId);
          siteOrUser = u ? u.name : (p.userId || "-");
        }


        return `
          <tr class="peer-row" data-id="${p.id}">
            <td class="mono">${p.id}</td>
            <td>${p.name}</td>
            <td>${capitalize(p.type)}</td>
            <td class="mono">${p.vpnIP}</td>
            <td>${iface ? iface.name : "-"}</td>
            <td>${siteOrUser}</td>
            <td>${lastHS}</td>
            <td>${stateBadge}</td>
            <td>${p.stats.rxBytes}/${p.stats.txBytes}</td>
            <td>
              <button class="peer-action" data-act="view" data-id="${p.id}">View</button>
              <button class="peer-action" data-act="config" data-id="${p.id}">Config</button>
            </td>
          </tr>
        `;
      })
      .join("");

    // Actions
    tbody.querySelectorAll(".peer-action").forEach(btn => {
      btn.onclick = e => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const act = btn.dataset.act;

        if (act === "view") peerOpenPeerDrawer(id);
        if (act === "config") openPeerConfigModal(id);
      };
    });

    // Clicking row opens drawer
    tbody.querySelectorAll(".peer-row").forEach(row => {
      row.onclick = e => {
        if (e.target.classList.contains("peer-action")) return;
        peerOpenPeerDrawer(row.dataset.id);
      };
    });
  }

  paintPeers();

  /* -------------------------------
     Search & filter events
  --------------------------------*/
  document.getElementById("peerSearchInput").oninput = paintPeers;
  document.getElementById("peerTypeFilter").onchange = paintPeers;
  document.getElementById("peerStateFilter").onchange = paintPeers;
}

/* ------------------------------------------------------------
   STATUS BADGE RENDER
------------------------------------------------------------ */

function renderPeerStatusBadge(peer) {
  const st = peer.stats.state;
  if (st === "online") return `<span class="peer-status status-online">ONLINE</span>`;
  if (st === "stale") return `<span class="peer-status status-stale">STALE</span>`;
  return `<span class="peer-status status-offline">OFFLINE</span>`;
}

/* Capitalize helper */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}


/* ------------------------------------------------------------
   PEER DRAWER (Right panel)
------------------------------------------------------------ */

function peerOpenPeerDrawer(peerId) {
  console.log(peerId);
  const peer = DB.getPeer(peerId);
  console.log("peer="+peer);
  if (!peer) return;

  const drawer = document.getElementById("peerDrawer");
  drawer.classList.remove("hidden");
  drawer.innerHTML = "";

  const interfaces = DB.getInterfaces();
  const routers = DB.getRouters ? DB.getRouters() : [];
  const sites = DB.getSites ? DB.getSites() : [];
  const users = DB.getUsers ? DB.getUsers() : [];

  const iface = interfaces.find(i => i.id === peer.interfaceId);
  const router = routers.find(r => r.id === peer.routerId);
  const site = sites.find(s => s.id === peer.siteId);
  const user = users.find(u => u.id === peer.userId);

  const maskedKey = peer.privateKey ? "*".repeat(Math.min(peer.privateKey.length, 44)) : "—";

  const stateBadge = renderPeerStatusBadge(peer);
  const lastHS = peer.stats.lastHandshake ? new Date(peer.stats.lastHandshake).toLocaleString() : "-";

  // ACL sites (engineer only)
  const aclSiteNames = (peer.aclSites || []).map(id => {
    const s = sites.find(s => s.id === id);
    return s ? s.name : id;
  });

  drawer.innerHTML = `
    <div class="peer-drawer-header">
      <div>
        <div class="peer-drawer-title">${peer.name}</div>
        <div class="peer-drawer-sub mono">${peer.id}</div>
      </div>
      <button class="peer-drawer-close" onclick="closePeerDrawer()">✕</button>
    </div>

    <div class="peer-drawer-section">
      <div class="peer-sec-title">SUMMARY</div>
      <div class="peer-summary-grid">
        <div><strong>Type:</strong> ${capitalize(peer.type)}</div>
        <div><strong>Status:</strong> ${stateBadge}</div>
        <div><strong>VPN IP:</strong> <span class="mono">${peer.vpnIP || "-"}</span></div>
        <div><strong>Interface:</strong> ${iface ? iface.name : "-"}</div>
        <div><strong>Last Handshake:</strong> ${lastHS}</div>
        <div><strong>Created:</strong> ${formatDate(peer.createdAt)}</div>
      </div>
    </div>

    <div class="peer-drawer-section">
      <div class="peer-sec-title">IDENTITY & BINDINGS</div>
      <div class="peer-summary-grid">
        ${
          peer.type === "router"
            ? `
              <div><strong>Router:</strong> ${router ? router.serial || router.name || router.id : "-"}</div>
              <div><strong>Site:</strong> ${site ? site.name : "-"}</div>
            `
            : `
              <div><strong>User:</strong> ${user ? user.name : "-"}</div>
              <div><strong>Device:</strong> ${peer.name}</div>
            `
        }
        <div><strong>Interface ID:</strong> ${peer.interfaceId}</div>
        <div><strong>Allocated At:</strong> ${formatDate(peer.allocatedAt)}</div>
      </div>
    </div>

    <div class="peer-drawer-section">
      <div class="peer-sec-title">KEYS</div>
      <div class="peer-key-row">
        <label>Private Key</label>
        <span class="mono" id="peerPrivKeyTxt">${maskedKey}</span>
        <button class="btn-secondary btn-small" id="btnPeerKeyToggle">Show</button>
        <button class="btn-secondary btn-small" id="btnPeerKeyRotate">Rotate</button>
      </div>
      <div class="peer-key-row">
        <label>Public Key</label>
        <span class="mono">${peer.publicKey || "—"}</span>
      </div>
    </div>

    <div class="peer-drawer-section">
      <div class="peer-sec-title">STATS</div>
      <div class="peer-stats-grid">
        <div><strong>RX:</strong> ${peer.stats.rxBytes} bytes</div>
        <div><strong>TX:</strong> ${peer.stats.txBytes} bytes</div>
        <div><strong>State:</strong> ${peer.stats.state}</div>
      </div>
    </div>

    <div class="peer-drawer-section">
      <div class="peer-sec-title">ROUTING / ALLOWED IPs</div>
      <div class="peer-routing">
        <div><strong>Allowed IPs:</strong></div>
        ${
          (peer.allowedIPs && peer.allowedIPs.length)
            ? `<ul class="peer-allowed-list">
                ${peer.allowedIPs.map(ip => `<li class="mono">${ip}</li>`).join("")}
               </ul>`
            : `<div class="peer-empty">No allowed IPs stored on peer object (server-side enforced).</div>`
        }
      </div>
    </div>

    ${
      peer.type === "engineer"
        ? `
          <div class="peer-drawer-section">
            <div class="peer-sec-title">ACCESS CONTROL (ACL)</div>
            ${
              aclSiteNames.length
                ? `<div class="peer-acl-sites">
                    ${aclSiteNames.map(name => `<span class="peer-acl-badge">${name}</span>`).join("")}
                   </div>`
                : `<div class="peer-empty">No site restrictions configured — server-side rules may still apply.</div>`
            }
            <button class="btn-secondary btn-small" id="btnEditACL">Edit ACL</button>
          </div>
        `
        : ""
    }

    <div class="peer-drawer-section">
      <div class="peer-sec-title">ACTIONS</div>
      <div class="peer-actions-row">
        ${
          peer.type === "engineer"
            ? `<button class="btn-secondary" id="btnPeerQR">Show QR</button>`
            : ""
        }
        <button class="btn-secondary" id="btnPeerConfig">Config</button>
        <button class="btn-danger" id="btnPeerDelete">Delete</button>
      </div>
    </div>
  `;

  // Toggle private key
  const toggleBtn = drawer.querySelector("#btnPeerKeyToggle");
  if (toggleBtn) {
    toggleBtn.onclick = () => {
      const span = drawer.querySelector("#peerPrivKeyTxt");
      if (!span) return;
      if (span.dataset.state === "shown") {
        span.textContent = maskedKey;
        span.dataset.state = "hidden";
        toggleBtn.textContent = "Show";
      } else {
        span.textContent = peer.privateKey || "—";
        span.dataset.state = "shown";
        toggleBtn.textContent = "Hide";
      }
    };
  }

  // Rotate key
  const rotateBtn = drawer.querySelector("#btnPeerKeyRotate");
  if (rotateBtn) {
    rotateBtn.onclick = () => {
      DB.rotatePeerKey(peer.id);
      showToast("Peer key rotated", "success");
      peerOpenPeerDrawer(peer.id); // refresh drawer
    };
  }

  // Edit ACL (engineer only)
  const aclBtn = drawer.querySelector("#btnEditACL");
  if (aclBtn) {
    aclBtn.onclick = () => openPeerACLModal(peer.id);
  }

  // Config modal
  const cfgBtn = drawer.querySelector("#btnPeerConfig");
  if (cfgBtn) {
    cfgBtn.onclick = () => openPeerConfigModal(peer.id);
  }

  // QR modal (engineer)
  const qrBtn = drawer.querySelector("#btnPeerQR");
  if (qrBtn) {
    qrBtn.onclick = () => openPeerQRModal(peer.id);
  }

  // Delete
  const delBtn = drawer.querySelector("#btnPeerDelete");
  if (delBtn) {
    delBtn.onclick = () => openPeerDeleteModal(peer.id);
  }
}

function closePeerDrawer() {
  const drawer = document.getElementById("peerDrawer");
  if (!drawer) return;
  drawer.classList.add("hidden");
}

/* Reuse formatDate from interfaces.js or define here */
function formatDate(d) {
  if (!d) return "-";
  return new Date(d).toLocaleString();
}


/* ------------------------------------------------------------
   PEER CONFIG MODAL
------------------------------------------------------------ */

function openPeerConfigModal(peerId) {
  const peer = DB.getPeer(peerId);
  if (!peer) return;

  const config = DB.generatePeerConfig(peerId);

  Modal.open({
    title: `Peer Config: ${peer.name}`,
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
          showToast("Peer config copied", "success");
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
   PEER ACL MODAL (Engineer peers)
------------------------------------------------------------ */

function openPeerACLModal(peerId) {
  const peer = DB.getPeer(peerId);
  if (!peer || peer.type !== "engineer") return;

  const sites = DB.getSites ? DB.getSites() : [];
  const current = new Set(peer.aclSites || []);

  const checkboxes = sites.map(s => {
    const checked = current.has(s.id) ? "checked" : "";
    return `
      <label class="peer-acl-row">
        <input type="checkbox" class="peerAclSite" data-id="${s.id}" ${checked}>
        <span>${s.name}</span>
      </label>
    `;
  }).join("");

  Modal.open({
    title: `Edit ACL: ${peer.name}`,
    size: "medium",
    content: sites.length
      ? `<div class="peer-acl-list">${checkboxes}</div>`
      : `<div class="peer-empty">No sites available.</div>`,
    actions: [
      {
        label: "Cancel",
        className: "btn-secondary",
        onClick: Modal.close
      },
      {
        label: "Save ACL",
        className: "btn-primary",
        onClick: () => {
          const els = document.querySelectorAll(".peerAclSite");
          const newSet = [];
          els.forEach(el => {
            if (el.checked) newSet.push(el.dataset.id);
          });

          // reset ACL then apply
          peer.aclSites = [];
          newSet.forEach(id => DB.addPeerAllowedSite(peer.id, id));

          Modal.close();
          showToast("ACL updated", "success");
          peerOpenPeerDrawer(peer.id); // refresh
        }
      }
    ]
  });
}


/* ------------------------------------------------------------
   PEER QR MODAL (Engineer peers)
------------------------------------------------------------ */

function openPeerQRModal(peerId) {
  const peer = DB.getPeer(peerId);
  if (!peer || peer.type !== "engineer") return;

  const config = DB.generatePeerConfig(peerId);

  Modal.open({
    title: `QR Config: ${peer.name}`,
    size: "large",
    content: `
      <div class="peer-qr-layout">
        <div class="peer-qr-box">
          <div class="peer-qr-placeholder">
            QR CODE PLACEHOLDER
          </div>
          <div class="peer-qr-note">
            (Later you can plug a real QR generator here.)
          </div>
        </div>
        <pre class="config-preview mono">${config.replace(/</g, "&lt;")}</pre>
      </div>
    `,
    actions: [
      {
        label: "Copy Config",
        className: "btn-secondary",
        onClick: () => {
          navigator.clipboard.writeText(config);
          showToast("Config copied", "success");
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
   ADD PEER (simple version, manual input)
------------------------------------------------------------ */

function openPeerCreateModal() {
  const interfaces = DB.getInterfaces();
  const sites = DB.getSites ? DB.getSites() : [];
  const users = DB.getUsers ? DB.getUsers() : [];

  const ifaceOptions = interfaces.map(i => `<option value="${i.id}">${i.name}</option>`).join("");
  const siteOptions = sites.map(s => `<option value="${s.id}">${s.name}</option>`).join("");
  const userOptions = users.map(u => `<option value="${u.id}">${u.name}</option>`).join("");

  Modal.open({
    title: "Add Peer",
    size: "medium",
    content: `
      <div class="form-group">
        <label>Type</label>
        <select id="peerTypeSel" class="form-input">
          <option value="router">Router</option>
          <option value="engineer">Engineer</option>
        </select>
      </div>

      <div class="form-group">
        <label>Name / Device</label>
        <input id="peerName" class="form-input" placeholder="RUTX11-0001 or Eng-Laptop-01">
      </div>

      <div class="form-group">
        <label>Interface</label>
        <select id="peerInterface" class="form-input">
          ${ifaceOptions}
        </select>
      </div>

      <div class="form-group">
        <label>VPN IP (/32)</label>
        <input id="peerVPNIP" class="form-input" placeholder="10.128.0.10/32">
      </div>

      <div class="form-group" id="peerRouterGroup">
        <label>Router Site</label>
        <select id="peerSiteSel" class="form-input">
          <option value="">(none)</option>
          ${siteOptions}
        </select>
      </div>

      <div class="form-group" id="peerUserGroup" style="display:none;">
        <label>User</label>
        <select id="peerUserSel" class="form-input">
          <option value="">(none)</option>
          ${userOptions}
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
        label: "Create Peer",
        className: "btn-primary",
        onClick: () => {
          const type = document.getElementById("peerTypeSel").value;
          const name = document.getElementById("peerName").value.trim();
          const interfaceId = document.getElementById("peerInterface").value;
          const vpnIP = document.getElementById("peerVPNIP").value.trim();
          const siteId = document.getElementById("peerSiteSel").value || null;
          const userId = document.getElementById("peerUserSel").value || null;

          if (!name || !interfaceId || !vpnIP) {
            showToast("Name, Interface, and VPN IP are required", "error");
            return;
          }

          DB.addPeer({
            type,
            name,
            interfaceId,
            vpnIP,
            siteId: type === "router" ? siteId : null,
            userId: type === "engineer" ? userId : null,
            allowedIPs: [],
            aclSites: []
          });

          Modal.close();
          navigateTo("peers");
        }
      }
    ]
  });

  // toggle router/user fields
  const typeSel = document.getElementById("peerTypeSel");
  typeSel.onchange = () => {
    const val = typeSel.value;
    document.getElementById("peerRouterGroup").style.display = val === "router" ? "block" : "none";
    document.getElementById("peerUserGroup").style.display = val === "engineer" ? "block" : "none";
  };
}

/* ------------------------------------------------------------
   DELETE PEER CONFIRM
------------------------------------------------------------ */

function openPeerDeleteModal(peerId) {
  const peer = DB.getPeer(peerId);
  if (!peer) return;

  Modal.open({
    title: "Delete Peer",
    size: "small",
    content: `
      <p>Are you sure you want to delete peer <strong>${peer.name}</strong>?</p>
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
          DB.deletePeer(peerId);
          Modal.close();
          closePeerDrawer();
          navigateTo("peers");
        }
      }
    ]
  });
}
