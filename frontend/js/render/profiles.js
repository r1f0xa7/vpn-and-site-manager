/* -----------------------------------------------------------
   RENDER: VPN PROFILES (Engineer Profiles)
----------------------------------------------------------- */

console.log("[RENDER] Loaded profiles.js");

function renderProfiles(root) {
  const user = getCurrentUser();
  const perms = getCurrentRolePermissions();
  const canEdit = perms.canEditProfiles;

  let profiles = state.engineer_vpn_profiles;
  if (user.role === "engineer") {
    profiles = profiles.filter(p => p.userId === user.id);
  }

  const block = document.createElement("section");
  block.className = "block";

  const header = document.createElement("div");
  header.className = "block-header";

  const title = document.createElement("h1");
  title.className = "block-title";
  title.textContent = "ENGINEER VPN PROFILES";

  header.appendChild(title);

  if (canEdit) {
    const btn = document.createElement("button");
    btn.className = "btn-primary";
    btn.textContent = "Add VPN Profile";
    btn.onclick = () => openProfileEditor(null);
    header.appendChild(btn);
  }

  block.appendChild(header);

  const wrapper = document.createElement("div");
  wrapper.className = "table-wrapper";

  wrapper.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>User</th>
          <th>Device Name</th>
          <th>VPN IP</th>
          <th>Peer ID</th>
          ${canEdit ? "<th>Actions</th>" : ""}
        </tr>
      </thead>
      <tbody>
        ${profiles.map(p => {
          const owner = state.users.find(u => u.id === p.userId);
          return `
            <tr>
              <td>${owner ? owner.name : p.userId}</td>
              <td>${p.deviceName}</td>
              <td><span class="mono">${p.vpnIp}</span></td>
              <td><span class="mono">${p.peerId}</span></td>
              ${
                canEdit
                  ? `
                    <td>
                      <button class="icon-btn" data-edit-prof="${p.id}">✎</button>
                      <button class="icon-btn" data-del-prof="${p.id}">🗑</button>
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

  if (canEdit) {
    document.querySelectorAll("[data-edit-prof]").forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.editProf;
        const p = state.engineer_vpn_profiles.find(x => x.id === id);
        openProfileEditor(p);
      };
    });

    document.querySelectorAll("[data-del-prof]").forEach(btn => {
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

/* -----------------------------------------------------------
   MODAL: Profile add/edit
----------------------------------------------------------- */
function openProfileEditor(profile) {
  const isEdit = !!profile;

  const html = `
    <form id="profForm" class="form">
      <div class="form-field">
        <label>User</label>
        <select id="profUser">
          ${state.users.map(u =>
            `<option value="${u.id}" ${profile?.userId === u.id ? "selected" : ""}>${u.name}</option>`
          ).join("")}
        </select>
      </div>

      <div class="form-field">
        <label>Device Name</label>
        <input id="profDevice" type="text" value="${profile?.deviceName || ""}">
      </div>

      <div class="form-field">
        <label>VPN IP (/32)</label>
        <input id="profIp" type="text" value="${profile?.vpnIp || ""}">
        <div class="form-help">
          Leave blank to auto-allocate from the engineer pool.
        </div>
      </div>

      <div class="form-field">
        <label>Peer ID</label>
        <input id="profPeer" type="text" value="${profile?.peerId || ""}">
      </div>
    </form>
  `;

  Modal.open({
    title: isEdit ? "Edit VPN Profile" : "Add VPN Profile",
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
            const idx = state.engineer_vpn_profiles.findIndex(x => x.id === profile.id);
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
          showToast(isEdit ? "Profile updated" : "Profile created", "success");
          Modal.close();
          navigateTo("profiles");
        }
      }
    ]
  });
}
