/**
 * Notification inbox: filter by read state / type, open detail, mark all read.
 * Admins additionally get a delete button per notification.
 */
CE.page({ access: 'user', active: 'notifications' }, () => {
  const { ui, utils, notifications } = CE;
  const $list = $('#notification-list');
  let filter = 'all';
  let loaded = false;

  function render() {
    if (!loaded) return;
    const read = notifications.readIds();
    const type = $('#type').val();
    const items = notifications.items.filter((n) => (filter === 'all' || !notifications.isRead(n, read)) && (!type || n.type === type));
    const unread = notifications.unreadCount();
    $('#summary').text(unread ? `You have ${utils.plural(unread, 'unread notification')}.` : 'You’re all caught up.');
    $('#mark-all').prop('disabled', !unread);
    $('[data-filter]').each((_, el) => {
      const active = el.dataset.filter === filter;
      $(el).attr('aria-pressed', String(active)).toggleClass('bg-white text-slate-900 shadow-sm', active).toggleClass('text-slate-600', !active);
    });
    ui.paginate({
      items,
      $list,
      $pager: $('#notification-pager'),
      pageSize: 15,
      render: (n) => notifications.itemHtml(n, { showDelete: true }),
      empty: `<li class="p-6">${ui.empty({
        icon: 'bell',
        title: filter === 'unread' ? 'No unread notifications' : 'No notifications yet',
        text: 'We’ll let you know when new events, announcements or promos are published.',
      })}</li>`,
    });
  }

  async function load() {
    ui.loading($list, `<li class="space-y-3 p-4">${ui.skeleton.rows(5)}</li>`);
    try {
      await notifications.load();
      loaded = true;
      render();
    } catch (error) {
      ui.errorState($list, error, load);
    }
  }

  $('[data-filter]').on('click', (e) => { filter = e.currentTarget.dataset.filter; render(); });
  $('#type').on('change', render);
  $('#mark-all').on('click', () => {
    notifications.setRead(notifications.items.map((n) => n.id));
    ui.toast('success', 'All notifications marked as read.');
  });
  $(document).on('ce:notifications', render);
  load();
});
