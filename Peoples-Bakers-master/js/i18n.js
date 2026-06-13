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
    try {
      await this.loadLanguage('en');
      if (this.currentLanguage !== 'en') {
        const loaded = await this.loadLanguage(this.currentLanguage);
        if (!loaded) {
          this.currentLanguage = 'en';
        }
      }
    } catch (e) {
      console.error('i18n: failed to load default language', e);
    }
    try {
      this.updateLanguage();
    } catch (e) {
      console.error('i18n: updateLanguage failed (page may show mixed EN)', e);
    }
    try {
      this.setupLanguageSwitcher();
    } catch (e) {
      console.error('i18n: setupLanguageSwitcher failed', e);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('i18n:ready', { detail: { language: this.currentLanguage } })
      );
    }
    this.emitLanguageChange();
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
    this.emitLanguageChange();
  }

  getTranslationValue(lang, key) {
    if (key == null || typeof key !== 'string') {
      return null;
    }
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

  t(key, vars) {
    if (key == null) {
      return '';
    }
    const keyStr = typeof key === 'string' ? key : String(key);
    let s =
      this.getTranslationValue(this.currentLanguage, keyStr) ||
      this.getTranslationValue('en', keyStr) ||
      keyStr;
    /* Leaf can be a number in JSON, or a mistaken nested object — never call .split on non-strings */
    if (typeof s === 'string') {
      if (vars && typeof vars === 'object') {
        Object.keys(vars).forEach(k => {
          s = s.split(`{{${k}}}`).join(String(vars[k]));
        });
      }
      return s;
    }
    if (s == null || (typeof s === 'object' && s !== null)) {
      return keyStr;
    }
    if (typeof s === 'number' && vars && typeof vars === 'object') {
      s = String(s);
      Object.keys(vars).forEach(k => {
        s = s.split(`{{${k}}}`).join(String(vars[k]));
      });
      return s;
    }
    return String(s);
  }

  updateLanguage() {
    const applyI18n = (element, setFn) => {
      try {
        setFn();
      } catch (err) {
        console.warn('i18n: skipped one element', err);
      }
    };

    document.querySelectorAll('[data-i18n]').forEach(element => {
      applyI18n(element, () => {
        const key = element.getAttribute('data-i18n');
        if (key == null || key === '') {
          return;
        }
        const translation = this.t(key);
        const asHtml = element.hasAttribute('data-i18n-html');
        if (asHtml) {
          element.innerHTML = translation;
          return;
        }
        const targetAttr = element.getAttribute('data-i18n-attr');
        if (targetAttr) {
          element.setAttribute(targetAttr, translation);
        } else {
          element.textContent = translation;
        }
      });
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
      applyI18n(element, () => {
        const key = element.getAttribute('data-i18n-placeholder');
        if (key) {
          element.setAttribute('placeholder', this.t(key));
        }
      });
    });

    document.querySelectorAll('[data-i18n-aria-label]').forEach(element => {
      applyI18n(element, () => {
        const key = element.getAttribute('data-i18n-aria-label');
        if (key) {
          element.setAttribute('aria-label', this.t(key));
        }
      });
    });

    const titleI18n = document.querySelector('title[data-i18n]');
    if (titleI18n) {
      try {
        const k = titleI18n.getAttribute('data-i18n');
        if (k) {
          titleI18n.textContent = this.t(k);
        }
      } catch (e) {
        console.warn('i18n: title update failed', e);
      }
    }

    // Update HTML lang attribute
    document.documentElement.lang = this.currentLanguage;

    // Update text direction for RTL languages (if needed in future)
    if (this.currentLanguage === 'ar') {
      document.documentElement.dir = 'rtl';
    } else {
      document.documentElement.dir = 'ltr';
    }
  }

  /** Call after setLanguage; not inside updateLanguage (avoids re-entrancy / loops). */
  emitLanguageChange() {
    window.dispatchEvent(
      new CustomEvent('i18n:languageChanged', {
        detail: { language: this.currentLanguage },
      })
    );
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
