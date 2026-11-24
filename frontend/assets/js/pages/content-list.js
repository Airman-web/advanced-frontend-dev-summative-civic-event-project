/**
 * Shared list page for announcements and promos — they differ only in card,
 * skeleton and copy. The page type is inferred from which list container exists.
 * Normal users only see published items; admins also see drafts and get
 * publish / edit / delete controls (rendered by CE.ui.adminControls).
 */
(function () {
  const TYPES = {
    announcements: { $list: '#announcement-list', $pager: '#announcement-pager', skeleton: 'rows', icon: 'megaphone', noun: 'announcement' },
    promos: { $list: '#promo-list', $pager: '#promo-pager', skeleton: 'cards', icon: 'video', noun: 'promo' },
  };
  const type = $(TYPES.announcements.$list).length ? 'announcements' : 'promos';
  const settings = TYPES[type];

  CE.page({ access: 'user', active: type }, () => {
    const { api, ui, utils } = CE;
    const $list = $(settings.$list);
    const $search = $('#search');
    let items = [];

    function render() {
      const query = $search.val().trim();
      const filtered = items.filter((item) => utils.matches(query, item.title, item.description));
      $('#result-count').text(`${utils.plural(filtered.length, settings.noun)}${query ? ` matching “${query}”` : ''}`);
      ui.paginate({
        items: filtered,
        $list,
        $pager: $(settings.$pager),
        render: ui.cards[settings.noun],
        empty: ui.empty({
          icon: settings.icon,
          title: query ? `No ${settings.noun}s match your search` : `No ${settings.noun}s yet`,
          text: query ? 'Try a different keyword.' : 'New content will show up here as soon as it’s published.',
        }),
      });
    }

    async function load() {
      ui.loading($list, ui.skeleton[settings.skeleton](6));
      try {
        items = await api.list(type);
        render();
      } catch (error) {
        ui.errorState($list, error, load);
      }
    }

    $search.on('input', utils.debounce(render, 250));
    if (type === 'announcements') ui.audioPreview($list);
    ui.actions.bind($list, load);
    load();
  });
})();
