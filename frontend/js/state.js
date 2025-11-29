/* -----------------------------------------------------------
   STATE.JS — GLOBAL SPA DATA STORE
   + LocalStorage persistence
   + IPAM utilities & allocator
----------------------------------------------------------- */

console.log("[STATE] Loaded state.js");

/* ===========================================================
   LOCAL STORAGE HELPERS
=========================================================== */

function loadLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function saveLS(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/* ===========================================================
   MASTER STATE OBJECT
=========================================================== */

const state = loadLS("wg_state", null) || {
  /* ----------------------------------------------
     USER ACCOUNTS
  ---------------------------------------------- */
  currentUserId: "u1",

  /* ---------------------------------------------------------
   USERS & AUTH (FRONTEND DEMO ONLY)
--------------------------------------------------------- */

  users: [
    {
      id: "u_admin",
      username: "admin",
      fullName: "Platform Administrator",
      role: "admin",          // admin | engineer | viewer
      password: "admin123"    // DEMO ONLY – plain-text; replace with backend auth later
    },
    {
      id: "u_eng",
      username: "engineer",
      fullName: "VPN Engineer",
      role: "engineer",
      password: "eng123"
    },
    {
      id: "u_view",
      username: "viewer",
      fullName: "Read-only User",
      role: "viewer",
      password: "view123"
    }
  ],

  currentUser: null, // set after login


  /* ----------------------------------------------
     COMPANIES
  ---------------------------------------------- */
  companies: [
    {
      id: "c1",
      name: "Main CCTV Client",
      code: "MCC",
      status: "active"
    }
  ],

  /* ----------------------------------------------
     SITES
  ---------------------------------------------- */
  sites: [
    {
      id: "site1",
      companyId: "c1",
      name: "Project Alpha Crane",
      code: "ALPHA-CRN",
      location: "London, UK",
      status: "active",
      natSubnet: "10.10.50.0/24"
    }
  ],

  /* ----------------------------------------------
     ROUTER DEVICES
  ---------------------------------------------- */
  router_devices: [
    {
      id: "rdev1",
      serial: "TEL-RUTX11-0001",
      model: "RUTX11",
      tunnelIp: "10.240.0.10/32",
      note: "HQ test router"
    }
  ],

  /* ---------------------------------------------------------
   ROUTERS (PHYSICAL TELTONIKA DEVICES)
--------------------------------------------------------- */

  routers: [
    // sample router (remove later)
    // {
    //   id: "router001",
    //   name: "RUTX11-001",
    //   serial: "1234567890",
    //   model: "RUTX11",
    //   imei: "352000000000001",
    //   mac: "00:11:22:33:44:55",
    //
    //   tunnelIP: "10.240.1.10/32",
    //   interfaceId: "wg0",
    //
    //   siteId: "site001",
    //
    //   stats: {
    //     online: false,
    //     lastSeen: null,
    //     rxBytes: 0,
    //     txBytes: 0
    //   },
    //
    //   createdAt: "2025-01-01T12:00:00Z",
    //   updatedAt: "2025-01-01T12:00:00Z"
    // }
  ],


  /* ----------------------------------------------
     SITE ↔ ROUTER ASSIGNMENTS
  ---------------------------------------------- */
  site_router_assignments: [
    {
      id: "sra1",
      siteId: "site1",
      routerDeviceId: "rdev1",
      active: true,
      assignedAt: "2025-01-01T12:00:00Z"
    }
  ],

  /* ----------------------------------------------
     CAMERAS
  ---------------------------------------------- */
  cameras: [
    {
      id: "cam1",
      siteId: "site1",
      name: "Gate Camera 1",
      vendor: "Dahua",
      natIp: "10.10.50.10",
      rtspPath: "/cam/realmonitor?channel=1&subtype=0"
    }
  ],

  /* ----------------------------------------------
     ENGINEER VPN PROFILES
  ---------------------------------------------- */
  engineer_vpn_profiles: [
    {
      id: "prof1",
      userId: "u2",
      vpnIp: "10.128.0.10/32",
      deviceName: "Engineer-Laptop",
      peerId: "peer-eng1"
    }
  ],

  /* ----------------------------------------------
     WIREGUARD INTERFACES
  ---------------------------------------------- */
  wireguard_interfaces: [
    {
      id: "wg0",
      name: "wg0",
      listenPort: 51820,
      publicKey: "SERVERPUBLICKEYHERE",
      privateKey: "SERVERPRIVATEKEYHERE",
      address: "10.200.0.1/16",
      dns: ["1.1.1.1"],
      mtu: 1420
    }
  ],

  /* ----------------------------------------------
     WIREGUARD PEERS
  ---------------------------------------------- */
  wireguard_peers: [
    {
      id: "peer-rtr1",
      type: "router",
      deviceId: "rdev1",
      publicKey: "ROUTER_PUBLIC_KEY_EXAMPLE",
      allowedIps: ["10.10.50.0/24"],
      endpoint: "",
      persistentKeepalive: 25
    },
    {
      id: "peer-eng1",
      type: "engineer",
      userId: "u2",
      publicKey: "ENGINEER_PUBLIC_KEY_EXAMPLE",
      allowedIps: ["0.0.0.0/0"],
      persistentKeepalive: 25
    }
  ],


  /* ---------------------------------------------------------
   IPAM SYSTEM
--------------------------------------------------------- */

  ipPools: {
    routers: {
      name: "Router Tunnel IPs",
      cidrs: ["10.240.0.0/12"]
    },
    engineers: {
      name: "Engineer VPN IPs",
      cidrs: ["10.128.0.0/13"]
    },
    sites: {
      name: "Site Camera NAT Ranges",
      cidrs: [
        "10.0.0.0/12",
        "10.16.0.0/12",
        "10.32.0.0/11"
      ],
      reserved: [
        "10.18.0.0/16",
        "10.110.0.0/20"
      ]
    },
    infra: {
      name: "Infrastructure Services",
      cidrs: ["10.200.0.0/16"]
    }
  },

  // Every allocation ever made stays here permanently
  ipAllocations: [
    // example
    // {
    //   id: "site001",
    //   type: "site",
    //   cidr: "10.16.50.0/24",
    //   pool: "sites",
    //   allocatedAt: "2025-01-02T12:00:00Z"
    // }
  ],


  /* ----------------------------------------------
     SETTINGS
  ---------------------------------------------- */
  settings: {
    theme: "wg",
    layout: "topnav",
    sidebarCollapsed: false,
    modalStyle: "wg"
  },

  audit_logs: [
    {
      id: "log1",
      ts: "2025-01-01T10:00:00Z",
      severity: "info",
      category: "system",
      message: "System initialised",
      source: "frontend",
      userId: null,
      objectType: null,
      objectId: null,
      details: {}
    }
  ],


  /* ---------------------------------------------------------
   WIREGUARD INTERFACES (Enterprise Multi-Interface System)
--------------------------------------------------------- */

  interfaces: [
    {
      id: "wg0",
      name: "wg0",

      description: "Primary VPN interface",
      createdAt: "2025-01-01T12:00:00Z",
      updatedAt: "2025-01-10T18:00:00Z",

      listenPort: 51820,
      privateKey: "",
      publicKey: "",
      mtu: 1420,
      dns: ["1.1.1.1", "8.8.8.8"],

      stats: {
        rxBytes: 0,
        txBytes: 0,
        lastReload: "2025-01-10T18:00:00Z",
        totalPeers: 0,
        onlinePeers: 0,
        stalePeers: 0
      },

      peers: [],              // router + engineer peer IDs
      configPreview: "",
      allowedIPsPreview: "",
      routingPreview: ""
    }
  ],

  /* ---------------------------------------------------------
   WIREGUARD PEERS (Router + Engineer in unified system)
--------------------------------------------------------- */

  peers: [
    // Example test peer (remove later)
    {
      id: "peer_test1",
      type: "router",         // router | engineer
      name: "RUT-TST-001",    // router name or engineer device name

      interfaceId: "wg0",     // interface assigned to this peer
      userId: null,           // only for engineer
      routerId: "router001",  // only for router
      siteId: "site001",      // only for router peers

      vpnIP: "10.128.0.10/32",   // /32 tunnel IP
      allocatedAt: "2025-01-01T12:00:00Z",

      privateKey: "base64-private",
      publicKey: "base64-public",

      allowedIPs: [],         // router peers: NAT subnet, engineer peers: ACL-based
      aclSites: [],           // engineer only

      stats: {
        rxBytes: 0,
        txBytes: 0,
        lastHandshake: null,
        state: "offline"      // online | offline | stale
      },

      createdAt: "2025-01-01T12:00:00Z",
      updatedAt: "2025-01-01T12:00:00Z"
    }
  ],



};

/* ===========================================================
   IP UTILITIES & ALLOCATOR
=========================================================== */

function ipToInt(ip) {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4) throw new Error("Invalid IP " + ip);
  return (
    ((parts[0] << 24) >>> 0) +
    (parts[1] << 16) +
    (parts[2] << 8) +
    parts[3]
  ) >>> 0;
}

