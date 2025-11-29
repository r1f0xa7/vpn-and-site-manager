console.log("[RENDER] Loaded dashboard.js");

function renderDashboard(root) {
  const interfaces = DB.getInterfaces ? DB.getInterfaces() : [];
  const peers = DB.getPeers ? DB.getPeers() : [];
  const routers = DB.getRouters ? DB.getRouters() : [];
  const sites = DB.getSites ? DB.getSites() : [];
  const logs = DB.getLogs ? DB.getLogs() : [];
  const ipAllocs = DB.getIPAllocations ? DB.getIPAllocations() : [];

  const onlinePeers = peers.filter(p => p.stats.state === "online");
  const stalePeers = peers.filter(p => p.stats.state === "stale");
  const offlinePeers = peers.filter(p => p.stats.state === "offline");
  const routerPeers = peers.filter(p => p.type === "router");
  const engineerPeers = peers.filter(p => p.type === "engineer");
  const onlineRouters = routers.filter(r => r.stats.online);

  root.innerHTML = "";

  /* --------------------------------------------------------
     TOP SUMMARY STRIP
  -------------------------------------------------------- */
  const top = document.createElement("section");
  top.className = "block dash-top";

  top.innerHTML = `
    <div class="dash-kpi-grid">
      <div class="dash-kpi">
        <div class="dash-kpi-label">Interfaces</div>
        <div class="dash-kpi-value">${interfaces.length}</div>
        <div class="dash-kpi-meta">WireGuard</div>
      </div>
      <div class="dash-kpi">
        <div class="dash-kpi-label">Peers</div>
        <div class="dash-kpi-value">${peers.length}</div>
        <div class="dash-kpi-meta">${routerPeers.length} router • ${engineerPeers.length} engineer</div>
      </div>
      <div class="dash-kpi">
        <div class="dash-kpi-label">Routers Online</div>
        <div class="dash-kpi-value">${onlineRouters.length}</div>
        <div class="dash-kpi-meta">${routers.length} total</div>
      </div>
      <div class="dash-kpi">
        <div class="dash-kpi-label">Sites</div>
        <div class="dash-kpi-value">${sites.length}</div>
        <div class="dash-kpi-meta">With permanent NAT ranges</div>
      </div>
    </div>
  `;
  root.appendChild(top);

  /* --------------------------------------------------------
     MAIN GRID: LEFT (VPN HEALTH) + RIGHT (EVENTS)
  -------------------------------------------------------- */
  const mainGrid = document.createElement("section");
  mainGrid.className = "dash-main-grid";

  mainGrid.innerHTML = `
    <div class="block dash-col">

      <div class="dash-section">
        <div class="dash-section-header">
          <h2 class="dash-section-title">VPN HEALTH</h2>
          <div class="dash-section-sub">Interfaces & tunnels</div>
        </div>

        <div class="dash-health-grid">
          <div class="dash-health-card">
            <div class="dash-health-label">Online Peers</div>
            <div class="dash-health-value green">${onlinePeers.length}</div>
            <div class="dash-health-meta">${stalePeers.length} stale • ${offlinePeers.length} offline</div>
          </div>
          <div class="dash-health-card">
            <div class="dash-health-label">Interfaces</div>
            <div class="dash-health-value">${interfaces.length}</div>
            <div class="dash-health-meta">${countGoodInterfaces(interfaces, peers)} healthy</div>
          </div>
          <div class="dash-health-card">
            <div class="dash-health-label">Router Tunnels</div>
            <div class="dash-health-value">${routerPeers.length}</div>
            <div class="dash-health-meta">${onlineRouters.length} routers online</div>
          </div>
        </div>

        <div class="dash-subsection">
          <div class="dash-subsection-header">
            <span class="dash-subsection-title">Interfaces</span>
            <button class="btn-secondary btn-small" onclick="navigateTo('interfaces')">View all</button>
          </div>
          <div class="dash-interfaces-list">
            ${
              interfaces.length
                ? interfaces.map(iface => {
                    const peersOnIface = peers.filter(p => p.interfaceId === iface.id);
                    const onlineOnIface = peersOnIface.filter(p => p.stats.state === "online").length;
                    const health = calculateInterfaceHealth(iface);
                    return `
                      <div class="dash-iface-row">
                        <div class="dash-iface-name mono">${iface.name}</div>
                        <div class="dash-iface-peers">${onlineOnIface}/${peersOnIface.length} peers</div>
                        <div class="dash-iface-port">Port ${iface.listenPort}</div>
                        <div class="dash-iface-health ${health.class}">${health.label}</div>
                      </div>
                    `;
                  }).join("")
                : `<div class="dash-empty">No interfaces defined yet.</div>`
            }
          </div>
        </div>
      </div>

      <div class="block dash-col">
        <div class="dash-section">
          <div class="dash-section-header">
            <h2 class="dash-section-title">IPAM STATUS</h2>
            <div class="dash-section-sub">Allocated ranges</div>
          </div>

          <div class="dash-ipam-grid">
            ${renderIPAMSummaryCards(ipAllocs)}
          </div>

          <div class="dash-ipam-link">
            <button class="btn-secondary btn-small" onclick="navigateTo('ipam')">Open IPAM</button>
          </div>
        </div>
      </div>

    </div>

    <div class="block dash-col dash-col-right">
      <div class="dash-section">
        <div class="dash-section-header">
          <h2 class="dash-section-title">ACTIVE TUNNELS</h2>
          <div class="dash-section-sub">Online peers</div>
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
                  ? onlinePeers.slice(0, 8).map(p => {
                      const iface = interfaces.find(i => i.id === p.interfaceId);
                      const siteName = p.type === "router"
                        ? (getSiteName(p.siteId) || "-")
                        : (getUserName(p.userId) || "-");
                      return `
                        <tr>
                          <td>${p.name}</td>
                          <td>${capitalize(p.type)}</td>
                          <td class="mono">${p.vpnIP}</td>
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

      <div class="dash-section">
        <div class="dash-section-header">
          <h2 class="dash-section-title">RECENT EVENTS</h2>
          <div class="dash-section-sub">From audit log</div>
        </div>

        <div class="dash-log-list">
          ${
            logs.length
              ? logs.slice(0, 8).map(l => `
                  <div class="dash-log-row">
                    <div class="dash-log-main">
                      <span class="dash-log-cat">${l.category || "system"}</span>
                      <span class="dash-log-msg">${l.message || ""}</span>
                    </div>
                    <div class="dash-log-meta">
                      <span class="mono">${formatDate(l.ts)}</span>
                    </div>
                  </div>
                `).join("")
              : `<div class="dash-empty">No events yet.</div>`
          }
        </div>

        <div class="dash-log-link">
          <button class="btn-secondary btn-small" onclick="navigateTo('logs')">Open Logs</button>
        </div>
      </div>

    </div>
  `;

  root.appendChild(mainGrid);

  /* ---------- helpers to resolve names from ids ---------- */

  function getSiteName(siteId) {
    if (!siteId || !sites.length) return null;
    const s = sites.find(s => s.id === siteId);
    return s ? s.name : null;
  }

  function getUserName(userId) {
    if (!userId || !DB.getUsers) return null;
    const users = DB.getUsers();
    const u = users.find(u => u.id === userId);
    return u ? u.name : null;
  }
}

/* ------------------------------------------------------------
   IPAM SUMMARY CARDS FOR DASHBOARD
------------------------------------------------------------ */

function renderIPAMSummaryCards(ipAllocs) {
  if (!state.ipPools) return "";

  const pools = state.ipPools;

  function count(poolKey) {
    return ipAllocs.filter(a => a.pool === poolKey).length;
  }

  return Object.entries(pools).map(([key, pool]) => {
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
  }).join("");
}
