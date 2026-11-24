/**
 * My registrations (GET /api/event-registrations/my-registrations), grouped into
 * Upcoming / Past / Cancelled tabs, with cancel for upcoming events.
 */
CE.page({ access: 'user', active: 'registrations' }, () => {
  const { api, ui, utils } = CE;
  const esc = utils.escape;
  const $panel = $('#registrations');
  const TABS = ['upcoming', 'past', 'cancelled'];
  const EMPTY = {
    upcoming: ['No upcoming registrations', 'Browse events and register for something you’d enjoy.'],
    past: ['No past events yet', 'Events you attended will appear here.'],
    cancelled: ['No cancelled registrations', ''],
  };
  let registrations = [];
  let tab = 'upcoming';

  const groupOf = (r) => (r.status === 'cancelled' ? 'cancelled' : utils.eventStatus(r) === 'past' ? 'past' : 'upcoming');

  function item(r) {
    const d = new Date(r.starts_at);
    return `
      <article class="card flex flex-wrap items-center gap-4 p-4 sm:flex-nowrap">
        <span class="w-14 shrink-0 rounded-xl bg-brand-50 py-2 text-center"><span class="block text-xs font-bold uppercase text-brand-700">${d.toLocaleString(undefined, { month: 'short' })}</span><span class="block text-xl font-bold leading-none">${d.getDate()}</span></span>
        <div class="min-w-0 flex-1">
          <h2 class="truncate font-semibold"><a href="event.html?id=${r.event_id}" class="hover:text-brand-700">${esc(r.title)}</a></h2>
          <p class="mt-0.5 text-sm text-slate-600">${utils.formatDateTime(r.starts_at)} · ${esc(r.location || 'TBA')}</p>
          <p class="mt-0.5 text-xs text-slate-500">${r.status === 'cancelled' ? `Cancelled ${utils.timeAgo(r.updated_at)}` : `Registered ${utils.timeAgo(r.created_at)}`}</p>
        </div>
        <div class="flex w-full shrink-0 justify-end gap-2 sm:w-auto">
          <a class="btn btn-secondary btn-sm" href="event.html?id=${r.event_id}">View event</a>
          ${groupOf(r) === 'upcoming' ? `<button type="button" class="btn btn-ghost btn-sm text-red-700" data-cancel="${r.event_id}" data-title="${esc(r.title)}">Cancel</button>` : ''}
        </div>
      </article>`;
  }

  function render() {
    const counts = Object.fromEntries(TABS.map((t) => [t, registrations.filter((r) => groupOf(r) === t).length]));
    $('[data-tab]').each((_, el) => {
      const active = el.dataset.tab === tab;
      $(el).attr({ 'aria-selected': String(active), tabindex: active ? '0' : '-1' })
        .toggleClass('border-brand-600 text-brand-700', active).toggleClass('border-transparent text-slate-600 hover:text-slate-900', !active)
        .html(`${utils.capitalize(el.dataset.tab)} <span class="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">${counts[el.dataset.tab]}</span>`);
    });
    $panel.attr('aria-labelledby', `tab-${tab}`);
    const items = registrations.filter((r) => groupOf(r) === tab)
      .sort((a, b) => (tab === 'upcoming' ? 1 : -1) * (new Date(a.starts_at) - new Date(b.starts_at)));
    const [title, text] = EMPTY[tab];
    $panel.removeAttr('aria-busy').html(items.length ? items.map(item).join('')
      : ui.empty({ icon: 'ticket', title, text, action: tab === 'upcoming' ? '<a href="events.html" class="btn btn-primary">Browse events</a>' : '' }));
  }

  async function load() {
    ui.loading($panel, ui.skeleton.rows(3));
    try {
      registrations = await api.registrations.mine();
      render();
    } catch (error) {
      ui.errorState($panel, error, load);
    }
  }

  $('[data-tab]').on('click', (e) => { tab = e.currentTarget.dataset.tab; render(); });
  // Arrow-key navigation between tabs (WAI-ARIA tabs pattern).
  $('[role=tablist]').on('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    tab = TABS[(TABS.indexOf(tab) + (e.key === 'ArrowRight' ? 1 : -1) + TABS.length) % TABS.length];
    render();
    $(`[data-tab=${tab}]`).trigger('focus');
  });

  $panel.on('click', '[data-cancel]', async (e) => {
    const { cancel, title } = e.currentTarget.dataset;
    const ok = await ui.confirm({ title: 'Cancel registration?', message: `You’ll lose your spot at “${title}”. Online re-registration isn’t available after cancelling.`, confirmLabel: 'Cancel registration', danger: true });
    if (!ok) return;
    const $btn = $(e.currentTarget);
    ui.busy($btn, true, 'Cancelling…');
    try {
      const updated = await api.registrations.cancel(cancel);
      Object.assign(registrations.find((r) => r.event_id === cancel), updated);
      ui.toast('success', 'Registration cancelled.');
      render();
    } catch (error) {
      ui.busy($btn, false);
      ui.handleError(error, () => $btn.trigger('click'));
    }
  });

  load();
});
