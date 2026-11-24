/**
 * CivicEvents — shared page chrome and boot sequence.
 *
 *   CE.page(options, init)   runs the ROLE GUARD, renders header/footer/sidebar, then init(user)
 *   CE.notifications         in-app notifications: list, unread count, read state, detail, delete
 */
(function (window, $) {
  'use strict';

  const { utils, auth, api, ui, flash, config } = window.CE;
  const { icon } = ui;
  const esc = utils.escape;

  /* =========================================================================
   * Navigation model
   * ========================================================================= */
  const MAIN_NAV = [
    { id: 'home', label: 'Home', href: 'dashboard.html' },
    { id: 'events', label: 'Events', href: 'events.html' },
    { id: 'announcements', label: 'Announcements', href: 'announcements.html' },
    { id: 'promos', label: 'Promos', href: 'promos.html' },
    { id: 'services', label: 'Services', href: 'service-requests.html' },
    // ROLE GUARD (UI): entries flagged `admin` are never rendered for normal users.
    { id: 'admin-dashboard', label: 'Dashboard', href: 'admin-dashboard.html', admin: true },
    { id: 'admin', label: 'Admin', href: 'admin-users.html', admin: true },
  ];

  const ADMIN_NAV = [
    { group: 'Manage', items: [
      { id: 'admin-dashboard', label: 'Overview', href: 'admin-dashboard.html', icon: 'chart' },
      { id: 'admin-users', label: 'Users', href: 'admin-users.html', icon: 'users' },
      { id: 'admin-service-requests', label: 'Service requests', href: 'admin-service-requests.html', icon: 'clipboard' },
      { id: 'admin-notifications', label: 'Notifications', href: 'admin-notifications.html', icon: 'bell' },
    ] },
    { group: 'Create', items: [
      { id: 'admin-event-form', label: 'New event', href: 'admin-event-form.html', icon: 'calendar' },
      { id: 'admin-announcement-form', label: 'New announcement', href: 'admin-announcement-form.html', icon: 'megaphone' },
      { id: 'admin-promo-form', label: 'New promo', href: 'admin-promo-form.html', icon: 'video' },
    ] },
  ];

  const logo = (size = 'h-9 w-9') => `
    <span class="grid ${size} place-items-center rounded-xl bg-brand-600 text-white shadow-sm">${icon('pin', 'h-5 w-5')}</span>`;

  /* =========================================================================
   * Notifications
   * -------------------------------------------------------------------------
   * The API has no "mark as read" endpoint, so read state is kept per user in
   * localStorage. Opening a notification is optimistic: it is marked read
   * immediately and reverted if the detail request fails.
   * ========================================================================= */
  const TYPE_STYLES = {
    event: ['calendar', 'badge-blue'],
    announcement: ['megaphone', 'badge-purple'],
    promo: ['video', 'badge-amber'],
    service_request: ['clipboard', 'badge-green'],
  };
  const LINKS = [
    ['event_id', 'event.html', 'View event'],
    ['announcement_id', 'announcement.html', 'Listen to announcement'],
    ['promo_id', 'promo.html', 'Watch promo'],
    ['service_request_id', 'service-requests.html', 'View your request'],
  ];

  const notifications = {
    items: [],
    loaded: false,

    storageKey: () => `ce.read:${auth.user()?.id}`,
    readIds() {
      try { return new Set(JSON.parse(localStorage.getItem(this.storageKey())) || []); } catch { return new Set(); }
    },
    setRead(ids, read = true) {
      const set = this.readIds();
      ids.forEach((id) => (read ? set.add(id) : set.delete(id)));
      localStorage.setItem(this.storageKey(), JSON.stringify([...set]));
      $(document).trigger('ce:notifications');
    },
    isRead(item, set = this.readIds()) { return item.read || set.has(item.id); },
    unreadCount() {
      const set = this.readIds();
      return this.items.filter((n) => !this.isRead(n, set)).length;
    },

    async load() {
      this.items = await api.get('/notifications');
      this.loaded = true;
      // Forget read ids for notifications that no longer exist.
      const ids = new Set(this.items.map((n) => n.id));
      const pruned = [...this.readIds()].filter((id) => ids.has(id));
      localStorage.setItem(this.storageKey(), JSON.stringify(pruned));
      $(document).trigger('ce:notifications');
      return this.items;
    },

    link(item) {
      const meta = item.metadata || {};
      const match = LINKS.find(([key]) => meta[key]);
      return match ? { href: `${match[1]}?id=${encodeURIComponent(meta[match[0]])}`, label: match[2] } : null;
    },

    typeBadge(type) {
      const [, badge] = TYPE_STYLES[type] || ['info', 'badge-gray'];
      return `<span class="badge ${badge}">${esc(utils.capitalize((type || 'system').replace(/_/g, ' ')))}</span>`;
    },

    /** One row in a notification list (drawer or inbox). */
    itemHtml(item, { showDelete = false } = {}) {
      const unread = !this.isRead(item);
      const [iconName] = TYPE_STYLES[item.type] || ['info'];
      return `
        <li class="group relative flex gap-3 px-4 py-3.5 transition hover:bg-slate-50 ${unread ? 'bg-brand-50/50' : ''}">
          <span class="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full ${unread ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500'}">${icon(iconName, 'h-4 w-4')}</span>
          <button type="button" class="min-w-0 flex-1 text-left after:absolute after:inset-0" data-open-notification="${item.id}">
            <span class="flex items-center gap-2">
              <span class="truncate text-sm ${unread ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}">${esc(item.title)}</span>
              ${unread ? '<span class="h-2 w-2 shrink-0 rounded-full bg-brand-600" aria-hidden="true"></span><span class="sr-only">(unread)</span>' : ''}
            </span>
            <span class="mt-0.5 line-clamp-2 block text-sm text-slate-600">${esc(item.message)}</span>
            <span class="mt-1 flex items-center gap-2 text-xs text-slate-500">${this.typeBadge(item.type)}<time datetime="${esc(item.created_at)}">${utils.timeAgo(item.created_at)}</time></span>
          </button>
          ${showDelete && auth.isAdmin() ? `<button type="button" class="btn btn-ghost btn-icon relative z-10 self-center text-red-700 hover:!bg-red-50" data-delete-notification="${item.id}" aria-label="Delete notification: ${esc(item.title)}">${icon('trash', 'h-4 w-4')}</button>` : ''}
        </li>`;
    },

    async open(id) {
      const wasRead = this.readIds().has(id);
      this.setRead([id]); // optimistic
      try {
        this.showDetail(await api.get(`/notifications/${id}`));
      } catch (error) {
        if (!wasRead) this.setRead([id], false); // revert on failure
        ui.handleError(error, () => this.open(id));
      }
    },

    showDetail(item) {
      const link = this.link(item);
      const $dialog = ui.dialog({
        title: esc(item.title),
        body: `
          <div class="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            ${this.typeBadge(item.type)}
            <span class="badge badge-gray">${item.recipient_id ? 'Sent to you' : 'Broadcast'}</span>
            <time datetime="${esc(item.created_at)}">${utils.formatDateTime(item.created_at)} · ${utils.timeAgo(item.created_at)}</time>
          </div>
          <p class="prose-text mt-4 text-slate-800">${esc(item.message)}</p>`,
        actions: `
          ${auth.isAdmin() ? `<button type="button" class="btn btn-ghost mr-auto text-red-700" data-delete-notification="${item.id}">${icon('trash', 'h-4 w-4')}Delete</button>` : ''}
          <button type="button" class="btn btn-secondary" data-close>Close</button>
          ${link ? `<a class="btn btn-primary" href="${link.href}">${link.label}${icon('chevronRight', 'h-4 w-4')}</a>` : ''}`,
      });
      $dialog.on('click', '[data-delete-notification]', () => $dialog[0].close());
    },

    /** ROLE GUARD (UI): only rendered for admins; DELETE is admin-only on the API too. */
    async remove(id) {
      const ok = await ui.confirm({ title: 'Delete notification?', message: 'It will be removed for every user who can see it.', confirmLabel: 'Delete', danger: true });
      if (!ok) return false;
      try {
        await api.del(`/notifications/${id}`);
        this.items = this.items.filter((n) => n.id !== id);
        $(document).trigger('ce:notifications');
        ui.toast('success', 'Notification deleted.');
        return true;
      } catch (error) {
        ui.handleError(error, () => this.remove(id));
        return false;
      }
    },
  };

  /* =========================================================================
   * Header, drawer, footer, sidebar
   * ========================================================================= */
  function navLinks(user, active, mobile) {
    const base = mobile
      ? 'block rounded-lg px-3 py-2.5 text-base font-medium'
      : 'rounded-lg px-3 py-2 text-sm font-medium transition';
    return MAIN_NAV
      .filter((item) => !item.admin || user.role === 'admin')
      .map((item) => {
        const current = item.id === active;
        return `<a href="${item.href}" class="${base} ${current ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}" ${current ? 'aria-current="page"' : ''}>${item.label}</a>`;
      }).join('');
  }

  const searchForm = (id, extra = '') => `
    <form role="search" action="search.html" class="${extra}">
      <label for="${id}" class="sr-only">Search events, announcements and promos</label>
      <div class="relative">
        <span class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">${icon('search', 'h-4 w-4')}</span>
        <input id="${id}" name="q" type="search" required class="input py-2 pl-9" placeholder="Search events, announcements…" value="${esc(utils.param('q') || '')}">
      </div>
    </form>`;

  function headerHtml(user, active) {
    const firstName = esc(user.full_name.split(' ')[0]);
    const menuItem = (href, iconName, label) => `<a role="menuitem" href="${href}" class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 focus:bg-slate-100">${icon(iconName, 'h-4 w-4 text-slate-500')}${label}</a>`;
    return `
      <a href="#main" class="btn btn-primary sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200]">Skip to main content</a>
      <header class="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div class="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:px-6 lg:px-8">
          <button type="button" id="menu-toggle" class="btn btn-ghost btn-icon lg:hidden" aria-expanded="false" aria-controls="mobile-nav" aria-label="Open main menu">${icon('menu')}</button>
          <a href="${auth.homeFor(user)}" class="mr-2 flex items-center gap-2.5 text-lg font-bold tracking-tight text-slate-900" aria-label="${config.appName} home">${logo()}<span class="hidden sm:inline" aria-hidden="true">${config.appName}</span></a>
          <nav aria-label="Main" class="hidden items-center gap-1 lg:flex">${navLinks(user, active)}</nav>
          ${searchForm('global-search', 'ml-auto hidden w-full max-w-xs md:block lg:hidden xl:block')}
          <div class="ml-auto flex items-center gap-1 md:ml-2 lg:ml-auto xl:ml-2">
            <a href="search.html" class="btn btn-ghost btn-icon hidden lg:inline-flex xl:hidden" aria-label="Search">${icon('search')}</a>
            <button type="button" id="bell" class="btn btn-ghost btn-icon relative" aria-haspopup="dialog" aria-controls="notif-drawer" aria-label="Notifications">
              ${icon('bell')}
              <span id="bell-count" class="absolute -right-0.5 -top-0.5 hidden min-w-[1.25rem] rounded-full bg-red-600 px-1 text-center text-[11px] font-bold leading-5 text-white ring-2 ring-white" aria-hidden="true"></span>
            </button>
            <div class="relative">
              <button type="button" id="profile-toggle" class="flex items-center gap-2 rounded-full p-1 pr-2 transition hover:bg-slate-100" aria-haspopup="menu" aria-expanded="false" aria-controls="profile-menu">
                <span class="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-bold text-white" data-user-initials>${esc(utils.initials(user.full_name))}</span>
                <span class="hidden text-sm font-medium text-slate-700 sm:block" data-user-first-name>${firstName}</span>
                ${icon('chevronDown', 'h-4 w-4 text-slate-500')}
                <span class="sr-only">Open profile menu</span>
              </button>
              <div id="profile-menu" role="menu" aria-labelledby="profile-toggle" class="card absolute right-0 mt-2 hidden w-64 p-2">
                <div class="mb-1 border-b border-slate-100 px-3 pb-3 pt-2">
                  <p class="truncate font-semibold text-slate-900" data-user-name>${esc(user.full_name)}</p>
                  <p class="truncate text-xs text-slate-500" data-user-email>${esc(user.email || '')}</p>
                  <span class="badge ${user.role === 'admin' ? 'badge-purple' : 'badge-blue'} mt-2">${user.role === 'admin' ? 'Administrator' : 'Resident'}</span>
                </div>
                ${menuItem('profile.html', 'user', 'My profile')}
                ${menuItem('my-registrations.html', 'ticket', 'My registrations')}
                ${menuItem('service-requests.html', 'clipboard', 'My service requests')}
                ${menuItem('notifications.html', 'bell', 'Notifications')}
                ${user.role === 'admin' ? menuItem('admin-dashboard.html', 'shield', 'Admin panel') : ''}
                <button type="button" role="menuitem" data-logout class="mt-1 flex w-full items-center gap-3 rounded-lg border-t border-slate-100 px-3 py-2 text-sm text-red-700 hover:bg-red-50 focus:bg-red-50">${icon('logout', 'h-4 w-4')}Sign out</button>
              </div>
            </div>
          </div>
        </div>
        <div id="mobile-nav" class="hidden border-t border-slate-200 bg-white px-4 pb-4 pt-3 lg:hidden">
          ${searchForm('mobile-search', 'mb-3 md:hidden')}
          <nav aria-label="Main mobile" class="space-y-1">${navLinks(user, active, true)}</nav>
        </div>
      </header>`;
  }

  const drawerHtml = `
    <dialog id="notif-drawer" class="drawer p-0 shadow-2xl" aria-labelledby="notif-drawer-title">
      <div class="flex h-full flex-col">
        <div class="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-4">
          <div>
            <h2 id="notif-drawer-title" class="text-lg font-semibold">Notifications</h2>
            <p class="text-xs text-slate-500" data-unread-label aria-live="polite"></p>
          </div>
          <div class="flex items-center gap-1">
            <button type="button" class="btn btn-ghost btn-sm" data-mark-all>Mark all read</button>
            <button type="button" class="btn btn-ghost btn-icon" data-close-drawer aria-label="Close notifications">${icon('x')}</button>
          </div>
        </div>
        <ul class="flex-1 divide-y divide-slate-100 overflow-y-auto" data-drawer-list></ul>
        <div class="border-t border-slate-200 p-4"><a href="notifications.html" class="btn btn-secondary w-full">View all notifications</a></div>
      </div>
    </dialog>`;

  function footerHtml() {
    const link = (href, label) => `<li><a href="${href}" class="text-slate-600 hover:text-brand-700 hover:underline">${label}</a></li>`;
    return `
      <footer class="mt-16 border-t border-slate-200 bg-white">
        <div class="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
          <div>
            <a href="dashboard.html" class="flex items-center gap-2.5 text-lg font-bold">${logo('h-8 w-8')}${config.appName}</a>
            <p class="mt-3 text-sm text-slate-600">Your city’s events, audio announcements and service updates — accessible to everyone.</p>
          </div>
          <nav aria-label="Explore"><h2 class="text-sm font-semibold text-slate-900">Explore</h2>
            <ul class="mt-3 space-y-2 text-sm">${link('events.html', 'Events')}${link('announcements.html', 'Announcements')}${link('promos.html', 'Promos')}${link('service-requests.html', 'Report an issue')}${link('my-registrations.html', 'My registrations')}</ul>
          </nav>
          <nav aria-label="Help"><h2 class="text-sm font-semibold text-slate-900">Help &amp; support</h2>
            <ul class="mt-3 space-y-2 text-sm">
              ${link(`mailto:${config.supportEmail}`, 'Contact support')}
              ${link(`mailto:${config.supportEmail}?subject=Accessibility%20feedback`, 'Report an accessibility issue')}
              <li><button type="button" class="text-slate-600 hover:text-brand-700 hover:underline" data-accessibility>Accessibility statement</button></li>
            </ul>
          </nav>
          <div><h2 class="text-sm font-semibold text-slate-900">Civic Services Office</h2>
            <address class="mt-3 space-y-1 text-sm not-italic text-slate-600">
              <p>City Hall, Main Street</p>
              <p>Mon–Fri · 8:00–17:00</p>
              <p><a class="hover:text-brand-700 hover:underline" href="mailto:${config.supportEmail}">${config.supportEmail}</a></p>
            </address>
          </div>
        </div>
        <div class="border-t border-slate-100 py-5 text-center text-xs text-slate-500">© ${new Date().getFullYear()} ${config.appName}. Built for every resident.</div>
      </footer>`;
  }

  function sidebarHtml(active) {
    const groups = ADMIN_NAV.map(({ group, items }) => `
      <div>
        <h2 class="px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">${group}</h2>
        <ul class="mt-2 space-y-1">${items.map((item) => {
          const current = item.id === active;
          return `<li><a href="${item.href}" class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${current ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-700 hover:bg-white hover:text-slate-900'}" ${current ? 'aria-current="page"' : ''}>${icon(item.icon, 'h-4 w-4')}${item.label}</a></li>`;
        }).join('')}</ul>
      </div>`).join('');
    const pills = ADMIN_NAV.flatMap((g) => g.items).map((item) => `
      <a href="${item.href}" class="flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium ${item.id === active ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200 bg-white text-slate-700'}" ${item.id === active ? 'aria-current="page"' : ''}>${icon(item.icon, 'h-4 w-4')}${item.label}</a>`).join('');
    return `
      <aside aria-label="Admin navigation" class="mb-6 lg:mb-0 lg:w-60 lg:shrink-0">
        <nav aria-label="Admin sections" class="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 lg:hidden">${pills}</nav>
        <nav aria-label="Admin" class="sticky top-24 hidden space-y-6 rounded-2xl border border-slate-200 bg-slate-100/70 p-4 lg:block">
          <p class="flex items-center gap-2 px-3 text-sm font-semibold text-slate-900">${icon('shield', 'h-4 w-4 text-brand-600')}Admin panel</p>
          ${groups}
        </nav>
      </aside>`;
  }

  /* =========================================================================
   * Behaviour
   * ========================================================================= */
  function bindHeader() {
    const $toggle = $('#profile-toggle');
    const $menu = $('#profile-menu');
    const setMenu = (open) => { $menu.toggleClass('hidden', !open); $toggle.attr('aria-expanded', String(open)); };

    $toggle.on('click', () => {
      const open = $menu.hasClass('hidden');
      setMenu(open);
      if (open) $menu.find('[role=menuitem]').first().trigger('focus');
    });
    $menu.on('keydown', (e) => {
      const $items = $menu.find('[role=menuitem]');
      const index = $items.index(document.activeElement);
      if (e.key === 'Escape') { setMenu(false); $toggle.trigger('focus'); }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        $items.eq((index + (e.key === 'ArrowDown' ? 1 : -1) + $items.length) % $items.length).trigger('focus');
      }
    });
    $(document).on('click', (e) => { if (!$(e.target).closest('#profile-toggle, #profile-menu').length) setMenu(false); });
    $(document).on('focusin', (e) => { if (!$(e.target).closest('#profile-toggle, #profile-menu').length) setMenu(false); });

    $('#menu-toggle').on('click', function () {
      const open = $('#mobile-nav').toggleClass('hidden').is(':visible');
      $(this).attr({ 'aria-expanded': String(open), 'aria-label': open ? 'Close main menu' : 'Open main menu' }).html(icon(open ? 'x' : 'menu'));
    });

    $(document).on('click', '[data-logout]', () => auth.logout());
    $(document).on('click', '[data-accessibility]', showAccessibilityStatement);
  }

  function bindNotifications() {
    const drawer = document.getElementById('notif-drawer');
    const $drawer = $(drawer);

    function renderDrawer() {
      const items = notifications.items.slice(0, 15);
      $drawer.find('[data-drawer-list]').removeAttr('aria-busy').html(items.length
        ? items.map((n) => notifications.itemHtml(n)).join('')
        : `<li class="p-6">${ui.empty({ icon: 'bell', title: 'You’re all caught up', text: 'New events, announcements and promos will appear here.' })}</li>`);
    }

    function renderBadge() {
      const count = notifications.unreadCount();
      $('#bell-count').toggleClass('hidden', !count).text(count > 9 ? '9+' : count);
      $('#bell').attr('aria-label', count ? `Notifications, ${count} unread` : 'Notifications, none unread');
      $drawer.find('[data-unread-label]').text(count ? `${utils.plural(count, 'unread notification')}` : 'No unread notifications');
    }

    $(document).on('ce:notifications', () => { renderBadge(); if (drawer.open) renderDrawer(); });

    $('#bell').on('click', () => {
      drawer.showModal();
      if (!notifications.loaded) ui.loading($drawer.find('[data-drawer-list]'), `<li class="space-y-3 p-4">${ui.skeleton.rows(4)}</li>`);
      else renderDrawer();
      notifications.load().then(renderDrawer).catch((error) => ui.errorState($drawer.find('[data-drawer-list]'), error, () => $('#bell').trigger('click')));
    });
    $drawer.on('click', '[data-close-drawer]', () => drawer.close());
    $drawer.on('click', (e) => { if (e.target === drawer) drawer.close(); });
    $drawer.on('click', '[data-mark-all]', () => {
      notifications.setRead(notifications.items.map((n) => n.id));
      ui.toast('success', 'All notifications marked as read.');
    });

    $(document).on('click', '[data-open-notification]', (e) => notifications.open(e.currentTarget.dataset.openNotification));
    $(document).on('click', '[data-delete-notification]', (e) => notifications.remove(e.currentTarget.dataset.deleteNotification));

    // Initial load + gentle polling while the tab is visible.
    const refresh = () => notifications.load().catch(() => {});
    refresh();
    setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, 60000);
  }

  function showAccessibilityStatement() {
    ui.dialog({
      title: 'Accessibility statement',
      body: `
        <div class="space-y-3 text-sm text-slate-700">
          <p>${config.appName} aims to meet WCAG 2.1 AA. Every page can be used with a keyboard, screen reader and zoom up to 200%.</p>
          <ul class="list-disc space-y-1 pl-5">
            <li>Audio announcements have keyboard-operable controls and transcripts where provided.</li>
            <li>Promo videos include English captions, enabled by default, and a full transcript.</li>
            <li>Colour is never the only way information is conveyed.</li>
          </ul>
          <p>Found a barrier? Email <a class="font-medium text-brand-700 underline" href="mailto:${config.supportEmail}">${config.supportEmail}</a>.</p>
        </div>`,
      actions: '<button type="button" class="btn btn-primary" data-close>Got it</button>',
    });
  }

  function renderForbidden() {
    $('#main').html(`
      <div class="mx-auto max-w-lg py-16 text-center">
        <span class="mx-auto grid h-16 w-16 place-items-center rounded-full bg-amber-100 text-amber-700">${icon('lock', 'h-8 w-8')}</span>
        <h1 class="mt-6 text-2xl font-bold">Administrators only</h1>
        <p class="mt-2 text-slate-600">Your account doesn’t have permission to view this page. If you think you should have access, please contact an administrator.</p>
        <div class="mt-6 flex flex-wrap justify-center gap-3">
          <a class="btn btn-primary" href="dashboard.html">${icon('home', 'h-4 w-4')}Go to home</a>
          <a class="btn btn-secondary" href="mailto:${config.supportEmail}?subject=Access%20request">${icon('envelope', 'h-4 w-4')}Contact admin</a>
        </div>
      </div>`).trigger('focus');
  }

  /** Decorative city photo under a dark brand overlay, so white text on top keeps AA contrast. */
  const cityBackdrop = (src) => (src ? `
    <img src="${src}" alt="" class="absolute inset-0 h-full w-full object-cover" aria-hidden="true">
    <span class="absolute inset-0 bg-gradient-to-t from-brand-950/95 via-brand-900/75 to-brand-900/40" aria-hidden="true"></span>` : '');

  /** Guest pages: city photo panel (desktop) or banner (mobile), chosen per page via <main data-hero="…">. */
  function renderAuthShell() {
    const $main = $('#main');
    const backdrop = cityBackdrop($main.data('hero'));
    $main
      .addClass('flex min-h-screen flex-col items-center justify-center px-4 py-10 sm:px-8')
      .prepend(`
        <a href="login.html" class="relative mb-8 flex h-36 w-full max-w-md items-end overflow-hidden rounded-2xl bg-brand-700 p-5 text-xl font-bold text-white shadow-lg lg:hidden">
          ${backdrop}<span class="relative flex items-center gap-2.5">${logo()}${config.appName}</span>
        </a>`)
      .wrap('<div class="lg:grid lg:min-h-screen lg:grid-cols-2"></div>')
      .before(`
        <aside class="relative hidden overflow-hidden bg-brand-700 p-12 text-white lg:flex lg:flex-col lg:justify-between" aria-label="About ${config.appName}">
          ${backdrop}
          <a href="login.html" class="relative flex items-center gap-3 text-xl font-bold"><span class="grid h-10 w-10 place-items-center rounded-xl bg-white text-brand-700">${icon('pin')}</span>${config.appName}</a>
          <div class="relative max-w-md">
            <h2 class="text-4xl font-bold leading-tight">Your city, in one accessible place.</h2>
            <p class="mt-4 text-lg text-brand-100">Discover local events, listen to audio announcements, watch captioned promos and stay informed with real-time notifications.</p>
            <ul class="mt-8 space-y-3 text-brand-50">
              ${[['calendar', 'Register for community events in one click'], ['megaphone', 'Audio announcements with transcripts'], ['caption', 'Captioned videos for every promo']]
                .map(([i, t]) => `<li class="flex items-center gap-3"><span class="grid h-9 w-9 place-items-center rounded-lg bg-white/10">${icon(i, 'h-5 w-5')}</span>${t}</li>`).join('')}
            </ul>
          </div>
          <p class="relative text-sm text-brand-200">© ${new Date().getFullYear()} ${config.appName}</p>
        </aside>`);
  }

  function renderChrome(user, { active, admin }) {
    const $main = $('#main');
    $main.before(headerHtml(user, active)).after(footerHtml());
    if (admin) {
      $main.addClass('min-w-0 flex-1')
        .wrap('<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:flex lg:gap-8 lg:px-8"></div>')
        .before(sidebarHtml(active));
    } else {
      $main.addClass('mx-auto block max-w-7xl px-4 py-8 sm:px-6 lg:px-8');
    }
    $('body').append(drawerHtml);
    // ROLE GUARD (UI): static elements marked data-admin-only are removed for normal users.
    $('[data-admin-only]').each((_, el) => (user.role === 'admin' ? $(el).removeClass('hidden') : $(el).remove()));
    bindHeader();
    bindNotifications();
  }

  /**
   * Boot a page.
   * @param {{access:'guest'|'user'|'admin', active?:string, admin?:boolean}} options
   *        `admin: true` renders the admin sidebar layout.
   * @param {(user:object|null)=>void} [init] page logic, only called when the guard allows it
   */
  window.CE.page = function (options, init) {
    $(function () {
      const verdict = auth.guard(options.access); // ROLE GUARD (see core.js)
      if (verdict === 'redirect') return;
      const user = auth.user();

      $('body').append('<div id="toast-region" aria-live="polite" class="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6"></div>');
      if (options.access === 'guest') renderAuthShell();
      else renderChrome(user, { ...options, admin: options.admin && user.role === 'admin' });
      $('body').removeClass('ce-booting');

      const message = flash.take();
      if (message) ui.toast(message.type, message.message);

      if (verdict === 'forbidden') return renderForbidden();
      init?.(user);
    });
  };

  window.CE.notifications = notifications;
})(window, window.jQuery);
