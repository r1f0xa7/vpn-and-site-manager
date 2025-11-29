console.log("[RENDER] Loaded login.js");

function renderLogin(root) {
  // Don't show login if already logged in – redirect
  if (Auth.isLoggedIn()) {
    navigateTo("dashboard");
    return;
  }

  root.innerHTML = "";

  const wrap = document.createElement("div");
  wrap.className = "login-page";

  wrap.innerHTML = `
    <div class="login-card">
      <div class="login-logo">
        <div class="login-logo-icon">WG</div>
        <div class="login-logo-text">
          <div class="login-logo-title">WireGuard Control</div>
          <div class="login-logo-sub">Enterprise VPN Management</div>
        </div>
      </div>

      <div class="login-alert" id="loginError" style="display:none;">
        Invalid username or password.
      </div>

      <div class="login-form">
        <div class="form-group">
          <label>Username</label>
          <input id="loginUsername" class="form-input" autocomplete="username" placeholder="admin / engineer / viewer">
        </div>

        <div class="form-group">
          <label>Password</label>
          <input id="loginPassword" class="form-input" type="password" autocomplete="current-password" placeholder="••••••••">
        </div>

        <button id="btnLogin" class="btn-primary login-btn">Sign In</button>

        <div class="login-hint">
          <span class="hint-label">Demo accounts:</span>
          <div><code>admin / admin123</code> (Admin)</div>
          <div><code>engineer / eng123</code> (Engineer)</div>
          <div><code>viewer / view123</code> (Viewer)</div>
        </div>
      </div>
    </div>
  `;

  root.appendChild(wrap);

  const errorBox = wrap.querySelector("#loginError");
  const userInput = wrap.querySelector("#loginUsername");
  const passInput = wrap.querySelector("#loginPassword");
  const btn = wrap.querySelector("#btnLogin");

  function doLogin() {
    const username = userInput.value.trim();
    const password = passInput.value;

    const user = Auth.login(username, password);
    if (!user) {
      errorBox.style.display = "block";
      return;
    }

    errorBox.style.display = "none";
    showToast(`Welcome, ${user.fullName}`, "success");
    navigateTo("dashboard");
  }

  btn.onclick = doLogin;

  passInput.addEventListener("keydown", e => {
    if (e.key === "Enter") doLogin();
  });

  userInput.focus();
}


function handleLogout() {
  Auth.logout();
  navigateTo("login");
}
