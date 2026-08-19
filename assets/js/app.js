/* ==========================================================================
   ronconde.com — behaviour
   Modules: theme · nav · scroll · reveal · lightbox · contact form · year
   ========================================================================== */

/* --------------------------------------------------------------------------
   Paste your Web3Forms access key here to receive messages in your inbox.
   Get one free (no signup) at https://web3forms.com — it is emailed to you.
   While this is empty the form falls back to opening the visitor's mail app.
   -------------------------------------------------------------------------- */
var WEB3FORMS_KEY = "";

var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ========== Theme ========== */
(function () {
  var toggle = document.getElementById("themeToggle");
  if (!toggle) return;

  var root = document.documentElement;
  var media = window.matchMedia("(prefers-color-scheme: dark)");

  function stored() {
    try {
      return localStorage.getItem("theme");
    } catch (e) {
      return null;
    }
  }

  function apply(theme) {
    root.setAttribute("data-theme", theme);
    toggle.setAttribute(
      "aria-label",
      theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
    );
  }

  apply(root.getAttribute("data-theme") || (media.matches ? "dark" : "light"));

  toggle.addEventListener("click", function () {
    var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    apply(next);
    try {
      localStorage.setItem("theme", next);
    } catch (e) {
      /* private mode — the choice just won't persist */
    }
  });

  // Follow the OS while the visitor hasn't picked a theme themselves.
  media.addEventListener("change", function (e) {
    if (!stored()) apply(e.matches ? "dark" : "light");
  });
})();

/* ========== Mobile nav ========== */
(function () {
  var toggle = document.getElementById("navToggle");
  var menu = document.getElementById("navMenu");
  if (!toggle || !menu) return;

  function setOpen(open) {
    menu.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    document.body.style.overflow = open ? "hidden" : "";
  }

  toggle.addEventListener("click", function () {
    setOpen(!menu.classList.contains("is-open"));
  });

  menu.addEventListener("click", function (e) {
    if (e.target.closest("a")) setOpen(false);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && menu.classList.contains("is-open")) {
      setOpen(false);
      toggle.focus();
    }
  });

  document.addEventListener("click", function (e) {
    if (!menu.classList.contains("is-open")) return;
    if (menu.contains(e.target) || toggle.contains(e.target)) return;
    setOpen(false);
  });

  // Leaving the mobile breakpoint should never strand a locked body.
  window.matchMedia("(min-width: 761px)").addEventListener("change", function (e) {
    if (e.matches) setOpen(false);
  });
})();

/* ========== Scroll progress + active section ========== */
(function () {
  var header = document.querySelector(".site-header");
  var links = Array.prototype.slice.call(document.querySelectorAll(".nav__link"));
  if (!header) return;

  var sections = links
    .map(function (link) {
      return document.querySelector(link.getAttribute("href"));
    })
    .filter(Boolean);

  var ticking = false;

  function update() {
    ticking = false;

    var doc = document.documentElement;
    var scrollable = doc.scrollHeight - doc.clientHeight;
    var progress = scrollable > 0 ? doc.scrollTop / scrollable : 0;
    header.style.setProperty("--scroll-progress", String(Math.min(1, Math.max(0, progress))));

    // The section that owns the top third of the viewport is the current one.
    var line = doc.scrollTop + header.offsetHeight + doc.clientHeight / 3;
    var currentIndex = -1;

    sections.forEach(function (section, i) {
      if (section.offsetTop <= line) currentIndex = i;
    });

    // Snap to the last section once the page bottom is reached.
    if (scrollable > 0 && doc.scrollTop >= scrollable - 2) currentIndex = sections.length - 1;

    links.forEach(function (link, i) {
      if (i === currentIndex) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  update();
})();

/* ========== Reveal on scroll ========== */
(function () {
  var items = Array.prototype.slice.call(document.querySelectorAll("[data-reveal]"));
  if (!items.length) return;

  function revealAll() {
    items.forEach(function (el) {
      el.classList.add("is-revealed");
    });
  }

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    revealAll();
    return;
  }

  // Stagger siblings so a group animates in as a sequence, not a block.
  var seen = new Map();
  items.forEach(function (el) {
    var parent = el.parentElement;
    var index = seen.get(parent) || 0;
    seen.set(parent, index + 1);
    el.style.setProperty("--reveal-delay", Math.min(index, 4) * 70 + "ms");
  });

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-revealed");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -6% 0px" }
  );

  items.forEach(function (el) {
    observer.observe(el);
  });

  // Failsafe: never leave the page permanently invisible if the observer
  // never gets a chance to run.
  setTimeout(function () {
    if (!document.querySelector("[data-reveal].is-revealed")) revealAll();
  }, 2500);
})();

