class I18n {
  constructor() {
    this.currentLanguage = localStorage.getItem('language') || 'en';
    this.translations = {};
    this.loadedLanguages = new Set();
    this.init();
  }

  async init() {
    await this.loadLanguage(this.currentLanguage);
    this.updateLanguage();
    this.setupLanguageSwitcher();
  }

  async loadLanguage(lang) {
    if (this.loadedLanguages.has(lang)) {
      return;
    }

    try {
      const response = await fetch(`js/translations/${lang}.json`);
      const translations = await response.json();
      this.translations[lang] = translations;
      this.loadedLanguages.add(lang);
    } catch (error) {
      console.error(`Failed to load language ${lang}:`, error);
      // Fallback to English if language loading fails
      if (lang !== 'en') {
        await this.loadLanguage('en');
      }
    }
  }

  async setLanguage(lang) {
    if (!this.loadedLanguages.has(lang)) {
      await this.loadLanguage(lang);
    }
    this.currentLanguage = lang;
    localStorage.setItem('language', lang);
    this.updateLanguage();
    this.updateLanguageSwitcher();
  }

  t(key) {
    const keys = key.split('.');
    let value = this.translations[this.currentLanguage];
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return key; // Return key if translation not found
      }
    }
    
    return value || key;
  }

  updateLanguage() {
    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      const translation = this.t(key);
      
      if (element.tagName === 'INPUT' && element.type === 'placeholder') {
        element.placeholder = translation;
      } else {
        element.textContent = translation;
      }
    });

    // Update HTML lang attribute
    document.documentElement.lang = this.currentLanguage;

    // Update text direction for RTL languages (if needed in future)
    if (this.currentLanguage === 'ar') {
      document.documentElement.dir = 'rtl';
    } else {
      document.documentElement.dir = 'ltr';
    }
  }

  setupLanguageSwitcher() {
    // Create language switcher if it doesn't exist
    let switcher = document.querySelector('.language-switcher');
    if (!switcher) {
      switcher = document.createElement('div');
      switcher.className = 'language-switcher';
      switcher.innerHTML = `
        <button class="language-btn" data-lang="en">EN</button>
        <button class="language-btn" data-lang="si">සිං</button>
        <button class="language-btn" data-lang="ta">த</button>
      `;
      
      // Add to nav-actions
      const navActions = document.querySelector('.nav-actions');
      if (navActions) {
        navActions.appendChild(switcher);
      }
    }

    // Add click handlers
    switcher.querySelectorAll('.language-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const lang = btn.getAttribute('data-lang');
        await this.setLanguage(lang);
      });
    });

    this.updateLanguageSwitcher();
  }

  updateLanguageSwitcher() {
    document.querySelectorAll('.language-btn').forEach(btn => {
      if (btn.getAttribute('data-lang') === this.currentLanguage) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }
}

// Initialize i18n when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.i18n = new I18n();
});
