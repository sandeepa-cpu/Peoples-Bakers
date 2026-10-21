/* Home hero — Swiper fade + GSAP bob + mouse 3D tilt. Do not tween Swiper's transform. */
(function setupHeroBanner() {
  if (!document.body.classList.contains("home-page")) return;

  var root = document.querySelector("[data-home-banner]");
  var swiperEl = document.querySelector("[data-hero-swiper]");
  if (!root || !swiperEl || typeof window.Swiper !== "function") return;

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isMobile = window.matchMedia("(max-width: 640px)").matches;
  var coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  var skipSpin = reducedMotion || coarsePointer || isMobile;
  var finePointer = window.matchMedia("(pointer: fine)").matches;
  var gsap = window.gsap || null;
  var ScrollTrigger = window.ScrollTrigger || null;
  var hasGsap = !!(gsap && typeof gsap.timeline === "function");

  if (hasGsap && ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
  }

  var overlay = root.querySelector("[data-hero-overlay]");
  var veil = root.querySelector("[data-hero-veil]");
  var glowEl = root.querySelector("[data-hero-glow]");
  var copyEl = root.querySelector("[data-hero-copy]");
  var copyBadge = root.querySelector("[data-hero-copy-badge]");
  var copyName = root.querySelector("[data-hero-copy-name]");
  var copyPrice = root.querySelector("[data-hero-copy-price]");
  var ctaPrimary = root.querySelector("[data-hero-cta-primary]");
  var ctaSecondary = root.querySelector("[data-hero-cta-secondary]");
  var platforms = root.querySelector("[data-hero-platforms]");
  var dots = Array.prototype.slice.call(
    root.querySelectorAll("[data-home-banner-dots] [data-slide-to]")
  );
  var btnPrev = root.querySelector("[data-home-banner-prev]");
  var btnNext = root.querySelector("[data-home-banner-next]");
  var wrapper = swiperEl.querySelector(".swiper-wrapper");
  var section = document.getElementById("home") || root;

  var introDone = false;
  var introTl = null;
  var spinTw = null;
  var bobTw = null;
  var transTl = null;
  var tiltXTo = null;
  var tiltYTo = null;
  var activeTilt = null;
  var tabHidden = false;
  var offscreen = false;
  var hoverPaused = false;
  var swiperSpeed = reducedMotion ? 0 : 700;

  function slideParts(slide) {
    if (!slide) return {};
    return {
      slide: slide,
      orbit: slide.querySelector(".hero-orbit"),
      bob: slide.querySelector(".hero-bob"),
      spin: slide.querySelector(".hero-spin"),
      tilt: slide.querySelector(".hero-tilt"),
      img: slide.querySelector("img"),
    };
  }

  function activeSlide() {
    return swiperEl.querySelector(".swiper-slide-active") || swiperEl.querySelector(".swiper-slide");
  }

  function activeImg() {
    var parts = slideParts(activeSlide());
    return parts.img || swiperEl.querySelector(".swiper-slide img");
  }

  function syncDots(index) {
    dots.forEach(function (dot, i) {
      var on = i === index;
      dot.classList.toggle("is-active", on);
      dot.setAttribute("aria-selected", on ? "true" : "false");
    });
  }

  function setMoving(on) {
    swiperEl.classList.toggle("is-moving", !!on);
    if (wrapper) {
      wrapper.style.willChange = on ? "opacity" : "";
    }
  }

  function syncGlow(img) {
    if (!glowEl) return;
    var src = img && (img.currentSrc || img.getAttribute("src"));
    glowEl.style.backgroundImage = src ? "url(\"" + src + "\")" : "";
  }

  function applyCopy(slide) {
    var badge = (slide && slide.getAttribute("data-hero-badge")) || "";
    var name = (slide && slide.getAttribute("data-hero-name")) || "";
    var price = (slide && slide.getAttribute("data-hero-price")) || "";
    if (copyBadge) {
      copyBadge.textContent = badge;
      copyBadge.hidden = !badge;
    }
    if (copyName) copyName.textContent = name;
    if (copyPrice) {
      copyPrice.textContent = price;
      copyPrice.hidden = !price;
    }
  }

  function syncCopy(slide) {
    if (reducedMotion || !hasGsap || !copyEl) {
      applyCopy(slide);
      return;
    }
    gsap.to(copyEl, {
      opacity: 0,
      duration: 0.18,
      overwrite: "auto",
      onComplete: function () {
        applyCopy(slide);
        gsap.to(copyEl, { opacity: 1, duration: 0.35, ease: "power2.out" });
      },
    });
  }

  function morphStage(slide) {
    if (root.closest(".hero--fab")) return;
    var color = (slide && slide.getAttribute("data-hero-bg")) || "#2D1810";
    var light = !!(slide && slide.getAttribute("data-hero-light") === "true");
    root.classList.toggle("is-hero-light", light);
    if (!hasGsap || reducedMotion) {
      root.style.backgroundColor = color;
      return;
    }
    gsap.to(root, {
      backgroundColor: color,
      duration: 0.7,
      ease: "power2.inOut",
      overwrite: "auto",
    });
  }

  function killOrbit() {
    if (spinTw) {
      spinTw.kill();
      spinTw = null;
    }
    if (bobTw) {
      bobTw.kill();
      bobTw = null;
    }
    tiltXTo = null;
    tiltYTo = null;
  }

  function restPose(slide) {
    var parts = slideParts(slide);
    if (!hasGsap) return;
    if (parts.bob) gsap.set(parts.bob, { y: 0, x: 0, scale: 1, rotateX: 0, rotateY: 0, rotateZ: 0 });
    if (parts.spin) gsap.set(parts.spin, { rotateY: 0, rotateX: 0, rotateZ: 0, scale: 1 });
    if (parts.tilt) gsap.set(parts.tilt, { rotateX: 0, rotateY: 0, rotateZ: 0, z: 0 });
    if (parts.orbit) gsap.set(parts.orbit, { scale: 1 });
  }

  function bindTilt(tilt) {
    activeTilt = tilt || null;
    if (!hasGsap || !tilt || reducedMotion || isMobile) {
      tiltXTo = null;
      tiltYTo = null;
      return;
    }
    tiltXTo = gsap.quickTo(tilt, "rotateX", { duration: 0.28, ease: "power3.out" });
    tiltYTo = gsap.quickTo(tilt, "rotateY", { duration: 0.28, ease: "power3.out" });
  }

  function startOrbit(slide) {
    killOrbit();
    if (root.closest(".hero--fab") || root.closest(".hero--promo-banners")) return;
    if (!slide || !hasGsap || reducedMotion || !introDone) return;
    if (tabHidden || offscreen) return;

    var parts = slideParts(slide);
    if (parts.orbit) {
      gsap.set(parts.orbit, { transformPerspective: 1400, transformStyle: "preserve-3d" });
    }
    if (parts.bob) gsap.set(parts.bob, { force3D: true, transformOrigin: "50% 55%", y: 0 });
    if (parts.spin) gsap.set(parts.spin, { force3D: true, transformOrigin: "50% 50%", rotateY: 0, rotateX: 0 });
    if (parts.tilt) gsap.set(parts.tilt, { force3D: true, transformOrigin: "50% 45%", rotateX: 0, rotateY: 0, z: 0 });

    if (parts.bob) {
      gsap.set(parts.bob, { y: skipSpin ? 0 : -8 });
      bobTw = gsap.to(parts.bob, {
        y: skipSpin ? -6 : 8,
        duration: 3.4,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      });
    }

    bindTilt(parts.tilt);
  }

  function playSlideSwap(instance) {
    if (!introDone || !instance) return;
    var incomingSlide = instance.slides[instance.activeIndex];
    var outgoingSlide = instance.slides[instance.previousIndex];
    var incoming = slideParts(incomingSlide);
    if (incomingSlide && outgoingSlide && incomingSlide === outgoingSlide) outgoingSlide = null;

    killOrbit();
    if (transTl) {
      transTl.kill();
      transTl = null;
    }

    syncGlow(incoming.img);
    morphStage(incomingSlide);
    syncCopy(incomingSlide);

    if (reducedMotion || !hasGsap) {
      restPose(incomingSlide);
      restPose(outgoingSlide);
      return;
    }

    transTl = gsap.timeline({
      onComplete: function () {
        transTl = null;
        restPose(outgoingSlide);
        startOrbit(incomingSlide);
      },
    });

    if (incoming.orbit) {
      transTl.fromTo(
        incoming.orbit,
        { scale: 0.94 },
        { scale: 1, duration: 0.52, ease: "power3.out" },
        0
      );
    }
  }

  function showOverlayNow() {
    var nodes = [veil, copyEl, ctaPrimary, ctaSecondary, platforms, btnPrev, btnNext];
    dots.forEach(function (dot) {
      nodes.push(dot);
    });
    nodes.forEach(function (el) {
      if (!el) return;
      el.style.opacity = "1";
      el.style.transform = "none";
      el.style.filter = "none";
    });
    restPose(activeSlide());
  }

  function playIntro() {
    if (introDone) return;
    introDone = true;
    root.classList.add("is-hero-ready");

    var slide = activeSlide();
    var parts = slideParts(slide);
    syncGlow(parts.img);
    morphStage(slide);
    applyCopy(slide);

    if (reducedMotion || !hasGsap) {
      showOverlayNow();
      startAutoplay();
      return;
    }

    introTl = gsap.timeline({
      defaults: { ease: "power3.out" },
      onComplete: function () {
        startAutoplay();
        startOrbit(activeSlide());
      },
    });

    if (veil) {
      introTl.fromTo(veil, { opacity: 0 }, { opacity: 1, duration: 0.28 }, 0);
    }
    if (parts.orbit) {
      introTl.fromTo(
        parts.orbit,
        { scale: 0.94 },
        { scale: 1, duration: 0.52, ease: "power3.out" },
        0.08
      );
    }
    if (copyEl) {
      introTl.fromTo(copyEl, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.4 }, 0.16);
    }
    if (ctaPrimary) {
      introTl.fromTo(
        ctaPrimary,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.42 },
        0.2
      );
      introTl.to(
        ctaPrimary,
        { scale: 1.03, duration: 0.04, yoyo: true, repeat: 1, ease: "power1.out" },
        0.58
      );
    }
    if (ctaSecondary) {
      introTl.fromTo(
        ctaSecondary,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.42 },
        0.28
      );
    }
    if (platforms) {
      introTl.fromTo(platforms, { opacity: 0 }, { opacity: 1, duration: 0.32 }, 0.36);
    }
    if (dots.length) {
      introTl.fromTo(dots, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.32, stagger: 0.04 }, 0.44);
    }
    if (btnPrev) {
      introTl.fromTo(btnPrev, { opacity: 0 }, { opacity: 1, duration: 0.32 }, 0.44);
      var prevIcon = btnPrev.querySelector("i");
      if (prevIcon) introTl.fromTo(prevIcon, { x: -12 }, { x: 0, duration: 0.32 }, 0.44);
    }
    if (btnNext) {
      introTl.fromTo(btnNext, { opacity: 0 }, { opacity: 1, duration: 0.32 }, 0.44);
      var nextIcon = btnNext.querySelector("i");
      if (nextIcon) introTl.fromTo(nextIcon, { x: 12 }, { x: 0, duration: 0.32 }, 0.44);
    }
  }

  function startAutoplay() {
    if (reducedMotion || !swiper || !swiper.autoplay) return;
    if (hoverPaused || tabHidden || offscreen) return;
    swiper.autoplay.start();
  }

  function pauseAutoplay() {
    if (swiper && swiper.autoplay) swiper.autoplay.stop();
  }

  function syncPause() {
    if (!introDone || hoverPaused || tabHidden || offscreen) {
      pauseAutoplay();
      if (tabHidden || offscreen) killOrbit();
      return;
    }
    startAutoplay();
    if (!spinTw && !bobTw) startOrbit(activeSlide());
  }

  if (hasGsap && !reducedMotion) {
    gsap.set(
      [veil, copyEl, ctaPrimary, ctaSecondary, platforms].filter(Boolean),
      { opacity: 0 }
    );
    gsap.set(dots, { opacity: 0 });
    gsap.set(btnPrev, { opacity: 0 });
    gsap.set(btnNext, { opacity: 0 });
  }

  var swiper = new window.Swiper(swiperEl, {
    loop: true,
    loopAdditionalSlides: 1,
    speed: swiperSpeed,
    effect: "fade",
    fadeEffect: {
      crossFade: true,
    },
    grabCursor: true,
    slidesPerView: 1,
    preloadImages: false,
    watchSlidesProgress: true,
    keyboard: {
      enabled: true,
      onlyInViewport: true,
    },
    a11y: {
      enabled: true,
      prevSlideMessage: "Previous slide",
      nextSlideMessage: "Next slide",
    },
    autoplay: {
      delay: 4500,
      disableOnInteraction: false,
      pauseOnMouseEnter: false,
    },
    navigation: {
      prevEl: btnPrev,
      nextEl: btnNext,
    },
    on: {
      init: function (instance) {
        var slide = instance.slides[instance.activeIndex];
        syncDots(instance.realIndex);
        syncGlow(slideParts(slide).img);
        morphStage(slide);
        applyCopy(slide);
        if (instance.autoplay) instance.autoplay.stop();
      },
      slideChange: function (instance) {
        syncDots(instance.realIndex);
      },
      sliderMove: function () {
        setMoving(true);
      },
      slideChangeTransitionStart: function (instance) {
        setMoving(true);
        playSlideSwap(instance);
      },
      slideChangeTransitionEnd: function (instance) {
        setMoving(false);
        if (!transTl) startOrbit(instance.slides[instance.activeIndex]);
      },
      transitionEnd: function () {
        setMoving(false);
      },
    },
  });

  if (swiper.autoplay) swiper.autoplay.stop();
  if (hasGsap && !reducedMotion) {
    var firstOrbit = slideParts(activeSlide()).orbit;
    if (firstOrbit) gsap.set(firstOrbit, { scale: 0.94 });
  }

  dots.forEach(function (dot) {
    dot.addEventListener("click", function () {
      var target = Number(dot.getAttribute("data-slide-to"));
      if (isNaN(target) || !swiper) return;
      pauseAutoplay();
      if (typeof swiper.slideToLoop === "function") {
        swiper.slideToLoop(target, swiperSpeed);
      } else {
        swiper.slideTo(target, swiperSpeed);
      }
      if (swiper.autoplay) {
        window.setTimeout(syncPause, swiperSpeed + 80);
      }
    });
  });

  function applyTiltFromPointer(clientX, clientY) {
    if (root.closest(".hero--fab")) return;
    if (reducedMotion || isMobile || !hasGsap) return;
    var tilt = activeTilt || slideParts(activeSlide()).tilt;
    if (!tilt) return;
    if (!tiltXTo || !tiltYTo) bindTilt(tilt);
    if (!tiltXTo || !tiltYTo) return;
    var rect = root.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    if (
      clientX < rect.left ||
      clientX > rect.right ||
      clientY < rect.top ||
      clientY > rect.bottom
    ) {
      return;
    }
    var nx = (clientX - rect.left) / rect.width - 0.5;
    var ny = (clientY - rect.top) / rect.height - 0.5;
    tiltXTo(ny * -22);
    tiltYTo(nx * 32);
  }

  root.addEventListener("mousemove", function (e) {
    applyTiltFromPointer(e.clientX, e.clientY);
  });
  window.addEventListener(
    "pointermove",
    function (e) {
      applyTiltFromPointer(e.clientX, e.clientY);
    },
    { passive: true }
  );
  root.addEventListener("mouseenter", function () {
    if (root.closest(".hero--fab")) return;
    hoverPaused = true;
    syncPause();
  });
  root.addEventListener("mouseleave", function () {
    hoverPaused = false;
    if (tiltXTo) tiltXTo(0);
    if (tiltYTo) tiltYTo(0);
    syncPause();
  });
  root.addEventListener("focusin", function () {
    hoverPaused = true;
    syncPause();
  });
  root.addEventListener("focusout", function (e) {
    if (root.contains(e.relatedTarget)) return;
    hoverPaused = false;
    syncPause();
  });

  root.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      swiper.slideNext();
      return;
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      swiper.slidePrev();
    }
  });

  document.addEventListener("visibilitychange", function () {
    tabHidden = document.hidden;
    syncPause();
  });

  if ("IntersectionObserver" in window) {
    var visObs = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          offscreen = entry.intersectionRatio < 0.2;
          syncPause();
        });
      },
      { threshold: [0, 0.2, 1] }
    );
    visObs.observe(section);
  }

  if (hasGsap && ScrollTrigger && !reducedMotion) {
    ScrollTrigger.create({
      trigger: section,
      start: "top 88%",
      once: true,
      onEnter: playIntro,
    });
    ScrollTrigger.create({
      trigger: section,
      start: "top 88%",
      onEnterBack: function () {
        if (!introDone || !overlay) return;
        gsap.fromTo(overlay, { opacity: 0.72 }, { opacity: 1, duration: 0.18, overwrite: true });
      },
    });
  } else {
    playIntro();
  }
})();
