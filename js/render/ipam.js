/* -----------------------------------------------------------
   RENDER: IPAM (IP Pools & Allocations)
----------------------------------------------------------- */

console.log("[RENDER] Loaded ipam.js");

function renderIPAM(root) {
  const perms = getCurrentRolePermissions();
  const canEdit = perms.canEditIPAM;

  const pools = DB.getPools();
  const allocs = DB.getAllocations();

  /* --------- POOLS BLOCK --------- */

  const block = document.createElement("section");
  block.className = "block";

  const header = document.createElement("div");
  header.className = "block-header";

  const title = document.createElement("h1");
  title.className = "block-title";
  title.textContent = "IP POOLS";
  header.appendChild(title);

  if (canEdit) {
    const btn = document.createElement("button");
    btn.className = "btn-primary";
    btn.textContent = "Add Pool";
    btn.onclick = () => openPoolEditor(null);
    header.appendChild(btn);
  }

  block.appendChild(header);

  const poolWrapper = document.createElement("div");
  poolWrapper.className = "table-wrapper";

  poolWrapper.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Type</th>
          <th>CIDR</th>
          <th>Reserved</th>
          ${canEdit ? "<th>Actions</th>" : ""}
        </tr>
      </thead>
      <tbody>
        ${pools.map(p => `
          <tr>
            <td>${p.name}</td>
            <td>${p.type}</td>
            <td><span class="mono">${p.cidr.join(", ")}</span></td>
            <td>${p.reserved && p.reserved.length ? p.reserved.join(", ") : "–"}</td>
            ${
              canEdit
                ? `
                  <td>
                    <button class="icon-btn" data-edit-pool="${p.id}">✎</button>
                    <button class="icon-btn" data-del-pool="${p.id}">🗑</button>
                  </td>
                `
                : ""
            }
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  block.appendChild(poolWrapper);
  root.appendChild(block);

  /* --------- ALLOCATIONS BLOCK --------- */

  const block2 = document.createElement("section");
  block2.className = "block";

  const header2 = document.createElement("div");
  header2.className = "block-header";

  const t2header = document.createElement("h1");
  t2header.className = "block-title";
  t2header.textContent = "IP ALLOCATIONS";
  header2.appendChild(t2header);

  if (canEdit) {
    const btnR = document.createElement("button");
    btnR.className = "btn-primary";
    btnR.textContent = "Reserve Block";
    btnR.onclick = () => openAllocationEditor(null);
    header2.appendChild(btnR);
  }

  block2.appendChild(header2);

  const allocWrapper = document.createElement("div");
  allocWrapper.className = "table-wrapper";

  allocWrapper.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Pool</th>
          <th>Object Type</th>
          <th>Object ID</th>
          <th>CIDR</th>
        </tr>
      </thead>
      <tbody>
        ${allocs.map(a => {
          const pool = pools.find(p => p.id === a.poolId);
          return `
            <tr>
              <td>${pool ? pool.name : a.poolId}</td>
              <td>${a.objectType}</td>
              <td>${a.objectId}</td>
              <td><span class="mono">${a.cidr}</span></td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;

  block2.appendChild(allocWrapper);
  root.appendChild(block2);

  /* Bind pool actions */

  if (canEdit) {
    document.querySelectorAll("[data-edit-pool]").forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.editPool;
        const p = pools.find(x => x.id === id);
        openPoolEditor(p);
      };
    });

    document.querySelectorAll("[data-del-pool]").forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.delPool;
        Modal.confirm("Delete this IP pool?", () => {
          DB.deletePool(id);
          showToast("Pool deleted", "success");
          navigateTo("ipam");
        });
      };
    });
  }
}

