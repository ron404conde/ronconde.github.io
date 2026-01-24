// Mobile nav toggle
const navToggle = document.getElementById("navToggle");
const navMenu = document.getElementById("navMenu");

if (navToggle && navMenu) {
  navToggle.addEventListener("click", () => {
    const isOpen = navMenu.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  // Close menu when clicking a link (mobile)
  navMenu.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => {
      navMenu.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });
}

// Smooth scroll for internal anchors
// (Kept to preserve exact current behavior, including consistent "block: start" alignment.)
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const id = a.getAttribute("href");
    if (!id || id === "#") return;

    const el = document.querySelector(id);
    if (!el) return;

    e.preventDefault();
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

// Year
const y = document.getElementById("year");
if (y) y.textContent = String(new Date().getFullYear());

// Contact form -> opens mail client with prefilled email
const contactForm = document.getElementById("contactForm");
if (contactForm) {
  contactForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const fd = new FormData(contactForm);
    const name = String(fd.get("name") || "").trim();
    const email = String(fd.get("email") || "").trim();
    const message = String(fd.get("message") || "").trim();

    const to = "sollezarondel@gmail.com";
    const subject = encodeURIComponent(`Portfolio message from ${name}`);
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}\n`
    );

    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
  });
}

// Force scroll all the way to top
const backToTop = document.getElementById("backToTop");

if (backToTop) {
  backToTop.addEventListener("click", (e) => {
    e.preventDefault();
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth"
    });
  });
}

// ========== Project Lightbox ==========
(function () {
  const cards = document.querySelectorAll(".project-card");
  if (!cards.length) return;

  // Build lightbox once
  const lb = document.createElement("div");
  lb.className = "lightbox";
  lb.innerHTML = `
    <div class="lightbox__dialog" role="dialog" aria-modal="true" aria-label="Project preview">
      <img class="lightbox__media" alt="" />
      <div class="lightbox__bar">
        <div>
          <div class="lightbox__title"></div>
          <div class="lightbox__meta"></div>
        </div>
        <button class="lightbox__close" type="button" aria-label="Close">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(lb);

  const media = lb.querySelector(".lightbox__media");
  const title = lb.querySelector(".lightbox__title");
  const meta = lb.querySelector(".lightbox__meta");
  const btnClose = lb.querySelector(".lightbox__close");
  const dialog = lb.querySelector(".lightbox__dialog");

  function openLightbox({ img, t, tags }) {
    media.src = img;
    media.alt = t ? `${t} preview` : "Project preview";
    title.textContent = t || "Project";
    meta.textContent = tags || "";
    lb.classList.add("is-open");
    document.body.style.overflow = "hidden";
    btnClose.focus();
  }

  function closeLightbox() {
    lb.classList.remove("is-open");
    document.body.style.overflow = "";
    media.src = "";
  }

  cards.forEach((c) => {
    c.addEventListener("click", () => {
      openLightbox({
        img: c.dataset.image || c.querySelector("img")?.src,
        t: c.dataset.title || "",
        tags: c.dataset.tags || ""
      });
    });
  });

  // Close actions
  btnClose.addEventListener("click", closeLightbox);
  lb.addEventListener("click", (e) => {
    if (e.target === lb) closeLightbox(); // click outside
  });
  dialog.addEventListener("click", (e) => e.stopPropagation());

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && lb.classList.contains("is-open")) closeLightbox();
  });
})();
