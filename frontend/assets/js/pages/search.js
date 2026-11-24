/**
 * Global search results (?q=) across events, announcements and promos,
 * using the same cached, role-filtered lists as the list pages.
 */
CE.page({ access: 'user', active: 'search' }, () => {
  const { api, ui, utils } = CE;
  const esc = utils.escape;
  const query = (utils.param('q') || '').trim();
  const $results = $('#results');
  const SECTIONS = [
    { type: 'events', label: 'Events', icon: 'calendar', page: 'event.html', fields: (e) => [e.title, e.description, e.location], meta: (e) => `${utils.formatDateTime(e.starts_at)} · ${e.location || 'TBA'}` },
    { type: 'announcements', label: 'Announcements', icon: 'megaphone', page: 'announcement.html', fields: (a) => [a.title], meta: (a) => `Audio · ${utils.formatDate(a.created_at)}` },
    { type: 'promos', label: 'Promos', icon: 'video', page: 'promo.html', fields: (p) => [p.title, p.description, p.caption_text], meta: (p) => `Video · ${utils.formatDate(p.created_at)}` },
  ];

  /** Split on the raw query (matches land on odd indexes), then escape every piece. */
  const pattern = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const highlight = (text) => String(text).split(pattern).map((part, i) => (i % 2 ? `<mark>${esc(part)}</mark>` : esc(part))).join('');

  function sectionHtml({ label, icon, page, meta }, items) {
    return `
      <section aria-labelledby="results-${label}">
        <h2 id="results-${label}" class="mb-3 flex items-center gap-2 text-lg font-semibold">${ui.icon(icon, 'h-5 w-5 text-brand-600')}${label} <span class="badge badge-gray">${items.length}</span></h2>
        <ul class="card divide-y divide-slate-100">${items.map((item) => `
          <li><a href="${page}?id=${item.id}" class="block p-4 hover:bg-slate-50">
            <span class="block font-medium">${highlight(item.title)}</span>
            <span class="mt-0.5 block text-sm text-slate-600">${esc(meta(item))}</span>
            ${item.description ? `<span class="mt-1 line-clamp-2 block text-sm text-slate-600">${highlight(item.description)}</span>` : ''}
          </a></li>`).join('')}
        </ul>
      </section>`;
  }

  $('#page-search').val(query);

  async function load() {
    if (!query) {
      $results.html(ui.empty({ icon: 'search', title: 'What are you looking for?', text: 'Use the search box above to find events, announcements and promos.' }));
      return $('#page-search').trigger('focus');
    }
    document.title = `“${query}” · Search · CivicEvents`;
    ui.loading($results, ui.skeleton.rows(4));
    try {
      const lists = await Promise.all(SECTIONS.map((s) => api.list(s.type)));
      const groups = SECTIONS.map((s, i) => [s, lists[i].filter((item) => utils.matches(query, ...s.fields(item)))]);
      const total = groups.reduce((sum, [, items]) => sum + items.length, 0);
      $('#search-summary').text(`${utils.plural(total, 'result')} for “${query}”`);
      $results.removeAttr('aria-busy').html(total
        ? groups.filter(([, items]) => items.length).map(([s, items]) => sectionHtml(s, items)).join('')
        : ui.empty({ icon: 'search', title: 'No results found', text: `Nothing matched “${query}”. Try a shorter or different keyword.` }));
    } catch (error) {
      ui.errorState($results, error, load);
    }
  }

  load();
});
