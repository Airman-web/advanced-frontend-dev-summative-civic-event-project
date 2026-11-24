/**
 * Admin: user management — list, view profile, enable/disable (optimistic toggle).
 * ROLE GUARD: access 'admin'. Per the rules, there is deliberately no role editor,
 * and admins can't disable their own account from the UI.
 */
CE.page({ access: 'admin', active: 'admin-users', admin: true }, (me) => {
  const { api, ui, utils } = CE;
  const esc = utils.escape;
  const $rows = $('#rows');
  let users = [];

  const roleBadge = (role) => `<span class="badge ${role === 'admin' ? 'badge-purple' : 'badge-blue'}">${role === 'admin' ? 'Admin' : 'Resident'}</span>`;
  const avatar = (name) => `<span class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-bold text-white">${esc(utils.initials(name))}</span>`;

  function row(user) {
    const self = user.id === me.id;
    return `
      <tr class="hover:bg-slate-50" data-user="${user.id}">
        <td class="px-4 py-3">
          <div class="flex items-center gap-3">${avatar(user.full_name)}
            <div class="min-w-0"><p class="truncate font-medium">${esc(user.full_name)}${self ? ' <span class="text-xs font-normal text-slate-500">(you)</span>' : ''}</p><p class="truncate text-slate-600">${esc(user.email)}</p></div>
          </div>
        </td>
        <td class="hidden px-4 py-3 sm:table-cell">${roleBadge(user.role)}</td>
        <td class="hidden whitespace-nowrap px-4 py-3 text-slate-600 md:table-cell">${utils.formatDate(user.created_at)}</td>
        <td class="px-4 py-3">
          <span class="flex items-center gap-2">
            <span class="switch"><input type="checkbox" role="switch" data-toggle="${user.id}" ${user.is_active ? 'checked' : ''} ${self ? 'disabled title="You can’t disable your own account"' : ''} aria-label="Account active for ${esc(user.full_name)}"><span class="knob"></span></span>
            <span class="text-xs font-medium ${user.is_active ? 'text-emerald-700' : 'text-slate-500'}" data-status>${user.is_active ? 'Active' : 'Disabled'}</span>
          </span>
        </td>
        <td class="px-4 py-3 text-right"><button type="button" class="btn btn-ghost btn-sm" data-view="${user.id}" aria-label="View ${esc(user.full_name)}">View</button></td>
      </tr>`;
  }

  function render() {
    const query = $('#search').val().trim();
    const status = $('#status').val();
    const role = $('#role').val();
    const items = users.filter((u) => utils.matches(query, u.full_name, u.email)
      && (!status || (status === 'active') === u.is_active)
      && (!role || u.role === role));
    $('#count').text(`${utils.plural(items.length, 'user')} shown · ${users.filter((u) => !u.is_active).length} disabled overall`);
    ui.paginate({
      items, $list: $rows, $pager: $('#pager'), pageSize: 15, render: row,
      empty: `<tr><td colspan="5" class="p-6">${ui.empty({ icon: 'users', title: 'No users match your filters' })}</td></tr>`,
    });
  }

  async function load() {
    ui.loading($rows, `<tr><td colspan="5" class="space-y-3 p-4">${ui.skeleton.rows(5)}</td></tr>`);
    try {
      users = await api.get('/users?limit=1000');
      render();
    } catch (error) {
      ui.errorState($rows, error, load);
    }
  }

  // Optimistic enable/disable: flip immediately, call the API, revert on failure.
  $rows.on('change', '[data-toggle]', async function () {
    const user = users.find((u) => u.id === this.dataset.toggle);
    const enable = this.checked;
    const $status = $(this).closest('td').find('[data-status]');
    const apply = (active) => {
      user.is_active = active;
      this.checked = active;
      $status.text(active ? 'Active' : 'Disabled').toggleClass('text-emerald-700', active).toggleClass('text-slate-500', !active);
    };

    if (!enable) {
      const ok = await ui.confirm({ title: `Disable ${user.full_name}?`, message: 'They will be marked inactive. You can re-enable the account at any time.', confirmLabel: 'Disable account', danger: true });
      if (!ok) { this.checked = true; return; }
    }
    apply(enable);
    this.disabled = true;
    try {
      await api.patch(`/users/${user.id}/${enable ? 'enable' : 'disable'}`);
      ui.toast('success', `${user.full_name} has been ${enable ? 'enabled' : 'disabled'}.`);
    } catch (error) {
      apply(!enable);
      ui.handleError(error);
    } finally {
      this.disabled = false;
    }
  });

  $rows.on('click', '[data-view]', async (e) => {
    const $dialog = ui.dialog({ title: 'User profile', body: `<div class="space-y-3">${ui.skeleton.rows(1)}</div>` });
    try {
      const user = await api.get(`/users/${e.currentTarget.dataset.view}`);
      const field = (label, value) => `<div class="flex justify-between gap-4 py-2.5"><dt class="text-slate-600">${label}</dt><dd class="text-right font-medium">${value}</dd></div>`;
      $dialog.find('[data-body]').html(`
        <div class="flex items-center gap-4">${avatar(user.full_name)}<div><p class="text-lg font-semibold">${esc(user.full_name)}</p><p class="text-sm text-slate-600">${esc(user.email)}</p></div></div>
        <dl class="mt-4 divide-y divide-slate-100 text-sm">
          ${field('Role', roleBadge(user.role))}
          ${field('Status', user.is_active ? '<span class="badge badge-green">Active</span>' : '<span class="badge badge-gray">Disabled</span>')}
          ${field('Member since', utils.formatDate(user.created_at))}
          ${field('Last updated', utils.formatDateTime(user.updated_at))}
        </dl>
        <p class="mt-4 flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">${ui.icon('lock', 'h-4 w-4 shrink-0')}Roles are managed by system administrators and can’t be changed here.</p>`);
    } catch (error) {
      ui.errorState($dialog.find('[data-body]'), error);
    }
  });

  $('#search').on('input', utils.debounce(render, 250));
  $('#status, #role').on('change', render);
  load();
});
