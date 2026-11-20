/**
 * CivicEvents — reusable UI building blocks.
 *
 *   CE.ui.icon / toast / dialog / confirm / handleError
 *   CE.ui.skeleton / loading / empty / errorState      (loading, empty & error states)
 *   CE.ui.busy / progress / paginate / lazy / stars
 *   CE.ui.forms                                        (validation, password strength, file fields)
 *   CE.ui.cards                                        (event / announcement / promo cards)
 *   CE.ui.actions                                      (admin delete & publish actions)
 */
(function (window, $) {
  'use strict';

  const { utils, auth, api, config } = window.CE;
  const esc = utils.escape;

  /* =========================================================================
   * Icons (Heroicons outline, MIT)
   * ========================================================================= */
  const ICONS = {
    alert: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z',
    bell: 'M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0',
    calendar: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5',
    caption: 'M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z',
    chart: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z',
    check: 'm4.5 12.75 6 6 9-13.5',
    checkCircle: 'M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
    chevronDown: 'm19.5 8.25-7.5 7.5-7.5-7.5',
    chevronLeft: 'M15.75 19.5 8.25 12l7.5-7.5',
    chevronRight: 'm8.25 4.5 7.5 7.5-7.5 7.5',
    clock: 'M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
    edit: 'm16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10',
    envelope: 'M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75',
    external: 'M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25',
    eye: 'M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
    home: 'm2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25',
    info: 'm11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z',
    lock: 'M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z',
    logout: 'M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9',
    megaphone: 'M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 1 1 0-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 0 1-1.44-4.282m3.102.069a18.03 18.03 0 0 1-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 0 1 8.835 2.535M10.34 6.66a23.847 23.847 0 0 0 8.835-2.535m0 0A23.74 23.74 0 0 0 18.795 3m.38 1.125a23.91 23.91 0 0 1 1.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 0 0 1.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 0 1 0 3.46',
    menu: 'M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5',
    pause: 'M15.75 5.25v13.5m-7.5-13.5v13.5',
    photo: 'm2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z',
    pin: 'M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z',
    play: 'M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z',
    plus: 'M12 4.5v15m7.5-7.5h-15',
    refresh: 'M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99',
    search: 'm21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z',
    shield: 'M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z',
    star: 'M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z',
    ticket: 'M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 0 1 0 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 0 1 0-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375Z',
    trash: 'm14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0',
    upload: 'M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5',
    user: 'M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
    users: 'M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z',
    video: 'm15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z',
    volume: 'M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z',
    volumeOff: 'M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6 4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z',
    x: 'M6 18 18 6M6 6l12 12',
  };

  const icon = (name, cls = 'h-5 w-5') =>
    `<svg class="${cls} shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor" aria-hidden="true" focusable="false"><path stroke-linecap="round" stroke-linejoin="round" d="${ICONS[name]}"/></svg>`;

  const spinner = (cls = 'h-4 w-4') =>
    `<svg class="spinner ${cls}" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-opacity=".25" stroke-width="3"/><path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>`;

  /* =========================================================================
   * Toasts — announced through a polite live region (errors use role="alert")
   * ========================================================================= */
  const TOASTS = {
    success: ['checkCircle', 'text-emerald-600'],
    error: ['alert', 'text-red-600'],
    warning: ['alert', 'text-amber-500'],
    info: ['info', 'text-brand-600'],
  };

  /**
   * @param {'success'|'error'|'warning'|'info'} type
   * @param {string} message
   * @param {{label:string, onClick?:Function, href?:string}} [action]
   */
  function toast(type, message, action) {
    const [iconName, color] = TOASTS[type] || TOASTS.info;
    const actionHtml = !action ? '' : action.href
      ? `<a class="btn btn-secondary btn-sm mt-2" href="${esc(action.href)}">${esc(action.label)}</a>`
      : `<button type="button" class="btn btn-secondary btn-sm mt-2" data-toast-action>${esc(action.label)}</button>`;
    const $toast = $(`
      <div class="toast card pointer-events-auto flex w-full max-w-sm items-start gap-3 p-4" role="${type === 'error' ? 'alert' : 'status'}">
        <span class="${color}">${icon(iconName)}</span>
        <div class="min-w-0 flex-1 text-sm"><p class="font-medium text-slate-800">${esc(message)}</p>${actionHtml}</div>
        <button type="button" class="btn btn-ghost btn-icon -m-1 p-1" data-toast-close aria-label="Dismiss notification">${icon('x', 'h-4 w-4')}</button>
      </div>`);
    const dismiss = () => $toast.fadeOut(150, () => $toast.remove());
    $toast.on('click', '[data-toast-close]', dismiss);
    $toast.on('click', '[data-toast-action]', () => { dismiss(); action.onClick?.(); });
    $('#toast-region').append($toast);
    setTimeout(dismiss, action ? 10000 : type === 'error' ? 8000 : 5000);
  }

  /**
   * Standard error feedback. Network failures get a Retry action for critical
   * operations; 403s offer a way to contact an administrator.
   */
  function handleError(error, retry) {
    let action;
    if (error.network && retry) action = { label: 'Retry', onClick: retry };
    else if (error.status === 403) action = { label: 'Contact admin', href: `mailto:${config.supportEmail}` };
    toast('error', error.message || 'Something went wrong.', action);
  }

  /* =========================================================================
   * Dialogs — native <dialog> gives us focus trapping, Esc to close and
   * focus restoration for free.
   * ========================================================================= */
  let dialogSeq = 0;

  /** `title` and `body` are HTML: callers must escape any user content. */
  function dialog({ title, body, actions = '', size = 'max-w-lg', onClose }) {
    const id = `dialog-${++dialogSeq}`;
    const $dialog = $(`
      <dialog class="w-[calc(100%-2rem)] ${size} rounded-2xl p-0 shadow-2xl" aria-labelledby="${id}-title">
        <div class="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <h2 id="${id}-title" class="text-lg font-semibold">${title}</h2>
          <button type="button" class="btn btn-ghost btn-icon -mr-2" data-close aria-label="Close dialog">${icon('x')}</button>
        </div>
        <div class="max-h-[70vh] overflow-y-auto px-6 py-5" data-body>${body}</div>
        ${actions ? `<div class="flex flex-wrap justify-end gap-2 rounded-b-2xl border-t border-slate-200 bg-slate-50 px-6 py-4">${actions}</div>` : ''}
      </dialog>`).appendTo('body');
    $dialog.on('click', '[data-close]', () => $dialog[0].close());
    $dialog.on('click', (e) => { if (e.target === $dialog[0]) $dialog[0].close(); }); // backdrop click
    $dialog.on('close', () => { onClose?.(); $dialog.remove(); });
    $dialog[0].showModal();
    return $dialog;
  }

  /** Promise-based confirmation dialog. Resolves true only when confirmed. */
  function confirm({ title, message, confirmLabel = 'Confirm', danger = false }) {
    return new Promise((resolve) => {
      let confirmed = false;
      const $dialog = dialog({
        title: esc(title),
        body: `<p class="text-slate-600">${esc(message)}</p>`,
        size: 'max-w-md',
        actions: `<button type="button" class="btn btn-secondary" data-close>Cancel</button>
                  <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-confirm>${esc(confirmLabel)}</button>`,
        onClose: () => resolve(confirmed),
      });
      $dialog.on('click', '[data-confirm]', () => { confirmed = true; $dialog[0].close(); });
    });
  }

  /* =========================================================================
   * Loading, empty and error states
   * ========================================================================= */
  const repeat = (count, html) => Array.from({ length: count }, () => html).join('');
  const skeleton = {
    cards: (count = 6) => repeat(count, `
      <div class="card overflow-hidden" aria-hidden="true">
        <div class="skeleton aspect-video rounded-none"></div>
        <div class="space-y-3 p-5"><div class="skeleton h-4 w-1/3"></div><div class="skeleton h-5 w-3/4"></div><div class="skeleton h-4 w-full"></div><div class="skeleton h-4 w-2/3"></div></div>
      </div>`),
    rows: (count = 5) => repeat(count, `
      <div class="card flex items-center gap-4 p-4" aria-hidden="true">
        <div class="skeleton h-12 w-12 shrink-0 rounded-full"></div>
        <div class="flex-1 space-y-2"><div class="skeleton h-4 w-1/2"></div><div class="skeleton h-3 w-1/3"></div></div>
      </div>`),
    detail: () => `
      <div class="space-y-6" aria-hidden="true">
        <div class="skeleton aspect-[21/9] w-full rounded-2xl"></div>
        <div class="skeleton h-8 w-2/3"></div>
        <div class="space-y-3"><div class="skeleton h-4 w-full"></div><div class="skeleton h-4 w-5/6"></div><div class="skeleton h-4 w-3/4"></div></div>
      </div>`,
  };

  /** Show a skeleton and mark the region busy for assistive tech. */
  function loading($el, html) {
    $el.attr('aria-busy', 'true').html(`${html}<span class="sr-only">Loading…</span>`);
  }

  function empty({ icon: iconName = 'info', title, text = '', action = '' }) {
    return `
      <div class="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
        <span class="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-600">${icon(iconName, 'h-6 w-6')}</span>
        <h3 class="mt-4 font-semibold text-slate-900">${esc(title)}</h3>
        ${text ? `<p class="mx-auto mt-1 max-w-md text-sm text-slate-600">${esc(text)}</p>` : ''}
        ${action ? `<div class="mt-5">${action}</div>` : ''}
      </div>`;
  }

  /** Render an error with a Retry button into `$el`. */
  function errorState($el, error, retry) {
    const title = error.network ? 'You appear to be offline' : error.status === 403 ? 'Access denied' : 'Couldn’t load this content';
    $el.removeAttr('aria-busy').html(`
      <div class="col-span-full rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center" role="alert">
        <span class="mx-auto grid h-12 w-12 place-items-center rounded-full bg-red-100 text-red-600">${icon('alert', 'h-6 w-6')}</span>
        <h3 class="mt-4 font-semibold text-red-900">${title}</h3>
        <p class="mx-auto mt-1 max-w-md text-sm text-red-800">${esc(error.message)}</p>
        ${retry ? `<button type="button" class="btn btn-secondary mt-5" data-retry>${icon('refresh', 'h-4 w-4')}Try again</button>` : ''}
      </div>`);
    $el.find('[data-retry]').one('click', retry);
  }

  function notFound($el, label, backHref) {
    $el.removeAttr('aria-busy').html(empty({
      icon: 'search',
      title: `${utils.capitalize(label)} not found`,
      text: `This ${label} may have been removed or is no longer available.`,
      action: `<a class="btn btn-primary" href="${backHref}">${icon('chevronLeft', 'h-4 w-4')}Back to ${label}s</a>`,
    }));
  }

  /** Toggle a button's busy state, preserving its original content. */
  function busy($btn, isBusy, label = 'Please wait…') {
    if (isBusy) {
      $btn.data('original', $btn.html()).prop('disabled', true).attr('aria-busy', 'true')
        .html(`${spinner()}<span>${esc(label)}</span>`);
    } else {
      $btn.prop('disabled', false).removeAttr('aria-busy').html($btn.data('original'));
    }
  }

  /** Accessible upload progress bar rendered into `$el`. */
  function progress($el, label = 'Uploading') {
    $el.removeClass('hidden').html(`
      <div class="flex justify-between text-sm font-medium text-slate-700"><span>${esc(label)}…</span><span data-pct>0%</span></div>
      <div class="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-label="${esc(label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
        <div class="bar h-full w-0 rounded-full bg-brand-600" data-bar></div>
      </div>`);
    return {
      set(pct) {
        $el.find('[data-pct]').text(pct >= 100 ? 'Processing…' : `${pct}%`);
        $el.find('[role=progressbar]').attr('aria-valuenow', pct);
        $el.find('[data-bar]').css('width', `${pct}%`);
      },
      hide: () => $el.addClass('hidden').empty(),
    };
  }

  /* =========================================================================
   * Pagination (client-side)
   * ========================================================================= */
  function pageNumbers(current, total) {
    const pages = new Set([1, total, current - 1, current, current + 1].filter((p) => p >= 1 && p <= total));
    const sorted = [...pages].sort((a, b) => a - b);
    return sorted.flatMap((p, i) => (i && p - sorted[i - 1] > 1 ? ['…', p] : [p]));
  }

  /**
   * Render `items` page by page into `$list`, with accessible controls in `$pager`.
   * @param {{items:Array, $list:jQuery, $pager:jQuery, render:Function, empty:string, pageSize?:number}} options
   */
  function paginate({ items, $list, $pager, render, empty: emptyHtml, pageSize = config.pageSize }) {
    const total = Math.max(1, Math.ceil(items.length / pageSize));
    const button = (page, label, content, disabled, current) => `
      <button type="button" class="btn ${current ? 'btn-primary' : 'btn-secondary'} btn-sm min-w-[2.25rem]" data-page="${page}"
        aria-label="${label}" ${current ? 'aria-current="page"' : ''} ${disabled ? 'disabled' : ''}>${content}</button>`;

    function go(page, focus) {
      page = Math.min(Math.max(1, page), total);
      const slice = items.slice((page - 1) * pageSize, page * pageSize);
      $list.removeAttr('aria-busy').html(items.length ? slice.map(render).join('') : emptyHtml);
      lazy($list);
      $pager.html(total < 2 ? '' : `
        <nav aria-label="Pagination" class="flex flex-wrap items-center justify-center gap-1.5">
          ${button(page - 1, 'Previous page', icon('chevronLeft', 'h-4 w-4'), page === 1)}
          ${pageNumbers(page, total).map((p) => (p === '…' ? '<span class="px-1 text-slate-500" aria-hidden="true">…</span>' : button(p, `Page ${p}`, p, false, p === page))).join('')}
          ${button(page + 1, 'Next page', icon('chevronRight', 'h-4 w-4'), page === total)}
        </nav>`);
      if (focus) $list[0].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    $pager.off('click.pager').on('click.pager', '[data-page]', (e) => go(Number(e.currentTarget.dataset.page), true));
    go(1);
  }

  /* =========================================================================
   * Lazy media — video thumbnails and audio durations only load near the viewport
   * ========================================================================= */
  function hydrate(el) {
    if (el.dataset.src) {
      el.src = el.dataset.src;
      delete el.dataset.src;
    }
    if (el.dataset.durationSrc) {
      const probe = new Audio();
      probe.preload = 'metadata';
      probe.onloadedmetadata = () => { el.textContent = utils.formatDuration(probe.duration); };
      probe.onerror = () => { el.textContent = 'Unavailable'; };
      probe.src = el.dataset.durationSrc;
      delete el.dataset.durationSrc;
    }
  }

  const lazyObserver = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      lazyObserver.unobserve(entry.target);
      hydrate(entry.target);
    }), { rootMargin: '200px' })
    : null;

  function lazy($root) {
    $root.find('[data-src], [data-duration-src]').each((_, el) => (lazyObserver ? lazyObserver.observe(el) : hydrate(el)));
  }

  /** One shared <audio> so only a single inline preview plays at a time. */
  function audioPreview($root) {
    const audio = new Audio();
    let $current = $();
    const setState = ($btn, playing) => $btn.attr('aria-pressed', String(playing))
      .html(icon(playing ? 'pause' : 'play'))
      .attr('aria-label', `${playing ? 'Pause' : 'Play'} ${$btn.data('title')}`);

    audio.addEventListener('ended', () => setState($current, false));
    audio.addEventListener('error', () => { setState($current, false); toast('error', 'This recording could not be played.'); });

    $root.on('click', '[data-preview]', (e) => {
      const $btn = $(e.currentTarget);
      if ($btn.is($current) && !audio.paused) { audio.pause(); return setState($btn, false); }
      setState($current, false);
      if (!$btn.is($current)) audio.src = $btn.data('preview');
      $current = $btn;
      audio.play().then(() => setState($btn, true)).catch(() => {});
    });
  }

  /** Read-only star rating with an accessible text equivalent. */
  function stars(value, cls = 'h-4 w-4') {
    const rounded = Math.round(value);
    const items = [1, 2, 3, 4, 5].map((n) => `<span class="${n <= rounded ? 'text-amber-400' : 'text-slate-300'}">${icon('star', `${cls} fill-current`)}</span>`).join('');
    return `<span class="inline-flex items-center" role="img" aria-label="Rated ${Number(value).toFixed(1)} out of 5">${items}</span>`;
  }

  /* =========================================================================
   * Forms
   * ========================================================================= */
  const PASSWORD_RULES = [
    { test: (v) => v.length >= 8, label: 'At least 8 characters' },
    { test: (v) => /[a-z]/.test(v), label: 'A lowercase letter' },
    { test: (v) => /[A-Z]/.test(v), label: 'An uppercase letter' },
    { test: (v) => /\d/.test(v), label: 'A number' },
    { test: (v) => /[\W_]/.test(v), label: 'A special character' },
  ];

  const forms = {
    /** Show or clear an inline error; wires aria-invalid and aria-describedby. */
    setError($field, message) {
      const errorId = `${$field.attr('id')}-error`;
      const describedBy = ($field.attr('aria-describedby') || '').split(' ').filter((id) => id && id !== errorId);
      $(`#${errorId}`).remove();
      if (message) {
        $field.closest('.field').append(`<p id="${errorId}" class="field-error">${esc(message)}</p>`);
        describedBy.push(errorId);
      }
      $field.attr({ 'aria-invalid': message ? 'true' : null, 'aria-describedby': describedBy.join(' ') || null });
    },

    /**
     * Validate fields with `{ fieldId: (value, $field) => errorMessage | falsy }`.
     * Focuses the first invalid field and returns whether the form is valid.
     */
    validate($form, rules) {
      let $first = null;
      Object.entries(rules).forEach(([id, rule]) => {
        const $field = $form.find(`#${id}`);
        const message = rule(String($field.val() ?? '').trim(), $field) || null;
        forms.setError($field, message);
        if (message && !$first) $first = $field;
      });
      $first?.trigger('focus');
      return !$first;
    },

    /** Trimmed string values of every named field. */
    values: ($form) => Object.fromEntries([...new FormData($form[0])].map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])),

    passwordRules: PASSWORD_RULES,
    isStrongPassword: (value) => PASSWORD_RULES.every((rule) => rule.test(value)),
    emailError: (value) => (!value ? 'Email is required.' : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? 'Enter a valid email address.' : null),

    /** Wire a password field to a strength meter + checklist. */
    strengthMeter($input, $meter) {
      const LEVELS = [['Too weak', 'bg-red-500'], ['Weak', 'bg-red-500'], ['Fair', 'bg-amber-500'], ['Good', 'bg-lime-500'], ['Strong', 'bg-emerald-600']];
      $meter.html(`
        <div class="flex gap-1" aria-hidden="true">${repeat(4, '<span class="h-1.5 flex-1 rounded-full bg-slate-200" data-seg></span>')}</div>
        <p class="mt-1.5 text-xs font-medium text-slate-600" aria-live="polite">Password strength: <span data-level>Too weak</span></p>
        <ul class="mt-2 grid gap-1 text-xs sm:grid-cols-2">${PASSWORD_RULES.map((r, i) => `<li class="flex items-center gap-1.5 text-slate-500" data-rule="${i}">${icon('check', 'h-3.5 w-3.5')}${r.label}</li>`).join('')}</ul>`);
      $input.on('input', () => {
        const value = $input.val();
        const passed = PASSWORD_RULES.map((r) => r.test(value));
        const score = value ? Math.max(1, passed.filter(Boolean).length - 1) : 0;
        const [label, color] = LEVELS[score];
        $meter.find('[data-seg]').each((i, seg) => { seg.className = `h-1.5 flex-1 rounded-full ${i < score ? color : 'bg-slate-200'}`; });
        $meter.find('[data-level]').text(label);
        passed.forEach((ok, i) => $meter.find(`[data-rule=${i}]`).toggleClass('text-emerald-700', ok).toggleClass('text-slate-500', !ok));
      });
    },

    /** Returns an error message when the file's type or size is not allowed. */
    fileError(file, { types, maxMB }) {
      const ext = `.${file.name.split('.').pop().toLowerCase()}`;
      if (!types.includes(ext)) return `Unsupported file type. Allowed: ${types.join(', ')}.`;
      if (file.size > maxMB * 1048576) return `File is ${utils.formatBytes(file.size)}; the maximum is ${maxMB} MB.`;
      return null;
    },

    /**
     * Drag-and-drop file field with client-side type/size validation and a preview.
     * @param {{input:string, types:string[], maxMB:number, preview:(url:string, file:File)=>string}} options
     * @returns {{file:()=>File|null, error:()=>string|null}}
     */
    fileField({ input, types, maxMB, preview }) {
      const $input = $(input);
      const $zone = $input.next('.dropzone');
      const $preview = $(`${input}-preview`);
      let file = null;
      let error = null;
      let objectUrl = null;

      function reset() {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        file = null; error = null; objectUrl = null;
        $input.val('');
        $preview.empty();
        forms.setError($input, null);
      }

      function select(selected) {
        reset();
        if (!selected) return;
        error = forms.fileError(selected, { types, maxMB });
        forms.setError($input, error);
        if (error) return;
        file = selected;
        objectUrl = URL.createObjectURL(file);
        $preview.html(`
          <div class="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
            ${preview(objectUrl, file)}
            <div class="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
              <span class="min-w-0 truncate"><span class="font-medium">${esc(file.name)}</span> <span class="text-slate-500">· ${utils.formatBytes(file.size)}</span></span>
              <button type="button" class="btn btn-ghost btn-sm text-red-700" data-remove-file>${icon('x', 'h-4 w-4')}Remove</button>
            </div>
          </div>`);
      }

      $input.on('change', () => select($input[0].files[0]));
      $preview.on('click', '[data-remove-file]', () => { reset(); $input.trigger('focus'); });
      $zone.on('dragover dragenter', (e) => { e.preventDefault(); $zone.addClass('is-dragging'); })
        .on('dragleave drop', () => $zone.removeClass('is-dragging'))
        .on('drop', (e) => {
          e.preventDefault();
          const dropped = e.originalEvent.dataTransfer.files;
          if (!dropped.length) return;
          $input[0].files = dropped;
          select(dropped[0]);
        });

      return { file: () => file, error: () => error };
    },

    /**
     * Shared submit flow for admin create/edit forms: busy button, optional upload
     * progress, cache invalidation, success flash and redirect. Network errors offer Retry.
     */
    async submit({ $button, $progress, busyLabel, send, invalidate = [], success, redirect }) {
      busy($button, true, busyLabel);
      const bar = $progress ? progress($progress) : null;
      try {
        const data = await send(bar ? bar.set : undefined);
        api.invalidate(...invalidate);
        window.CE.flash.set('success', success);
        window.location.href = redirect(data);
      } catch (error) {
        bar?.hide();
        busy($button, false);
        handleError(error, () => forms.submit({ $button, $progress, busyLabel, send, invalidate, success, redirect }));
      }
    },
  };

  /* =========================================================================
   * Cards
   * ========================================================================= */
  const RESOURCES = {
    events: { label: 'event', path: '/events', form: 'admin-event-form.html', list: 'events.html' },
    announcements: { label: 'announcement', path: '/announcements', form: 'admin-announcement-form.html', list: 'announcements.html' },
    promos: { label: 'promo', path: '/promos', form: 'admin-promo-form.html', list: 'promos.html' },
  };

  const draftBadge = (item) => (item.published === false ? '<span class="badge badge-amber">Draft</span>' : '');
  const STATUS_BADGES = {
    upcoming: '<span class="badge badge-blue">Upcoming</span>',
    live: '<span class="badge badge-green">Happening now</span>',
    past: '<span class="badge badge-gray">Ended</span>',
  };

  /**
   * ROLE GUARD (UI): admin controls are only rendered for admins. The API still
   * rejects these actions for normal users (authorize(['admin'])).
   */
  function adminControls(type, item, { compact = false, publishToggle = false } = {}) {
    if (!auth.isAdmin()) return '';
    const title = esc(item.title);
    const label = (text) => (compact ? `<span class="sr-only">${text}</span>` : text);
    const publish = publishToggle
      ? `<button type="button" class="btn btn-ghost btn-sm" data-action="publish" data-type="${type}" data-id="${item.id}" data-publish="${!item.published}" aria-label="${item.published ? 'Unpublish' : 'Publish'} ${title}">${icon(item.published ? 'eye' : 'upload', 'h-4 w-4')}${label(item.published ? 'Unpublish' : 'Publish')}</button>`
      : '';
    return `${publish}
      <a class="btn btn-ghost btn-sm" href="${RESOURCES[type].form}?id=${item.id}" aria-label="Edit ${title}">${icon('edit', 'h-4 w-4')}${label('Edit')}</a>
      <button type="button" class="btn btn-ghost btn-sm text-red-700 hover:!bg-red-50 hover:!text-red-800" data-action="delete" data-type="${type}" data-id="${item.id}" data-title="${title}" aria-label="Delete ${title}">${icon('trash', 'h-4 w-4')}${label('Delete')}</button>`;
  }

  const cards = {
    event(event, { registered = false } = {}) {
      const status = utils.eventStatus(event);
      const image = event.metadata?.image_url;
      const start = new Date(event.starts_at);
      const title = esc(event.title);
      // ROLE GUARD (UI): only normal users register; admins manage instead.
      const canRegister = !auth.isAdmin() && status !== 'past' && !registered;
      return `
        <article class="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg">
          <a href="event.html?id=${event.id}" class="relative block aspect-video overflow-hidden bg-gradient-to-br from-brand-100 to-brand-200" tabindex="-1" aria-hidden="true">
            <span class="absolute inset-0 grid place-items-center text-brand-400">${icon('calendar', 'h-12 w-12')}</span>
            ${image ? `<img src="${esc(image)}" alt="" loading="lazy" class="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105" onerror="this.remove()">` : ''}
            <span class="absolute left-3 top-3 rounded-lg bg-white/95 px-2.5 py-1 text-center shadow">
              <span class="block text-[11px] font-bold uppercase tracking-wide text-brand-700">${start.toLocaleString(undefined, { month: 'short' })}</span>
              <span class="block text-lg font-bold leading-none text-slate-900">${start.getDate()}</span>
            </span>
          </a>
          <div class="flex flex-1 flex-col gap-3 p-5">
            <div class="flex flex-wrap gap-1.5">${STATUS_BADGES[status]}${draftBadge(event)}${registered ? '<span class="badge badge-green">✓ Registered</span>' : ''}</div>
            <h3 class="text-lg font-semibold leading-snug"><a href="event.html?id=${event.id}" class="hover:text-brand-700">${title}</a></h3>
            <dl class="space-y-1.5 text-sm text-slate-600">
              <div class="flex items-center gap-2"><dt>${icon('clock', 'h-4 w-4 text-slate-400')}<span class="sr-only">When</span></dt><dd>${utils.formatDateTime(event.starts_at)}</dd></div>
              <div class="flex items-center gap-2"><dt>${icon('pin', 'h-4 w-4 text-slate-400')}<span class="sr-only">Where</span></dt><dd class="truncate">${esc(event.location || 'Location to be announced')}</dd></div>
            </dl>
            ${event.description ? `<p class="line-clamp-2 text-sm text-slate-600">${esc(event.description)}</p>` : ''}
            <div class="mt-auto flex flex-wrap items-center gap-2 pt-2">
              <a class="btn btn-secondary btn-sm" href="event.html?id=${event.id}" aria-label="View ${title}">View</a>
              ${canRegister ? `<button type="button" class="btn btn-primary btn-sm" data-register="${event.id}" aria-label="Register for ${title}">Register</button>` : ''}
              ${adminControls('events', event, { compact: true })}
            </div>
          </div>
        </article>`;
    },

    announcement(item) {
      const title = esc(item.title);
      return `
        <article class="card flex flex-wrap items-center gap-4 p-4 sm:flex-nowrap sm:p-5">
          <button type="button" class="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-600 text-white shadow transition hover:bg-brand-700"
            data-preview="${esc(item.audio_url)}" data-title="${title}" aria-pressed="false" aria-label="Play ${title}">${icon('play')}</button>
          <div class="min-w-0 flex-1">
            <h3 class="truncate font-semibold"><a href="announcement.html?id=${item.id}" class="hover:text-brand-700">${title}</a></h3>
            <p class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
              <span class="inline-flex items-center gap-1">${icon('clock', 'h-4 w-4 text-slate-400')}<span class="sr-only">Length:</span><span class="tabular-nums" data-duration-src="${esc(item.audio_url)}">--:--</span></span>
              <time datetime="${esc(item.created_at)}">${utils.formatDate(item.created_at)}</time>
              ${draftBadge(item)}
            </p>
          </div>
          <div class="flex w-full shrink-0 flex-wrap justify-end gap-1 sm:w-auto">
            <a class="btn btn-secondary btn-sm" href="announcement.html?id=${item.id}" aria-label="Open ${title}">Details</a>
            ${adminControls('announcements', item, { compact: true, publishToggle: true })}
          </div>
        </article>`;
    },

    promo(item) {
      const title = esc(item.title);
      return `
        <article class="card group flex flex-col overflow-hidden">
          <a href="promo.html?id=${item.id}" class="relative block aspect-video overflow-hidden bg-slate-900" aria-label="Watch ${title}">
            <video class="h-full w-full object-cover opacity-90 transition duration-300 group-hover:scale-105" data-src="${esc(item.video_url)}#t=0.5" preload="metadata" muted playsinline tabindex="-1" aria-hidden="true"></video>
            <span class="absolute inset-0 grid place-items-center">
              <span class="grid h-14 w-14 place-items-center rounded-full bg-white/90 text-brand-700 shadow-lg transition group-hover:scale-110">${icon('play', 'h-6 w-6 fill-current')}</span>
            </span>
            ${item.caption_text ? '<span class="badge absolute bottom-2 right-2 bg-black/75 text-white">CC</span>' : ''}
          </a>
          <div class="flex flex-1 flex-col gap-2 p-5">
            <div class="flex flex-wrap gap-1.5">${draftBadge(item)}<span class="text-xs text-slate-500">${utils.formatDate(item.created_at)}</span></div>
            <h3 class="text-lg font-semibold leading-snug"><a href="promo.html?id=${item.id}" class="hover:text-brand-700">${title}</a></h3>
            ${item.description ? `<p class="line-clamp-2 text-sm text-slate-600">${esc(item.description)}</p>` : ''}
            <div class="mt-auto flex flex-wrap gap-1 pt-2">${adminControls('promos', item, { compact: true, publishToggle: true })}</div>
          </div>
        </article>`;
    },
  };

  /* =========================================================================
   * Admin actions (delete, publish/unpublish) — shared by lists and detail pages
   * ========================================================================= */
  const actions = {
    async remove(type, id, title) {
      const { label, path } = RESOURCES[type];
      const ok = await confirm({ title: `Delete this ${label}?`, message: `“${title}” will be permanently removed. This can’t be undone.`, confirmLabel: 'Delete', danger: true });
      if (!ok) return false;
      try {
        await api.del(`${path}/${id}`);
        api.invalidate(type);
        toast('success', `${utils.capitalize(label)} deleted.`);
        return true;
      } catch (error) {
        handleError(error, () => actions.remove(type, id, title));
        return false;
      }
    },

    async setPublished(type, id, publish) {
      const { label, path } = RESOURCES[type];
      try {
        const item = await api.patch(`${path}/${id}/${publish ? 'publish' : 'unpublish'}`);
        api.invalidate(type);
        toast('success', publish ? `${utils.capitalize(label)} published — residents can now see it.` : `${utils.capitalize(label)} moved to drafts.`);
        return item;
      } catch (error) {
        handleError(error);
        return null;
      }
    },

    /** Delegate admin action clicks inside `$root`; `onChange` runs after a successful action. */
    bind($root, onChange) {
      $root.on('click', '[data-action]', async (e) => {
        const { action, type, id, title, publish } = e.currentTarget.dataset;
        const $btn = $(e.currentTarget);
        if (action === 'delete' && await actions.remove(type, id, title)) onChange('delete', id);
        if (action === 'publish') {
          busy($btn, true, '');
          const item = await actions.setPublished(type, id, publish === 'true');
          busy($btn, false);
          if (item) onChange('publish', id);
        }
      });
    },
  };

  /**
   * Shared loader for detail pages (event / announcement / promo): validates ?id,
   * shows a skeleton, hides drafts from normal users, renders not-found / error
   * states, and wires admin actions (publish → reload, delete → back to the list).
   * @param {{$el:jQuery, type:'events'|'announcements'|'promos', render:(item:object)=>void}} options
   */
  function loadDetail({ $el, type, render }) {
    const { label, path, list } = RESOURCES[type];
    const id = utils.param('id');

    async function load() {
      if (!utils.isUuid(id)) return notFound($el, label, list);
      loading($el, skeleton.detail());
      try {
        const item = await api.get(`${path}/${id}`);
        // ROLE GUARD (data): unpublished drafts are hidden from normal users.
        if (!api.visible(item)) return notFound($el, label, list);
        render(item);
      } catch (error) {
        if (error.status === 404) notFound($el, label, list);
        else errorState($el, error, load);
      }
    }

    actions.bind($el, (action) => {
      if (action === 'publish') return load();
      window.CE.flash.set('success', `${utils.capitalize(label)} deleted.`);
      window.location.href = list;
    });
    load();
  }

  window.CE.ui = {
    icon, spinner, toast, handleError, dialog, confirm,
    skeleton, loading, empty, errorState, notFound, busy, progress,
    paginate, lazy, audioPreview, stars, forms, cards, actions, adminControls, loadDetail, RESOURCES, STATUS_BADGES,
  };
})(window, window.jQuery);
