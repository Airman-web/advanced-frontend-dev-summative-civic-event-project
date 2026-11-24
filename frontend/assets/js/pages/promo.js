/**
 * Promo detail: HTML5 video with an English captions <track>, enabled by default.
 * The API stores captions as plain `caption_text`, so we build a WebVTT file in
 * the browser (or use it verbatim if it is already WebVTT) and attach it as a blob.
 */
CE.page({ access: 'user', active: 'promos' }, () => {
  const { auth, ui, utils } = CE;
  const { icon } = ui;
  const esc = utils.escape;
  const $detail = $('#promo-detail');
  const WORDS_PER_CUE = 10;
  let item;

  /** Split plain text into ~10-word cues spread evenly across the video's duration. */
  function toWebVtt(text, duration) {
    if (/^WEBVTT/.test(text.trim())) return text.trim();
    const words = text.trim().split(/\s+/);
    const chunks = [];
    for (let i = 0; i < words.length; i += WORDS_PER_CUE) chunks.push(words.slice(i, i + WORDS_PER_CUE).join(' '));
    const length = Number.isFinite(duration) && duration > 0 ? duration / chunks.length : 3;
    const stamp = (s) => new Date(s * 1000).toISOString().slice(11, 23);
    const cues = chunks.map((chunk, i) => `${i + 1}\n${stamp(i * length)} --> ${stamp((i + 1) * length)}\n${chunk}`);
    return `WEBVTT\n\n${cues.join('\n\n')}`;
  }

  function attachCaptions(video) {
    if (!item.caption_text) return;
    const blob = new Blob([toWebVtt(item.caption_text, video.duration)], { type: 'text/vtt' });
    const track = Object.assign(document.createElement('track'), {
      kind: 'captions', srclang: 'en', label: 'English', default: true, src: URL.createObjectURL(blob),
    });
    video.appendChild(track);
    track.track.mode = 'showing';
    $('#cc-toggle').prop('disabled', false);
  }

  function render() {
    const url = esc(item.video_url);
    document.title = `${item.title} · CivicEvents`;
    $('#crumb').text(item.title);
    $detail.removeAttr('aria-busy').html(`
      <article>
        <div class="overflow-hidden rounded-2xl bg-black shadow-lg">
          <video id="video" class="aspect-video w-full" controls preload="metadata" playsinline aria-label="Promo video: ${esc(item.title)}" aria-describedby="promo-description">
            <source src="${url}">
            <p class="p-6 text-white">Your browser doesn’t support HTML5 video. <a href="${url}" download class="underline">Download the video</a>.</p>
          </video>
        </div>
        <div id="video-error" class="mt-3 hidden rounded-xl bg-red-50 p-4 text-sm text-red-800" role="alert">
          This video can’t be played in your browser. <a href="${url}" download class="font-semibold underline">Download it</a> instead.
        </div>

        <div class="mt-6 flex flex-wrap items-start justify-between gap-4">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <span class="badge badge-amber">${icon('video', 'h-3.5 w-3.5')}Promo</span>
              ${item.published === false ? '<span class="badge badge-gray">Draft</span>' : ''}
              <time datetime="${esc(item.created_at)}">${utils.formatDate(item.created_at)}</time>
            </div>
            <h1 class="mt-2 text-3xl font-bold tracking-tight">${esc(item.title)}</h1>
          </div>
          <button type="button" id="cc-toggle" class="btn btn-secondary" aria-pressed="true" disabled>${icon('caption', 'h-4 w-4')}<span>Captions on</span></button>
        </div>
        <p id="promo-description" class="prose-text mt-4 text-lg text-slate-700">${esc(item.description || '')}</p>

        <details class="card mt-6 p-6" ${item.caption_text ? 'open' : ''}>
          <summary class="cursor-pointer text-lg font-semibold">Transcript</summary>
          <p class="prose-text mt-3 text-slate-700">${esc(item.caption_text || 'No transcript is available for this video.')}</p>
        </details>

        ${auth.isAdmin() ? `
          <section class="card mt-6 flex flex-wrap items-center justify-between gap-3 p-5">
            <h2 class="text-sm font-semibold text-slate-500">Admin actions</h2>
            <div class="flex flex-wrap gap-2">${ui.adminControls('promos', item, { publishToggle: true })}</div>
          </section>` : ''}
      </article>`);

    const video = document.getElementById('video');
    if (video.readyState >= 1) attachCaptions(video);
    else video.addEventListener('loadedmetadata', () => attachCaptions(video), { once: true });
    $(video).find('source').on('error', () => $('#video-error').removeClass('hidden'));

    $('#cc-toggle').on('click', function () {
      const track = video.textTracks[0];
      if (!track) return;
      const on = track.mode !== 'showing';
      track.mode = on ? 'showing' : 'hidden';
      $(this).attr('aria-pressed', String(on)).find('span').text(on ? 'Captions on' : 'Captions off');
    });
  }

  ui.loadDetail({ $el: $detail, type: 'promos', render: (data) => { item = data; render(); } });
});
