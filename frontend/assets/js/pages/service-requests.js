/**
 * Resident service requests: report a city issue (POST /api/service-requests) and
 * track your own requests (GET /api/service-requests/my-requests). Status changes are
 * made by admins and arrive as targeted notifications that link back here (?id=).
 */
CE.page({ access: 'user', active: 'services' }, () => {
  const { api, ui, utils } = CE;
  const { forms, icon } = ui;
  const esc = utils.escape;
  const $form = $('#request-form');
  const $list = $('#request-list');
  const focusId = utils.param('id');
  let requests = [];

  function item(r) {
    const highlighted = r.id === focusId;
    return `
      <article id="request-${r.id}" class="card p-5 ${highlighted ? 'ring-2 ring-brand-500' : ''}">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-xs font-semibold uppercase tracking-wide text-brand-700">${esc(r.service_type)}</p>
            <h3 class="mt-1 font-semibold">${esc(r.title)}</h3>
          </div>
          ${ui.requestStatusBadge(r.status)}
        </div>
        <p class="prose-text mt-2 text-sm text-slate-700">${esc(r.description)}</p>
        <p class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
          ${r.location ? `<span class="inline-flex items-center gap-1">${icon('pin', 'h-3.5 w-3.5')}${esc(r.location)}</span>` : ''}
          <span>Submitted <time datetime="${esc(r.created_at)}">${utils.formatDate(r.created_at)}</time></span>
          ${r.updated_at !== r.created_at ? `<span>Updated ${utils.timeAgo(r.updated_at)}</span>` : ''}
        </p>
        ${r.admin_note ? `
          <div class="mt-3 flex gap-2 rounded-lg bg-brand-50 p-3 text-sm text-brand-900">
            ${icon('info', 'h-4 w-4 shrink-0 text-brand-600')}<p><span class="font-semibold">Update from the city team:</span> ${esc(r.admin_note)}</p>
          </div>` : ''}
      </article>`;
  }

  function render() {
    const status = $('#status-filter').val();
    const items = requests.filter((r) => !status || r.status === status);
    $('[data-total]').text(`(${requests.length})`);
    $list.removeAttr('aria-busy').html(items.length ? items.map(item).join('') : ui.empty({
      icon: 'clipboard',
      title: requests.length ? 'No requests with this status' : 'You haven’t reported anything yet',
      text: requests.length ? 'Try another status filter.' : 'Spotted a problem in your neighbourhood? Use the form to let the city know.',
    }));
  }

  async function loadTypes() {
    const $select = $('#service_type');
    try {
      const types = await api.get('/service-requests/types', { cache: 'service-types' });
      $select.html('<option value="">Choose a type…</option>' + types.map((t) => `<option>${esc(t)}</option>`).join('')).prop('disabled', false);
    } catch (error) {
      $select.html('<option value="">Unavailable</option>');
      ui.handleError(error, loadTypes);
    }
  }

  async function loadRequests() {
    ui.loading($list, ui.skeleton.rows(3));
    try {
      requests = await api.get('/service-requests/my-requests');
      render();
      // Arrived from a notification: bring that request into view.
      if (focusId) document.getElementById(`request-${focusId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (error) {
      ui.errorState($list, error, loadRequests);
    }
  }

  const $description = $('#description');
  const updateCount = () => $form.find('[data-count]').text($description.val().length);
  $description.on('input', updateCount);
  $('#status-filter').on('change', render);

  $form.on('submit', async (e) => {
    e.preventDefault();
    const values = forms.values($form);
    const valid = forms.validate($form, {
      service_type: (v) => !v && 'Please choose the type of issue.',
      title: (v) => (!v ? 'Please add a short summary.' : v.length < 5 && 'Please add a little more detail to the summary.'),
      description: (v) => (!v ? 'Please describe the problem.' : v.length < 10 && 'Please describe the problem in a sentence or two.'),
    });
    if (!valid) return;

    const $button = $form.find('[type=submit]');
    ui.busy($button, true, 'Submitting…');
    try {
      const created = await api.post('/service-requests', values);
      requests.unshift(created);
      $form[0].reset();
      updateCount();
      $('#status-filter').val('');
      render();
      ui.toast('success', 'Thanks! Your request has been sent to the city team.');
    } catch (error) {
      ui.handleError(error, () => $form.trigger('submit'));
    } finally {
      ui.busy($button, false);
    }
  });

  loadTypes();
  loadRequests();
});
