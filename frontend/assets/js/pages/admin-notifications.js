/**
 * Admin: notification management table with single and bulk delete.
 * ROLE GUARD: access 'admin' (DELETE /api/notifications/:id is admin-only on the API too).
 */
CE.page({ access: 'admin', active: 'admin-notifications', admin: true }, () => {
  const { api, ui, utils, notifications } = CE;
  const esc = utils.escape;
  const $rows = $('#rows');
  const selected = new Set();

  $('[data-icon=info]').html(ui.icon('info'));

  const visible = () => {
    const query = $('#search').val().trim();
    const type = $('#type').val();
    return notifications.items.filter((n) => utils.matches(query, n.title, n.message) && (!type || n.type === type));
  };

  function row(n) {
    return `
      <tr class="align-top hover:bg-slate-50">
        <td class="px-4 py-3"><input type="checkbox" class="h-4 w-4 rounded" value="${n.id}" ${selected.has(n.id) ? 'checked' : ''} aria-label="Select “${esc(n.title)}”"></td>
        <td class="max-w-md px-4 py-3">
          <button type="button" class="text-left font-medium text-slate-900 hover:text-brand-700 hover:underline" data-open-notification="${n.id}">${esc(n.title)}</button>
          <p class="mt-0.5 line-clamp-2 text-slate-600">${esc(n.message)}</p>
        </td>
        <td class="hidden px-4 py-3 md:table-cell">${notifications.typeBadge(n.type)}</td>
        <td class="hidden px-4 py-3 text-slate-600 md:table-cell">${n.recipient_id ? 'Single user' : 'Everyone'}</td>
        <td class="whitespace-nowrap px-4 py-3 text-slate-600"><time datetime="${esc(n.created_at)}" title="${utils.formatDateTime(n.created_at)}">${utils.timeAgo(n.created_at)}</time></td>
        <td class="px-4 py-3 text-right">
          <button type="button" class="btn btn-ghost btn-icon text-red-700 hover:!bg-red-50" data-delete-notification="${n.id}" aria-label="Delete “${esc(n.title)}”">${ui.icon('trash', 'h-4 w-4')}</button>
        </td>
      </tr>`;
  }

  function syncSelection() {
    const ids = visible().map((n) => n.id);
    [...selected].forEach((id) => { if (!notifications.items.some((n) => n.id === id)) selected.delete(id); });
    const count = selected.size;
    $('[data-bulk-delete]').prop('disabled', !count).text(count ? `Delete selected (${count})` : 'Delete selected');
    const all = ids.length > 0 && ids.every((id) => selected.has(id));
    $('#select-all').prop({ checked: all, indeterminate: !all && ids.some((id) => selected.has(id)) });
  }

  function render() {
    const items = visible();
    $('[data-total]').text(`(${items.length})`);
    ui.paginate({
      items,
      $list: $rows,
      $pager: $('#pager'),
      pageSize: 20,
      render: row,
      empty: `<tr><td colspan="6" class="p-6">${ui.empty({ icon: 'bell', title: 'No notifications found' })}</td></tr>`,
    });
    syncSelection();
  }

  async function load() {
    ui.loading($rows, `<tr><td colspan="6" class="space-y-3 p-4">${ui.skeleton.rows(4)}</td></tr>`);
    try {
      await notifications.load();
      render();
    } catch (error) {
      ui.errorState($rows, error, load);
    }
  }

  $rows.on('change', 'input[type=checkbox]', (e) => {
    e.currentTarget.checked ? selected.add(e.currentTarget.value) : selected.delete(e.currentTarget.value);
    syncSelection();
  });
  $('#select-all').on('change', function () {
    visible().forEach((n) => (this.checked ? selected.add(n.id) : selected.delete(n.id)));
    render();
  });
  $('#search').on('input', utils.debounce(render, 250));
  $('#type').on('change', render);

  $('#bulk-form').on('submit', async (e) => {
    e.preventDefault();
    const ids = [...selected];
    const ok = await ui.confirm({ title: `Delete ${utils.plural(ids.length, 'notification')}?`, message: 'They will be removed for every user. This can’t be undone.', confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    const $button = $('[data-bulk-delete]');
    ui.busy($button, true, 'Deleting…');
    const results = await Promise.allSettled(ids.map((id) => api.del(`/notifications/${id}`)));
    const failed = results.filter((r) => r.status === 'rejected').length;
    ui.busy($button, false);
    selected.clear();
    if (failed) ui.toast('error', `${utils.plural(failed, 'notification')} could not be deleted. Please try again.`);
    if (ids.length - failed) ui.toast('success', `${utils.plural(ids.length - failed, 'notification')} deleted.`);
    load();
  });

  $(document).on('ce:notifications', render);
  load();
});