function intToIp(num) {
  return [
    (num >>> 24) & 255,
    (num >>> 16) & 255,
    (num >>> 8) & 255,
    num & 255
  ].join(".");
}

function cidrToRange(cidr) {
  const [ip, prefixStr] = cidr.split("/");
  const prefix = parseInt(prefixStr, 10);
  const base = ipToInt(ip);
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  const start = base & mask;
  const size = Math.pow(2, 32 - prefix);
  const end = start + size - 1;
  return { start, end };
}

function rangesOverlap(a, b) {
  return a.start <= b.end && b.start <= a.end;
}

/**
 * Allocate a block from the first pool of a type.
 * poolType: "router" | "camera" | "engineer" | "infra"
 * objectType: e.g. "router_device", "site"
 * objectId:   id of object
 * prefixLen:  e.g. 32 (/32), 24 (/24)
 */
function allocateFromPoolType(poolType, objectType, objectId, prefixLen) {
  const pool = state.ip_pools.find(p => p.type === poolType);
  if (!pool) {
    console.warn("No pool for type", poolType);
    return null;
  }

  // already allocated for this object?
  const existing = state.ip_allocations.find(
    a =>
      a.poolId === pool.id &&
      a.objectType === objectType &&
      a.objectId === objectId
  );
  if (existing) return existing.cidr;

  const poolAllocs = state.ip_allocations.filter(a => a.poolId === pool.id);
  const allocRanges = poolAllocs.map(a => cidrToRange(a.cidr));
  const reservedRanges = (pool.reserved || []).map(cidrToRange);

  for (const poolCidr of pool.cidr) {
    const parent = cidrToRange(poolCidr);
    const blockSize = Math.pow(2, 32 - prefixLen);

    for (
      let start = parent.start;
      start + blockSize - 1 <= parent.end;
      start += blockSize
    ) {
      const candidate = { start, end: start + blockSize - 1 };

      // skip reserved
      if (reservedRanges.some(r => rangesOverlap(candidate, r))) continue;

      // skip existing allocations
      if (allocRanges.some(r => rangesOverlap(candidate, r))) continue;

      const cidrStr = intToIp(start) + "/" + prefixLen;

      DB.upsertAllocation({
        poolId: pool.id,
        objectType,
        objectId,
        cidr: cidrStr
      });

      return cidrStr;
    }
  }

  console.warn("No free IP block in pool", poolType);
  return null;
}

