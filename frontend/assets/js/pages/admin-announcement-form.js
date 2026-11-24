/**
 * Admin: create (multipart, file field "audio") or edit an announcement.
 * The backend's update endpoint doesn't replace audio, so editing covers title + published.
 * ROLE GUARD: access 'admin'.
 */
CE.page({ access: 'admin', active: 'admin-announcement-form', admin: true }, async () => {
  const { api, ui, utils } = CE;
  const { forms } = ui;
  const id = utils.param('id');
  const $form = $('#announcement-form');

  $('[data-icon=upload]').html(ui.icon('upload'));
  const audio = forms.fileField({
    input: '#audio',
    types: ['.mp3', '.wav', '.m4a', '.ogg'],
    maxMB: 5,
    preview: (url) => `<audio controls src="${url}" class="w-full p-3" aria-label="Preview of the selected recording"></audio>`,
  });

  if (id) {
    $('[data-title]').text('Edit announcement');
    $('[data-submit]').text('Save changes');
    document.title = 'Edit announcement · CivicEvents Admin';
    $('[data-audio-field]').remove();
    $form.find(':input').prop('disabled', true);
    try {
      const item = await api.get(`/announcements/${id}`);
      $('#title').val(item.title);
      $('#published').prop('checked', item.published !== false);
      $('[data-current-audio]').removeClass('hidden').html(`
        <span class="label">Current recording</span>
        <audio controls preload="metadata" src="${utils.escape(item.audio_url)}" class="w-full" aria-label="Current recording"></audio>
        <p class="hint">The recording can’t be replaced. To change it, create a new announcement and delete this one.</p>`);
      $form.find(':input').prop('disabled', false);
    } catch (error) {
      return error.status === 404 ? ui.notFound($form, 'announcement', 'announcements.html') : ui.errorState($form, error, () => window.location.reload());
    }
  }

  $form.on('submit', (e) => {
    e.preventDefault();
    const title = $('#title').val().trim();
    const published = $('#published').is(':checked');
    const rules = { title: (v) => !v && 'Title is required.' };
    if (!forms.validate($form, rules) || audio.error()) return;
    if (!id && !audio.file()) {
      forms.setError($('#audio'), 'Please choose an audio file to upload.');
      return $('#audio').trigger('focus');
    }

    let send;
    if (id) {
      send = () => api.put(`/announcements/${id}`, { title, published });
    } else {
      const data = new FormData();
      data.append('title', title);
      data.append('published', String(published));
      data.append('audio', audio.file());
      send = (onProgress) => api.upload('POST', '/announcements', data, onProgress);
    }

    forms.submit({
      $button: $('[data-submit]'),
      $progress: id ? null : $('#upload-progress'),
      busyLabel: id ? 'Saving…' : 'Uploading…',
      send,
      invalidate: ['announcements'],
      success: id ? 'Announcement updated.' : 'Announcement published — residents have been notified.',
      redirect: (item) => `announcement.html?id=${item.id}`,
    });
  });
});
