/* -----------------------------------------------------------
   ENTERPRISE DASHBOARD (Home)
   - Clean NOC-style overview
----------------------------------------------------------- */

console.log("[RENDER] Loaded enterprise dashboard.js");

function renderDashboard(root) {
  const companies   = DB.getCompanies();
  const sites       = DB.getSites();
  const routers     = DB.getRouters();
  const cameras     = DB.getCameras();
  const peers       = DB.getPeers();
  const profiles    = state.engineer_vpn_profiles;
  const pools       = DB.getPools();
  const allocations = DB.getAllocations();

  const routerPeers = peers.filter(p => p.type === "router");
  const engPeers    = peers.filter(p => p.type === "engineer");

  const activeSites   = sites.filter(s => s.status === "active");
  const inactiveSites = sites.filter(s => s.status !== "active");

  const assignedSiteIds = state.site_router_assignments
    .filter(a => a.active)
    .map(a => a.siteId);

  const sitesWithRouter = activeSites.filter(s => assignedSiteIds.includes(s.id));
  const sitesWithoutRouter = activeSites.filter(s => !assignedSiteIds.includes(s.id));

  const sitesWithCameras = activeSites.filter(s =>
    cameras.some(c => c.siteId === s.id)
  );
  const sitesWithoutCameras = activeSites.filter(s =>
    !cameras.some(c => c.siteId === s.id)
  );

  const pct = (part, total) =>
    total === 0 ? 0 : Math.round((part / total) * 100);

  const routerCoverage = pct(sitesWithRouter.length, activeSites.length);
  const cameraCoverage = pct(sitesWithCameras.length, activeSites.length);

  /* ---------- IP pool usage ---------- */

  const poolUsage = pools.map(p => {
    const usedAllocs = allocations.filter(a => a.poolId === p.id).length;

    let capacity = 0;
    if (p.type === "router" || p.type === "engineer") {
      capacity = p.cidr
        .map(c => {
          const r = cidrToRange(c);
          return r.end - r.start + 1;
        })
        .reduce((a, b) => a + b, 0);
    } else if (p.type === "camera") {
      capacity = p.cidr
        .map(c => {
          const [ip, prefixStr] = c.split("/");
          const prefix = parseInt(prefixStr, 10);
          const totalAddrs = Math.pow(2, 32 - prefix);
          return totalAddrs / 256; // /24 blocks
        })
        .reduce((a, b) => a + b, 0);
    } else {
      capacity = usedAllocs + 1;
    }

    const usagePct =
      capacity === 0 ? 0 : Math.min(100, Math.round((usedAllocs / capacity) * 100));

    return { pool: p, usedAllocs, capacity, usagePct };
  });

  const poolsOver80 = poolUsage.filter(p => p.usagePct >= 80);
  const poolsOver90 = poolUsage.filter(p => p.usagePct >= 90);

  /* ---------- basic health flags (placeholder) ---------- */

  const offlineRouters = routers.filter(r => r.status === "offline");
  const now = Date.now();
  const stalePeers = peers.filter(p => {
    if (!p.lastHandshakeAt) return false;
    const ageMs = now - new Date(p.lastHandshakeAt).getTime();
    const days = ageMs / (1000 * 60 * 60 * 24);
    return days > 30;
  });

  let systemStatus = "ok";
  if (offlineRouters.length > 0 || poolsOver90.length > 0) {
    systemStatus = "critical";
  } else if (
    sitesWithoutRouter.length > 0 ||
    poolsOver80.length > 0 ||
    stalePeers.length > 0
  ) {
    systemStatus = "warning";
  }

  /* =======================================================
     0. GLOBAL STATUS BAR
  ======================================================= */

  const bar = document.createElement("div");
  bar.className = "dash-status-bar";

  const statusPill = document.createElement("span");
  statusPill.className = "dash-status-pill";

  if (systemStatus === "ok") {
    statusPill.classList.add("dash-status-ok");
    statusPill.textContent = "● System OK";
  } else if (systemStatus === "warning") {
    statusPill.classList.add("dash-status-warn");
    statusPill.textContent = "● System Degraded";
  } else {
    statusPill.classList.add("dash-status-critical");
    statusPill.textContent = "● System Critical";
  }

  bar.appendChild(statusPill);

  const barItems = [
    `Routers Online: ${routers.length - offlineRouters.length}/${routers.length}`,
    `Sites Active: ${activeSites.length}/${sites.length}`,
    `Cameras: ${cameras.length}`,
    `VPN Peers: ${peers.length}`,
  ];

  barItems.forEach(text => {
    const span = document.createElement("span");
    span.className = "dash-status-item";
    span.textContent = text;
    bar.appendChild(span);
  });

  root.appendChild(bar);

  /* =======================================================
     1. OVERVIEW KPIs
  ======================================================= */

  const block1 = document.createElement("section");
  block1.className = "block";

  const kpiGrid = document.createElement("div");
  kpiGrid.className = "dash-kpi-grid";

  const makeKpi = (label, value, subtitle) => {
    const card = document.createElement("div");
    card.className = "dash-kpi-card";
    card.innerHTML = `
      <div class="dash-kpi-label">${label}</div>
      <div class="dash-kpi-value">${value}</div>
      <div class="dash-kpi-sub">${subtitle || ""}</div>
    `;
    return card;
  };

  kpiGrid.appendChild(
    makeKpi("Sites", sites.length, `${activeSites.length} active, ${inactiveSites.length} inactive`)
  );
  kpiGrid.appendChild(
    makeKpi("Routers", routers.length, `${routers.length - offlineRouters.length} online`)
  );
  kpiGrid.appendChild(
    makeKpi("Cameras", cameras.length, "Total across all sites")
  );
  kpiGrid.appendChild(
    makeKpi("VPN Peers", peers.length, `${routerPeers.length} router, ${engPeers.length} engineer`)
  );

  block1.appendChild(kpiGrid);
  root.appendChild(block1);

  /* =======================================================
     2. MAIN SPLIT: SITE CARDS (LEFT) + HEALTH (RIGHT)
  ======================================================= */

  const block2 = document.createElement("section");
  block2.className = "block";

  const mainSplit = document.createElement("div");
  mainSplit.className = "dash-main-split";

  /* ---- LEFT: Site operational cards ---- */

  const leftCol = document.createElement("div");
  leftCol.className = "dash-main-left";

  const leftHeader = document.createElement("div");
  leftHeader.className = "dash-panel-header-line";
  leftHeader.innerHTML = `<span>SITE OPERATIONAL OVERVIEW</span>`;
  leftCol.appendChild(leftHeader);

  const siteList = document.createElement("div");
  siteList.className = "dash-site-list";

  const sitesSorted = [...sites].sort((a, b) =>
    (a.name || "").localeCompare(b.name || "")
  );

  if (sitesSorted.length === 0) {
    const empty = document.createElement("div");
    empty.className = "dash-empty";
    empty.textContent = "No sites have been created yet.";
    siteList.appendChild(empty);
  } else {
    sitesSorted.forEach(site => {
      const comp = companies.find(c => c.id === site.companyId);
      const cams = cameras.filter(c => c.siteId === site.id);
      const assignment = state.site_router_assignments.find(
        a => a.siteId === site.id && a.active
      );
      const router = assignment
        ? routers.find(r => r.id === assignment.routerDeviceId)
        : null;

      const routerOk = !!router && router.status !== "offline";
      const cameraCount = cams.length;

      // simple "health %" based on having router + cameras + active
      let healthScore = 0;
      if (site.status === "active") healthScore += 40;
      if (routerOk) healthScore += 30;
      if (cameraCount > 0) healthScore += 30;

      const healthClass =
        healthScore >= 80 ? "good" :
        healthScore >= 50 ? "warn" :
        "bad";

      const card = document.createElement("div");
      card.className = "dash-site-card";

      card.innerHTML = `
        <div class="dash-site-header">
          <div>
            <div class="dash-site-name">${site.name}</div>
            <div class="dash-site-sub">
              ${comp ? comp.name : "Unassigned company"}
              ${site.code ? ` • ${site.code}` : ""}
            </div>
          </div>
          <div class="dash-site-status">
            <span class="dash-badge dash-badge-${site.status === "active" ? "green" : "grey"}">
              ${site.status || "unknown"}
            </span>
          </div>
        </div>

        <div class="dash-site-body">
          <div class="dash-site-row">
            <span class="dash-site-label">Router</span>
            <span class="dash-site-value">
              ${
                router
                  ? `<span class="mono">${router.serial}</span>
                     <span class="dash-badge dash-badge-${routerOk ? "green" : "red"}">
                       ${routerOk ? "online" : "offline"}
                     </span>`
                  : `<span class="dash-badge dash-badge-red">none assigned</span>`
              }
            </span>
          </div>
          <div class="dash-site-row">
            <span class="dash-site-label">Cameras</span>
            <span class="dash-site-value">
              ${cameraCount}
            </span>
          </div>
          <div class="dash-site-row">
            <span class="dash-site-label">NAT Subnet</span>
            <span class="dash-site-value mono">
              ${site.natSubnet || "—"}
            </span>
          </div>
        </div>

        <div class="dash-site-footer">
          <div class="dash-health">
            <div class="dash-health-bar">
              <div class="dash-health-inner dash-health-${healthClass}"
                   style="width:${healthScore}%;"></div>
            </div>
            <span class="dash-health-text">${healthScore}% health</span>
          </div>
        </div>
      `;

      card.addEventListener("click", () => navigateTo("sites"));

      siteList.appendChild(card);
    });
  }

  leftCol.appendChild(siteList);
  mainSplit.appendChild(leftCol);

  /* ---- RIGHT: Router / VPN / IPAM health ---- */

  const rightCol = document.createElement("div");
  rightCol.className = "dash-main-right";

  const healthPanel = document.createElement("div");
  healthPanel.className = "dash-panel";

  healthPanel.innerHTML = `
    <div class="dash-panel-title">ROUTER & VPN HEALTH</div>
    <div class="dash-panel-body">
      <div class="dash-metric-row">
        <div>
          <div class="dash-metric-label">Routers</div>
          <div class="dash-metric-main">${routers.length}</div>
          <div class="dash-metric-sub">
            ${routers.length - offlineRouters.length} online,
            ${offlineRouters.length} offline
          </div>
        </div>
        <div>
          <div class="dash-metric-label">VPN Peers</div>
          <div class="dash-metric-main">${peers.length}</div>
          <div class="dash-metric-sub">
            ${routerPeers.length} router • ${engPeers.length} engineer
          </div>
        </div>
      </div>

      <div class="dash-panel-sep"></div>

      <div class="dash-metric-label">IPAM Capacity</div>
      <div class="dash-ipam-list">
        ${poolUsage.map(pu => `
          <div class="dash-ipam-row">
            <div class="dash-ipam-head">
              <span>${pu.pool.name}</span>
              <span class="dash-ipam-meta">
                ${pu.usedAllocs}/${pu.capacity || "?"} allocations
              </span>
            </div>
            <div class="dash-progress">
              <div class="dash-progress-inner ${
                pu.usagePct >= 90
                  ? "dash-progress-danger"
                  : pu.usagePct >= 80
                    ? "dash-progress-warn"
                    : ""
              }" style="width:${pu.usagePct}%;"></div>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;

  rightCol.appendChild(healthPanel);
  mainSplit.appendChild(rightCol);

  block2.appendChild(mainSplit);
  root.appendChild(block2);

  /* =======================================================
     3. ATTENTION CENTER
  ======================================================= */

  const block3 = document.createElement("section");
  block3.className = "block";

  const attGrid = document.createElement("div");
  attGrid.className = "dash-attention-grid";

  const makeAtt = (label, count, severity, onClickView) => {
    const card = document.createElement("div");
    card.className = "dash-att-card dash-att-" + severity;
    card.innerHTML = `
      <div class="dash-att-label">${label}</div>
      <div class="dash-att-count">${count}</div>
    `;
    if (onClickView) {
      card.addEventListener("click", () => navigateTo(onClickView));
    }
    return card;
  };

  attGrid.appendChild(
    makeAtt("Sites without router", sitesWithoutRouter.length,
      sitesWithoutRouter.length ? "warn" : "ok", "sites")
  );
  attGrid.appendChild(
    makeAtt("Sites without cameras", sitesWithoutCameras.length,
      sitesWithoutCameras.length ? "warn" : "ok", "cameras")
  );
  attGrid.appendChild(
    makeAtt("Routers offline", offlineRouters.length,
      offlineRouters.length ? "crit" : "ok", "routers")
  );
  attGrid.appendChild(
    makeAtt("IP pools ≥ 80%", poolsOver80.length,
      poolsOver80.length ? "warn" : "ok", "ipam")
  );
  attGrid.appendChild(
    makeAtt("Stale peers (>30d)", stalePeers.length,
      stalePeers.length ? "warn" : "ok", "peers")
  );

  block3.appendChild(attGrid);
  root.appendChild(block3);

  /* =======================================================
     4. RECENT ACTIVITY (router assignments as timeline)
  ======================================================= */

  const block4 = document.createElement("section");
  block4.className = "block";

  const actTitle = document.createElement("div");
  actTitle.className = "dash-panel-header-line";
  actTitle.textContent = "RECENT ROUTER ASSIGNMENTS";
  block4.appendChild(actTitle);

  const timeline = document.createElement("div");
  timeline.className = "dash-timeline";

  const assignmentsSorted = [...state.site_router_assignments]
    .sort((a, b) => (b.assignedAt || "").localeCompare(a.assignedAt || ""));

  if (assignmentsSorted.length === 0) {
    const empty = document.createElement("div");
    empty.className = "dash-empty";
    empty.textContent = "No assignments recorded yet.";
    timeline.appendChild(empty);
  } else {
    assignmentsSorted.slice(0, 10).forEach(a => {
      const site   = sites.find(s => s.id === a.siteId);
      const router = routers.find(r => r.id === a.routerDeviceId);
      const when   = a.assignedAt
        ? new Date(a.assignedAt).toLocaleString()
        : "(unknown time)";

      const row = document.createElement("div");
      row.className = "dash-timeline-row";
      row.innerHTML = `
        <div class="dash-timeline-main">
          <span class="dash-timeline-router">${router ? router.serial : a.routerDeviceId}</span>
          <span class="dash-timeline-arrow">→</span>
          <span class="dash-timeline-site">${site ? site.name : a.siteId}</span>
        </div>
        <div class="dash-timeline-meta">${when}</div>
      `;
      timeline.appendChild(row);
    });
  }

  block4.appendChild(timeline);
  root.appendChild(block4);

  /* =======================================================
     5. QUICK ACTIONS
  ======================================================= */

  const block5 = document.createElement("section");
  block5.className = "block";

  const qaGrid = document.createElement("div");
  qaGrid.className = "dash-qa-grid";

  const makeQa = (label, desc, view) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "dash-qa-tile";
    btn.innerHTML = `
      <div class="dash-qa-title">${label}</div>
      <div class="dash-qa-desc">${desc}</div>
    `;
    btn.addEventListener("click", () => navigateTo(view));
    return btn;
  };

  qaGrid.appendChild(makeQa(
    "New Site",
    "Create a new CCTV site and allocate IP space.",
    "sites"
  ));
  qaGrid.appendChild(makeQa(
    "Register Router",
    "Onboard a Teltonika router into the VPN.",
    "routers"
  ));
  qaGrid.appendChild(makeQa(
    "Add Cameras",
    "Attach cameras to an existing site.",
    "cameras"
  ));
  qaGrid.appendChild(makeQa(
    "New VPN Profile",
    "Create an engineer VPN profile.",
    "profiles"
  ));
  qaGrid.appendChild(makeQa(
    "Manage Users & Roles",
    "Control who can access what.",
    "users"
  ));
  qaGrid.appendChild(makeQa(
    "Open IPAM",
    "Review pools, allocations and reserved ranges.",
    "ipam"
  ));

  block5.appendChild(qaGrid);
  root.appendChild(block5);
}
