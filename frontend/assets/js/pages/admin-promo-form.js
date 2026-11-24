/**
 * Admin: create / edit a promo (multipart, file field "video" + caption_text).
 * The create endpoint always publishes, so a draft is created then unpublished.
 * ROLE GUARD: access 'admin'.
 */
CE.page({ access: 'admin', active: 'admin-promo-form', admin: true }, async () => {
  const { api, ui, utils } = CE;
  const { forms } = ui;
  const id = utils.param('id');
  const $form = $('#promo-form');
  const FIELDS = ['title', 'description', 'caption_text'];

  $('[data-icon=upload]').html(ui.icon('upload'));
  const video = forms.fileField({
    input: '#video',
    types: ['.mp4', '.mov', '.avi', '.mkv'],
    maxMB: 8,
    preview: (url) => `<video controls muted src="${url}" class="max-h-72 w-full bg-black" aria-label="Preview of the selected video"></video>`,
  });

  if (id) {
    $('[data-title]').text('Edit promo');
    $('[data-submit]').text('Save changes');
    $('[data-video-required]').remove();
    document.title = 'Edit promo · CivicEvents Admin';
    $form.find(':input').prop('disabled', true);
    try {
      const promo = await api.get(`/promos/${id}`);
      FIELDS.forEach((key) => $(`#${key}`).val(promo[key] || ''));
      $('#published').prop('checked', promo.published !== false);
      $('[data-current-video]').html(`
        <figure class="mb-3 overflow-hidden rounded-xl border border-slate-200">
          <video controls muted preload="metadata" src="${utils.escape(promo.video_url)}" class="max-h-56 w-full bg-black" aria-label="Current video"></video>
          <figcaption class="px-4 py-2 text-xs text-slate-500">Current video — upload a new one to replace it.</figcaption>
        </figure>`);
      $form.find(':input').prop('disabled', false);
    } catch (error) {
      return error.status === 404 ? ui.notFound($form, 'promo', 'promos.html') : ui.errorState($form, error, () => window.location.reload());
    }
  }

  $form.on('submit', (e) => {
    e.preventDefault();
    const v = forms.values($form);
    const published = $('#published').is(':checked');
    const valid = forms.validate($form, {
      title: (val) => !val && 'Title is required.',
      description: (val) => !val && 'Description is required.',
      caption_text: (val) => !val && 'Captions are required for accessibility.',
    });
    if (!valid || video.error()) return;
    if (!id && !video.file()) {
      forms.setError($('#video'), 'Please choose a video to upload.');
      return $('#video').trigger('focus');
    }

    const data = new FormData();
    FIELDS.forEach((key) => data.append(key, v[key]));
    if (id) data.append('published', String(published));
    if (video.file()) data.append('video', video.file());

    forms.submit({
      $button: $('[data-submit]'),
      $progress: $('#upload-progress'),
      busyLabel: id ? 'Saving…' : 'Uploading…',
      send: async (onProgress) => {
        const promo = await api.upload(id ? 'PUT' : 'POST', id ? `/promos/${id}` : '/promos', data, onProgress);
        return !id && !published ? api.patch(`/promos/${promo.id}/unpublish`) : promo;
      },
      invalidate: ['promos'],
      success: id ? 'Promo updated.' : published ? 'Promo published — residents have been notified.' : 'Promo saved as a draft.',
      redirect: (promo) => `promo.html?id=${promo.id}`,
    });
  });
});
