/* -----------------------------------------------------------
   MODAL.JS — Global Modal Component
----------------------------------------------------------- */

console.log("[MODAL] Loaded modal.js");

const Modal = (function () {
  let backdropEl = null;
  let modalEl = null;
  let titleEl = null;
  let bodyEl = null;
  let actionsEl = null;
  let currentConfig = null;

  function ensureElements() {
    if (backdropEl) return;

    const container = document.getElementById("modalContainer") || document.body;

    backdropEl = document.createElement("div");
    backdropEl.className = "modal-backdrop hidden";

    modalEl = document.createElement("div");
    modalEl.className = "modal";

    const header = document.createElement("div");
    header.className = "modal-header";

    titleEl = document.createElement("h2");
    titleEl.className = "modal-title";
    header.appendChild(titleEl);

    const closeBtn = document.createElement("button");
    closeBtn.className = "modal-close-btn";
    closeBtn.textContent = "✕";
    closeBtn.addEventListener("click", () => close());
    header.appendChild(closeBtn);

    bodyEl = document.createElement("div");
    bodyEl.className = "modal-body";

    actionsEl = document.createElement("div");
    actionsEl.className = "modal-actions";

    modalEl.appendChild(header);
    modalEl.appendChild(bodyEl);
    modalEl.appendChild(actionsEl);

    backdropEl.appendChild(modalEl);
    container.appendChild(backdropEl);

    backdropEl.addEventListener("click", (e) => {
      if (e.target === backdropEl) close();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !backdropEl.classList.contains("hidden")) {
        close();
      }
    });
  }

  function open(config) {
    ensureElements();
    currentConfig = config || {};

    titleEl.textContent = config.title || "Modal";

    bodyEl.innerHTML = "";
    if (typeof config.content === "string") {
      bodyEl.innerHTML = config.content;
    } else if (config.content instanceof Node) {
      bodyEl.appendChild(config.content);
    }

    actionsEl.innerHTML = "";
    if (Array.isArray(config.actions) && config.actions.length > 0) {
      config.actions.forEach((a) => {
        const btn = document.createElement("button");
        btn.textContent = a.label || "OK";
        btn.className = a.className || "btn-primary";
        btn.type = a.type || "button";
        btn.addEventListener("click", () => {
          if (a.onClick) a.onClick();
        });
        actionsEl.appendChild(btn);
      });
    } else {
      const btn = document.createElement("button");
      btn.textContent = "Close";
      btn.className = "btn-secondary";
      btn.type = "button";
      btn.addEventListener("click", () => close());
      actionsEl.appendChild(btn);
    }

    backdropEl.classList.remove("hidden");
  }

  function close() {
    if (!backdropEl) return;
    backdropEl.classList.add("hidden");
    if (currentConfig && currentConfig.onClose) {
      currentConfig.onClose();
    }
    currentConfig = null;
  }

  function confirm(message, onConfirm) {
    open({
      title: "Confirm",
      content: `<p style="font-size:13px;color:var(--text-soft);">${message}</p>`,
      actions: [
        {
          label: "Cancel",
          className: "btn-secondary",
          onClick: () => close()
        },
        {
          label: "Confirm",
          className: "btn-danger",
          onClick: () => {
            if (onConfirm) onConfirm();
            close();
          }
        }
      ]
    });
  }

  return {
    open,
    close,
    confirm
  };
})();

function openModalSimple(title, html) {
  Modal.open({ title, content: html });
}
