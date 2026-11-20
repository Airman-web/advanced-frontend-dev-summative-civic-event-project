/**
 * CivicEvents — core layer (no DOM rendering here).
 *
 *   CE.utils  formatting and small helpers
 *   CE.flash  one-shot messages that survive a redirect
 *   CE.auth   global auth context: token + { id, full_name, email, role }, and the ROLE GUARD
 *   CE.api    jQuery API client: Bearer header, error normalisation, upload progress, list cache
 */
(function (window, $) {
  'use strict';

  const CE = (window.CE = window.CE || {});
  const config = window.CE_CONFIG;

  /* =========================================================================
   * Utilities
   * ========================================================================= */
  const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const relativeTime = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  const TIME_UNITS = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];
  const formatWith = (options) => (value) => (value ? new Date(value).toLocaleString(undefined, options) : '—');
  const pad = (n) => String(n).padStart(2, '0');

  const utils = {
    /** Escape any API-provided value before interpolating it into HTML. */
    escape: (value) => String(value ?? '').replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]),
    param: (name) => new URLSearchParams(window.location.search).get(name),
    isUuid: (value) => UUID.test(value || ''),
    formatDate: formatWith({ dateStyle: 'medium' }),
    formatDateTime: formatWith({ dateStyle: 'medium', timeStyle: 'short' }),
    formatTime: formatWith({ timeStyle: 'short' }),
    timeAgo(value) {
      const seconds = (new Date(value) - Date.now()) / 1000;
      const unit = TIME_UNITS.find(([, size]) => Math.abs(seconds) >= size);
      return unit ? relativeTime.format(Math.round(seconds / unit[1]), unit[0]) : 'just now';
    },
    formatDuration(total) {
      if (!Number.isFinite(total) || total < 0) return '--:--';
      const h = Math.floor(total / 3600);
      const m = Math.floor(total / 60) % 60;
      const s = Math.floor(total % 60);
      return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
    },
    formatBytes: (bytes) => (bytes < 1048576 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1048576).toFixed(1)} MB`),
    plural: (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`,
    capitalize: (text = '') => text.charAt(0).toUpperCase() + text.slice(1),
    initials: (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('') || '?',
    debounce(fn, wait = 250) {
      let timer;
      return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), wait); };
    },
    /** ISO string → value for <input type="datetime-local"> in the user's timezone. */
    toDateTimeInput(value) {
      if (!value) return '';
      const date = new Date(value);
      return new Date(date - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    },
    mapUrl: (location) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`,
    /** Case-insensitive "does any field contain the query". An empty query matches everything. */
    matches: (query, ...fields) => !query || fields.some((f) => String(f ?? '').toLowerCase().includes(query.toLowerCase())),
    eventStatus(event) {
      const now = Date.now();
      if (new Date(event.ends_at || event.starts_at) < now) return 'past';
      return new Date(event.starts_at) <= now ? 'live' : 'upcoming';
    },
    /** Only same-site page names are accepted for ?next= redirects (prevents open redirects). */
    safeNext: (next) => (/^[\w-]+\.html(\?[\w=&%.-]*)?$/.test(next || '') ? next : null),
    currentPage: () => (window.location.pathname.split('/').pop() || 'index.html') + window.location.search,
  };

  /* =========================================================================
   * Flash messages (shown once on the next page load)
   * ========================================================================= */
  const FLASH_KEY = 'ce.flash';
  const flash = {
    set: (type, message) => sessionStorage.setItem(FLASH_KEY, JSON.stringify({ type, message })),
    take() {
      const raw = sessionStorage.getItem(FLASH_KEY);
      sessionStorage.removeItem(FLASH_KEY);
      try { return JSON.parse(raw); } catch { return null; }
    },
  };

  /* =========================================================================
   * Auth context
   * -------------------------------------------------------------------------
   * Token storage policy:
   *  - "Keep me signed in" unchecked → sessionStorage: cleared when the browser
   *    session ends; the safer default, especially on shared devices.
   *  - "Keep me signed in" checked   → localStorage: survives restarts. Trade-off:
   *    any script running on this origin (e.g. through XSS) could read it. We
   *    mitigate by escaping all API content before rendering, and the backend
   *    issues short-lived (1h) tokens which we also expire client-side.
   * ========================================================================= */
  const SESSION_KEY = 'ce.session';
  const stores = [window.sessionStorage, window.localStorage];
  let expiryTimer = null;

  function decodeToken(token) {
    try {
      return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    } catch {
      return null;
    }
  }

  function readStored() {
    for (const store of stores) {
      const raw = store.getItem(SESSION_KEY);
      if (!raw) continue;
      try { return { ...JSON.parse(raw), store }; } catch { store.removeItem(SESSION_KEY); }
    }
    return null;
  }

  const isExpired = (token) => {
    const payload = decodeToken(token);
    return !payload || (payload.exp && payload.exp * 1000 <= Date.now());
  };

  const auth = {
    /** The active session `{ token, user }`, or null when signed out / expired. */
    session() {
      const stored = readStored();
      return stored && !isExpired(stored.token) ? stored : null;
    },
    user() { return this.session()?.user || null; },
    token() { return this.session()?.token || null; },
    isAdmin() { return this.user()?.role === 'admin'; },

    save(token, user, remember) {
      this.clear();
      const { id, full_name, email, role } = user;
      (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify({ token, user: { id, full_name, email, role } }));
    },
    /** Keep the cached user in sync after a profile update (role is never taken from the client). */
    updateUser({ full_name, email }) {
      const stored = readStored();
      if (!stored) return;
      const user = { ...stored.user, full_name, email };
      stored.store.setItem(SESSION_KEY, JSON.stringify({ token: stored.token, user }));
    },
    clear() {
      stores.forEach((store) => store.removeItem(SESSION_KEY));
      api.clearCache();
    },
    logout(reason) {
      this.clear();
      clearTimeout(expiryTimer);
      if (reason === 'expired') {
        flash.set('warning', 'Your session has expired. Please sign in again.');
        window.location.replace(`login.html?next=${encodeURIComponent(utils.currentPage())}`);
      } else {
        flash.set('success', 'You have been signed out.');
        window.location.replace('login.html');
      }
    },
    homeFor: (user) => (user?.role === 'admin' ? 'admin-dashboard.html' : 'dashboard.html'),

    /** Sign the user out the moment their JWT expires, even if the page stays open. */
    watchExpiry() {
      const payload = decodeToken(this.token() || '');
      if (!payload?.exp) return;
      clearTimeout(expiryTimer);
      expiryTimer = setTimeout(() => this.logout('expired'), Math.min(payload.exp * 1000 - Date.now(), 2147483647));
    },

    /**
     * ROLE GUARD — decides whether the current visitor may view a page.
     * This is a UX convenience only: the backend's `authenticate` / `authorize(['admin'])`
     * middleware is the real security boundary and rejects unauthorised requests anyway.
     *
     *   'guest' → signed-out visitors only (login/signup). Signed-in users are sent home.
     *   'user'  → any signed-in account (role "user" or "admin").
     *   'admin' → role "admin" only. Normal users get a 403 view instead of the page.
     *
     * @param {'guest'|'user'|'admin'} access
     * @returns {'ok'|'redirect'|'forbidden'}
     */
    guard(access) {
      const session = this.session();
      if (access === 'guest') {
        if (!session) return 'ok';
        window.location.replace(this.homeFor(session.user));
        return 'redirect';
      }
      if (!session) {
        // A stored-but-expired token means the session timed out; otherwise the visitor never signed in.
        if (readStored()) this.logout('expired');
        else window.location.replace(`login.html?next=${encodeURIComponent(utils.currentPage())}`);
        return 'redirect';
      }
      this.watchExpiry();
      return access === 'admin' && session.user.role !== 'admin' ? 'forbidden' : 'ok';
    },
  };

  /* =========================================================================
   * API client
   * ========================================================================= */
  const API_ROOT = `${config.apiBaseUrl.replace(/\/+$/, '')}/api`;
  const CACHE_PREFIX = 'ce.cache:';
  const CACHE_TTL = 5 * 60 * 1000;
  const LIST_PATHS = { events: '/events', announcements: '/announcements?limit=500', promos: '/promos?limit=500' };
  const FRIENDLY_MESSAGES = {
    401: 'Your session is no longer valid. Please sign in again.',
    403: 'You don’t have permission to do that. Contact an administrator if you need access.',
    404: 'We couldn’t find what you were looking for.',
    413: 'That file is too large to upload.',
  };

  /** Turn any failed jqXHR into `{ status, message, network }` with a human-readable message. */
  function toError(xhr, textStatus) {
    const status = xhr.status || 0;
    const body = xhr.responseJSON || {};
    let message;
    if (!status) {
      message = textStatus === 'timeout'
        ? 'The request timed out. Please try again.'
        : 'Can’t reach the server. Check your connection and make sure the API is running.';
    } else if (status >= 500) {
      message = 'Something went wrong on our side. Please try again in a moment.';
    } else if (status === 403) {
      message = FRIENDLY_MESSAGES[403];
    } else if (body.errors?.length) {
      message = body.errors.map((e) => e.message).join(' ');
    } else {
      message = body.message || FRIENDLY_MESSAGES[status] || 'The request could not be completed.';
    }
    return { status, message, network: !status };
  }

  function cacheRead(key) {
    try {
      const { at, data } = JSON.parse(sessionStorage.getItem(CACHE_PREFIX + key));
      return Date.now() - at < CACHE_TTL ? data : null;
    } catch {
      return null;
    }
  }

  function cacheWrite(key, data) {
    try {
      sessionStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ at: Date.now(), data }));
    } catch { /* storage full — caching is best-effort */ }
  }

  function uploadXhr(onProgress) {
    const xhr = $.ajaxSettings.xhr();
    xhr.upload?.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    });
    return xhr;
  }

  /**
   * Core request. Resolves with the response's `data` field.
   * @param {string} method
   * @param {string} path      e.g. '/events'
   * @param {{body?:object, form?:FormData, onProgress?:Function, cache?:string}} [options]
   */
  function request(method, path, { body, form, onProgress, cache } = {}) {
    if (cache) {
      const hit = cacheRead(cache);
      if (hit) return Promise.resolve(hit);
    }
    const token = auth.token();
    const settings = {
      url: API_ROOT + path,
      method,
      dataType: 'json',
      timeout: form ? 0 : 20000,
      // Every protected endpoint needs the Bearer token.
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    };
    if (form) Object.assign(settings, { data: form, processData: false, contentType: false, xhr: () => uploadXhr(onProgress) });
    else if (body) Object.assign(settings, { data: JSON.stringify(body), contentType: 'application/json' });

    return new Promise((resolve, reject) => {
      $.ajax(settings)
        .done((res) => {
          const data = res?.data ?? res;
          if (cache) cacheWrite(cache, data);
          resolve(data);
        })
        .fail((xhr, textStatus) => {
          const error = toError(xhr, textStatus);
          // The server rejected our token (expired or revoked) → end the session and go to login.
          if (error.status === 401 && token) auth.logout('expired');
          reject(error);
        });
    });
  }

  const api = {
    get: (path, options) => request('GET', path, options),
    post: (path, body) => request('POST', path, { body }),
    put: (path, body) => request('PUT', path, { body }),
    patch: (path, body) => request('PATCH', path, { body }),
    del: (path) => request('DELETE', path),
    upload: (method, path, form, onProgress) => request(method, path, { form, onProgress }),

    invalidate: (...keys) => keys.forEach((key) => sessionStorage.removeItem(CACHE_PREFIX + key)),
    clearCache: () => Object.keys(sessionStorage)
      .filter((key) => key.startsWith(CACHE_PREFIX))
      .forEach((key) => sessionStorage.removeItem(key)),

    /**
     * ROLE GUARD (data): the API returns unpublished drafts to everyone, so
     * normal users only ever receive published items from these helpers.
     */
    visible: (item) => auth.isAdmin() || item.published !== false,
    async list(type) {
      const items = await request('GET', LIST_PATHS[type], { cache: type });
      return items.filter(api.visible);
    },

    registrations: {
      mine: () => request('GET', '/event-registrations/my-registrations'),
      register: (event_id) => request('POST', '/event-registrations/register', { body: { event_id } }),
      cancel: (event_id) => request('POST', '/event-registrations/cancel', { body: { event_id } }),
    },
  };

  Object.assign(CE, { utils, flash, auth, api, config });
})(window, window.jQuery);
