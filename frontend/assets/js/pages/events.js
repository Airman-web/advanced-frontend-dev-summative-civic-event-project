/**
 * Events list: search, location/date filters, pagination, register (users),
 * edit/delete (admins). The API returns every event, so filtering is client-side.
 */
CE.page({ access: 'user', active: 'events' }, () => {
  const { api, auth, ui, utils } = CE;
  const $filters = $('#filters');
  const $list = $('#event-list');
  const FILTER_KEYS = ['q', 'location', 'from', 'to', 'when'];
  let events = [];
  let registered = new Set();

  // Restore filters from the URL so filtered views are shareable.
  FILTER_KEYS.forEach((key) => { const v = utils.param(key); if (v) $filters.find(`[name=${key}]`).val(v); });

  async function load() {
    ui.loading($list, ui.skeleton.cards(6));
    $('#event-pager').empty();
    try {
      // ROLE GUARD (UI): admins don't register, so only fetch registrations for normal users.
      const [list, mine] = await Promise.all([api.list('events'), auth.isAdmin() ? [] : api.registrations.mine()]);
      events = list;
      registered = new Set(mine.filter((r) => r.status === 'registered').map((r) => r.event_id));
      fillLocations();
      render();
    } catch (error) {
      ui.errorState($list, error, load);
    }
  }

  function fillLocations() {
    const $select = $('#location');
    const current = utils.param('location') || $select.val();
    const locations = [...new Set(events.map((e) => e.location).filter(Boolean))].sort();
    $select.html('<option value="">All locations</option>' + locations.map((l) => `<option>${utils.escape(l)}</option>`).join('')).val(current);
  }

  function applyFilters() {
    const f = Object.fromEntries(new FormData($filters[0]));
    const result = events.filter((e) => {
      const start = new Date(e.starts_at);
      const past = utils.eventStatus(e) === 'past';
      return utils.matches(f.q, e.title, e.description, e.location)
        && (!f.location || e.location === f.location)
        && (!f.from || start >= new Date(`${f.from}T00:00`))
        && (!f.to || start <= new Date(`${f.to}T23:59:59`))
        && (f.when === 'all' || (f.when === 'past') === past);
    });
    // Upcoming: soonest first. Past: most recent first.
    return f.when === 'past' ? result.reverse() : result;
  }

  function render() {
    const items = applyFilters();
    const params = new URLSearchParams([...new FormData($filters[0])].filter(([k, v]) => v && !(k === 'when' && v === 'upcoming')));
    window.history.replaceState(null, '', params.toString() ? `?${params}` : window.location.pathname);
    $('#result-count').text(`${utils.plural(items.length, 'event')} found`);
    ui.paginate({
      items,
      $list,
      $pager: $('#event-pager'),
      render: (e) => ui.cards.event(e, { registered: registered.has(e.id) }),
      empty: ui.empty({
        icon: 'calendar',
        title: events.length ? 'No events match your filters' : 'No events yet',
        text: events.length ? 'Try a different search, location or date range.' : 'Check back soon for upcoming community events.',
        action: events.length ? '<button type="reset" form="filters" class="btn btn-secondary">Clear filters</button>' : '',
      }),
    });
  }

  $filters.on('input change', 'select, input[type=date]', render);
  $filters.on('input', '#q', utils.debounce(render, 250));
  $filters.on('reset', () => setTimeout(render)); // run after the browser resets the fields
  $filters.on('submit', (e) => e.preventDefault());

  $list.on('click', '[data-register]', async (e) => {
    const $btn = $(e.currentTarget);
    const id = $btn.data('register');
    ui.busy($btn, true, 'Registering…');
    try {
      await api.registrations.register(id);
      registered.add(id);
      ui.toast('success', 'You’re registered! See it any time in My registrations.');
      $btn.closest('article').replaceWith(ui.cards.event(events.find((ev) => ev.id === id), { registered: true }));
    } catch (error) {
      ui.busy($btn, false);
      ui.handleError(error, () => $btn.trigger('click'));
    }
  });

  ui.actions.bind($list, load);
  load();
});
