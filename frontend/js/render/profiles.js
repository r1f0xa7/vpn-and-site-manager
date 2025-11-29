/* -----------------------------------------------------------
   RENDER: VPN PROFILES (Engineer Profiles)
----------------------------------------------------------- */

console.log("[RENDER] Loaded profiles.js");

function renderProfiles(root) {
  const user = getCurrentUser();
  const perms = getCurrentRolePermissions();
  const canEdit = perms.canEditProfiles;

  // Base list
  let allProfiles = state.engineer_vpn_profiles || [];

  // Engineers only see their own profiles
  if (user.role === "engineer") {
    allProfiles = allProfiles.filter(p => p.userId === user.id);
  }

  const users = state.users || [];
  const userMap = new Map(users.map(u => [u.id, u]));

  // Local UI state
  let currentPage = 1;
  let pageSize = 20;
  let searchTerm = "";
  let userFilter = "";

  // --------- helpers ---------
  const escapeHtml = (str) =>
    (str || "")
      .toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  function getDisplayProfiles() {
    let list = allProfiles.slice();

    if (userFilter) {
      list = list.filter(p => p.userId === userFilter);
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(p => {
        const owner = userMap.get(p.userId);
        const ownerName = owner ? owner.name || "" : "";
        return (
          (p.deviceName || "").toLowerCase().includes(q) ||
          (p.vpnIp || "").toLowerCase().includes(q) ||
          (p.peerId || "").toLowerCase().includes(q) ||
          ownerName.toLowerCase().includes(q)
        );
      });
    }

    // stable sort: by user, then device name
    list.sort((a, b) => {
      const ua = (userMap.get(a.userId)?.name || "").toLowerCase();
      const ub = (userMap.get(b.userId)?.name || "").toLowerCase();
      if (ua !== ub) return ua.localeCompare(ub);
      return (a.deviceName || "").toLowerCase().localeCompare((b.deviceName || "").toLowerCase());
    });

    return list;
  }

  // ------------- layout -------------
  root.innerHTML = "";

  const block = document.createElement("section");
  block.className = "block";

  // Header
  const header = document.createElement("div");
  header.className = "block-header profiles-header";

  header.innerHTML = `
    <div>
      <h1 class="block-title">ENGINEER VPN PROFILES</h1>
      <p class="text-muted profiles-subtitle">
        Per-device WireGuard profiles for field engineers.
      </p>
    </div>
  `;

  if (canEdit) {
    const btn = document.createElement("button");
    btn.className = "btn-primary";
    btn.textContent = "Add VPN Profile";
    btn.onclick = () => openProfileEditor(null);
    header.appendChild(btn);
  }

  block.appendChild(header);

  // Filters row
  const filters = document.createElement("div");
  filters.className = "profiles-filters";

  const canFilterByUser = user.role !== "engineer";

  filters.innerHTML = `
    <div class="profiles-filter-group">
      <label>Search</label>
      <input id="profilesSearch" class="search-input" placeholder="Device / VPN IP / peer / user…">
    </div>

    ${
      canFilterByUser
        ? `
      <div class="profiles-filter-group">
        <label>User</label>
        <select id="profilesUserFilter" class="filter-select">
          <option value="">All users</option>
          ${users
            .map(u => `<option value="${u.id}">${escapeHtml(u.name)}</option>`)
            .join("")}
        </select>
      </div>
      `
        : ""
    }

    <div class="profiles-filter-group profiles-page-size">
      <label>Rows per page</label>
      <select id="profilesPageSize" class="filter-select">
        <option value="10">10</option>
        <option value="20" selected>20</option>
        <option value="50">50</option>
      </select>
    </div>
  `;

  block.appendChild(filters);

  // Table
  const wrapper = document.createElement("div");
  wrapper.className = "table-wrapper profiles-table-wrapper";

  wrapper.innerHTML = `
    <table class="profiles-table">
      <thead>
        <tr>
          <th style="width: 180px;">User</th>
          <th>Device Name</th>
          <th style="width: 130px;">VPN IP</th>
          <th style="width: 130px;">Peer ID</th>
          ${canEdit ? '<th style="width: 120px;">Actions</th>' : ""}
        </tr>
      </thead>
      <tbody id="profilesTableBody"></tbody>
    </table>
  `;

  block.appendChild(wrapper);

  // Footer (pagination)
  const footer = document.createElement("div");
  footer.className = "profiles-table-footer";
  footer.innerHTML = `
    <div class="profiles-page-info" id="profilesPageInfo"></div>
    <div class="profiles-pagination" id="profilesPagination"></div>
  `;
  block.appendChild(footer);

  root.appendChild(block);

  // ------------- DOM refs & render -------------
  const tbody = wrapper.querySelector("#profilesTableBody");
  const pageInfoEl = document.getElementById("profilesPageInfo");
  const paginationEl = document.getElementById("profilesPagination");
  const searchEl = document.getElementById("profilesSearch");
  const pageSizeSelect = document.getElementById("profilesPageSize");
  const userFilterEl = canFilterByUser
    ? document.getElementById("profilesUserFilter")
    : null;

  function renderPagination(total) {
    if (!total) {
      pageInfoEl.textContent = "0 profiles";
      paginationEl.innerHTML = "";
      return;
    }

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * pageSize + 1;
    const end = Math.min(total, currentPage * pageSize);

    pageInfoEl.textContent = `${start}-${end} of ${total} profiles`;

    paginationEl.innerHTML = `
      <button class="profiles-page-btn" data-page="prev" ${currentPage === 1 ? "disabled" : ""}>‹</button>
      <span class="profiles-page-current">Page ${currentPage} of ${totalPages}</span>
      <button class="profiles-page-btn" data-page="next" ${currentPage === totalPages ? "disabled" : ""}>›</button>
    `;
  }

  function renderTable() {
    const list = getDisplayProfiles();

    if (!list.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="${canEdit ? 5 : 4}" class="profiles-empty">
            No VPN profiles found for the current filters.
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
      .map(p => {
        const owner = userMap.get(p.userId);
        const ownerName = owner ? owner.name : p.userId;

        return `
          <tr data-prof-id="${escapeHtml(p.id)}">
            <td>${escapeHtml(ownerName)}</td>
            <td>${escapeHtml(p.deviceName || "")}</td>
            <td><span class="mono">${escapeHtml(p.vpnIp || "-")}</span></td>
            <td><span class="mono">${escapeHtml(p.peerId || "")}</span></td>
            ${
              canEdit
                ? `
              <td>
                <div class="profiles-actions">
                  <button class="router-action-btn prof-edit" data-edit-prof="${escapeHtml(p.id)}">Edit</button>
                  <button class="router-action-btn prof-del" data-del-prof="${escapeHtml(p.id)}">Delete</button>
                </div>
              </td>
              `
                : ""
            }
          </tr>
        `;
      })
      .join("");

    renderPagination(total);

    if (canEdit) {
      tbody.querySelectorAll(".prof-edit").forEach(btn => {
        btn.onclick = () => {
          const id = btn.dataset.editProf;
          const prof = state.engineer_vpn_profiles.find(x => x.id === id);
          openProfileEditor(prof);
        };
      });

      tbody.querySelectorAll(".prof-del").forEach(btn => {
        btn.onclick = () => {
          const id = btn.dataset.delProf;
          Modal.confirm("Delete this VPN profile?", () => {
            const idx = state.engineer_vpn_profiles.findIndex(x => x.id === id);
            if (idx !== -1) {
              state.engineer_vpn_profiles.splice(idx, 1);
              saveState();
            }
            showToast("Profile deleted", "success");
            navigateTo("profiles");
          });
        };
      });
    }
  }

  // ------------- events -------------
  searchEl.addEventListener("input", () => {
    searchTerm = searchEl.value.trim();
    currentPage = 1;
    renderTable();
  });

  if (userFilterEl) {
    userFilterEl.addEventListener("change", () => {
      userFilter = userFilterEl.value || "";
      currentPage = 1;
      renderTable();
    });
  }

  pageSizeSelect.addEventListener("change", () => {
    pageSize = parseInt(pageSizeSelect.value, 10) || 20;
    currentPage = 1;
    renderTable();
  });

  paginationEl.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-page]");
    if (!btn) return;
    const action = btn.dataset.page;

    const list = getDisplayProfiles();
    const totalPages = Math.max(1, Math.ceil(list.length / pageSize));

    if (action === "prev" && currentPage > 1) {
      currentPage--;
      renderTable();
    } else if (action === "next" && currentPage < totalPages) {
      currentPage++;
      renderTable();
    }
  });

  // initial render
  renderTable();
}

