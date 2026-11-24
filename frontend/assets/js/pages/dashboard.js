/**
 * Resident home: personal stats (GET /api/dashboard/me), upcoming events,
 * the user's next registrations, latest announcements and promos.
 * Each section loads independently so one failure doesn't blank the page.
 */
CE.page({ access: 'user', active: 'home' }, (user) => {
  const { api, ui, utils, notifications } = CE;
  const { icon } = ui;
  const esc = utils.escape;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  $('#greeting').text(`${greeting}, ${user.full_name.split(' ')[0]}`);
  $('#today').text(new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }));

  const statCard = (iconName, label, value, href, tone) => `
    <a href="${href}" class="card flex items-center gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
      <span class="grid h-12 w-12 shrink-0 place-items-center rounded-xl ${tone}">${icon(iconName, 'h-6 w-6')}</span>
      <span><span class="block text-2xl font-bold tabular-nums" data-stat="${label}">${value}</span><span class="block text-sm text-slate-600">${label}</span></span>
    </a>`;

  // Several sections need the user's registrations: share one request (reset after a failure or change).
  let registrations = null;
  const myRegistrations = () => {
    registrations ||= api.registrations.mine().catch((error) => { registrations = null; throw error; });
    return registrations;
  };
  const activeIds = (regs) => new Set(regs.filter((r) => r.status === 'registered').map((r) => r.event_id));

  /** Load a section with skeleton → content/empty → error-with-retry. */
  async function section($el, skeleton, fetch, render) {
    ui.loading($el, skeleton);
    try {
      $el.removeAttr('aria-busy').html(render(await fetch()));
      ui.lazy($el);
    } catch (error) {
      ui.errorState($el, error, () => section($el, skeleton, fetch, render));
    }
  }

  const loadStats = () => section($('#stats'), ui.skeleton.rows(4), async () => {
    const [stats, regs] = await Promise.all([api.get('/dashboard/me'), myRegistrations()]);
    return { stats, active: activeIds(regs).size };
  }, ({ stats, active }) => [
    statCard('ticket', 'Registered events', active, 'my-registrations.html', 'bg-brand-50 text-brand-700'),
    statCard('star', 'Reviews given', Number(stats.feedbacks.total_feedbacks), 'profile.html', 'bg-amber-50 text-amber-600'),
    statCard('bell', 'Unread notifications', notifications.loaded ? notifications.unreadCount() : '–', 'notifications.html', 'bg-red-50 text-red-600'),
    statCard('megaphone', 'Announcements', Number(stats.announcements.total_announcements), 'announcements.html', 'bg-purple-50 text-purple-700'),
  ].join(''));

  // Keep the unread tile live as notifications load or are read.
  $(document).on('ce:notifications', () => $('[data-stat="Unread notifications"]').text(notifications.unreadCount()));

  section($('#upcoming'), ui.skeleton.cards(2), () => Promise.all([api.list('events'), myRegistrations()]), ([events, regs]) => {
    const registered = activeIds(regs);
    const upcoming = events.filter((e) => utils.eventStatus(e) !== 'past').slice(0, 4);
    return upcoming.length
      ? upcoming.map((e) => ui.cards.event(e, { registered: registered.has(e.id) })).join('')
      : ui.empty({ icon: 'calendar', title: 'No upcoming events', text: 'New events will appear here.' });
  });

  const loadMyEvents = () => section($('#my-events'), `<div class="p-4">${ui.skeleton.rows(3)}</div>`, myRegistrations, (regs) => {
    const next = regs.filter((r) => r.status === 'registered' && new Date(r.ends_at || r.starts_at) > Date.now())
      .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at)).slice(0, 5);
    if (!next.length) return `<div class="p-6 text-center text-sm text-slate-600">You haven’t registered for any upcoming events.<br><a href="events.html" class="mt-2 inline-block font-semibold text-brand-700 hover:underline">Find something to join</a></div>`;
    return next.map((r) => {
      const d = new Date(r.starts_at);
      return `
        <a href="event.html?id=${r.event_id}" class="flex items-center gap-4 p-4 hover:bg-slate-50">
          <span class="w-12 shrink-0 rounded-lg bg-brand-50 py-1 text-center"><span class="block text-[11px] font-bold uppercase text-brand-700">${d.toLocaleString(undefined, { month: 'short' })}</span><span class="block text-lg font-bold leading-none">${d.getDate()}</span></span>
          <span class="min-w-0"><span class="block truncate font-medium">${esc(r.title)}</span><span class="block truncate text-sm text-slate-600">${utils.formatTime(r.starts_at)} · ${esc(r.location || '')}</span></span>
        </a>`;
    }).join('');
  });

  section($('#announcements'), ui.skeleton.rows(3), () => api.list('announcements'), (items) => (items.length
    ? items.slice(0, 3).map(ui.cards.announcement).join('')
    : ui.empty({ icon: 'megaphone', title: 'No announcements yet' })));
  ui.audioPreview($('#announcements'));

  section($('#promos'), ui.skeleton.cards(2), () => api.list('promos'), (items) => (items.length
    ? items.slice(0, 2).map(ui.cards.promo).join('')
    : ui.empty({ icon: 'video', title: 'No promos yet' })));

  loadStats();
  loadMyEvents();
  ui.actions.bind($('#upcoming, #announcements, #promos'), () => window.location.reload());

  $('#upcoming').on('click', '[data-register]', async (e) => {
    const $btn = $(e.currentTarget);
    ui.busy($btn, true, 'Registering…');
    try {
      await api.registrations.register($btn.data('register'));
      ui.toast('success', 'You’re registered!');
      $btn.replaceWith('<span class="badge badge-green">✓ Registered</span>');
      registrations = null;
      loadStats();
      loadMyEvents();
    } catch (error) {
      ui.busy($btn, false);
      ui.handleError(error, () => $btn.trigger('click'));
    }
  });
});
