class I18n {
  constructor() {
    this.supportedLanguages = ['en', 'si', 'ta'];
    const savedLanguage = localStorage.getItem('language') || 'en';
    this.currentLanguage = this.supportedLanguages.includes(savedLanguage)
      ? savedLanguage
      : 'en';
    this.translations = {};
    this.loadedLanguages = new Set();
    this.init();
  }

  async init() {
    await this.loadLanguage('en');
    if (this.currentLanguage !== 'en') {
      const loaded = await this.loadLanguage(this.currentLanguage);
      if (!loaded) {
        this.currentLanguage = 'en';
      }
    }
    this.updateLanguage();
    this.setupLanguageSwitcher();
  }

  async loadLanguage(lang) {
    if (!this.supportedLanguages.includes(lang)) {
      console.warn(`Unsupported language requested: ${lang}`);
      return false;
    }

    if (this.loadedLanguages.has(lang)) {
      return true;
    }

    try {
      const response = await fetch(`js/translations/${lang}.json`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const translations = await response.json();
      this.translations[lang] = translations;
      this.loadedLanguages.add(lang);
      return true;
    } catch (error) {
      console.error(`Failed to load language ${lang}:`, error);
      return false;
    }
  }

  async setLanguage(lang) {
    if (!this.supportedLanguages.includes(lang)) {
      return;
    }

    let targetLanguage = lang;
    if (!this.loadedLanguages.has(lang)) {
      const loaded = await this.loadLanguage(lang);
      if (!loaded) {
        targetLanguage = 'en';
        await this.loadLanguage('en');
      }
    }

    this.currentLanguage = targetLanguage;
    localStorage.setItem('language', targetLanguage);
    this.updateLanguage();
    this.updateLanguageSwitcher();
  }

  getTranslationValue(lang, key) {
    if (!this.translations[lang]) {
      return null;
    }

    const keys = key.split('.');
    let value = this.translations[lang];

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return null;
      }
    }

    return value ?? null;
  }

  t(key) {
    return (
      this.getTranslationValue(this.currentLanguage, key) ||
      this.getTranslationValue('en', key) ||
      key
    );
  }

  updateLanguage() {
    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      const translation = this.t(key);

      const targetAttr = element.getAttribute('data-i18n-attr');
      if (targetAttr) {
        element.setAttribute(targetAttr, translation);
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
      switcher.setAttribute('role', 'group');
      switcher.setAttribute('aria-label', 'Select language');
      switcher.innerHTML = `
        <button class="language-btn" data-lang="en" type="button" title="English">EN</button>
        <button class="language-btn" data-lang="si" type="button" title="Sinhala">සිං</button>
        <button class="language-btn" data-lang="ta" type="button" title="Tamil">த</button>
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
        btn.setAttribute('aria-pressed', 'true');
      } else {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
      }
    });
  }
}

// Initialize i18n when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.i18n = new I18n();
});
