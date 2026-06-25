/* Peoples Bakers — login/register wiring for login.html */
(function () {
  "use strict";

  function api(path, body) {
    return fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(body),
    })
      .catch(function () {
        // Network error — almost always means the page wasn't opened through
        // the Node server (e.g. file:// or Live Server on a different port).
        throw new Error(
          "Can't reach the server. Open the site via http://localhost:3000 (not file:// or Live Server) and make sure the server is running."
        );
      })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) throw new Error(data.error || "Request failed");
          return data;
        });
      });
  }

  function ensureMsg(form) {
    var el = form.querySelector(".auth-msg");
    if (!el) {
      el = document.createElement("p");
      el.className = "auth-msg";
      el.style.cssText =
        "margin-top:.9rem;font-size:.82rem;text-align:center;min-height:1.1em;";
      form.appendChild(el);
    }
    return el;
  }
  function setMsg(form, text, ok) {
    var el = ensureMsg(form);
    el.textContent = text;
    el.style.color = ok ? "#7CFC9A" : "#ff8a80";
  }

  function safeNextUrl(next) {
    if (!next) return null;
    try {
      var url = new URL(next, location.origin);
      if (url.origin !== location.origin) return null;
      return url.pathname + url.search + url.hash;
    } catch (e) {
      if (next.charAt(0) === "/" && next.charAt(1) !== "/") return next;
      return null;
    }
  }

  function go(user) {
    var next = safeNextUrl(new URLSearchParams(location.search).get("next"));
    if (next) {
      location.href = next;
    } else {
      location.href = "index.html";
    }
  }

  var loginForm =
    document.querySelector("#panel-login form") || null;
  var registerForm =
    document.querySelector("#panel-register form") || null;

  if (loginForm) {
    loginForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = loginForm.querySelector(".btn-submit");
      var email = document.getElementById("l-email").value;
      var pwd = document.getElementById("l-pwd").value;
      if (!email || !pwd) {
        setMsg(loginForm, "Enter your email and password.");
        return;
      }
      btn.disabled = true;
      var orig = btn.textContent;
      btn.textContent = "Signing in…";
      api("/api/auth/login", { email: email, password: pwd })
        .then(function (d) {
          setMsg(loginForm, "Welcome back!", true);
          go(d.user);
        })
        .catch(function (err) {
          setMsg(loginForm, err.message);
        })
        .finally(function () {
          btn.disabled = false;
          btn.textContent = orig;
        });
    });
  }

  /* ── Google sign-in (Google Identity Services) ── */
  function onGoogleCredential(response) {
    if (!response || !response.credential) return;
    api("/api/auth/google", { credential: response.credential })
      .then(function (d) {
        go(d.user);
      })
      .catch(function (err) {
        var f =
          document.querySelector(".panel.active form") ||
          document.querySelector("form");
        if (f) setMsg(f, err.message);
      });
  }

  function initGoogle() {
    fetch("/api/config", { credentials: "same-origin" })
      .then(function (r) {
        return r.json();
      })
      .then(function (cfg) {
        if (!cfg.googleClientId) return; // not configured — keep email/password only
        (function waitForGsi() {
          if (
            !(window.google && google.accounts && google.accounts.id)
          ) {
            setTimeout(waitForGsi, 300);
            return;
          }
          google.accounts.id.initialize({
            client_id: cfg.googleClientId,
            callback: onGoogleCredential,
            auto_select: false,
            cancel_on_tap_outside: false,
          });
          // One Tap: show a quick, password-less prompt on page load.
          try {
            google.accounts.id.prompt();
          } catch (e) {
            /* One Tap is best-effort */
          }
          document.querySelectorAll(".btn-google").forEach(function (btn) {
            var holder = document.createElement("div");
            holder.style.display = "flex";
            holder.style.justifyContent = "center";
            holder.style.marginTop = "0.2rem";
            btn.parentNode.insertBefore(holder, btn);
            btn.style.display = "none";
            try {
              google.accounts.id.renderButton(holder, {
                theme: "filled_black",
                size: "large",
                text: "continue_with",
                shape: "pill",
                width: 320,
              });
            } catch (e) {
              btn.style.display = "";
            }
          });
        })();
      })
      .catch(function () {});
  }

  initGoogle();

  if (registerForm) {
    registerForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = registerForm.querySelector(".btn-submit");
      var name = document.getElementById("r-name").value;
      var email = document.getElementById("r-email").value;
      var phone = document.getElementById("r-phone").value;
      var pwd = document.getElementById("r-pwd").value;
      var confirm = document.getElementById("r-confirm").value;

      if (!name || !email || !pwd) {
        setMsg(registerForm, "Please fill in name, email and password.");
        return;
      }
      if (pwd.length < 6) {
        setMsg(registerForm, "Password must be at least 6 characters.");
        return;
      }
      if (pwd !== confirm) {
        setMsg(registerForm, "Passwords do not match.");
        return;
      }
      btn.disabled = true;
      var orig = btn.textContent;
      btn.textContent = "Creating…";
      api("/api/auth/register", {
        name: name,
        email: email,
        phone: phone,
        password: pwd,
      })
        .then(function (d) {
          setMsg(registerForm, "Account created!", true);
          go(d.user);
        })
        .catch(function (err) {
          setMsg(registerForm, err.message);
        })
        .finally(function () {
          btn.disabled = false;
          btn.textContent = orig;
        });
    });
  }

  var phoneHint = document.getElementById("r-phone-discount-hint");
  if (phoneHint) {
    fetch("/api/config", { credentials: "same-origin" })
      .then(function (res) {
        return res.ok ? res.json() : null;
      })
      .then(function (cfg) {
        if (cfg && cfg.phoneDiscountEnabled && cfg.phoneDiscountHint) {
          phoneHint.textContent = cfg.phoneDiscountHint;
        }
      })
      .catch(function () {});
  }
})();
