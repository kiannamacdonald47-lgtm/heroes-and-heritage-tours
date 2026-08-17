// Mark JS as available — CSS only hides [data-reveal] elements when this
// class is present, so content is never lost if JS fails to load.
document.documentElement.classList.add("js");

// Year stamp
document.querySelectorAll("[data-year]").forEach((el) => {
  el.textContent = new Date().getFullYear();
});

// Homepage hero carousel — auto-advances and crossfades; dots and
// prefers-reduced-motion both just stop the timer, since a static
// first slide is always a complete, valid hero on its own.
const heroCarousel = document.getElementById("heroCarousel");
if (heroCarousel) {
  const slides = Array.from(heroCarousel.querySelectorAll("[data-carousel-slide]"));
  const dots = Array.from(heroCarousel.querySelectorAll("[data-carousel-dot]"));
  let current = 0;
  let timer = null;

  const showSlide = (index) => {
    current = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => slide.classList.toggle("is-active", i === current));
    dots.forEach((dot, i) => {
      dot.classList.toggle("is-active", i === current);
      dot.setAttribute("aria-pressed", String(i === current));
    });
  };

  const startAutoplay = () => {
    stopAutoplay();
    timer = window.setInterval(() => showSlide(current + 1), 6000);
  };

  const stopAutoplay = () => {
    if (timer) window.clearInterval(timer);
    timer = null;
  };

  if (slides.length > 1) {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    dots.forEach((dot, i) => {
      dot.addEventListener("click", () => {
        showSlide(i);
        if (!prefersReducedMotion) startAutoplay();
      });
    });
    if (!prefersReducedMotion) startAutoplay();
  }
}

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

// Nav "Tours" dropdown — hover works on desktop via CSS; this adds a
// tap/click toggle so touch devices (no hover) can open it too.
document.querySelectorAll(".nav-dropdown").forEach((dropdown) => {
  const trigger = dropdown.querySelector(".nav-dropdown-trigger");
  if (!trigger) return;

  const closeDropdown = () => {
    dropdown.dataset.open = "false";
    trigger.setAttribute("aria-expanded", "false");
  };

  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = dropdown.dataset.open === "true";
    document.querySelectorAll(".nav-dropdown").forEach((d) => (d.dataset.open = "false"));
    dropdown.dataset.open = isOpen ? "false" : "true";
    trigger.setAttribute("aria-expanded", String(!isOpen));
  });

  dropdown.querySelectorAll(".nav-dropdown-menu a").forEach((link) => {
    link.addEventListener("click", closeDropdown);
  });
});

