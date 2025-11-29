/* -----------------------------------------------------------
   RENDER: CAMERAS
   Dahua camera inventory per site
----------------------------------------------------------- */

console.log("[RENDER] Loaded cameras.js");

function renderCameras(root) {
  const perms = getCurrentRolePermissions();
  const canEdit = perms.canEditCameras;

  const cameras = DB.getCameras();
  const sites = DB.getSites();

  const block = document.createElement("section");
  block.className = "block";

  const header = document.createElement("div");
  header.className = "block-header";

  const title = document.createElement("h1");
  title.className = "block-title";
  title.textContent = "CAMERAS";

  header.appendChild(title);

  if (canEdit) {
    const btn = document.createElement("button");
    btn.className = "btn-primary";
    btn.textContent = "Add Camera";
    btn.onclick = () => openCameraEditor(null);
    header.appendChild(btn);
  }

  block.appendChild(header);

  const wrapper = document.createElement("div");
  wrapper.className = "table-wrapper";

  wrapper.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Site</th>
          <th>Name</th>
          <th>Vendor</th>
          <th>NAT IP</th>
          <th>RTSP Path</th>
          ${canEdit ? "<th>Actions</th>" : ""}
        </tr>
      </thead>
      <tbody>
        ${cameras.map(cam => {
          const site = sites.find(s => s.id === cam.siteId);
          return `
            <tr>
              <td>${site ? site.name : "-"}</td>
              <td>${cam.name}</td>
              <td>${cam.vendor}</td>
              <td><span class="mono">${cam.natIp}</span></td>
              <td><span class="mono">${cam.rtspPath}</span></td>
              ${
                canEdit
                  ? `
                    <td>
                      <button class="icon-btn" data-edit-camera="${cam.id}">✎</button>
                      <button class="icon-btn" data-del-camera="${cam.id}">🗑</button>
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

  // Edit
  document.querySelectorAll("[data-edit-camera]").forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.editCamera;
      const cam = cameras.find(c => c.id === id);
      openCameraEditor(cam);
    };
  });

  // Delete
  document.querySelectorAll("[data-del-camera]").forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.delCamera;
      Modal.confirm("Delete this camera?", () => {
        DB.deleteCamera(id);
        showToast("Camera deleted", "success");
        navigateTo("cameras");
      });
    };
  });
}

/* -----------------------------------------------------------
   MODAL: Camera add/edit
----------------------------------------------------------- */
function openCameraEditor(cam) {
  const isEdit = !!cam;

  const html = `
    <form id="cameraForm" class="form">
      <div class="form-field">
        <label>Site</label>
        <select id="camSite">
          ${state.sites.map(s =>
            `<option value="${s.id}" ${cam?.siteId === s.id ? "selected" : ""}>${s.name}</option>`
          ).join("")}
        </select>
      </div>

      <div class="form-field">
        <label>Name</label>
        <input id="camName" type="text" value="${cam?.name || ""}">
      </div>

      <div class="form-field">
        <label>Vendor</label>
        <input id="camVendor" type="text" value="${cam?.vendor || "Dahua"}">
      </div>

      <div class="form-field">
        <label>NAT IP</label>
        <input id="camNatIp" type="text" value="${cam?.natIp || ""}">
      </div>

      <div class="form-field">
        <label>RTSP Path</label>
        <input id="camRtsp" type="text" value="${cam?.rtspPath || ""}">
      </div>
    </form>
  `;

  Modal.open({
    title: isEdit ? "Edit Camera" : "Add Camera",
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
          const siteId = document.getElementById("camSite").value;
          const name = document.getElementById("camName").value.trim();
          const vendor = document.getElementById("camVendor").value.trim();
          const natIp = document.getElementById("camNatIp").value.trim();
          const rtsp = document.getElementById("camRtsp").value.trim();

          if (!name || !natIp || !rtsp) {
            showToast("Please fill all fields", "error");
            return;
          }

          DB.upsertCamera({
            id: cam?.id,
            siteId,
            name,
            vendor,
            natIp,
            rtspPath: rtsp
          });

          showToast(isEdit ? "Camera updated" : "Camera created", "success");
          Modal.close();
          navigateTo("cameras");
        }
      }
    ]
  });
}
