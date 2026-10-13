(function(global) {
  'use strict';

  const LANGUAGE_SETTING_KEY = 'languagePreference';
  const SOURCE_LOCALE = 'en-US';
  const SUPPORTED_LOCALES = ['en-US', 'es-ES', 'pt-BR'];
  const LOCALE_LABELS = {
    'auto': 'Auto',
    'en-US': 'English (United States)',
    'es-ES': 'Español (España)',
    'pt-BR': 'Português (Brasil)',
  };

  const state = {
    localePreference: 'auto',
    effectiveLocale: SOURCE_LOCALE,
    dictionary: {},
    sourceDictionary: {},
    initialized: false,
    refreshCallbacks: [],
  };

  function formatPositional(template, values) {
    if (!template || !values || !values.length) {
      return template;
    }

    return template.replace(/%(\d+)\$[sd]/g, (match, index) => {
      const value = values[Number(index) - 1];
      return value === undefined || value === null ? '' : String(value);
    });
  }

  function t(key, ...values) {
    const translated = state.dictionary[key];
    const source = state.sourceDictionary[key];
    const result = translated || source || key;
    return formatPositional(result, values);
  }

  function _n(singular, plural, count) {
    return count === 1 ? t(singular, count) : t(plural, count);
  }

  function normalizeDetectedLocale(rawLocale) {
    if (!rawLocale || typeof rawLocale !== 'string') {
      return SOURCE_LOCALE;
    }

    const locale = rawLocale.trim().replace(/_/g, '-');
    if (SUPPORTED_LOCALES.includes(locale)) {
      return locale;
    }

    const langPrefix = locale.split('-')[0];
    const match = SUPPORTED_LOCALES.find((supportedLocale) => supportedLocale.split('-')[0] === langPrefix);
    return match || SOURCE_LOCALE;
  }

  function detectLocaleFromNavigator() {
    const browserLocales = Array.isArray(navigator.languages) ? navigator.languages : [];
    const preferredBrowserLocale = browserLocales[0] || navigator.language || SOURCE_LOCALE;
    return normalizeDetectedLocale(preferredBrowserLocale);
  }

  function detectLocale() {
    return new Promise((resolve) => {
      if (typeof tizen === 'undefined' || !tizen.systeminfo || typeof tizen.systeminfo.getPropertyValue !== 'function') {
        resolve(detectLocaleFromNavigator());
        return;
      }

      try {
        tizen.systeminfo.getPropertyValue('LOCALE', (localeInfo) => {
          const languageRaw = localeInfo && localeInfo.language ? String(localeInfo.language).trim() : '';
          const countryRaw = localeInfo && localeInfo.country ? String(localeInfo.country).trim() : '';
          const language = languageRaw ? languageRaw.toLowerCase() : '';
          const country = countryRaw ? countryRaw.toUpperCase() : '';
          let locale = '';

          if (language && /[-_]/.test(language)) {
            locale = language;
          } else if (language && country) {
            locale = `${language}-${country}`;
          } else {
            locale = language || country || '';
          }

          resolve(normalizeDetectedLocale(locale));
        }, () => {
          resolve(detectLocaleFromNavigator());
        });
      } catch (error) {
        resolve(detectLocaleFromNavigator());
      }
    });
  }

  function readStoredPreference() {
    return new Promise((resolve) => {
      if (typeof window.getData === 'function') {
        try {
          window.getData(LANGUAGE_SETTING_KEY, (savedValue) => {
            const storedPreference = savedValue && typeof savedValue[LANGUAGE_SETTING_KEY] === 'string'
              ? savedValue[LANGUAGE_SETTING_KEY]
              : '';
            resolve(storedPreference);
          });
          return;
        } catch (error) {
          console.warn('[i18n.js] Failed to read language preference from settings store:', error);
        }
      }
      resolve('');
    });
  }

  function writeStoredPreference(preference) {
    const value = preference || 'auto';
    if (typeof window.storeData === 'function') {
      try {
        window.storeData(LANGUAGE_SETTING_KEY, value, null);
      } catch (error) {
        console.warn('[i18n.js] Failed to persist language preference in settings store:', error);
      }
    }
  }

  function loadLocaleFile(locale) {
    return fetch(`static/locales/${locale}.json`, { cache: 'no-store' }).then((response) => {
      if (!response.ok) {
        throw new Error(`Locale file not found: ${locale}`);
      }
      return response.json();
    });
  }

  function updateDocumentLanguage(locale) {
    document.documentElement.setAttribute('lang', locale || SOURCE_LOCALE);
  }

  function updateLocalizedSelections() {
    const selectLanguage = document.getElementById('selectLanguage');
    if (selectLanguage) {
      const value = selectLanguage.getAttribute('data-value') || state.localePreference || 'auto';
      selectLanguage.textContent = LOCALE_LABELS[value] || LOCALE_LABELS.auto;
    }

    const selectResolution = document.getElementById('selectResolution');
    if (selectResolution) {
      const selectedItem = document.querySelector(`.videoResolutionMenu li[data-value="${selectResolution.dataset.value}"]`);
      if (selectedItem) {
        selectResolution.textContent = t(selectedItem.getAttribute('data-i18n') || selectedItem.textContent.trim());
      }
    }

    const selectFramerate = document.getElementById('selectFramerate');
    if (selectFramerate) {
      const selectedItem = document.querySelector(`.videoFramerateMenu li[data-value="${selectFramerate.dataset.value}"]`);
      if (selectedItem) {
        selectFramerate.textContent = t(selectedItem.getAttribute('data-i18n') || selectedItem.textContent.trim());
      }
    }

    const selectAudioBackend = document.getElementById('selectAudioBackend');
    if (selectAudioBackend) {
      const selectedItem = document.querySelector(`.audioBackendMenu li[data-value="${selectAudioBackend.dataset.value}"]`);
      if (selectedItem) {
        selectAudioBackend.textContent = t(selectedItem.getAttribute('data-i18n') || selectedItem.textContent.trim());
      }
    }

    const selectAudio = document.getElementById('selectAudio');
    if (selectAudio) {
      const selectedItem = document.querySelector(`.audioConfigMenu li[data-value="${selectAudio.dataset.value}"]`);
      if (selectedItem) {
        selectAudio.textContent = t(selectedItem.getAttribute('data-i18n') || selectedItem.textContent.trim());
      }
    }

    const selectCodec = document.getElementById('selectCodec');
    if (selectCodec) {
      const selectedItem = document.querySelector(`.videoCodecMenu li[data-value="${selectCodec.dataset.value}"]`);
      if (selectedItem) {
        selectCodec.textContent = t(selectedItem.getAttribute('data-i18n') || selectedItem.textContent.trim());
      }
    }
  }

  function refreshUI() {
    document.querySelectorAll('[data-i18n]').forEach((element) => {
      const key = element.getAttribute('data-i18n');
      const param = element.getAttribute('data-param');
      if (!key) {
        return;
      }
      element.textContent = param ? t(key, param) : t(key);
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
      const key = element.getAttribute('data-i18n-placeholder');
      if (!key) {
        return;
      }
      element.setAttribute('placeholder', t(key));
    });

    updateLocalizedSelections();
    state.refreshCallbacks.forEach((cb) => cb());
  }

  function populateLanguageMenu(onSelect) {
    const menu = document.querySelector('ul.languageMenu');
    const button = document.getElementById('selectLanguage');
    if (!menu) return;

    // Build <li> items from LOCALE_LABELS
    Object.entries(LOCALE_LABELS).forEach(([value, label]) => {
      const li = document.createElement('li');
      li.className = 'mdl-menu__item';
      li.setAttribute('data-value', value);
      li.textContent = label;
      if (typeof onSelect === 'function') {
        li.addEventListener('click', onSelect);
      }
      menu.appendChild(li);
    });

    // Set the button text to match the current data-value
    if (button) {
      const currentValue = button.getAttribute('data-value') || 'auto';
      button.textContent = LOCALE_LABELS[currentValue] || LOCALE_LABELS['auto'];
    }
  }

  function applyLanguagePreference(preference) {
    state.localePreference = preference || 'auto';
    writeStoredPreference(state.localePreference);
    return setLanguage(state.localePreference);
  }

  function setLanguage(preference) {
    const selectedPreference = preference || state.localePreference || 'auto';
    const selectLanguage = document.getElementById('selectLanguage');
    if (selectLanguage) {
      selectLanguage.setAttribute('data-value', selectedPreference);
    }

    const resolveLocalePromise = selectedPreference === 'auto'
      ? detectLocale()
      : Promise.resolve(SUPPORTED_LOCALES.includes(selectedPreference) ? selectedPreference : SOURCE_LOCALE);

    return resolveLocalePromise.then((effectiveLocale) => loadLocaleFile(effectiveLocale).then((dict) => {
      state.effectiveLocale = effectiveLocale;
      state.dictionary = dict || {};
      updateDocumentLanguage(effectiveLocale);
      refreshUI();
      return effectiveLocale;
    })).catch((error) => {
      console.warn('[i18n.js] Failed to load locale. Falling back to source locale.', error);
      state.effectiveLocale = SOURCE_LOCALE;
      state.dictionary = state.sourceDictionary;
      updateDocumentLanguage(SOURCE_LOCALE);
      refreshUI();
      return SOURCE_LOCALE;
    });
  }

  function init() {
    if (state.initialized) {
      return Promise.resolve(state.effectiveLocale);
    }

    return readStoredPreference().then((storedPreference) => {
      const preference = storedPreference || 'auto';
      state.localePreference = preference;
      return loadLocaleFile(SOURCE_LOCALE)
        .then((sourceDict) => {
          state.sourceDictionary = sourceDict || {};
        })
        .catch(() => {
          state.sourceDictionary = {};
        })
        .then(() => setLanguage(preference))
        .then((effectiveLocale) => {
          state.initialized = true;
          return effectiveLocale;
        });
    });
  }

  global.i18n = {
    init,
    t,
    _n,
    refreshUI,
    setLanguage,
    applyLanguagePreference,
    populateLanguageMenu,
    getPreference: () => state.localePreference,
    getLocale: () => state.effectiveLocale,
    getSupportedLocales: () => SUPPORTED_LOCALES.slice(),
    onRefresh: (cb) => { state.refreshCallbacks.push(cb); },
  };

  global.t = t;
  global._n = _n;
  global.refreshUI = refreshUI;
})(window);
