/**
 * My profile: view account details, edit full_name / email (role and is_active
 * are read-only and never sent), and list the user's own event reviews.
 */
CE.page({ access: 'user', active: 'profile' }, () => {
  const { api, auth, ui, utils } = CE;
  const { forms, icon } = ui;
  const esc = utils.escape;
  const $form = $('#profile-form');
  let profile;

  function renderCard() {
    $('#profile-card').removeAttr('aria-busy').html(`
      <div class="text-center">
        <span class="mx-auto grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-2xl font-bold text-white">${esc(utils.initials(profile.full_name))}</span>
        <p class="mt-4 text-lg font-semibold">${esc(profile.full_name)}</p>
        <p class="text-sm text-slate-600">${esc(profile.email)}</p>
        <div class="mt-3 flex justify-center gap-2">
          <span class="badge ${profile.role === 'admin' ? 'badge-purple' : 'badge-blue'}">${profile.role === 'admin' ? 'Administrator' : 'Resident'}</span>
          <span class="badge ${profile.is_active ? 'badge-green' : 'badge-gray'}">${profile.is_active ? 'Active' : 'Disabled'}</span>
        </div>
      </div>
      <dl class="mt-6 space-y-2 border-t border-slate-100 pt-4 text-sm">
        <div class="flex justify-between"><dt class="text-slate-600">Member since</dt><dd class="font-medium">${utils.formatDate(profile.created_at)}</dd></div>
        <div class="flex justify-between"><dt class="text-slate-600">Last updated</dt><dd class="font-medium">${utils.formatDate(profile.updated_at)}</dd></div>
      </dl>
      <a href="my-registrations.html" class="btn btn-secondary mt-6 w-full">${icon('ticket', 'h-4 w-4')}My registrations</a>`);
  }

  function fillForm() {
    $('#full_name').val(profile.full_name);
    $('#email').val(profile.email);
    $('#role-display').html(`${icon('lock', 'h-4 w-4')}${profile.role === 'admin' ? 'Administrator' : 'Resident'}`);
    $('#status-display').html(`${icon('lock', 'h-4 w-4')}${profile.is_active ? 'Active' : 'Disabled'}`);
    $form.find(':input').prop('disabled', false);
    syncDirty();
  }

  const changes = () => {
    const v = forms.values($form);
    return Object.fromEntries(['full_name', 'email'].filter((k) => v[k] !== profile[k]).map((k) => [k, v[k]]));
  };
  const syncDirty = () => $form.find('[type=submit], [type=reset]').prop('disabled', !Object.keys(changes()).length);

  async function load() {
    ui.loading($('#profile-card'), '<div class="skeleton mx-auto h-20 w-20 rounded-full"></div><div class="skeleton mx-auto mt-4 h-5 w-2/3"></div>');
    try {
      profile = await api.get('/users/profile/me');
      renderCard();
      fillForm();
    } catch (error) {
      ui.errorState($('#profile-card'), error, load);
    }
  }

  async function loadFeedback() {
    const $list = $('#my-feedback');
    ui.loading($list, `<li>${ui.skeleton.rows(2)}</li>`);
    try {
      const items = await api.get('/event-feedback/my-feedback');
      $list.removeAttr('aria-busy').html(items.length ? items.map((f) => `
        <li class="py-4">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <a href="event.html?id=${f.event_id}" class="font-medium hover:text-brand-700 hover:underline">${esc(f.title)}</a>
            ${ui.stars(f.rating)}
          </div>
          ${f.comment ? `<p class="mt-1 text-sm text-slate-700">${esc(f.comment)}</p>` : ''}
          <p class="mt-1 text-xs text-slate-500">Reviewed ${utils.formatDate(f.created_at)}</p>
        </li>`).join('') : '<li class="py-4 text-sm text-slate-600">You haven’t reviewed any events yet.</li>');
    } catch (error) {
      ui.errorState($list, error, loadFeedback);
    }
  }

  $form.on('input', syncDirty);
  $form.on('reset', () => setTimeout(() => { fillForm(); forms.setError($('#full_name'), null); forms.setError($('#email'), null); }));

  $form.on('submit', async (e) => {
    e.preventDefault();
    const valid = forms.validate($form, {
      full_name: (v) => (!v ? 'Full name is required.' : v.length < 2 && 'Please enter your full name.'),
      email: forms.emailError,
    });
    const body = changes();
    if (!valid || !Object.keys(body).length) return;

    const $button = $form.find('[type=submit]');
    ui.busy($button, true, 'Saving…');
    try {
      profile = await api.patch('/users/profile/me', body);
      auth.updateUser(profile);
      // Keep the header in sync without a reload.
      $('[data-user-name]').text(profile.full_name);
      $('[data-user-first-name]').text(profile.full_name.split(' ')[0]);
      $('[data-user-initials]').text(utils.initials(profile.full_name));
      $('[data-user-email]').text(profile.email);
      renderCard();
      ui.busy($button, false);
      fillForm();
      ui.toast('success', 'Your profile has been updated.');
    } catch (error) {
      ui.busy($button, false);
      if (error.status === 409) {
        forms.setError($('#email'), 'This email is already used by another account.');
        ui.dialog({
          title: 'Email already in use',
          body: `<p class="text-slate-600"><strong>${esc(body.email)}</strong> belongs to another account, so we couldn’t update your email. Your other details were not changed. Please use a different address.</p>`,
          actions: '<button type="button" class="btn btn-primary" data-close>Choose another email</button>',
          onClose: () => $('#email').trigger('focus').trigger('select'),
        });
      } else {
        ui.handleError(error, () => $form.trigger('submit'));
      }
    }
  });

  load();
  loadFeedback();
});
