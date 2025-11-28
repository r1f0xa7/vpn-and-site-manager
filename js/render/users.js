/* -----------------------------------------------------------
   RENDER: USERS & ROLES
----------------------------------------------------------- */

console.log("[RENDER] Loaded users.js");

function renderUsers(root) {
  const perms = getCurrentRolePermissions();
  const canEdit = perms.canEditUsers;
  const canRoles = perms.canManageRoles;

  const users = DB.getUsers();

  const block = document.createElement("section");
  block.className = "block";

  const header = document.createElement("div");
  header.className = "block-header";

  const title = document.createElement("h1");
  title.className = "block-title";
  title.textContent = "USERS & ACCESS";

  header.appendChild(title);

  if (canEdit) {
    const btn = document.createElement("button");
    btn.className = "btn-primary";
    btn.textContent = "Add User";
    btn.onclick = () => openUserEditor(null);
    header.appendChild(btn);
  }

  block.appendChild(header);

  const wrapper = document.createElement("div");
  wrapper.className = "table-wrapper";

  wrapper.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Role</th>
          <th>Status</th>
          ${canEdit ? "<th>Actions</th>" : ""}
        </tr>
      </thead>
      <tbody>
        ${users.map(u => `
          <tr>
            <td>${u.name}</td>
            <td>${u.email}</td>
            <td>
              ${
                canRoles
                  ? `
                    <select class="user-role-select" data-user="${u.id}">
                      ${Object.keys(rolePermissions).map(r =>
                        `<option value="${r}" ${u.role === r ? "selected" : ""}>${r}</option>`
                      ).join("")}
                    </select>
                  `
                  : u.role
              }
            </td>
            <td>${u.status}</td>
            ${
              canEdit
                ? `
                  <td>
                    <button class="icon-btn" data-edit-user="${u.id}">✎</button>
                    <button class="icon-btn" data-del-user="${u.id}">🗑</button>
                  </td>
                `
                : ""
            }
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  block.appendChild(wrapper);
  root.appendChild(block);

  // Role changes
  if (canRoles) {
    document.querySelectorAll(".user-role-select").forEach(sel => {
      sel.addEventListener("change", () => {
        const userId = sel.dataset.user;
        const role = sel.value;
        const u = users.find(x => x.id === userId);
        if (!u) return;
        DB.upsertUser({ ...u, role });
        showToast("Role updated", "success");
        // If current user changed their own role, re-apply nav
        if (userId === state.currentUserId) {
          buildNavigationUI();
        }
      });
    });
  }

  // Edit user
  document.querySelectorAll("[data-edit-user]").forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.editUser;
      const u = users.find(x => x.id === id);
      openUserEditor(u);
    };
  });

  // Delete user
  document.querySelectorAll("[data-del-user]").forEach(btn => {
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

/* -----------------------------------------------------------
   MODAL: User add/edit
----------------------------------------------------------- */
function openUserEditor(user) {
  const isEdit = !!user;

  const html = `
    <form id="userForm" class="form">
      <div class="form-field">
        <label>Name</label>
        <input id="userName" type="text" value="${user?.name || ""}">
      </div>

      <div class="form-field">
        <label>Email</label>
        <input id="userEmail" type="email" value="${user?.email || ""}">
      </div>

      <div class="form-field">
        <label>Role</label>
        <select id="userRole">
          ${Object.keys(rolePermissions).map(r =>
            `<option value="${r}" ${user?.role === r ? "selected" : ""}>${r}</option>`
          ).join("")}
        </select>
      </div>

      <div class="form-field">
        <label>Status</label>
        <select id="userStatus">
          <option value="active" ${user?.status === "active" ? "selected": ""}>Active</option>
          <option value="disabled" ${user?.status === "disabled" ? "selected": ""}>Disabled</option>
        </select>
      </div>
    </form>
  `;

  Modal.open({
    title: isEdit ? "Edit User" : "Add User",
    content: html,
    actions: [
      {
        label: "Cancel",
        className: "icon-btn",
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
