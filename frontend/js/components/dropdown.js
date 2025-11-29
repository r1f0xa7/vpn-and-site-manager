/* -----------------------------------------------------------
   DROPDOWN.JS — Simple outside-click handler
   Not heavily used yet, but ready for future dropdowns.
----------------------------------------------------------- */

console.log("[DROPDOWN] Loaded dropdown.js");

(function () {
  document.addEventListener("click", (e) => {
    const openDropdowns = document.querySelectorAll("[data-dropdown-open='true']");

    openDropdowns.forEach((dd) => {
      if (!dd.contains(e.target)) {
        dd.setAttribute("data-dropdown-open", "false");
        dd.classList.remove("show");
      }
    });
  });
})();
