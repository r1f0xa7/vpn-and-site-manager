/* -----------------------------------------------------------
   RENDER: COMPANIES
   CRUD for companies (Admin + IT Engineer)
----------------------------------------------------------- */

console.log("[RENDER] Loaded companies.js");

function renderCompanies(root) {

  const perms = getCurrentRolePermissions();
  const canEdit = perms.canEditCompanies;

  const companies = DB.getCompanies();

  const block = document.createElement("section");
  block.className = "block";

  const header = document.createElement("div");
  header.className = "block-header";

  const title = document.createElement("h1");
  title.className = "block-title";
  title.textContent = "COMPANY MANAGEMENT";

  header.appendChild(title);

  if (canEdit) {
    const addBtn = document.createElement("button");
    addBtn.className = "btn-primary";
    addBtn.textContent = "Add Company";
    addBtn.onclick = () => openCompanyEditor(null);
    header.appendChild(addBtn);
  }

  block.appendChild(header);

  // Table
  const table = document.createElement("div");
  table.className = "table-wrapper";

  table.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Code</th>
          <th>Status</th>
          ${canEdit ? "<th>Actions</th>" : ""}
        </tr>
      </thead>
      <tbody>
        ${companies.map(c => `
          <tr>
            <td>${c.name}</td>
            <td>${c.code}</td>
            <td>${c.status}</td>
            ${
              canEdit
                ? `
                  <td>
                    <button class="icon-btn" data-edit-company="${c.id}">✎</button>
                    <button class="icon-btn" data-del-company="${c.id}">🗑</button>
                  </td>
                `
                : ""
            }
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  block.appendChild(table);
  root.appendChild(block);

  /* ---------- ACTION BINDS ---------- */

  document.querySelectorAll("[data-edit-company]").forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.editCompany;
      const company = companies.find(x => x.id === id);
      openCompanyEditor(company);
    };
  });

  document.querySelectorAll("[data-del-company]").forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.delCompany;
      Modal.confirm("Delete this company?", () => {
        DB.deleteCompany(id);
        showToast("Company deleted", "success");
        navigateTo("companies");
      });
    };
  });
}



/* -----------------------------------------------------------
   MODAL: Add/Edit Company
----------------------------------------------------------- */
function openCompanyEditor(company) {

  const isEdit = !!company;

  const html = `
    <form id="companyForm" class="form">
      <div class="form-field">
        <label>Name</label>
        <input type="text" id="companyName" value="${company ? company.name : ""}">
      </div>

      <div class="form-field">
        <label>Code</label>
        <input type="text" id="companyCode" value="${company ? company.code : ""}">
      </div>

      <div class="form-field">
        <label>Status</label>
        <select id="companyStatus">
          <option value="active" ${company?.status === "active" ? "selected": ""}>Active</option>
          <option value="inactive" ${company?.status === "inactive" ? "selected": ""}>Inactive</option>
        </select>
      </div>
    </form>
  `;

  Modal.open({
    title: isEdit ? "Edit Company" : "Add Company",
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
          const name = document.getElementById("companyName").value.trim();
          const code = document.getElementById("companyCode").value.trim();
          const status = document.getElementById("companyStatus").value;

          if (!name || !code) {
            showToast("Please fill in all fields", "error");
            return;
          }

          DB.upsertCompany({
            id: company?.id,
            name,
            code,
            status
          });

          showToast(isEdit ? "Company updated" : "Company created", "success");

          Modal.close();
          navigateTo("companies");
        }
      }
    ]
  });
}
