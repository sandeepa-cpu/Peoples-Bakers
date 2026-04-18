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

window.addEventListener('scroll', () => {
  const navbar = document.querySelector('.navbar');
  if (!navbar) {
    return;
  }

  if (window.scrollY > 50) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('service-worker.js')
      .catch((error) => {
        console.error('Service worker registration failed:', error);
      });
  });
}
