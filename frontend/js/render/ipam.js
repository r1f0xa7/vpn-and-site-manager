console.log("[RENDER] Loaded ipam.js");

function renderIPAM(root) {
  const pools = state.ipPools;
  const allocs = DB.getIPAllocations();

  root.innerHTML = "";

  const header = document.createElement("section");
  header.className = "block";
  header.innerHTML = `
    <h1 class="block-title">IP ADDRESS MANAGEMENT (IPAM)</h1>
    <p class="text-muted">Permanent pools & allocations</p>
  `;
  root.appendChild(header);

  const section = document.createElement("section");
  section.className = "block";

  section.innerHTML = `
    <div class="ipam-grid">

      ${Object.entries(pools).map(([poolKey, pool]) => {
        const poolAllocs = allocs.filter(a => a.pool === poolKey);

        return `
          <div class="ipam-card">
            <div class="ipam-card-title">${pool.name}</div>

            <div class="ipam-card-sub">CIDRs:</div>
            <div class="mono ipam-cidrs">
              ${pool.cidrs.map(c => `<div>${c}</div>`).join("")}
            </div>

            ${
              pool.reserved 
                ? `
                  <div class="ipam-card-sub">Reserved:</div>
                  <div class="mono ipam-reserved">
                    ${pool.reserved.map(r => `<div>${r}</div>`).join("")}
                  </div>
                `
                : ""
            }

            <div class="ipam-card-sub">Allocations:</div>
            <div class="ipam-alloc-list">
              ${
                poolAllocs.length
                  ? poolAllocs.map(a => `
                    <div class="ipam-alloc-row">
                      <span class="mono">${a.cidr}</span>
                      <span class="ipam-alloc-tag">${a.type} → ${a.id}</span>
                    </div>
                  `).join("")
                  : `<div class="ipam-empty">No allocations yet.</div>`
              }
            </div>
          </div>
        `;
      }).join("")}

    </div>
  `;

  root.appendChild(section);
}