/* -----------------------------------------------------------
   MODAL: IP Pool Add/Edit
----------------------------------------------------------- */
function openPoolEditor(pool) {
  const isEdit = !!pool;

  const html = `
    <form id="poolForm" class="form">
      <div class="form-field">
        <label>Name</label>
        <input id="poolName" type="text" value="${pool?.name || ""}">
      </div>

      <div class="form-field">
        <label>Type</label>
        <select id="poolType">
          <option value="router" ${pool?.type === "router" ? "selected" : ""}>router</option>
          <option value="camera" ${pool?.type === "camera" ? "selected" : ""}>camera</option>
          <option value="engineer" ${pool?.type === "engineer" ? "selected" : ""}>engineer</option>
          <option value="infra" ${pool?.type === "infra" ? "selected" : ""}>infra</option>
        </select>
      </div>

      <div class="form-field">
        <label>CIDR (comma separated)</label>
        <input id="poolCidr" type="text"
               value="${pool?.cidr?.join(", ") || ""}">
      </div>

      <div class="form-field">
        <label>Reserved (comma separated, optional)</label>
        <input id="poolReserved" type="text"
               value="${pool?.reserved?.join(", ") || ""}">
      </div>
    </form>
  `;

  Modal.open({
    title: isEdit ? "Edit IP Pool" : "Add IP Pool",
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
          const name = document.getElementById("poolName").value.trim();
          const type = document.getElementById("poolType").value;
          const cidrTxt = document.getElementById("poolCidr").value.trim();
          const resTxt = document.getElementById("poolReserved").value.trim();

          if (!name || !cidrTxt) {
            showToast("Please fill all fields", "error");
            return;
          }

          const cidr = cidrTxt.split(",").map(x => x.trim()).filter(Boolean);
          const reserved = resTxt
            ? resTxt.split(",").map(x => x.trim()).filter(Boolean)
            : [];

          DB.upsertPool({
            id: pool?.id,
            name,
            type,
            cidr,
            reserved
          });

          showToast(isEdit ? "Pool updated" : "Pool created", "success");
          Modal.close();
          navigateTo("ipam");
        }
      }
    ]
  });
}

/* -----------------------------------------------------------
   MODAL: Reserve / Edit IP Allocation
----------------------------------------------------------- */
function openAllocationEditor(allocation) {
  const pools = DB.getPools();
  const isEdit = !!allocation;

  const html = `
    <form id="allocForm" class="form">
      <div class="form-field">
        <label>Pool</label>
        <select id="allocPool">
          ${pools.map(p =>
            `<option value="${p.id}" ${allocation?.poolId === p.id ? "selected" : ""}>${p.name}</option>`
          ).join("")}
        </select>
      </div>

      <div class="form-field">
        <label>Object Type</label>
        <input id="allocType" type="text" value="${allocation?.objectType || "reserved"}">
        <div class="form-help">
          Use "reserved" to keep a block free for external systems.
        </div>
      </div>

      <div class="form-field">
        <label>Object ID / Note</label>
        <input id="allocObj" type="text" value="${allocation?.objectId || ""}">
      </div>

      <div class="form-field">
        <label>CIDR</label>
        <input id="allocCidr" type="text" value="${allocation?.cidr || ""}">
      </div>
    </form>
  `;

  Modal.open({
    title: isEdit ? "Edit Allocation" : "Reserve IP Block",
    content: html,
    actions: [
      {
        label: "Cancel",
        className: "btn-secondary",
        onClick: () => Modal.close()
      },
      {
        label: isEdit ? "Save" : "Reserve",
        className: "btn-primary",
        onClick: () => {
          const poolId = document.getElementById("allocPool").value;
          const objectType = document.getElementById("allocType").value.trim() || "reserved";
          const objectId = document.getElementById("allocObj").value.trim() || "(manual)";
          const cidr = document.getElementById("allocCidr").value.trim();

          if (!cidr) {
            showToast("CIDR is required", "error");
            return;
          }

          DB.upsertAllocation({
            id: allocation?.id,
            poolId,
            objectType,
            objectId,
            cidr
          });

          showToast(isEdit ? "Allocation updated" : "Block reserved", "success");
          Modal.close();
          navigateTo("ipam");
        }
      }
    ]
  });
}
