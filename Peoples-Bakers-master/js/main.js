const counters = document.querySelectorAll('.counter');

const animateCounter = (counter) => {
  const target = parseInt(
    counter.getAttribute('data-target')
  );
  const duration = 2000;
  const step = target / (duration / 16);
  let current = 0;

  const timer = setInterval(() => {
    current += step;
    if (current >= target) {
      current = target;
      clearInterval(timer);
    }
    
    if (target >= 1000) {
      counter.textContent = 
        Math.floor(current / 1000) + 'K+';
    } else {
      counter.textContent = 
        Math.floor(current) + '+';
    }
  }, 16);
};

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.5 }
);

counters.forEach(counter => {
  observer.observe(counter);
});

let lastScrollY = window.scrollY;
window.addEventListener(
  'scroll',
  () => {
    const navbar = document.querySelector('.navbar');
    if (!navbar) {
      return;
    }

    const currentScrollY = window.scrollY;
    if (currentScrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }

    // Hide the social icon bar when scrolling down,
    // reveal it again while scrolling up.
    if (currentScrollY > 110 && currentScrollY > lastScrollY + 4) {
      document.body.classList.add('top-bar-hidden');
    } else if (currentScrollY < lastScrollY - 4 || currentScrollY <= 30) {
      document.body.classList.remove('top-bar-hidden');
    }

    lastScrollY = currentScrollY;
  },
  { passive: true }
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('service-worker.js')
      .catch((error) => {
        console.error('Service worker registration failed:', error);
      });
  });
}
