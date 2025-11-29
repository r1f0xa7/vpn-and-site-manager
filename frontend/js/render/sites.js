/* -----------------------------------------------------------
   RENDER: SITES
   Site management + Router assignment
----------------------------------------------------------- */

console.log("[RENDER] Loaded sites.js");

function renderSites(root) {
  const perms = getCurrentRolePermissions();
  const canEdit = perms.canEditSites;

  const sites = DB.getSites();
  const routers = DB.getRouters();
  const assignments = state.site_router_assignments;

  const block = document.createElement("section");
  block.className = "block";

  const header = document.createElement("div");
  header.className = "block-header";

  const title = document.createElement("h1");
  title.className = "block-title";
  title.textContent = "SITES";

  header.appendChild(title);

  if (canEdit) {
    const btn = document.createElement("button");
    btn.className = "btn-primary";
    btn.textContent = "Add Site";
    btn.onclick = () => openSiteEditor(null);
    header.appendChild(btn);
  }

  block.appendChild(header);

  const table = document.createElement("div");
  table.className = "table-wrapper";

  table.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Company</th>
          <th>Site</th>
          <th>NAT Subnet</th>
          <th>Assigned Router</th>
          <th>Status</th>
          ${canEdit ? "<th>Actions</th>" : ""}
        </tr>
      </thead>

      <tbody>
        ${sites.map(site => {
          const comp = state.companies.find(c => c.id === site.companyId);

          const assignment = assignments.find(a => a.siteId === site.id && a.active);
          const router = assignment
            ? routers.find(r => r.id === assignment.routerDeviceId)
            : null;

          return `
            <tr>
              <td>${comp ? comp.name : "Unknown"}</td>
              <td>${site.name}</td>
              <td><span class="mono">${site.natSubnet}</span></td>
              <td>${router ? router.serial : "-"}</td>
              <td>${site.status}</td>

              ${
                canEdit
                  ? `
                    <td>
                      <button class="icon-btn" data-edit-site="${site.id}">✎</button>
                      <button class="icon-btn" data-assign-router="${site.id}">📡</button>
                      <button class="icon-btn" data-del-site="${site.id}">🗑</button>
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

  block.appendChild(table);
  root.appendChild(block);

  /* ---------------- Site Actions ---------------- */

  // Edit site
  document.querySelectorAll("[data-edit-site]").forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.editSite;
      const site = sites.find(x => x.id === id);
      openSiteEditor(site);
    };
  });

  // Assign router
  document.querySelectorAll("[data-assign-router]").forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.assignRouter;
      const site = sites.find(x => x.id === id);
      openRouterAssignmentModal(site);
    };
  });

  // Delete site
  document.querySelectorAll("[data-del-site]").forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.delSite;

      Modal.confirm("Delete this site?", () => {
        DB.deleteSite(id);
        showToast("Site deleted", "success");
        navigateTo("sites");
      });
    };
  });
}



/* -----------------------------------------------------------
   MODAL: Add/Edit Site
----------------------------------------------------------- */
function openSiteEditor(site) {
  const isEdit = !!site;

  const html = `
    <form id="siteForm" class="form">
      <div class="form-field">
        <label>Company</label>
        <select id="siteCompany">
          ${state.companies.map(c =>
            `<option value="${c.id}" ${site?.companyId === c.id ? "selected" : ""}>${c.name}</option>`
          ).join("")}
        </select>
      </div>

      <div class="form-field">
        <label>Site Name</label>
        <input id="siteName" type="text" value="${site?.name || ""}">
      </div>

      <div class="form-field">
        <label>Code</label>
        <input id="siteCode" type="text" value="${site?.code || ""}">
      </div>

      <div class="form-field">
        <label>Location</label>
        <input id="siteLocation" type="text" value="${site?.location || ""}">
      </div>

      <div class="form-field">
        <label>Status</label>
        <select id="siteStatus">
          <option value="active" ${site?.status === "active" ? "selected" : ""}>Active</option>
          <option value="inactive" ${site?.status === "inactive" ? "selected" : ""}>Inactive</option>
        </select>
      </div>

      <div class="form-field">
        <label>NAT Subnet (Permanent)</label>
        <input id="siteSubnet" type="text"
               value="${site?.natSubnet || ""}"
               ${isEdit ? "disabled" : ""}>
      </div>
    </form>
  `;

  Modal.open({
    title: isEdit ? "Edit Site" : "Create Site",
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
          const companyId = document.getElementById("siteCompany").value;
          const name = document.getElementById("siteName").value.trim();
          const code = document.getElementById("siteCode").value.trim();
          const loc = document.getElementById("siteLocation").value.trim();
          const status = document.getElementById("siteStatus").value;
          const subnet = site?.natSubnet || document.getElementById("siteSubnet").value.trim();

          if (!name || !code || !loc || !subnet) {
            showToast("Please fill all fields", "error");
            return;
          }

          DB.upsertSite({
            id: site?.id,
            companyId,
            name,
            code,
            location: loc,
            status,
            natSubnet: subnet
          });

          showToast(isEdit ? "Site updated" : "Site created", "success");
          Modal.close();
          navigateTo("sites");
        }
      }
    ]
  });
}



/* -----------------------------------------------------------
   MODAL: Assign Router to Site
----------------------------------------------------------- */
function openRouterAssignmentModal(site) {
  const routers = DB.getRouters();
  const currentAssignment = state.site_router_assignments.find(a => a.siteId === site.id && a.active);

  const html = `
    <div style="font-size:13px;color:var(--text-soft);">
      <p>Select which router device will be assigned to this site.</p>

      <div class="form-field">
        <label>Router Device</label>
        <select id="assignRouter">
          ${routers.map(r => `
            <option value="${r.id}"
              ${currentAssignment?.routerDeviceId === r.id ? "selected" : ""}>
              ${r.serial} (${r.model})
            </option>
          `).join("")}
        </select>
      </div>
    </div>
  `;

  Modal.open({
    title: `Assign Router – ${site.name}`,
    content: html,
    actions: [
      {
        label: "Cancel",
        className: "icon-btn",
        onClick: () => Modal.close()
      },
      {
        label: "Assign",
        className: "btn-primary",
        onClick: () => {
          const routerId = document.getElementById("assignRouter").value;

          DB.assignRouterToSite(site.id, routerId);

          showToast("Router assigned", "success");
          Modal.close();
          navigateTo("sites");
        }
      }
    ]
  });
}
