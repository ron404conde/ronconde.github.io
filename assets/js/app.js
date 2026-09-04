/* ==========================================================================
   ronconde.com — behaviour
   Modules: theme · nav · scroll · reveal · lightbox · contact form · year
   ========================================================================== */

/* --------------------------------------------------------------------------
   REQUIRED: paste your Web3Forms access key here to receive messages in your
   inbox. Get one free (no signup) at https://web3forms.com — it is emailed to
   you. While this is empty nothing is delivered to an inbox: the form degrades
   to offering the visitor a pre-filled mailto: link they have to click and
   send themselves, which many visitors will not do.
   -------------------------------------------------------------------------- */
var WEB3FORMS_KEY = "";

var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Both the mobile nav and the lightbox freeze the page behind them. A plain
   overflow write lets whichever closes last clear the other one's lock, so
   they share a counter instead. */
var scrollLock = (function () {
  var count = 0;
  return {
    lock: function () {
      if (++count === 1) document.body.classList.add("is-locked");
    },
    unlock: function () {
      if (count > 0 && --count === 0) document.body.classList.remove("is-locked");
    }
  };
})();

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

  // Callers close the menu defensively from several handlers, so this has to
  // be a no-op when the state already matches — otherwise the shared scroll
  // lock gets released more times than it was taken.
  function setOpen(open) {
    if (menu.classList.contains("is-open") === open) return;
    menu.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    if (open) scrollLock.lock();
    else scrollLock.unlock();
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
  // never gets a chance to run, including in full-page capture tools.
  setTimeout(function () {
    revealAll();
  }, 2500);
})();

/* ========== Project lightbox ========== */
(function () {
  var triggers = Array.prototype.slice.call(document.querySelectorAll("[data-lightbox]"));
  if (!triggers.length) return;

  var lb = document.createElement("div");
  lb.className = "lightbox";
  lb.innerHTML =
    '<div class="lightbox__dialog" role="dialog" aria-modal="true" aria-labelledby="lightboxTitle" tabindex="-1">' +
    '<div class="lightbox__viewport">' +
    '<img class="lightbox__media" width="1600" height="860" alt="" />' +
    "</div>" +
    '<div class="lightbox__bar">' +
    '<div class="lightbox__label">' +
    '<div class="lightbox__title" id="lightboxTitle"></div>' +
    '<div class="lightbox__meta"></div>' +
    '<div class="lightbox__hint">Drag to explore &#8596;</div>' +
    "</div>" +
    '<button class="lightbox__close" type="button">Close</button>' +
    "</div>" +
    "</div>";
  document.body.appendChild(lb);

  var dialog = lb.querySelector(".lightbox__dialog");
  var viewport = lb.querySelector(".lightbox__viewport");
  var media = lb.querySelector(".lightbox__media");
  var title = lb.querySelector(".lightbox__title");
  var meta = lb.querySelector(".lightbox__meta");
  var close = lb.querySelector(".lightbox__close");
  var lastFocused = null;

  var FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function focusable() {
    return Array.prototype.slice.call(dialog.querySelectorAll(FOCUSABLE));
  }

  // On narrow screens the image is taller than the viewport is wide, so it pans
  // instead of shrinking to fit. Start centred: cut edges on both sides read as
  // "this scrolls", where a flush left edge just looks like a crop.
  function centerViewport() {
    viewport.scrollLeft = (viewport.scrollWidth - viewport.clientWidth) / 2;
    viewport.scrollTop = 0;
  }

  // scrollWidth is only meaningful once the image has decoded.
  media.addEventListener("load", centerViewport);

  function open(trigger) {
    lastFocused = trigger;
    var name = trigger.dataset.title || "Project";
    media.src = trigger.dataset.image || "";
    media.alt = name + " screenshot, full size";
    title.textContent = name;
    meta.textContent = trigger.dataset.tags || "";
    lb.classList.add("is-open");
    scrollLock.lock();
    centerViewport();
    // Focus the dialog rather than Close, so the title is announced first.
    dialog.focus();
  }

  function hide() {
    lb.classList.remove("is-open");
    scrollLock.unlock();
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
    if (e.key !== "Tab") return;

    // Cycle focus within the dialog. Queried per keypress so the trap stays
    // correct if more controls are added later.
    var items = focusable();
    if (!items.length) {
      e.preventDefault();
      dialog.focus();
      return;
    }

    var first = items[0];
    var last = items[items.length - 1];
    var active = document.activeElement;

    if (e.shiftKey && (active === first || active === dialog)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (active === last || active === dialog)) {
      e.preventDefault();
      first.focus();
    }
  });
})();

/* ========== Contact form ========== */
(function () {
  var form = document.getElementById("contactForm");
  if (!form) return;

  var submit = document.getElementById("contactSubmit");
  var status = document.getElementById("formStatus");
  var defaultSubmitLabel = WEB3FORMS_KEY ? "Send message" : "Continue via email";
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var EMAIL_ADDRESS = "sollezarondel@gmail.com";
  // Past this, mail clients start silently truncating the prefilled body.
  var MAILTO_MAX = 1800;

  submit.textContent = defaultSubmitLabel;

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

  // `link` turns the status line into an actionable fallback: {href, text}.
  function setStatus(message, state, link) {
    status.textContent = message;
    if (link) {
      status.appendChild(document.createTextNode(" "));
      var a = document.createElement("a");
      a.href = link.href;
      a.textContent = link.text;
      status.appendChild(a);
    }
    if (state) status.setAttribute("data-state", state);
    else status.removeAttribute("data-state");
  }

  function mailtoUrl(data) {
    var subject = encodeURIComponent("Portfolio message from " + data.name);
    var body = encodeURIComponent(
      "Name: " + data.name + "\nEmail: " + data.email + "\n\nMessage:\n" + data.message + "\n"
    );
    return "mailto:" + EMAIL_ADDRESS + "?subject=" + subject + "&body=" + body;
  }

  function values() {
    return {
      name: String(fieldOf("name").value || "").trim(),
      email: String(fieldOf("email").value || "").trim(),
      message: String(fieldOf("message").value || "").trim()
    };
  }

  // No form backend configured. Navigating to a mailto: silently does nothing
  // on machines with no mail client registered, so hand over a visible link
  // the visitor chooses to click instead.
  function sendViaMailto(data) {
    var url = mailtoUrl(data);

    if (url.length > MAILTO_MAX) {
      setStatus(
        "That message is too long to hand to a mail app. Please send it directly to",
        "error",
        { href: "mailto:" + EMAIL_ADDRESS, text: EMAIL_ADDRESS }
      );
      return;
    }

    setStatus("Almost there — finish sending from your email app:", null, {
      href: url,
      text: "Open a pre-filled email"
    });
  }

  function sendViaWeb3Forms(data) {
    submit.disabled = true;
    submit.textContent = "Sending…";
    setStatus("Sending your message…", null);

    // Without this a hung request leaves the button stuck on "Sending…".
    var controller = new AbortController();
    var timer = setTimeout(function () {
      controller.abort();
    }, 15000);

    return fetch("https://api.web3forms.com/submit", {
      method: "POST",
      signal: controller.signal,
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
        // The form is deliberately not reset — the typed message survives so
        // it can be copied into a direct email.
        setStatus("Something went wrong sending that. Email me directly at", "error", {
          href: "mailto:" + EMAIL_ADDRESS,
          text: EMAIL_ADDRESS
        });
      })
      .finally(function () {
        clearTimeout(timer);
        submit.disabled = false;
        submit.textContent = defaultSubmitLabel;
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

document.documentElement.classList.add("app-ready");
