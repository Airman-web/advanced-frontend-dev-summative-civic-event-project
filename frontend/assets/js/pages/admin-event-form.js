/**
 * Admin: create / edit an event (multipart/form-data, image field "image").
 * ROLE GUARD: access 'admin' — normal users get the 403 view (see CE.auth.guard).
 */
CE.page({ access: 'admin', active: 'admin-event-form', admin: true }, async () => {
  const { api, ui, utils } = CE;
  const { forms } = ui;
  const id = utils.param('id');
  const $form = $('#event-form');

  $('[data-icon=upload]').html(ui.icon('upload'));
  const image = forms.fileField({
    input: '#image',
    types: ['.jpg', '.jpeg', '.png', '.gif'],
    maxMB: 2,
    preview: (url) => `<img src="${url}" alt="Preview of the selected image" class="max-h-72 w-full bg-slate-100 object-contain">`,
  });

  if (id) {
    $('[data-title]').text('Edit event');
    $('[data-submit]').text('Save changes');
    document.title = 'Edit event · CivicEvents Admin';
    $form.find(':input').prop('disabled', true);
    try {
      const event = await api.get(`/events/${id}`);
      ['title', 'description', 'location'].forEach((key) => $(`#${key}`).val(event[key] || ''));
      $('#starts_at').val(utils.toDateTimeInput(event.starts_at));
      $('#ends_at').val(utils.toDateTimeInput(event.ends_at));
      $('#published').prop('checked', event.published !== false);
      if (event.metadata?.image_url) {
        $('[data-current-image]').html(`
          <figure class="mb-3 overflow-hidden rounded-xl border border-slate-200">
            <img src="${utils.escape(event.metadata.image_url)}" alt="Current event image" class="max-h-56 w-full bg-slate-100 object-contain">
            <figcaption class="px-4 py-2 text-xs text-slate-500">Current image — upload a new one to replace it.</figcaption>
          </figure>`);
      }
      $form.find(':input').prop('disabled', false);
    } catch (error) {
      return error.status === 404 ? ui.notFound($form, 'event', 'events.html') : ui.errorState($form, error, () => window.location.reload());
    }
  }

  $form.on('submit', (e) => {
    e.preventDefault();
    const v = forms.values($form);
    const valid = forms.validate($form, {
      title: (val) => !val && 'Title is required.',
      location: (val) => !val && 'Location is required.',
      starts_at: (val) => !val && 'Start date and time are required.',
      ends_at: (val) => (!val ? 'End date and time are required.' : v.starts_at && new Date(val) <= new Date(v.starts_at) && 'The event must end after it starts.'),
    });
    if (!valid || image.error()) return;

    const data = new FormData();
    ['title', 'description', 'location'].forEach((key) => data.append(key, v[key]));
    data.append('starts_at', new Date(v.starts_at).toISOString());
    data.append('ends_at', new Date(v.ends_at).toISOString());
    data.append('published', String($('#published').is(':checked')));
    if (image.file()) data.append('image', image.file());

    forms.submit({
      $button: $('[data-submit]'),
      $progress: $('#upload-progress'),
      busyLabel: id ? 'Saving…' : 'Creating…',
      send: (onProgress) => api.upload(id ? 'PUT' : 'POST', id ? `/events/${id}` : '/events', data, onProgress),
      invalidate: ['events'],
      success: id ? 'Event updated.' : 'Event created and residents notified.',
      redirect: (event) => `event.html?id=${event.id}`,
    });
  });
});
