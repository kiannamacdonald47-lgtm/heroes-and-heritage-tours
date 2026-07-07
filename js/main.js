// Mark JS as available — CSS only hides [data-reveal] elements when this
// class is present, so content is never lost if JS fails to load.
document.documentElement.classList.add("js");

// Year stamp
document.querySelectorAll("[data-year]").forEach((el) => {
  el.textContent = new Date().getFullYear();
});

// Nav scroll state
const nav = document.getElementById("nav");
if (nav) {
  const onScroll = () => {
    nav.dataset.scrolled = window.scrollY > 8 ? "true" : "false";
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

// Mobile menu toggle
const navToggle = document.getElementById("navToggle");
const mobileMenu = document.getElementById("mobileMenu");
if (navToggle && mobileMenu) {
  navToggle.addEventListener("click", () => {
    const isOpen = mobileMenu.dataset.open === "true";
    mobileMenu.dataset.open = isOpen ? "false" : "true";
    navToggle.setAttribute("aria-expanded", String(!isOpen));
    document.body.style.overflow = isOpen ? "" : "hidden";
  });
  mobileMenu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      mobileMenu.dataset.open = "false";
      navToggle.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
    });
  });
}

// Scroll reveal (progressive enhancement — see CSS: content is visible
// without JS or with prefers-reduced-motion)
const revealTargets = document.querySelectorAll("[data-reveal]");
if ("IntersectionObserver" in window && revealTargets.length) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.dataset.reveal = "true";
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
  );
  revealTargets.forEach((el) => observer.observe(el));
} else {
  revealTargets.forEach((el) => (el.dataset.reveal = "true"));
}

// ============================================================
// FAQ accordion
// ============================================================
document.querySelectorAll(".faq-item").forEach((item) => {
  const question = item.querySelector(".faq-question");
  if (!question) return;
  question.addEventListener("click", () => {
    const isOpen = item.dataset.open === "true";
    item.closest(".faq-list")?.querySelectorAll(".faq-item").forEach((other) => {
      if (other !== item) other.dataset.open = "false";
      other.querySelector(".faq-question")?.setAttribute("aria-expanded", "false");
    });
    item.dataset.open = isOpen ? "false" : "true";
    question.setAttribute("aria-expanded", String(!isOpen));
  });
});

// ============================================================
// Gallery lightbox
// ============================================================
const galleryItems = Array.from(document.querySelectorAll("[data-gallery-item]"));
const lightbox = document.getElementById("lightbox");
if (galleryItems.length && lightbox) {
  const lightboxImg = lightbox.querySelector("img");
  const closeBtn = lightbox.querySelector(".lightbox-close");
  const prevBtn = lightbox.querySelector(".lightbox-prev");
  const nextBtn = lightbox.querySelector(".lightbox-next");
  let currentIndex = 0;
  let visibleItems = galleryItems;

  const openLightbox = (index) => {
    visibleItems = galleryItems.filter((el) => el.offsetParent !== null);
    currentIndex = visibleItems.indexOf(index);
    if (currentIndex === -1) currentIndex = 0;
    updateLightbox();
    lightbox.dataset.open = "true";
    document.body.style.overflow = "hidden";
    closeBtn?.focus();
  };

  const updateLightbox = () => {
    const el = visibleItems[currentIndex];
    if (!el || !lightboxImg) return;
    lightboxImg.src = el.dataset.full || el.querySelector("img").src;
    lightboxImg.alt = el.querySelector("img").alt || "";
  };

  const closeLightbox = () => {
    lightbox.dataset.open = "false";
    document.body.style.overflow = "";
  };

  galleryItems.forEach((item) => {
    item.addEventListener("click", () => openLightbox(item));
  });

  closeBtn?.addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  prevBtn?.addEventListener("click", () => {
    currentIndex = (currentIndex - 1 + visibleItems.length) % visibleItems.length;
    updateLightbox();
  });
  nextBtn?.addEventListener("click", () => {
    currentIndex = (currentIndex + 1) % visibleItems.length;
    updateLightbox();
  });
  document.addEventListener("keydown", (e) => {
    if (lightbox.dataset.open !== "true") return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") prevBtn?.click();
    if (e.key === "ArrowRight") nextBtn?.click();
  });
}

// Gallery filters
const filterButtons = document.querySelectorAll("[data-gallery-filter]");
if (filterButtons.length) {
  filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const filter = btn.dataset.galleryFilter;
      filterButtons.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      document.querySelectorAll("[data-gallery-item]").forEach((item) => {
        const match = filter === "all" || item.dataset.tour === filter;
        item.style.display = match ? "" : "none";
      });
    });
  });
}