document.addEventListener("click", () => {
  document.querySelectorAll(".nav-dropdown").forEach((d) => {
    d.dataset.open = "false";
    const trigger = d.querySelector(".nav-dropdown-trigger");
    if (trigger) trigger.setAttribute("aria-expanded", "false");
  });
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    document.querySelectorAll(".nav-dropdown").forEach((d) => {
      d.dataset.open = "false";
      const trigger = d.querySelector(".nav-dropdown-trigger");
      if (trigger) trigger.setAttribute("aria-expanded", "false");
    });
  }
});

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
  // window.TOUR_DATA is injected by booking.njk at build time from the
  // CMS-managed tours.json — falls back to a static copy only if that
  // script tag is ever missing (e.g. a page built outside Eleventy).
  const TOUR_LIST = window.TOUR_DATA || [
    { slug: "vimy-to-victory", name: "Vimy to Victory Day Tour", price: 320, runDays: [2, 5, 0], departureCity: "Arras" },
    { slug: "in-flanders-fields", name: "In Flanders Fields Tour", price: 420, runDays: [1, 4], departureCity: "Arras" },
    { slug: "somme-front", name: "The Somme Front Day Tour", price: 320, runDays: [3, 6], departureCity: "Arras" },
    { slug: "signature-2-day", name: "The Signature: 2 Day Canadian Tour", price: 740, runDays: [1, 4], departureCity: "Arras" },
    { slug: "ultimate-3-day", name: "The Ultimate: 3 Day Canadian Tour", price: 1380, runDays: [1, 4], departureCity: "Arras" },
  ];

  const TOURS = {};
  const RUN_DAYS = {};
  TOUR_LIST.forEach((t) => {
    TOURS[t.slug] = { name: t.name, price: t.price, departureCity: t.departureCity };
    RUN_DAYS[t.slug] = t.runDays;
  });

  const tourRadios = bookingForm.querySelectorAll('input[name="tour"]');
  const guestsInput = document.getElementById("guests");
  const summaryTour = document.getElementById("summaryTour");
  const summaryGuests = document.getElementById("summaryGuests");
  const summaryPerPerson = document.getElementById("summaryPerPerson");
  const summarySubtotal = document.getElementById("summarySubtotal");
  const summaryDeposit = document.getElementById("summaryDeposit");
  const dateHint = document.getElementById("dateAvailabilityHint");
  const dateInput = document.getElementById("preferredDate");

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
      dateHint.textContent = `${tour.name} departs ${tour.departureCity} every ${days}. Other days available on request; we'll confirm your exact date by email.`;
    }
  };

  tourRadios.forEach((radio) => radio.addEventListener("change", updateSummary));
  guestsInput?.addEventListener("input", updateSummary);

  // Pre-select tour from ?tour=slug when arriving from a tour detail page
  const searchParams = new URLSearchParams(window.location.search);
  const preselect = searchParams.get("tour");
  if (preselect && TOURS[preselect]) {
    const match = bookingForm.querySelector(`input[name="tour"][value="${preselect}"]`);
    if (match) match.checked = true;
  }
  updateSummary();

  // Returning from a canceled Stripe Checkout: let the guest know their
  // details weren't lost and they can pick up where they left off.
  if (searchParams.get("canceled") === "true") {
    const status = document.getElementById("bookingStatus");
    if (status) {
      status.textContent = "Checkout was canceled, no payment was taken. Review your details below and try again whenever you're ready.";
      status.dataset.visible = "true";
    }
  }

  // ==========================================================
  // Interactive calendar — only lets guests click dates that
  // actually match the selected tour's recurring schedule, so
  // there's no way to submit a date the tour doesn't run on.
  // ==========================================================
  const calGrid = document.getElementById("calGrid");
  const calMonthLabel = document.getElementById("calMonthLabel");
  const calPrev = document.getElementById("calPrev");
  const calNext = document.getElementById("calNext");

  if (calGrid && calMonthLabel && calPrev && calNext && dateInput) {
    const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let viewYear = today.getFullYear();
    let viewMonth = today.getMonth();
    let selectedISO = null;

    const formatDisplay = (date) => `${DAY_NAMES[date.getDay()]}, ${MONTH_NAMES[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;

    const renderCalendar = () => {
      const tourKey = getSelectedTour();
      const runDays = RUN_DAYS[tourKey] || [];
      calMonthLabel.textContent = `${MONTH_NAMES[viewMonth]} ${viewYear}`;

      const firstOfMonth = new Date(viewYear, viewMonth, 1);
      const startOffset = firstOfMonth.getDay();
      const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

      calGrid.innerHTML = "";

      for (let i = 0; i < startOffset; i++) {
        const empty = document.createElement("span");
        empty.className = "booking-calendar-day booking-calendar-day--empty";
        calGrid.appendChild(empty);
      }

      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(viewYear, viewMonth, d);
        const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const isPast = date < today;
        const available = runDays.includes(date.getDay()) && !isPast;

        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = String(d);
        btn.className = "booking-calendar-day " + (available ? "booking-calendar-day--available" : "booking-calendar-day--unavailable");
        if (!available) btn.disabled = true;
        if (iso === selectedISO) btn.classList.add("booking-calendar-day--selected");
        btn.setAttribute("aria-label", formatDisplay(date) + (available ? "" : ", not available"));

        if (available) {
          btn.addEventListener("click", () => {
            selectedISO = iso;
            dateInput.value = formatDisplay(date);
            dateInput.dataset.iso = iso;
            renderCalendar();
          });
        }

        calGrid.appendChild(btn);
      }

      calPrev.disabled = viewYear === today.getFullYear() && viewMonth === today.getMonth();
    };

    calPrev.addEventListener("click", () => {
      viewMonth -= 1;
      if (viewMonth < 0) { viewMonth = 11; viewYear -= 1; }
      renderCalendar();
    });
    calNext.addEventListener("click", () => {
      viewMonth += 1;
      if (viewMonth > 11) { viewMonth = 0; viewYear += 1; }
      renderCalendar();
    });

    // Changing tour clears the selected date (a different tour may run
    // on different days) and re-renders against the new schedule.
    tourRadios.forEach((radio) => radio.addEventListener("change", () => {
      selectedISO = null;
      dateInput.value = "";
      renderCalendar();
    }));

    renderCalendar();
  }

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

  bookingForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!bookingForm.checkValidity()) {
      bookingForm.reportValidity();
      return;
    }
    const status = document.getElementById("bookingStatus");
    const submitBtn = bookingForm.querySelector('button[type="submit"]');
    const formData = new FormData(bookingForm);

    if (submitBtn) submitBtn.disabled = true;
    if (status) {
      status.textContent = "Redirecting you to secure checkout...";
      status.dataset.visible = "true";
    }

    try {
      const response = await fetch("/.netlify/functions/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tourSlug: formData.get("tour"),
          preferredDate: formData.get("preferredDate"),
          guests: formData.get("guests"),
          familyResearch: formData.get("familyResearch"),
          fullName: formData.get("fullName"),
          email: formData.get("email"),
          phone: formData.get("phone"),
          age: formData.get("age"),
          country: formData.get("country"),
          notes: formData.get("notes"),
        }),
      });

      if (!response.ok) throw new Error(await response.text());
      const { url } = await response.json();
      if (!url) throw new Error("No checkout URL returned.");
      window.location.href = url;
    } catch (err) {
      console.error("Checkout error:", err);
      if (submitBtn) submitBtn.disabled = false;
      if (status) {
        status.textContent = "We couldn't start checkout just now. Please try again, or contact us directly and we'll take your booking by hand.";
        status.dataset.visible = "true";
      }
    }
  });
}

// ============================================================
// Contact form (placeholder — no backend wired yet)
// ============================================================
const contactForm = document.getElementById("contactForm");
if (contactForm) {
  // Pre-select tour from ?tour=slug when arriving from a tour detail page
  const contactTourSelect = document.getElementById("tourInterest");
  const preselectTour = new URLSearchParams(window.location.search).get("tour");
  if (contactTourSelect && preselectTour) {
    const match = Array.from(contactTourSelect.options).find((o) => o.value === preselectTour);
    if (match) contactTourSelect.value = preselectTour;
  }

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
      status.textContent = "Thank you. This is a placeholder confirmation. Connect a form backend in js/main.js to actually receive messages.";
      status.dataset.visible = "true";
    }
    contactForm.reset();
  });
}

// ============================================================
// Homepage email capture form (placeholder, no backend wired yet)
// ============================================================
const emailCaptureForm = document.getElementById("emailCaptureForm");
if (emailCaptureForm) {
  emailCaptureForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const status = document.getElementById("signupStatus");
    if (!emailCaptureForm.checkValidity()) {
      emailCaptureForm.reportValidity();
      return;
    }
    // TODO: replace this block with a real submit, e.g.
    // fetch("https://formspree.io/f/YOUR_ID", { method: "POST", body: new FormData(emailCaptureForm), headers: { Accept: "application/json" } })
    if (status) {
      status.textContent = "Thank you. This is a placeholder confirmation. Connect a form backend in js/main.js to actually receive signups.";
      status.dataset.visible = "true";
    }
    emailCaptureForm.reset();
  });
}
