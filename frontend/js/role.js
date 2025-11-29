/* -----------------------------------------------------------
   ROLE.JS — Role-based Access Control (RBAC) for the SPA
   Roles:
     - admin
     - it_engineer
     - site_manager
     - engineer
     - viewer

   Controls:
     - Which sections are visible in the nav
     - Which entities can be created/edited/deleted
     - Who can change other users' roles / access
----------------------------------------------------------- */

console.log("[ROLE] Loaded role.js");

/* ===========================================================
   SECTION DEFINITIONS
   (must match the views / renderers)
=========================================================== */

const SECTIONS = [
  "dashboard",   // Home / Overview
  "interfaces",  // WireGuard interface admin
  "peers",       // WG peers (routers + engineers)
  "users",       // User & role management
  "companies",   // Companies
  "sites",       // Sites
  "routers",     // Router devices (Teltonika)
  "cameras",     // Cameras
  "ipam",        // IP pools + allocations
  "profiles",     // Engineer VPN profiles (My VPN)
  "logs"
];

/* Display labels + icons (used by nav builder) */
const SECTION_META = {
  dashboard:  { label: "Home",        icon: "" },
  interfaces: { label: "Interfaces",  icon: "" },
  peers:      { label: "Peers",       icon: "" },
  users:      { label: "Users",       icon: "" },
  companies:  { label: "Companies",   icon: "" },
  sites:      { label: "Sites",       icon: "" },
  routers:    { label: "Routers",     icon: "" },
  cameras:    { label: "Cameras",     icon: "" },
  ipam:       { label: "IPAM",        icon: "" },
  profiles:   { label: "VPN Profiles",icon: "" },
  logs:       { label: "Logs",        icon: "" }

};



/* ===========================================================
   ROLE PERMISSIONS
   NOTE: only admin + it_engineer can manage who can access which sections
=========================================================== */

const rolePermissions = {

  /* --------------------------------------------------------
     ADMIN
     Full access to everything.
  -------------------------------------------------------- */
  admin: {
    sections: [...SECTIONS],

    canEditCompanies: true,
    canEditSites: true,
    canEditRouters: true,
    canEditCameras: true,
    canEditInterfaces: true,
    canEditPeers: true,
    canEditUsers: true,
    canEditIPAM: true,
    canEditProfiles: true,

    // Admin is allowed to change roles/sections for others
    canManageRoles: true,
    canChangeSettings: true,    // theme, layout, modal style, etc.
    canSeeLogs: true
  },

  /* --------------------------------------------------------
     IT ENGINEER
     Almost full access. Can control infrastructure, IPAM,
     WG config and can manage users' access as requested.
  -------------------------------------------------------- */
  it_engineer: {
    sections: [
      "dashboard",
      "interfaces",
      "peers",
      "users",      // can manage which sections others see
      "companies",
      "sites",
      "routers",
      "cameras",
      "ipam",
      "profiles",
      "logs"
    ],

    canEditCompanies: true,
    canEditSites: true,
    canEditRouters: true,
    canEditCameras: true,
    canEditInterfaces: true,
    canEditPeers: true,
    canEditUsers: true,        // can manage other users
    canEditIPAM: true,
    canEditProfiles: true,

    canManageRoles: true,      // can decide which sections other users can see
    canChangeSettings: true,
    canSeeLogs: true
  },

  /* --------------------------------------------------------
     SITE MANAGER
     Operates at site-level: can manage sites, routers,
     cameras but cannot touch IPAM or WG core config.
  -------------------------------------------------------- */
  site_manager: {
    sections: [
      "dashboard",
      "sites",
      "routers",
      "cameras",
      "peers"
    ],

    canEditCompanies: false,
    canEditSites: true,
    canEditRouters: true,
    canEditCameras: true,
    canEditInterfaces: false,
    canEditPeers: false,
    canEditUsers: false,
    canEditIPAM: false,
    canEditProfiles: false,

    canManageRoles: false,
    canChangeSettings: false,
    canSeeLogs: false
  },

  /* --------------------------------------------------------
     ENGINEER
     Field engineer who just needs VPN and read-only
     visibility into sites / cameras.
  -------------------------------------------------------- */
  engineer: {
    sections: [
      "dashboard",
      "sites",
      "cameras",
      "profiles"
    ],

    canEditCompanies: false,
    canEditSites: false,
    canEditRouters: false,
    canEditCameras: false,
    canEditInterfaces: false,
    canEditPeers: false,
    canEditUsers: false,
    canEditIPAM: false,
    canEditProfiles: false,  // cannot edit others, only see their own

    canManageRoles: false,
    canChangeSettings: false,
    canSeeLogs: false
  },

  /* --------------------------------------------------------
     VIEWER
     Read-only monitoring view.
  -------------------------------------------------------- */
  viewer: {
    sections: [
      "dashboard",
      "sites",
      "routers",
      "cameras"
    ],

    canEditCompanies: false,
    canEditSites: false,
    canEditRouters: false,
    canEditCameras: false,
    canEditInterfaces: false,
    canEditPeers: false,
    canEditUsers: false,
    canEditIPAM: false,
    canEditProfiles: false,

    canManageRoles: false,
    canChangeSettings: false,
    canSeeLogs: false
  }
};



/* ===========================================================
   CURRENT USER UTILITIES
=========================================================== */

/* Get the current user object from state */
function getCurrentUser() {
  const id = state.currentUserId;
  return state.users.find(u => u.id === id) || state.users[0];
}

/* Get permissions config for current user */
function getCurrentRolePermissions() {
  const user = getCurrentUser();
  const role = user?.role || "viewer";
  return rolePermissions[role] || rolePermissions["viewer"];
}

/* Get which sections should be visible in nav */
function getVisibleSections() {
  const perms = getCurrentRolePermissions();
  return perms.sections || [];
}

/* Check if user may access a section */
function canAccessSection(sectionId) {
  const perms = getCurrentRolePermissions();
  return perms.sections.includes(sectionId);
}

/* Generic check for edit rights on an entity type */
function canEditEntity(entityType) {
  const perms = getCurrentRolePermissions();
  switch (entityType) {
    case "company": return !!perms.canEditCompanies;
    case "site":    return !!perms.canEditSites;
    case "router":  return !!perms.canEditRouters;
    case "camera":  return !!perms.canEditCameras;
    case "interface": return !!perms.canEditInterfaces;
    case "peer":    return !!perms.canEditPeers;
    case "user":    return !!perms.canEditUsers;
    case "ipam":    return !!perms.canEditIPAM;
    case "profile": return !!perms.canEditProfiles;
    case "logs": return !!perms.canSeeLogs;
    default:        return false;
  }
}

/* Check if current user can manage other users' roles / section access */
function canManageRoles() {
  const perms = getCurrentRolePermissions();
  return !!perms.canManageRoles;
}

/* Check if current user can change global settings (theme/layout/modal style) */
function canChangeSettings() {
  const perms = getCurrentRolePermissions();
  return !!perms.canChangeSettings;
}

console.log("[ROLE] Current user:", getCurrentUser());
console.log("[ROLE] Current perms:", getCurrentRolePermissions());