// ============================================================
// Booking form — tour + date + pricing summary
// ============================================================
const bookingForm = document.getElementById("bookingForm");
if (bookingForm) {
  const TOURS = {
    "vimy-to-victory": { name: "Vimy to Victory Day Tour", price: 320, days: 1 },
    "in-flanders-fields": { name: "In Flanders Fields Tour", price: 420, days: 1 },
    "somme-front": { name: "The Somme Front Day Tour", price: 320, days: 1 },
    "signature-2-day": { name: "The Signature — 2 Day Canadian Tour", price: 740, days: 2 },
    "ultimate-3-day": { name: "The Ultimate — 3 Day Canadian Tour", price: 1380, days: 3 },
  };

  const tourRadios = bookingForm.querySelectorAll('input[name="tour"]');
  const guestsInput = document.getElementById("guests");
  const summaryTour = document.getElementById("summaryTour");
  const summaryGuests = document.getElementById("summaryGuests");
  const summaryPerPerson = document.getElementById("summaryPerPerson");
  const summarySubtotal = document.getElementById("summarySubtotal");
  const summaryDeposit = document.getElementById("summaryDeposit");
  const dateHint = document.getElementById("dateAvailabilityHint");
  const dateInput = document.getElementById("preferredDate");

  const RUN_DAYS = {
    "vimy-to-victory": [2, 5, 0], // Tue, Fri, Sun
    "in-flanders-fields": [1, 4], // Mon, Thu
    "somme-front": [3, 6], // Wed, Sat
    "signature-2-day": [1, 4], // Mon, Thu (start)
    "ultimate-3-day": [1, 4], // Mon, Thu (start)
  };
  const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const getSelectedTour = () => {
    const checked = Array.from(tourRadios).find((r) => r.checked);
    return checked ? checked.value : null;
  };

  const updateSummary = () => {
    const tourKey = getSelectedTour();
    const guests = Math.max(1, parseInt(guestsInput?.value || "1", 10) || 1);
    if (!tourKey) return;
    const tour = TOURS[tourKey];
    const subtotal = tour.price * guests;
    const deposit = Math.round(subtotal * 0.3);

    if (summaryTour) summaryTour.textContent = tour.name;
    if (summaryGuests) summaryGuests.textContent = String(guests);
    if (summaryPerPerson) summaryPerPerson.textContent = `$${tour.price.toLocaleString()} CAD`;
    if (summarySubtotal) summarySubtotal.textContent = `$${subtotal.toLocaleString()} CAD`;
    if (summaryDeposit) summaryDeposit.textContent = `$${deposit.toLocaleString()} CAD`;

    if (dateHint) {
      const days = RUN_DAYS[tourKey].map((d) => DAY_NAMES[d]).join(", ");
      dateHint.textContent = `${tour.name} departs Arras every ${days}. Other days available on request — we'll confirm your exact date by email.`;
    }
  };

  tourRadios.forEach((radio) => radio.addEventListener("change", updateSummary));
  guestsInput?.addEventListener("input", updateSummary);

  // Pre-select tour from ?tour=slug when arriving from a tour detail page
  const preselect = new URLSearchParams(window.location.search).get("tour");
  if (preselect && TOURS[preselect]) {
    const match = bookingForm.querySelector(`input[name="tour"][value="${preselect}"]`);
    if (match) match.checked = true;
  }
  updateSummary();

  // Validate the preferred date falls on a valid running day; if not, warn (soft, not blocking)
  dateInput?.addEventListener("change", () => {
    const tourKey = getSelectedTour();
    if (!tourKey || !dateInput.value) return;
    const selectedDay = new Date(dateInput.value + "T00:00:00").getDay();
    const valid = RUN_DAYS[tourKey].includes(selectedDay);
    const warning = document.getElementById("dateWarning");
    if (warning) {
      warning.style.display = valid ? "none" : "block";
    }
  });

  // Step navigation (visual only — single-page form, steps are sections)
  const steps = bookingForm.querySelectorAll("[data-step]");
  const stepIndicators = document.querySelectorAll(".booking-step");
  const nextButtons = bookingForm.querySelectorAll("[data-step-next]");
  const backButtons = bookingForm.querySelectorAll("[data-step-back]");

  const showStep = (index) => {
    steps.forEach((step, i) => {
      step.style.display = i === index ? "" : "none";
    });
    stepIndicators.forEach((el, i) => {
      el.dataset.active = String(i === index);
    });
    window.scrollTo({ top: bookingForm.offsetTop - 120, behavior: "smooth" });
  };

  let currentStep = 0;
  if (steps.length) showStep(0);

  nextButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const currentFields = steps[currentStep]?.querySelectorAll("input, select, textarea");
      let valid = true;
      currentFields?.forEach((field) => {
        if (!field.checkValidity()) {
          valid = false;
        }
      });
      if (!valid) {
        steps[currentStep]?.querySelectorAll("input, select, textarea").forEach((f) => {
          if (!f.checkValidity()) f.reportValidity();
        });
        return;
      }
      currentStep = Math.min(currentStep + 1, steps.length - 1);
      showStep(currentStep);
    });
  });

  backButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      currentStep = Math.max(currentStep - 1, 0);
      showStep(currentStep);
    });
  });

  bookingForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!bookingForm.checkValidity()) {
      bookingForm.reportValidity();
      return;
    }
    const status = document.getElementById("bookingStatus");
    // TODO — wire real submission before launch:
    // 1) POST the form data to a form backend (e.g. Formspree) so you
    //    receive the guest's details (including age/country demographics).
    // 2) On success, redirect to a Stripe Checkout / Payment Link for the
    //    deposit shown in the summary panel, pre-filled with the amount.
    if (status) {
      status.textContent = "This is a placeholder confirmation — the booking form isn't connected to a payment processor yet. See js/main.js for where to add Stripe + your form backend.";
      status.dataset.visible = "true";
    }
    steps.forEach((step) => (step.style.display = "none"));
    stepIndicators.forEach((el) => (el.dataset.active = "false"));
  });
}

// ============================================================
// Contact form (placeholder — no backend wired yet)
// ============================================================
const contactForm = document.getElementById("contactForm");
if (contactForm) {
  contactForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const status = document.getElementById("formStatus");
    if (!contactForm.checkValidity()) {
      contactForm.reportValidity();
      return;
    }
    // TODO: replace this block with a real submit — e.g.
    // fetch("https://formspree.io/f/YOUR_ID", { method: "POST", body: new FormData(contactForm), headers: { Accept: "application/json" } })
    if (status) {
      status.textContent = "Thank you — this is a placeholder confirmation. Connect a form backend in js/main.js to actually receive messages.";
      status.dataset.visible = "true";
    }
    contactForm.reset();
  });
}
