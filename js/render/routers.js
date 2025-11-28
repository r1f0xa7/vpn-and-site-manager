/* -----------------------------------------------------------
   RENDER: ROUTERS (Teltonika Manager)
----------------------------------------------------------- */

console.log("[RENDER] Loaded routers.js");

function renderRouters(root) {
  const perms = getCurrentRolePermissions();
  const canEdit = perms.canEditRouters;

  const routers = DB.getRouters();
  const sites = DB.getSites();
  const assignments = state.site_router_assignments;

  const block = document.createElement("section");
  block.className = "block";

  const header = document.createElement("div");
  header.className = "block-header";

  const title = document.createElement("h1");
  title.className = "block-title";
  title.textContent = "ROUTER DEVICES";

  header.appendChild(title);

  if (canEdit) {
    const btn = document.createElement("button");
    btn.className = "btn-primary";
    btn.textContent = "Add Router";
    btn.onclick = () => openRouterEditor(null);
    header.appendChild(btn);
  }

  block.appendChild(header);

  const wrapper = document.createElement("div");
  wrapper.className = "table-wrapper";

  wrapper.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Serial</th>
          <th>Model</th>
          <th>Tunnel IP</th>
          <th>Assigned Site</th>
          <th>Note</th>
          ${canEdit ? "<th>Actions</th>" : ""}
        </tr>
      </thead>
      <tbody>
        ${routers.map(r => {
          const assign = assignments.find(a => a.routerDeviceId === r.id && a.active);
          const site = assign ? sites.find(s => s.id === assign.siteId) : null;

          return `
            <tr>
              <td>${r.serial}</td>
              <td>${r.model}</td>
              <td><span class="mono">${r.tunnelIp}</span></td>
              <td>${site ? site.name : "-"}</td>
              <td>${r.note || ""}</td>
              ${
                canEdit
                  ? `
                    <td>
                      <button class="icon-btn" data-edit-router="${r.id}">✎</button>
                      <button class="icon-btn" data-del-router="${r.id}">🗑</button>
                    </td>
                  `
                  : ""
              }
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;

  block.appendChild(wrapper);
  root.appendChild(block);

  // Edit routers
  document.querySelectorAll("[data-edit-router]").forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.editRouter;
      const r = routers.find(x => x.id === id);
      openRouterEditor(r);
    };
  });

  // Delete routers
  document.querySelectorAll("[data-del-router]").forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.delRouter;
      Modal.confirm("Delete this router device?", () => {
        DB.deleteRouter(id);
        showToast("Router deleted", "success");
        navigateTo("routers");
      });
    };
  });
}

/* -----------------------------------------------------------
   MODAL: Add/Edit Router
----------------------------------------------------------- */
function openRouterEditor(router) {
  const isEdit = !!router;

  const html = `
    <form id="routerForm" class="form">
      <div class="form-field">
        <label>Serial</label>
        <input id="routerSerial" type="text"
               value="${router?.serial || ""}">
      </div>

      <div class="form-field">
        <label>Model</label>
        <input id="routerModel" type="text"
               value="${router?.model || "RUTX11"}">
      </div>

      <div class="form-field">
        <label>Tunnel IP (/32)</label>
        <input id="routerTunnelIp" type="text"
               value="${router?.tunnelIp || ""}">
        <div class="form-help">
          Must be a permanent /32 from the router pool (10.240.0.0/12).
        </div>
      </div>

      <div class="form-field">
        <label>Note</label>
        <textarea id="routerNote">${router?.note || ""}</textarea>
      </div>
    </form>
  `;

  Modal.open({
    title: isEdit ? "Edit Router Device" : "Add Router Device",
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
          const serial = document.getElementById("routerSerial").value.trim();
          const model = document.getElementById("routerModel").value.trim();
          const tunnelIp = document.getElementById("routerTunnelIp").value.trim();
          const note = document.getElementById("routerNote").value.trim();

          if (!serial || !model || !tunnelIp) {
            showToast("Please fill all fields", "error");
            return;
          }

          DB.upsertRouter({
            id: router?.id,
            serial,
            model,
            tunnelIp,
            note
          });

          showToast(isEdit ? "Router updated" : "Router created", "success");
          Modal.close();
          navigateTo("routers");
        }
      }
    ]
  });
}