/* ===========================================================
   SAVE STATE
=========================================================== */

function saveState() {
  saveLS("wg_state", state);
}

/* ===========================================================
   GENERIC HELPERS
=========================================================== */

function uid(prefix = "id") {
  return prefix + "-" + Math.random().toString(36).substring(2, 9);
}

function findItem(arr, id) {
  return arr.find(x => x.id === id);
}

function deleteItem(arr, id) {
  const i = arr.findIndex(x => x.id === id);
  if (i !== -1) arr.splice(i, 1);
}

/* ===========================================================
   DB OPERATIONS
=========================================================== */

const DB = {


  /* ---------------------------------------------------------
   USER / AUTH HELPERS (FRONTEND DEMO)
--------------------------------------------------------- */

  getUsers() {
    return state.users || [];
  },

  getUserByUsername(username) {
    return (state.users || []).find(u => u.username === username);
  },

  setCurrentUser(user) {
    state.currentUser = user ? {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role
    } : null;
    saveState();
  },

  getCurrentUser() {
    return state.currentUser || null;
  },

  /* Users */
  getUsers() { return state.users; },
  getUser(id) { return findItem(state.users, id); },
  upsertUser(data) {
    if (!data.id) data.id = uid("u");
    const ex = findItem(state.users, data.id);
    if (ex) Object.assign(ex, data);
    else state.users.push(data);
    saveState();
    return data;
  },
  deleteUser(id) {
    deleteItem(state.users, id);
    saveState();
  },

  /* Companies */
  getCompanies() { return state.companies; },
  upsertCompany(data) {
    if (!data.id) data.id = uid("c");
    const ex = findItem(state.companies, data.id);
    if (ex) Object.assign(ex, data);
    else state.companies.push(data);
    saveState();
  },
  deleteCompany(id) {
    deleteItem(state.companies, id);
    saveState();
  },

  /* Sites */
  getSites() { return state.sites; },
  upsertSite(data) {
    const isNew = !data.id;
    if (!data.id) data.id = uid("site");

    if (isNew && !data.natSubnet) {
      const cidr = allocateFromPoolType("camera", "site", data.id, 24);
      if (cidr) data.natSubnet = cidr;
    }

    const existing = findItem(state.sites, data.id);
    if (existing) Object.assign(existing, data);
    else state.sites.push(data);
    saveState();
  },
  deleteSite(id) {
    deleteItem(state.sites, id);
    saveState();
  },

  /* Routers */
  getRouters() { return state.router_devices; },
  upsertRouter(data) {
    const isNew = !data.id;
    if (!data.id) data.id = uid("rdev");

    if (isNew && !data.tunnelIp) {
      const cidr = allocateFromPoolType("router", "router_device", data.id, 32);
      if (cidr) data.tunnelIp = cidr;
    }

    const ex = findItem(state.router_devices, data.id);
    if (ex) Object.assign(ex, data);
    else state.router_devices.push(data);
    saveState();
  },
  deleteRouter(id) {
    deleteItem(state.router_devices, id);
    saveState();
  },

  /* Cameras */
  getCameras() { return state.cameras; },
  upsertCamera(data) {
    if (!data.id) data.id = uid("cam");
    const ex = findItem(state.cameras, data.id);
    if (ex) Object.assign(ex, data);
    else state.cameras.push(data);
    saveState();
  },
  deleteCamera(id) {
    deleteItem(state.cameras, id);
    saveState();
  },

  /* IP Pools */
  getPools() { return state.ip_pools; },
  upsertPool(data) {
    if (!data.id) data.id = uid("pool");
    const ex = findItem(state.ip_pools, data.id);
    if (ex) Object.assign(ex, data);
    else state.ip_pools.push(data);
    saveState();
  },
  deletePool(id) {
    deleteItem(state.ip_pools, id);
    saveState();
  },

  /* ---------------------------------------------------------
   IPAM: CORE HELPERS
--------------------------------------------------------- */

  /* IP Allocations */
  getAllocations() { return state.ip_allocations; },
  upsertAllocation(data) {
    if (!data.id) data.id = uid("ipa");
    const ex = findItem(state.ip_allocations, data.id);
    if (ex) Object.assign(ex, data);
    else state.ip_allocations.push(data);
    saveState();
  },

  getIPAllocations() {
    return state.ipAllocations || [];
  },

  getAllocFor(id, type) {
    return state.ipAllocations.find(x => x.id === id && x.type === type);
  },

  reserveCIDR(id, type, pool, cidr) {
    state.ipAllocations.push({
      id, type, pool, cidr, allocatedAt: new Date().toISOString()
    });
    saveState();
  },

  /* ---------------------------------------------------------
     AUTO-ALLOCATE ROUTER VPN IP (/32)
  --------------------------------------------------------- */

  allocateRouterIP(routerId) {
    // return existing
    const existing = DB.getAllocFor(routerId, "router");
    if (existing) return existing.cidr;

    // router pool = 10.240.0.0/12
    const pool = state.ipPools.routers.cidrs[0];

    // generate /32: 10.240.x.y
    let ip;
    while (true) {
      const a = 240;                  // fixed: 10.240.x.x
      const b = Math.floor(Math.random() * 256);
      const c = Math.floor(Math.random() * 256);

      ip = `10.${a}.${b}.${c}/32`;

      if (!state.ipAllocations.find(x => x.cidr === ip))
        break;
    }

    DB.reserveCIDR(routerId, "router", "routers", ip);
    return ip;
  },

  /* ---------------------------------------------------------
     AUTO-ALLOCATE ENGINEER VPN IP (/32)
  --------------------------------------------------------- */

  allocateEngineerIP(peerId) {
    const existing = DB.getAllocFor(peerId, "engineer");
    if (existing) return existing.cidr;

    // engineer pool: 10.128.0.0/13
    // Range: 10.128.0.0 – 10.135.255.255
    let ip;

    while (true) {
      const A = 128 + Math.floor(Math.random() * 8); // 128–135
      const B = Math.floor(Math.random() * 256);
      const C = Math.floor(Math.random() * 256);

      ip = `10.${A}.${B}.${C}/32`;

      if (!state.ipAllocations.find(x => x.cidr === ip))
        break;
    }

    DB.reserveCIDR(peerId, "engineer", "engineers", ip);
    return ip;
  },

  /* ---------------------------------------------------------
     AUTO-ALLOCATE SITE NAT SUBNET (/24)
  --------------------------------------------------------- */

  allocateSiteSubnet(siteId) {
    const existing = DB.getAllocFor(siteId, "site");
    if (existing) return existing.cidr;

    const pools = state.ipPools.sites.cidrs;
    const reserved = state.ipPools.sites.reserved;

    let result;

    while (true) {
      // Choose random pool (10.0.0.0/12, etc.)
      const base = pools[Math.floor(Math.random() * pools.length)];

      // base "10.X.0.0/12"
      const octets = base.split("/")[0].split(".");
      const A = Number(octets[1]); // base second octet

      const second = A + Math.floor(Math.random() * Math.pow(2, (12 - 8))); // within /12 boundary

      const third = Math.floor(Math.random() * 256);
      const subnet = `10.${second}.${third}.0/24`;

      // skip reserved blocks
      if (reserved.some(r => cidrWithin(subnet, r))) continue;

      // skip if already used
      if (state.ipAllocations.find(x => x.cidr === subnet)) continue;

      result = subnet;
      break;
    }

    DB.reserveCIDR(siteId, "site", "sites", result);
    return result;
  },


  /* ---------------------------------------------------------
     ROUTER MANAGEMENT
  --------------------------------------------------------- */

  getRouters() {
    return state.routers || [];
  },

  getRouter(id) {
    return state.routers.find(r => r.id === id);
  },

  addRouter(data) {
    const id = uid("router");

    // permanent tunnel IP from IPAM system
    const tunnelIP = DB.allocateRouterIP(id);

    const router = {
      id,
      name: data.name || id,
      serial: data.serial || "",
      model: data.model || "",
      imei: data.imei || "",
      mac: data.mac || "",

      tunnelIP,
      interfaceId: data.interfaceId || "wg0",

      siteId: data.siteId || null,

      stats: {
        online: false,
        lastSeen: null,
        rxBytes: 0,
        txBytes: 0
      },

      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    state.routers.push(router);
    saveState();

    // Create router peer
    DB.addPeer({
      type: "router",
      name: router.name,
      interfaceId: router.interfaceId,
      vpnIP: tunnelIP,
      routerId: router.id,
      siteId: router.siteId,
      allowedIPs: [],  // backend will inject site NAT subnet later
      aclSites: []     // no ACL for routers
    });

    DB.addLog({
      category: "router",
      severity: "info",
      message: `Router added: ${router.name}`,
      objectType: "router",
      objectId: id
    });

    return router;
  },

  updateRouter(id, updates) {
    const router = this.getRouter(id);
    if (!router) return;

    Object.assign(router, updates, {
      updatedAt: new Date().toISOString()
    });

    saveState();

    DB.addLog({
      category: "router",
      severity: "info",
      message: `Router updated: ${router.name}`,
      objectType: "router",
      objectId: id
    });
  },

  deleteRouter(id) {
    const router = this.getRouter(id);
    if (!router) return;

    // delete its peer
    const peer = DB.getPeers().find(p => p.routerId === id);
    if (peer) DB.deletePeer(peer.id);

    state.routers = state.routers.filter(r => r.id !== id);
    saveState();

    DB.addLog({
      category: "router",
      severity: "warn",
      message: `Router deleted: ${router.name}`,
      objectType: "router",
      objectId: id
    });
  },

  /* ---------------------------------------------------------
     Router status simulation
  --------------------------------------------------------- */

  setRouterOnline(id) {
    const r = this.getRouter(id);
    if (!r) return;
    r.stats.online = true;
    r.stats.lastSeen = new Date().toISOString();
    saveState();
  },

  setRouterOffline(id) {
    const r = this.getRouter(id);
    if (!r) return;
    r.stats.online = false;
    saveState();
  },



  /* Peers */
  getPeers() { return state.wireguard_peers; },
  upsertPeer(data) {
    if (!data.id) data.id = uid("peer");
    const ex = findItem(state.wireguard_peers, data.id);
    if (ex) Object.assign(ex, data);
    else state.wireguard_peers.push(data);
    saveState();
  },
  deletePeer(id) {
    deleteItem(state.wireguard_peers, id);
    saveState();
  },

  /* Router ↔ Site assignment */
  assignRouterToSite(siteId, routerId) {
    state.site_router_assignments.forEach(a => {
      if (a.siteId === siteId) a.active = false;
    });

    state.site_router_assignments.push({
      id: uid("sra"),
      siteId,
      routerDeviceId: routerId,
      active: true,
      assignedAt: new Date().toISOString()
    });

    saveState();
  },

  getLogs() {
    return [...state.audit_logs].sort((a, b) =>
      (b.ts || "").localeCompare(a.ts || "")
    );
  },

  addLog(entry) {
    const log = {
      id: uid("log"),
      ts: new Date().toISOString(),
      severity: entry.severity || "info",
      category: entry.category || "system",
      message: entry.message || "",
      source: entry.source || "frontend",
      userId: state.currentUserId || null,
      objectType: entry.objectType || null,
      objectId: entry.objectId || null,
      details: entry.details || {}
    };
    state.audit_logs.push(log);
    saveState();
  },


  /* ---------------------------------------------------------
     INTERFACE MANAGEMENT
  --------------------------------------------------------- */

  getInterfaces() {
    return state.interfaces || [];
  },

  getInterface(id) {
    return this.getInterfaces().find(i => i.id === id);
  },

  addInterface(data) {
    const id = uid("wg");

    const privateKey = generatePrivateKey();
    const publicKey = generatePublicKey(privateKey);

    const iface = {
      id,
      name: data.name || id,
      description: data.description || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),

      listenPort: data.listenPort || 51820,
      privateKey,
      publicKey,
      mtu: data.mtu || 1420,
      dns: data.dns || ["1.1.1.1", "8.8.8.8"],

      stats: {
        rxBytes: 0,
        txBytes: 0,
        lastReload: null,
        totalPeers: 0,
        onlinePeers: 0,
        stalePeers: 0
      },

      peers: [],
      configPreview: "",
      allowedIPsPreview: "",
      routingPreview: ""
    };

    state.interfaces.push(iface);
    saveState();

    DB.addLog({
      category: "interface",
      severity: "info",
      message: `Interface created: ${iface.name}`,
      objectType: "interface",
      objectId: iface.id
    });

    return iface;
  },

  updateInterface(id, updates) {
    const iface = this.getInterface(id);
    if (!iface) return;

    Object.assign(iface, updates, {
      updatedAt: new Date().toISOString()
    });

    saveState();

    DB.addLog({
      category: "interface",
      severity: "info",
      message: `Interface updated: ${iface.name}`,
      objectType: "interface",
      objectId: iface.id
    });
  },

  deleteInterface(id) {
    const before = state.interfaces.length;
    state.interfaces = state.interfaces.filter(i => i.id !== id);
    saveState();

    if (state.interfaces.length < before) {
      DB.addLog({
        category: "interface",
        severity: "warn",
        message: `Interface deleted: ${id}`,
        objectType: "interface",
        objectId: id
      });
    }
  },

  /* ---------------------------------------------------------
     PEER LINKING
  --------------------------------------------------------- */

  addInterfacePeer(interfaceId, peerId) {
    const iface = this.getInterface(interfaceId);
    if (!iface) return;

    if (!iface.peers.includes(peerId)) {
      iface.peers.push(peerId);
    }

    iface.updatedAt = new Date().toISOString();
    saveState();

    DB.addLog({
      category: "interface",
      severity: "info",
      message: `Peer ${peerId} added to ${iface.name}`,
      objectType: "interface",
      objectId: interfaceId
    });
  },

  removeInterfacePeer(interfaceId, peerId) {
    const iface = this.getInterface(interfaceId);
    if (!iface) return;

    iface.peers = iface.peers.filter(p => p !== peerId);
    iface.updatedAt = new Date().toISOString();
    saveState();

    DB.addLog({
      category: "interface",
      severity: "warn",
      message: `Peer ${peerId} removed from ${iface.name}`,
      objectType: "interface",
      objectId: interfaceId
    });
  },

  /* ---------------------------------------------------------
     CONFIG GENERATION (Mock for now)
  --------------------------------------------------------- */

  generateInterfaceConfig(interfaceId) {
    const iface = this.getInterface(interfaceId);
    if (!iface) return "";

    const listenPort = iface.listenPort;
    const privateKey = iface.privateKey;
    const mtu = iface.mtu;
    const dns = iface.dns.join(", ");

    const config = `
      [Interface]
      Address = 10.200.0.1/16
      ListenPort = ${listenPort}
      PrivateKey = ${privateKey}
      MTU = ${mtu}
      DNS = ${dns}

      # Peers will be appended by backend`.trim();

    iface.configPreview = config;
    iface.updatedAt = new Date().toISOString();

    saveState();

    DB.addLog({
      category: "interface",
      severity: "info",
      message: `Config regenerated for ${iface.name}`,
      objectType: "interface",
      objectId: interfaceId
    });

    return config;
  },

  reloadInterface(interfaceId) {
    const iface = this.getInterface(interfaceId);
    if (!iface) return;

    iface.stats.lastReload = new Date().toISOString();
    saveState();

    DB.addLog({
      category: "interface",
      severity: "info",
      message: `Interface reloaded: ${iface.name}`,
      objectType: "interface",
      objectId: interfaceId
    });
  },


  /* ---------------------------------------------------------
   PEER MANAGEMENT — CREATE / UPDATE / DELETE / READ
  --------------------------------------------------------- */

  getPeers() {
    return state.peers || [];
  },

  getPeer(id) {
    return state.peers.find(p => p.id === id);
  },

  addPeer(data) {
    const id = uid("peer");
    const privateKey = generatePrivateKey();
    const publicKey = generatePublicKey(privateKey);

    const peer = {
      id,
      type: data.type,                 // router | engineer
      name: data.name || id,

      interfaceId: data.interfaceId,
      userId: data.userId || null,
      routerId: data.routerId || null,
      siteId: data.siteId || null,

      vpnIP: data.vpnIP,               // already allocated /32
      allocatedAt: new Date().toISOString(),

      privateKey,
      publicKey,

      allowedIPs: data.allowedIPs || [],
      aclSites: data.aclSites || [],   // engineer only

      stats: {
        rxBytes: 0,
        txBytes: 0,
        lastHandshake: null,
        state: "offline"
      },

      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    state.peers.push(peer);

    // Link into interface
    DB.addInterfacePeer(data.interfaceId, id);

    saveState();

    DB.addLog({
      category: "peer",
      severity: "info",
      message: `Peer created: ${peer.name}`,
      objectType: "peer",
      objectId: id
    });

    return peer;
  },

  updatePeer(id, updates) {
    const peer = this.getPeer(id);
    if (!peer) return;

    Object.assign(peer, updates, {
      updatedAt: new Date().toISOString()
    });

    saveState();

    DB.addLog({
      category: "peer",
      severity: "info",
      message: `Peer updated: ${peer.name}`,
      objectType: "peer",
      objectId: id
    });
  },

  deletePeer(id) {
    const peer = this.getPeer(id);
    if (!peer) return;

    // Remove from interface
    if (peer.interfaceId) {
      DB.removeInterfacePeer(peer.interfaceId, id);
    }

    state.peers = state.peers.filter(p => p.id !== id);
    saveState();

    DB.addLog({
      category: "peer",
      severity: "warn",
      message: `Peer deleted: ${peer.name}`,
      objectType: "peer",
      objectId: id
    });
  },


  rotatePeerKey(id) {
    const peer = this.getPeer(id);
    if (!peer) return;

    const privateKey = generatePrivateKey();
    const publicKey = generatePublicKey(privateKey);

    peer.privateKey = privateKey;
    peer.publicKey = publicKey;
    peer.updatedAt = new Date().toISOString();

    saveState();

    DB.addLog({
      category: "peer",
      severity: "info",
      message: `Peer key rotated: ${peer.name}`,
      objectType: "peer",
      objectId: id
    });
  },


  setPeerOnline(id) {
    const peer = this.getPeer(id);
    if (!peer) return;

    peer.stats.state = "online";
    peer.stats.lastHandshake = new Date().toISOString();
    saveState();
  },

  setPeerStale(id) {
    const peer = this.getPeer(id);
    if (!peer) return;

    peer.stats.state = "stale";
    saveState();
  },

  setPeerOffline(id) {
    const peer = this.getPeer(id);
    if (!peer) return;

    peer.stats.state = "offline";
    saveState();
  }
  ,


  addPeerAllowedSite(peerId, siteId) {
    const peer = this.getPeer(peerId);
    if (!peer || peer.type !== "engineer") return;

    if (!peer.aclSites.includes(siteId)) {
      peer.aclSites.push(siteId);
    }

    peer.updatedAt = new Date().toISOString();
    saveState();
  },

  removePeerAllowedSite(peerId, siteId) {
    const peer = this.getPeer(peerId);
    if (!peer) return;

    peer.aclSites = peer.aclSites.filter(s => s !== siteId);
    peer.updatedAt = new Date().toISOString();
    saveState();
  },


  searchPeers(query) {
    query = query.toLowerCase();
    return state.peers.filter(p =>
      (p.name || "").toLowerCase().includes(query) ||
      (p.id || "").toLowerCase().includes(query)
    );
  },

  filterPeersByType(type) {
    return state.peers.filter(p => p.type === type);
  },

  filterPeersByState(state) {
    return state.peers.filter(p => p.stats.state === state);
  },

  generatePeerConfig(id) {
    const peer = this.getPeer(id);
    if (!peer) return "";

    // Optional: find interface for comments / endpoint
    const iface = this.getInterface ? this.getInterface(peer.interfaceId) : null;

    const endpoint = "vpn.example.com:51820"; // placeholder, for now
    const allowed = "0.0.0.0/0";              // you can change this later

    return `
  [Interface]
  PrivateKey = ${peer.privateKey}
  Address = ${peer.vpnIP}
  
  [Peer]
  # Server ${iface ? iface.name : ""}
  PublicKey = SERVER_PUBLIC_KEY
  Endpoint = ${endpoint}
  AllowedIPs = ${allowed}
  PersistentKeepalive = 25
    `.trim();
  },




};

function generatePrivateKey() {
  // mock generator for now
  return btoa("priv-" + Math.random().toString(36).slice(2));
}

function generatePublicKey(privateKey) {
  // fake public key generation
  return btoa("pub-" + privateKey);
}


function cidrWithin(child, parent) {
  const [c, cBits] = child.split("/");
  const [p, pBits] = parent.split("/");

  const cMask = ~((1 << (32 - cBits)) - 1);
  const pMask = ~((1 << (32 - pBits)) - 1);

  const cNum = ipToInt(c);
  const pNum = ipToInt(p);

  return (cNum & pMask) === (pNum & pMask);
}

function ipToInt(ip) {
  return ip.split('.').reduce((a, b) => (a << 8) + Number(b), 0);
}

/* ---------------------------------------------------------
   AUTH MODULE (FRONTEND ONLY)
--------------------------------------------------------- */

const Auth = {
  login(username, password) {
    const user = DB.getUserByUsername(username);
    if (!user) return null;
    if (user.password !== password) return null;

    DB.setCurrentUser(user);
    return DB.getCurrentUser();
  },

  logout() {
    DB.setCurrentUser(null);
  },

  getUser() {
    return DB.getCurrentUser();
  },

  isLoggedIn() {
    return !!DB.getCurrentUser();
  },

  hasRole(role) {
    const u = DB.getCurrentUser();
    if (!u) return false;
    if (u.role === "admin") return true; // admin can do everything
    return u.role === role;
  }
};


console.log("[STATE] State initialized", state);
