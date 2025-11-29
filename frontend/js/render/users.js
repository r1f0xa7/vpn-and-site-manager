/* -----------------------------------------------------------
   RENDER: USERS & ROLES
----------------------------------------------------------- */

console.log("[RENDER] Loaded users.js");

function renderUsers(root) {
  const perms = getCurrentRolePermissions();
  const canEdit = perms.canEditUsers;
  const canRoles = perms.canManageRoles;

  const allUsers = DB.getUsers() || [];
  const roleKeys = Object.keys(rolePermissions || {});

  // local UI state
  let currentPage = 1;
  let pageSize = 20;
  let searchTerm = "";
  let statusFilter = "";
  let roleFilter = "";

  const escapeHtml = (str) =>
    (str || "")
      .toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  function getFilteredUsers() {
    let list = allUsers.slice();

    if (statusFilter) {
      list = list.filter(u => u.status === statusFilter);
    }

    if (roleFilter) {
      list = list.filter(u => u.role === roleFilter);
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(u =>
        (u.name || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.role || "").toLowerCase().includes(q)
      );
    }

    // Sort by role then name
    list.sort((a, b) => {
      const ra = (a.role || "").toLowerCase();
      const rb = (b.role || "").toLowerCase();
      if (ra !== rb) return ra.localeCompare(rb);
      return (a.name || "").toLowerCase().localeCompare((b.name || "").toLowerCase());
    });

    return list;
  }

  // ------------------ LAYOUT ------------------
  root.innerHTML = "";

  const block = document.createElement("section");
  block.className = "block";

  // Header
  const header = document.createElement("div");
  header.className = "block-header users-header";

  header.innerHTML = `
    <div>
      <h1 class="block-title">USERS & ACCESS</h1>
      <p class="text-muted users-subtitle">
        Accounts, roles and access status for the platform.
      </p>
    </div>
  `;

  if (canEdit) {
    const btn = document.createElement("button");
    btn.className = "btn-primary";
    btn.textContent = "Add User";
    btn.onclick = () => openUserEditor(null);
    header.appendChild(btn);
  }

  block.appendChild(header);

  // Filter bar
  const filters = document.createElement("div");
  filters.className = "users-filters";

  filters.innerHTML = `
    <div class="users-filter-group">
      <label>Search</label>
      <input id="userSearchInput" class="search-input" placeholder="Name / email / role…">
    </div>

    <div class="users-filter-group">
      <label>Status</label>
      <select id="userStatusFilter" class="filter-select">
        <option value="">All</option>
        <option value="active">Active</option>
        <option value="disabled">Disabled</option>
      </select>
    </div>

    <div class="users-filter-group">
      <label>Role</label>
      <select id="userRoleFilter" class="filter-select">
        <option value="">All</option>
        ${roleKeys.map(r => `<option value="${r}">${escapeHtml(r)}</option>`).join("")}
      </select>
    </div>

    <div class="users-filter-group users-page-size">
      <label>Rows per page</label>
      <select id="usersPageSize" class="filter-select">
        <option value="10">10</option>
        <option value="20" selected>20</option>
        <option value="50">50</option>
      </select>
    </div>
  `;

  block.appendChild(filters);

  // Table wrapper
  const wrapper = document.createElement("div");
  wrapper.className = "table-wrapper users-table-wrapper";

  wrapper.innerHTML = `
    <table class="users-table">
      <thead>
        <tr>
          <th style="width: 220px;">Name</th>
          <th>Email</th>
          <th style="width: 130px;">Role</th>
          <th style="width: 110px;">Status</th>
          ${canEdit ? '<th style="width: 120px;">Actions</th>' : ""}
        </tr>
      </thead>
      <tbody id="usersTableBody"></tbody>
    </table>
  `;

  block.appendChild(wrapper);

  // Footer
  const footer = document.createElement("div");
  footer.className = "users-table-footer";
  footer.innerHTML = `
    <div class="users-page-info" id="usersPageInfo"></div>
    <div class="users-pagination" id="usersPagination"></div>
  `;
  block.appendChild(footer);

  root.appendChild(block);

  // ------------ DOM refs -------------
  const tbody = wrapper.querySelector("#usersTableBody");
  const searchInput = document.getElementById("userSearchInput");
  const statusFilterEl = document.getElementById("userStatusFilter");
  const roleFilterEl = document.getElementById("userRoleFilter");
  const pageSizeSelect = document.getElementById("usersPageSize");
  const pageInfoEl = document.getElementById("usersPageInfo");
  const paginationEl = document.getElementById("usersPagination");

  // ------------ rendering -------------
  function renderPagination(total) {
    if (!total) {
      pageInfoEl.textContent = "0 users";
      paginationEl.innerHTML = "";
      return;
    }

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * pageSize + 1;
    const end = Math.min(total, currentPage * pageSize);

    pageInfoEl.textContent = `${start}-${end} of ${total} users`;

    paginationEl.innerHTML = `
      <button class="users-page-btn" data-page="prev" ${currentPage === 1 ? "disabled" : ""}>‹</button>
      <span class="users-page-current">Page ${currentPage} of ${totalPages}</span>
      <button class="users-page-btn" data-page="next" ${currentPage === totalPages ? "disabled" : ""}>›</button>
    `;
  }

  function renderTable() {
    const list = getFilteredUsers();

    if (!list.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="${canEdit ? 5 : 4}" class="users-empty">
            No users match the current filters.
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
      .map(u => {
        const roleCell = canRoles
          ? `
            <select class="user-role-select" data-user="${u.id}">
              ${roleKeys
                .map(r =>
                  `<option value="${r}" ${u.role === r ? "selected" : ""}>${escapeHtml(r)}</option>`
                )
                .join("")}
            </select>
          `
          : escapeHtml(u.role || "");

        const statusBadge =
          u.status === "disabled"
            ? `<span class="user-status user-status-disabled">Disabled</span>`
            : `<span class="user-status user-status-active">Active</span>`;

        return `
          <tr data-user-id="${escapeHtml(u.id)}">
            <td>${escapeHtml(u.name)}</td>
            <td>${escapeHtml(u.email)}</td>
            <td>${roleCell}</td>
            <td>${statusBadge}</td>
            ${
              canEdit
                ? `
              <td>
                <div class="users-actions">
                  <button class="router-action-btn user-edit" data-edit-user="${escapeHtml(u.id)}">Edit</button>
                  <button class="router-action-btn user-del" data-del-user="${escapeHtml(u.id)}">Delete</button>
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

    // Role changes
    if (canRoles) {
      tbody.querySelectorAll(".user-role-select").forEach(sel => {
        sel.addEventListener("change", () => {
          const userId = sel.dataset.user;
          const role = sel.value;
          const u = allUsers.find(x => x.id === userId);
          if (!u) return;
          DB.upsertUser({ ...u, role });
          showToast("Role updated", "success");

          if (userId === state.currentUserId) {
            buildNavigationUI();
          }
        });
      });
    }

    // Edit user
    if (canEdit) {
      tbody.querySelectorAll(".user-edit").forEach(btn => {
        btn.onclick = () => {
          const id = btn.dataset.editUser;
          const u = allUsers.find(x => x.id === id);
          openUserEditor(u);
        };
      });

      // Delete user
      tbody.querySelectorAll(".user-del").forEach(btn => {
        btn.onclick = () => {
          const id = btn.dataset.delUser;
          if (id === state.currentUserId) {
            showToast("Cannot delete current user", "error");
            return;
          }
          Modal.confirm("Delete this user?", () => {
            DB.deleteUser(id);
            showToast("User deleted", "success");
            navigateTo("users");
          });
        };
      });
    }
  }

  // ------------ events -------------
  searchInput.addEventListener("input", () => {
    searchTerm = searchInput.value.trim();
    currentPage = 1;
    renderTable();
  });

  statusFilterEl.addEventListener("change", () => {
    statusFilter = statusFilterEl.value || "";
    currentPage = 1;
    renderTable();
  });

  roleFilterEl.addEventListener("change", () => {
    roleFilter = roleFilterEl.value || "";
    currentPage = 1;
    renderTable();
  });

  pageSizeSelect.addEventListener("change", () => {
    pageSize = parseInt(pageSizeSelect.value, 10) || 20;
    currentPage = 1;
    renderTable();
  });

  paginationEl.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-page]");
    if (!btn) return;
    const action = btn.dataset.page;

    const list = getFilteredUsers();
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
   MODAL: User add/edit
----------------------------------------------------------- */

function openUserEditor(user) {
  const isEdit = !!user;

  const html = `
    <form id="userForm" class="form">
      <div class="form-field">
        <label>Name</label>
        <input id="userName" type="text" class="form-input"
               placeholder="Full name"
               value="${user?.name || ""}">
      </div>

      <div class="form-field">
        <label>Email</label>
        <input id="userEmail" type="email" class="form-input"
               placeholder="user@example.com"
               value="${user?.email || ""}">
      </div>

      <div class="form-field">
        <label>Role</label>
        <select id="userRole" class="form-input">
          ${Object.keys(rolePermissions).map(r =>
            `<option value="${r}" ${user?.role === r ? "selected" : ""}>${r}</option>`
          ).join("")}
        </select>
      </div>

      <div class="form-field">
        <label>Status</label>
        <select id="userStatus" class="form-input">
          <option value="active" ${user?.status === "active" ? "selected": ""}>Active</option>
          <option value="disabled" ${user?.status === "disabled" ? "selected": ""}>Disabled</option>
        </select>
      </div>
    </form>
  `;

  Modal.open({
    title: isEdit ? "Edit User" : "Add User",
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
          const name = document.getElementById("userName").value.trim();
          const email = document.getElementById("userEmail").value.trim();
          const role = document.getElementById("userRole").value;
          const status = document.getElementById("userStatus").value;

          if (!name || !email) {
            showToast("Please fill all fields", "error");
            return;
          }

          DB.upsertUser({
            id: user?.id,
            name,
            email,
            role,
            status
          });

          showToast(isEdit ? "User updated" : "User created", "success");
          Modal.close();
          navigateTo("users");
        }
      }
    ]
  });
}
