console.log("[RENDER] Loaded dashboard.js");

function renderDashboard(root) {
  const interfaces = DB.getInterfaces ? DB.getInterfaces() : [];
  const peers = DB.getPeers ? DB.getPeers() : [];
  const routers = DB.getRouters ? DB.getRouters() : [];
  const sites = DB.getSites ? DB.getSites() : [];
  const logs = DB.getLogs ? DB.getLogs() : [];
  const ipAllocs = DB.getIPAllocations ? DB.getIPAllocations() : [];

  const users = DB.getUsers ? DB.getUsers() : [];

  const onlinePeers = peers.filter(p => p.stats?.state === "online");
  const stalePeers = peers.filter(p => p.stats?.state === "stale");
  const offlinePeers = peers.filter(p => p.stats?.state === "offline");

  const routerPeers = peers.filter(p => p.type === "router");
  const engineerPeers = peers.filter(p => p.type === "engineer");
  const onlineRouters = routers.filter(r => r.stats?.online);

  root.innerHTML = "";

  /* --------------------------------------------------------
     TOP SUMMARY STRIP (KPIs)
  -------------------------------------------------------- */

  const top = document.createElement("section");
  top.className = "block dash-top";

  top.innerHTML = `
    <div class="dash-kpi-grid">
      <button class="dash-kpi" data-nav="interfaces">
        <div class="dash-kpi-label">Interfaces</div>
        <div class="dash-kpi-value">${interfaces.length}</div>
        <div class="dash-kpi-meta">WireGuard endpoints</div>
      </button>

      <button class="dash-kpi" data-nav="peers">
        <div class="dash-kpi-label">Peers</div>
        <div class="dash-kpi-value">${peers.length}</div>
        <div class="dash-kpi-meta">${routerPeers.length} router • ${engineerPeers.length} engineer</div>
      </button>

      <button class="dash-kpi" data-nav="routers">
        <div class="dash-kpi-label">Routers Online</div>
        <div class="dash-kpi-value">${onlineRouters.length}</div>
        <div class="dash-kpi-meta">${routers.length} total</div>
      </button>

      <button class="dash-kpi" data-nav="sites">
        <div class="dash-kpi-label">Sites</div>
        <div class="dash-kpi-value">${sites.length}</div>
        <div class="dash-kpi-meta">With permanent NAT ranges</div>
      </button>
    </div>
  `;
  root.appendChild(top);

  // KPI click → navigate
  top.querySelectorAll("[data-nav]").forEach(btn => {
    btn.onclick = () => navigateTo(btn.dataset.nav);
  });

  /* --------------------------------------------------------
     MAIN GRID: LEFT (VPN/IPAM) + RIGHT (TUNNELS/LOGS)
  -------------------------------------------------------- */

  const mainGrid = document.createElement("section");
  mainGrid.className = "dash-main-grid";

  mainGrid.innerHTML = `
    <!-- LEFT COLUMN -->
    <div class="dash-col dash-col-left">

      <!-- VPN HEALTH -->
      <div class="block dash-section-card">
        <div class="dash-section-header">
          <div>
            <h2 class="dash-section-title">VPN HEALTH</h2>
            <div class="dash-section-sub">Interfaces & tunnels</div>
          </div>
          <button class="btn-secondary btn-small" onclick="navigateTo('peers')">View peers</button>
        </div>

        <div class="dash-health-grid">
          <div class="dash-health-card">
            <div class="dash-health-label">Online Peers</div>
            <div class="dash-health-value dash-health-value-green">${onlinePeers.length}</div>
            <div class="dash-health-meta">
              ${stalePeers.length} stale • ${offlinePeers.length} offline
            </div>
          </div>

          <div class="dash-health-card">
            <div class="dash-health-label">Interfaces</div>
            <div class="dash-health-value">${interfaces.length}</div>
            <div class="dash-health-meta">
              ${countGoodInterfaces(interfaces, peers)} healthy
            </div>
          </div>

          <div class="dash-health-card">
            <div class="dash-health-label">Router Tunnels</div>
            <div class="dash-health-value">${routerPeers.length}</div>
            <div class="dash-health-meta">
              ${onlineRouters.length} routers online
            </div>
          </div>
        </div>

        <!-- INTERFACES MINI-LIST -->
        <div class="dash-subsection">
          <div class="dash-subsection-header">
            <span class="dash-subsection-title">Interfaces</span>
            <button class="btn-secondary btn-small" onclick="navigateTo('interfaces')">View all</button>
          </div>

          <div class="dash-interfaces-list">
            ${
              interfaces.length
                ? interfaces
                    .slice(0, 6)
                    .map(iface => {
                      const peersOnIface = peers.filter(p => p.interfaceId === iface.id);
                      const onlineOnIface = peersOnIface.filter(p => p.stats?.state === "online").length;
                      const health = calculateInterfaceHealth(iface);
                      return `
                        <div class="dash-iface-row">
                          <div class="dash-iface-name mono">${iface.name}</div>
                          <div class="dash-iface-peers">${onlineOnIface}/${peersOnIface.length} peers</div>
                          <div class="dash-iface-port">Port ${iface.listenPort || "-"}</div>
                          <div class="dash-iface-health ${health.class}">${health.label}</div>
                        </div>
                      `;
                    }).join("")
                : `<div class="dash-empty">No interfaces defined yet.</div>`
            }
          </div>
        </div>
      </div>

      <!-- IPAM STATUS -->
      <div class="block dash-section-card">
        <div class="dash-section-header">
          <div>
            <h2 class="dash-section-title">IPAM STATUS</h2>
            <div class="dash-section-sub">Permanent pools & allocations</div>
          </div>
          <button class="btn-secondary btn-small" onclick="navigateTo('ipam')">Open IPAM</button>
        </div>

        <div class="dash-ipam-grid">
          ${renderIPAMSummaryCards(ipAllocs)}
        </div>
      </div>

    </div>

    <!-- RIGHT COLUMN -->
    <div class="dash-col dash-col-right">

      <!-- ACTIVE TUNNELS -->
      <div class="block dash-section-card">
        <div class="dash-section-header">
          <div>
            <h2 class="dash-section-title">ACTIVE TUNNELS</h2>
            <div class="dash-section-sub">Online peers (last handshake)</div>
          </div>
          <button class="btn-secondary btn-small" onclick="navigateTo('peers')">View peers</button>
        </div>

        <div class="dash-table-wrapper">
          <table class="dash-table">
            <thead>
              <tr>
                <th>Peer</th>
                <th>Type</th>
                <th>VPN IP</th>
                <th>Interface</th>
                <th>Bind</th>
              </tr>
            </thead>
            <tbody>
              ${
                onlinePeers.length
                  ? onlinePeers.slice(0, 10).map(p => {
                      const iface = interfaces.find(i => i.id === p.interfaceId);
                      const siteName = p.type === "router"
                        ? (getSiteName(p.siteId, sites) || "-")
                        : (getUserName(p.userId, users) || "-");
                      return `
                        <tr>
                          <td>${p.name || p.id}</td>
                          <td>${capitalize(p.type)}</td>
                          <td class="mono">${p.vpnIP || "-"}</td>
                          <td>${iface ? iface.name : "-"}</td>
                          <td>${siteName}</td>
                        </tr>
                      `;
                    }).join("")
                  : `<tr><td colspan="5" class="dash-empty">No online peers.</td></tr>`
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- RECENT EVENTS -->
      <div class="block dash-section-card">
        <div class="dash-section-header">
          <div>
            <h2 class="dash-section-title">RECENT EVENTS</h2>
            <div class="dash-section-sub">From audit log</div>
          </div>
          <button class="btn-secondary btn-small" onclick="navigateTo('logs')">Open Logs</button>
        </div>

        <div class="dash-log-list">
          ${
            logs.length
              ? logs
                  .slice(0, 10)
                  .map(l => {
                    const sevClass =
                      l.severity === "error"
                        ? "dash-log-sev-error"
                        : l.severity === "warn"
                        ? "dash-log-sev-warn"
                        : "dash-log-sev-info";

                    return `
                      <div class="dash-log-row">
                        <div class="dash-log-main">
                          <span class="dash-log-sev ${sevClass}">${l.severity || "info"}</span>
                          <span class="dash-log-cat">${l.category || "system"}</span>
                          <span class="dash-log-msg">${escapeHtml(l.message || "")}</span>
                        </div>
                        <div class="dash-log-meta">
                          <span class="mono">${formatDate(l.ts)}</span>
                        </div>
                      </div>
                    `;
                  })
                  .join("")
              : `<div class="dash-empty">No events yet.</div>`
          }
        </div>
      </div>

    </div>
  `;

  root.appendChild(mainGrid);
}