/* -----------------------------------------------------------
   MODAL: Profile add/edit
----------------------------------------------------------- */

function openProfileEditor(profile) {
  const isEdit = !!profile;
  const users = state.users || [];

  const html = `
    <div class="form-section">
      <div class="form-section-header">
        <h3>${isEdit ? "Edit VPN Profile" : "New VPN Profile"}</h3>
        <p>Bind a WireGuard peer to an engineer device.</p>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>User</label>
          <select id="profUser" class="form-input">
            ${users
              .map(
                u =>
                  `<option value="${u.id}" ${
                    profile && profile.userId === u.id ? "selected" : ""
                  }>${u.name}</option>`
              )
              .join("")}
          </select>
        </div>

        <div class="form-group">
          <label>Device Name</label>
          <input id="profDevice" type="text" class="form-input"
                 placeholder="e.g. John’s Laptop"
                 value="${profile ? profile.deviceName || "" : ""}">
          <p class="form-hint">Visible in logs and config exports.</p>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>VPN IP (/32)</label>
          <input id="profIp" type="text" class="form-input"
                 placeholder="10.x.x.x/32"
                 value="${profile ? profile.vpnIp || "" : ""}">
          <p class="form-hint">
            Leave blank to auto-allocate from the engineer pool.
          </p>
        </div>

        <div class="form-group">
          <label>Peer ID</label>
          <input id="profPeer" type="text" class="form-input"
                 placeholder="existing WireGuard peer id"
                 value="${profile ? profile.peerId || "" : ""}">
          <p class="form-hint">
            Must match an existing WireGuard peer in the system.
          </p>
        </div>
      </div>
    </div>
  `;

  Modal.open({
    title: isEdit ? "Edit VPN Profile" : "Add VPN Profile",
    size: "medium",
    content: html,
    actions: [
      {
        label: "Cancel",
        className: "btn-secondary",
        onClick: () => Modal.close()
      },
      {
        label: isEdit ? "Save" : "Create",
        className: "btn-primary",
        onClick: () => {
          const userId = document.getElementById("profUser").value;
          const deviceName = document.getElementById("profDevice").value.trim();
          let vpnIp = document.getElementById("profIp").value.trim();
          const peerId = document.getElementById("profPeer").value.trim();

          if (!deviceName || !peerId) {
            showToast("Device name and peer ID are required", "error");
            return;
          }

          if (isEdit) {
            const idx = state.engineer_vpn_profiles.findIndex(
              x => x.id === profile.id
            );
            if (idx !== -1) {
              state.engineer_vpn_profiles[idx] = {
                ...state.engineer_vpn_profiles[idx],
                userId,
                deviceName,
                vpnIp,
                peerId
              };
            }
          } else {
            const newId = uid("prof");

            if (!vpnIp) {
              const cidr = allocateFromPoolType(
                "engineer",
                "engineer_profile",
                newId,
                32
              );
              if (cidr) vpnIp = cidr;
            }

            state.engineer_vpn_profiles.push({
              id: newId,
              userId,
              deviceName,
              vpnIp,
              peerId
            });
          }

          saveState();
          showToast(
            isEdit ? "Profile updated" : "Profile created",
            "success"
          );
          Modal.close();
          navigateTo("profiles");
        }
      }
    ]
  });
}
