/**
 * Admin: review resident service requests and move them through
 * pending → in progress → resolved / rejected. Each update sends the resident
 * a targeted notification (handled by the API).
 * ROLE GUARD: access 'admin' (GET /service-requests and PATCH /:id/status are admin-only on the API).
 */
CE.page({ access: 'admin', active: 'admin-service-requests', admin: true }, () => {
  const { api, ui, utils } = CE;
  const esc = utils.escape;
  const $rows = $('#rows');
  let requests = [];

  function renderSummary() {
    const current = $('#status').val();
    $('#summary').html(Object.entries(ui.REQUEST_STATUSES).map(([key, [label]]) => `
      <button type="button" class="card p-4 text-left transition hover:shadow-lg ${current === key ? 'ring-2 ring-brand-500' : ''}" data-status="${key}" aria-pressed="${current === key}">
        <span class="block text-2xl font-bold tabular-nums">${requests.filter((r) => r.status === key).length}</span>
        <span class="mt-1 block">${ui.requestStatusBadge(key)}</span>
        <span class="sr-only">${label} requests: show only these</span>
      </button>`).join(''));
  }

  function row(r) {
    return `
      <tr class="align-top hover:bg-slate-50">
        <td class="max-w-md px-4 py-3">
          <p class="text-xs font-semibold uppercase tracking-wide text-brand-700">${esc(r.service_type)}</p>
          <p class="mt-0.5 font-medium text-slate-900">${esc(r.title)}</p>
          <p class="mt-0.5 line-clamp-2 text-slate-600">${esc(r.description)}</p>
          ${r.location ? `<p class="mt-1 flex items-center gap-1 text-xs text-slate-500">${ui.icon('pin', 'h-3.5 w-3.5')}${esc(r.location)}</p>` : ''}
        </td>
        <td class="hidden px-4 py-3 md:table-cell"><p class="font-medium">${esc(r.full_name)}</p><p class="text-slate-600">${esc(r.email)}</p></td>
        <td class="px-4 py-3">${ui.requestStatusBadge(r.status)}</td>
        <td class="hidden whitespace-nowrap px-4 py-3 text-slate-600 sm:table-cell"><time datetime="${esc(r.created_at)}" title="${utils.formatDateTime(r.created_at)}">${utils.timeAgo(r.created_at)}</time></td>
        <td class="px-4 py-3 text-right"><button type="button" class="btn btn-secondary btn-sm" data-update="${r.id}" aria-label="Update status of ${esc(r.title)}">Update</button></td>
      </tr>`;
  }

  function render() {
    const query = $('#search').val().trim();
    const type = $('#type').val();
    const status = $('#status').val();
    const items = requests.filter((r) => utils.matches(query, r.title, r.description, r.full_name, r.email, r.location)
      && (!type || r.service_type === type) && (!status || r.status === status));
    $('#count').text(`${utils.plural(items.length, 'request')} shown`);
    renderSummary();
    ui.paginate({
      items, $list: $rows, $pager: $('#pager'), pageSize: 15, render: row,
      empty: `<tr><td colspan="5" class="p-6">${ui.empty({ icon: 'clipboard', title: requests.length ? 'No requests match your filters' : 'No service requests yet', text: requests.length ? '' : 'Requests submitted by residents will appear here.' })}</td></tr>`,
    });
  }

  async function load() {
    ui.loading($rows, `<tr><td colspan="5" class="space-y-3 p-4">${ui.skeleton.rows(4)}</td></tr>`);
    try {
      requests = await api.get('/service-requests');
      const types = [...new Set(requests.map((r) => r.service_type))].sort();
      $('#type').html('<option value="">All types</option>' + types.map((t) => `<option>${esc(t)}</option>`).join(''));
      render();
    } catch (error) {
      ui.errorState($rows, error, load);
    }
  }

  function openUpdate(request) {
    const $dialog = ui.dialog({
      title: 'Update service request',
      body: `
        <div class="rounded-lg bg-slate-50 p-4 text-sm">
          <p class="text-xs font-semibold uppercase tracking-wide text-brand-700">${esc(request.service_type)}</p>
          <p class="mt-1 font-semibold">${esc(request.title)}</p>
          <p class="prose-text mt-1 text-slate-700">${esc(request.description)}</p>
          <p class="mt-2 text-xs text-slate-500">From ${esc(request.full_name)} · ${utils.formatDateTime(request.created_at)}${request.location ? ` · ${esc(request.location)}` : ''}</p>
        </div>
        <form id="status-form" class="mt-5 space-y-4" novalidate>
          <div class="field">
            <label for="new-status" class="label">Status</label>
            <select id="new-status" class="input">${Object.entries(ui.REQUEST_STATUSES).map(([key, [label]]) => `<option value="${key}" ${key === request.status ? 'selected' : ''}>${label}</option>`).join('')}</select>
          </div>
          <div class="field">
            <label for="admin-note" class="label">Note to the resident <span class="font-normal text-slate-500">(optional)</span></label>
            <textarea id="admin-note" rows="3" maxlength="500" class="input" placeholder="e.g. A crew is scheduled for Thursday.">${esc(request.admin_note || '')}</textarea>
          </div>
        </form>`,
      actions: '<button type="button" class="btn btn-secondary" data-close>Cancel</button><button type="submit" form="status-form" class="btn btn-primary">Save &amp; notify resident</button>',
    });

    $dialog.find('#status-form').on('submit', async (e) => {
      e.preventDefault();
      const $button = $dialog.find('[type=submit]');
      ui.busy($button, true, 'Saving…');
      try {
        const updated = await api.patch(`/service-requests/${request.id}/status`, {
          status: $('#new-status').val(),
          admin_note: $('#admin-note').val().trim() || null,
        });
        Object.assign(request, updated);
        $dialog[0].close();
        render();
        ui.toast('success', `Marked as ${ui.REQUEST_STATUSES[updated.status][0].toLowerCase()}. ${request.full_name} has been notified.`);
      } catch (error) {
        ui.busy($button, false);
        ui.handleError(error, () => $dialog.find('#status-form').trigger('submit'));
      }
    });
  }

  $rows.on('click', '[data-update]', (e) => openUpdate(requests.find((r) => r.id === e.currentTarget.dataset.update)));
  $('#summary').on('click', '[data-status]', (e) => {
    const key = e.currentTarget.dataset.status;
    $('#status').val($('#status').val() === key ? '' : key); // click again to clear
    render();
  });
  $('#search').on('input', utils.debounce(render, 250));
  $('#type, #status').on('change', render);
  load();
});