/* ------------------------------------------------------------
   HELPERS
------------------------------------------------------------ */

function renderIPAMSummaryCards(ipAllocs) {
  if (!state.ipPools) return "";

  const pools = state.ipPools;

  function count(poolKey) {
    return ipAllocs.filter(a => a.pool === poolKey).length;
  }

  return Object.entries(pools)
    .map(([key, pool]) => {
      const used = count(key);
      return `
        <div class="dash-ipam-card">
          <div class="dash-ipam-title">${pool.name}</div>
          <div class="dash-ipam-used">${used} allocations</div>
          <div class="dash-ipam-meta mono">
            ${pool.cidrs.join(" , ")}
          </div>
        </div>
      `;
    })
    .join("");
}

function countGoodInterfaces(interfaces, peers) {
  if (!interfaces || !interfaces.length) return 0;
  return interfaces.filter(iface => {
    const h = calculateInterfaceHealth(iface);
    return h && h.class === "health-good";
  }).length;
}

function getSiteName(siteId, sites) {
  if (!siteId || !sites || !sites.length) return null;
  const s = sites.find(s => s.id === siteId);
  return s ? s.name : null;
}

function getUserName(userId, users) {
  if (!userId || !users || !users.length) return null;
  const u = users.find(u => u.id === userId);
  return u ? u.name : null;
}

function escapeHtml(str) {
  return (str || "")
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
