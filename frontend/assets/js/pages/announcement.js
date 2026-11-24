/**
 * Announcement detail with a custom, keyboard-accessible audio player built on
 * a native <audio> element (fallback text + download link included).
 */
CE.page({ access: 'user', active: 'announcements' }, () => {
  const { auth, ui, utils } = CE;
  const { icon } = ui;
  const esc = utils.escape;
  const $detail = $('#announcement-detail');
  let item;

  function render() {
    const url = esc(item.audio_url);
    document.title = `${item.title} · CivicEvents`;
    $('#crumb').text(item.title);
    $detail.removeAttr('aria-busy').html(`
      <article>
        <header class="mb-6">
          <div class="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span class="badge badge-purple">${icon('megaphone', 'h-3.5 w-3.5')}Audio announcement</span>
            ${item.published === false ? '<span class="badge badge-amber">Draft</span>' : ''}
            <time datetime="${esc(item.created_at)}">Published ${utils.formatDateTime(item.created_at)}</time>
          </div>
          <h1 class="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">${esc(item.title)}</h1>
        </header>

        <section class="card overflow-hidden" aria-label="Audio player">
          <div class="bg-gradient-to-br from-brand-600 to-brand-800 p-6 text-white sm:p-8">
            <audio id="audio" preload="metadata" src="${url}">
              <p>Your browser can’t play this audio format. <a href="${url}" download class="underline">Download the recording</a> instead.</p>
            </audio>
            <div class="flex items-center gap-4 sm:gap-6">
              <button type="button" id="play" class="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-white text-brand-700 shadow-lg transition hover:scale-105" aria-label="Play announcement">${icon('play', 'h-7 w-7 fill-current')}</button>
              <div class="min-w-0 flex-1">
                <label for="seek" class="sr-only">Playback position</label>
                <input id="seek" type="range" class="range" min="0" max="0" step="0.1" value="0" aria-valuetext="0:00 of unknown length" disabled>
                <div class="mt-1 flex justify-between text-sm tabular-nums text-brand-100" aria-hidden="true">
                  <span id="current">0:00</span><span id="duration">--:--</span>
                </div>
              </div>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2 px-4 py-3 sm:px-6">
            <button type="button" class="btn btn-ghost btn-sm" data-skip="-10" aria-label="Rewind 10 seconds">−10s</button>
            <button type="button" class="btn btn-ghost btn-sm" data-skip="10" aria-label="Forward 10 seconds">+10s</button>
            <div class="ml-auto flex items-center gap-2">
              <button type="button" id="mute" class="btn btn-ghost btn-icon" aria-label="Mute" aria-pressed="false">${icon('volume')}</button>
              <label for="volume" class="sr-only">Volume</label>
              <input id="volume" type="range" class="range w-24" min="0" max="1" step="0.05" value="1">
              <label for="speed" class="sr-only">Playback speed</label>
              <select id="speed" class="input w-auto py-1.5 text-sm">
                ${[0.75, 1, 1.25, 1.5, 2].map((s) => `<option value="${s}" ${s === 1 ? 'selected' : ''}>${s}×</option>`).join('')}
              </select>
            </div>
          </div>
          <div id="audio-error" class="hidden border-t border-red-100 bg-red-50 px-6 py-4 text-sm text-red-800" role="alert">
            This recording can’t be played in your browser. <a href="${url}" download class="font-semibold underline">Download it</a> to listen offline.
          </div>
        </section>

        <section class="card mt-6 p-6" aria-labelledby="transcript-heading">
          <h2 id="transcript-heading" class="flex items-center gap-2 text-lg font-semibold">${icon('caption', 'h-5 w-5 text-brand-600')}Transcript</h2>
          <p class="prose-text mt-3 text-slate-700">${item.transcript ? esc(item.transcript) : 'A written transcript isn’t available for this announcement yet. Need help accessing it? <a class="font-medium text-brand-700 underline" href="mailto:' + CE.config.supportEmail + '">Contact support</a>.'}</p>
        </section>

        ${auth.isAdmin() ? `
          <section class="card mt-6 flex flex-wrap items-center justify-between gap-3 p-5">
            <h2 class="text-sm font-semibold text-slate-500">Admin actions</h2>
            <div class="flex flex-wrap gap-2">${ui.adminControls('announcements', item, { publishToggle: true })}</div>
          </section>` : ''}
      </article>`);
    bindPlayer();
  }

  function bindPlayer() {
    const audio = document.getElementById('audio');
    const $play = $('#play');
    const $seek = $('#seek');
    const $mute = $('#mute');
    const time = () => `${utils.formatDuration(audio.currentTime)} of ${utils.formatDuration(audio.duration)}`;

    const syncPlay = () => $play
      .html(icon(audio.paused ? 'play' : 'pause', 'h-7 w-7 fill-current'))
      .attr('aria-label', audio.paused ? 'Play announcement' : 'Pause announcement');
    const syncTime = () => {
      $('#current').text(utils.formatDuration(audio.currentTime));
      $seek.val(audio.currentTime).attr('aria-valuetext', time());
    };

    $(audio)
      .on('loadedmetadata durationchange', () => {
        $('#duration').text(utils.formatDuration(audio.duration));
        if (Number.isFinite(audio.duration)) $seek.attr('max', audio.duration).prop('disabled', false);
        syncTime();
      })
      .on('timeupdate', syncTime)
      .on('play pause ended', syncPlay)
      .on('error', () => { $('#audio-error').removeClass('hidden'); $play.prop('disabled', true); });

    $play.on('click', () => (audio.paused ? audio.play().catch(() => {}) : audio.pause()));
    $seek.on('input', () => { audio.currentTime = Number($seek.val()); });
    $detail.find('[data-skip]').on('click', (e) => { audio.currentTime = Math.max(0, audio.currentTime + Number(e.currentTarget.dataset.skip)); });
    $('#volume').on('input', function () { audio.volume = Number(this.value); audio.muted = audio.volume === 0; });
    $('#speed').on('change', function () { audio.playbackRate = Number(this.value); });
    $mute.on('click', () => { audio.muted = !audio.muted; });
    $(audio).on('volumechange', () => $mute
      .html(icon(audio.muted ? 'volumeOff' : 'volume'))
      .attr({ 'aria-pressed': String(audio.muted), 'aria-label': audio.muted ? 'Unmute' : 'Mute' }));

    // Keyboard shortcuts while focus is inside the player: Space/K toggles, ←/→ seek 5s.
    $detail.find('[aria-label="Audio player"]').on('keydown', (e) => {
      if ($(e.target).is('input, select')) return;
      if (e.key === ' ' || e.key.toLowerCase() === 'k') { e.preventDefault(); $play.trigger('click'); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') audio.currentTime += e.key === 'ArrowLeft' ? -5 : 5;
    });
  }

  ui.loadDetail({ $el: $detail, type: 'announcements', render: (data) => { item = data; render(); } });
});
