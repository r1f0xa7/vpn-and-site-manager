/* -----------------------------------------------------------
   TOAST.JS — Simple global toast notifications
   Usage: showToast("Saved successfully", "success");
----------------------------------------------------------- */

console.log("[TOAST] Loaded toast.js");

let toastTimeoutId = null;

function showToast(message, type = "info") {
  let container = document.getElementById("toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    document.body.appendChild(container);
  }

  // Clear any existing toasts
  container.innerHTML = "";

  const toast = document.createElement("div");
  toast.className = "toast";

  if (type === "success") toast.classList.add("toast-success");
  else if (type === "error") toast.classList.add("toast-error");
  else toast.classList.add("toast-info");

  toast.textContent = message;

  container.appendChild(toast);

  // Trigger show animation
  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  if (toastTimeoutId) clearTimeout(toastTimeoutId);

  toastTimeoutId = setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => {
      if (toast.parentNode === container) {
        container.removeChild(toast);
      }
    }, 200);
  }, 2500);
}