/* ========== Project lightbox ========== */
(function () {
  var triggers = Array.prototype.slice.call(document.querySelectorAll("[data-lightbox]"));
  if (!triggers.length) return;

  var lb = document.createElement("div");
  lb.className = "lightbox";
  lb.innerHTML =
    '<div class="lightbox__dialog" role="dialog" aria-modal="true" aria-labelledby="lightboxTitle">' +
    '<img class="lightbox__media" alt="" />' +
    '<div class="lightbox__bar">' +
    "<div>" +
    '<div class="lightbox__title" id="lightboxTitle"></div>' +
    '<div class="lightbox__meta"></div>' +
    "</div>" +
    '<button class="lightbox__close" type="button">Close</button>' +
    "</div>" +
    "</div>";
  document.body.appendChild(lb);

  var media = lb.querySelector(".lightbox__media");
  var title = lb.querySelector(".lightbox__title");
  var meta = lb.querySelector(".lightbox__meta");
  var close = lb.querySelector(".lightbox__close");
  var lastFocused = null;

  function open(trigger) {
    lastFocused = trigger;
    var name = trigger.dataset.title || "Project";
    media.src = trigger.dataset.image || "";
    media.alt = name + " screenshot, full size";
    title.textContent = name;
    meta.textContent = trigger.dataset.tags || "";
    lb.classList.add("is-open");
    document.body.style.overflow = "hidden";
    close.focus();
  }

  function hide() {
    lb.classList.remove("is-open");
    document.body.style.overflow = "";
    media.src = "";
    if (lastFocused) lastFocused.focus();
    lastFocused = null;
  }

  triggers.forEach(function (trigger) {
    trigger.addEventListener("click", function () {
      open(trigger);
    });
  });

  close.addEventListener("click", hide);

  lb.addEventListener("click", function (e) {
    if (e.target === lb) hide();
  });

  document.addEventListener("keydown", function (e) {
    if (!lb.classList.contains("is-open")) return;
    if (e.key === "Escape") {
      hide();
      return;
    }
    // Close is the only focusable control in the dialog, so keep focus on it.
    if (e.key === "Tab") {
      e.preventDefault();
      close.focus();
    }
  });
})();

/* ========== Contact form ========== */
(function () {
  var form = document.getElementById("contactForm");
  if (!form) return;

  var submit = document.getElementById("contactSubmit");
  var status = document.getElementById("formStatus");
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  var rules = {
    name: function (v) {
      return v.length >= 2 ? "" : "Please enter your name.";
    },
    email: function (v) {
      return EMAIL.test(v) ? "" : "Please enter a valid email address.";
    },
    message: function (v) {
      return v.length >= 10 ? "" : "A little more detail helps — at least 10 characters.";
    }
  };

  function fieldOf(name) {
    return form.elements[name];
  }

  function showError(name, message) {
    var input = fieldOf(name);
    var slot = document.getElementById("cf-" + name + "-error");
    if (slot) slot.textContent = message;
    if (input) {
      if (message) input.setAttribute("aria-invalid", "true");
      else input.removeAttribute("aria-invalid");
    }
    return !message;
  }

  function validate() {
    var ok = true;
    Object.keys(rules).forEach(function (name) {
      var input = fieldOf(name);
      var valid = showError(name, rules[name](String(input.value || "").trim()));
      if (!valid && ok) input.focus();
      ok = ok && valid;
    });
    return ok;
  }

  // Clear an error as soon as the visitor fixes it.
  Object.keys(rules).forEach(function (name) {
    var input = fieldOf(name);
    if (!input) return;
    input.addEventListener("input", function () {
      if (input.getAttribute("aria-invalid") === "true") {
        showError(name, rules[name](String(input.value || "").trim()));
      }
    });
  });

  function setStatus(message, state) {
    status.textContent = message;
    if (state) status.setAttribute("data-state", state);
    else status.removeAttribute("data-state");
  }

  function values() {
    return {
      name: String(fieldOf("name").value || "").trim(),
      email: String(fieldOf("email").value || "").trim(),
      message: String(fieldOf("message").value || "").trim()
    };
  }

  function sendViaMailto(data) {
    var subject = encodeURIComponent("Portfolio message from " + data.name);
    var body = encodeURIComponent(
      "Name: " + data.name + "\nEmail: " + data.email + "\n\nMessage:\n" + data.message + "\n"
    );
    window.location.href =
      "mailto:sollezarondel@gmail.com?subject=" + subject + "&body=" + body;
    setStatus("Opening your email app with the message pre-filled.", null);
  }

  function sendViaWeb3Forms(data) {
    submit.disabled = true;
    submit.textContent = "Sending…";
    setStatus("Sending your message…", null);

    return fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        access_key: WEB3FORMS_KEY,
        subject: "Portfolio message from " + data.name,
        from_name: data.name,
        name: data.name,
        email: data.email,
        message: data.message,
        botcheck: fieldOf("botcheck").value
      })
    })
      .then(function (res) {
        return res.json();
      })
      .then(function (result) {
        if (!result.success) throw new Error(result.message || "Request failed");
        form.reset();
        setStatus("Thanks — your message is on its way. I'll get back to you soon.", "ok");
      })
      .catch(function () {
        setStatus(
          "Something went wrong sending that. Email me directly at sollezarondel@gmail.com.",
          "error"
        );
      })
      .finally(function () {
        submit.disabled = false;
        submit.textContent = "Send message";
      });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    // Bots fill every field they find, including the hidden one.
    if (fieldOf("botcheck").value) return;

    if (!validate()) {
      setStatus("Please check the highlighted fields.", "error");
      return;
    }

    var data = values();
    if (WEB3FORMS_KEY) sendViaWeb3Forms(data);
    else sendViaMailto(data);
  });
})();

/* ========== Footer year ========== */
(function () {
  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
