/* -----------------------------------------------------------
   RENDER: PEERS (WireGuard peers list)
----------------------------------------------------------- */

console.log("[RENDER] Loaded peers.js");

function renderPeers(root) {
  const perms = getCurrentRolePermissions();
  const canEdit = perms.canEditPeers;

  const peers = DB.getPeers();
  const users = state.users;
  const routers = DB.getRouters();

  const block = document.createElement("section");
  block.className = "block";

  const header = document.createElement("div");
  header.className = "block-header";

  const title = document.createElement("h1");
  title.className = "block-title";
  title.textContent = "WIREGUARD PEERS";

  header.appendChild(title);

  if (canEdit) {
    const btn = document.createElement("button");
    btn.className = "btn-primary";
    btn.textContent = "Add Peer";
    btn.onclick = () => openPeerEditor(null);
    header.appendChild(btn);
  }

  block.appendChild(header);

  const wrapper = document.createElement("div");
  wrapper.className = "table-wrapper";

  wrapper.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Peer ID</th>
          <th>Type</th>
          <th>Owner</th>
          <th>Allowed IPs</th>
          <th>Keepalive</th>
          ${canEdit ? "<th>Actions</th>" : ""}
        </tr>
      </thead>
      <tbody>
        ${peers.map(p => {
          let typeLabel = "";
          let ownerLabel = "";

          if (p.type === "router") {
            const r = routers.find(r => r.id === p.deviceId);
            typeLabel = "Router";
            ownerLabel = r ? r.serial : p.deviceId;
          } else {
            const u = users.find(u => u.id === p.userId);
            typeLabel = "Engineer";
            ownerLabel = u ? u.name : p.userId;
          }

          return `
            <tr>
              <td><span class="mono">${p.id}</span></td>
              <td>${typeLabel}</td>
              <td>${ownerLabel}</td>
              <td><span class="mono">${p.allowedIps.join(", ")}</span></td>
              <td>${p.persistentKeepalive || "–"}</td>
              ${
                canEdit
                  ? `
                    <td>
                      <button class="btn-secondary" data-edit-peer="${p.id}">✎</button>
                      <button class="btn-secondary" data-del-peer="${p.id}">🗑</button>
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

  // Bind actions
  document.querySelectorAll("[data-edit-peer]").forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.editPeer;
      const p = peers.find(x => x.id === id);
      openPeerEditor(p);
    };
  });

  document.querySelectorAll("[data-del-peer]").forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.delPeer;
      Modal.confirm("Delete this peer?", () => {
        DB.deletePeer(id);
        showToast("Peer deleted", "success");
        navigateTo("peers");
      });
    };
  });
}

/* -----------------------------------------------------------
   MODAL: Peer Add/Edit (simple)
----------------------------------------------------------- */
function openPeerEditor(peer) {
  const isEdit = !!peer;

  const html = `
    <form id="peerForm" class="form">
      <div class="form-field">
        <label>Type</label>
        <select id="peerType">
          <option value="router" ${peer?.type === "router" ? "selected" : ""}>Router</option>
          <option value="engineer" ${peer?.type === "engineer" ? "selected" : ""}>Engineer</option>
        </select>
      </div>

      <div class="form-field">
        <label>Router Device ID / User ID</label>
        <input id="peerOwnerId" type="text"
               value="${peer?.deviceId || peer?.userId || ""}">
        <div class="form-help">
          For router: router device ID (like rdev1). For engineer: user ID (like u2).
        </div>
      </div>

      <div class="form-field">
        <label>Allowed IPs (comma separated)</label>
        <input id="peerAllowed" type="text"
               value="${peer?.allowedIps?.join(", ") || ""}">
      </div>

      <div class="form-field">
        <label>Persistent Keepalive (seconds)</label>
        <input id="peerKeep" type="number"
               value="${peer?.persistentKeepalive || ""}">
      </div>
    </form>
  `;

  Modal.open({
    title: isEdit ? "Edit Peer" : "Add Peer",
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
          const type = document.getElementById("peerType").value;
          const ownerId = document.getElementById("peerOwnerId").value.trim();
          const allowed = document.getElementById("peerAllowed").value.trim();
          const keep = document.getElementById("peerKeep").value.trim();

          if (!ownerId || !allowed) {
            showToast("Please fill all fields", "error");
            return;
          }

          const allowedIps = allowed.split(",").map(x => x.trim()).filter(Boolean);

          const data = {
            id: peer?.id,
            type,
            allowedIps,
            persistentKeepalive: keep ? Number(keep) : undefined
          };

          if (type === "router") {
            data.deviceId = ownerId;
            delete data.userId;
          } else {
            data.userId = ownerId;
            delete data.deviceId;
          }

          DB.upsertPeer(data);
          showToast(isEdit ? "Peer updated" : "Peer created", "success");
          Modal.close();
          navigateTo("peers");
        }
      }
    ]
  });
}
