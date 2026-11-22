/**
 * Event detail: info, map link, register/cancel (users), feedback, and — for
 * admins — the registrant list, feedback summary and edit/delete controls.
 */
CE.page({ access: 'user', active: 'events' }, () => {
  const { api, auth, ui, utils } = CE;
  const { icon, forms } = ui;
  const esc = utils.escape;
  const id = utils.param('id');
  const isAdmin = auth.isAdmin();
  const $detail = $('#event-detail');
  let event;

  function dateRange(start, end) {
    const s = new Date(start);
    const e = new Date(end || start);
    const sameDay = s.toDateString() === e.toDateString();
    const day = s.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    return sameDay
      ? `${day}<br><span class="text-slate-600">${utils.formatTime(s)} – ${utils.formatTime(e)}</span>`
      : `${utils.formatDateTime(s)}<br><span class="text-slate-600">to ${utils.formatDateTime(e)}</span>`;
  }

  function render() {
    const image = event.metadata?.image_url;
    const status = utils.eventStatus(event);
    document.title = `${event.title} · CivicEvents`;
    $('#crumb').text(event.title);
    $detail.removeAttr('aria-busy').html(`
      <article class="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div class="min-w-0 space-y-8">
          <div class="relative aspect-[21/9] overflow-hidden rounded-2xl bg-gradient-to-br from-brand-100 to-brand-300">
            <span class="absolute inset-0 grid place-items-center text-brand-500">${icon('calendar', 'h-16 w-16')}</span>
            ${image ? `<img src="${esc(image)}" alt="Image for ${esc(event.title)}" class="absolute inset-0 h-full w-full object-cover" onerror="this.remove()">` : ''}
          </div>
          <header>
            <div class="flex flex-wrap gap-2">${ui.STATUS_BADGES[status]}${event.published === false ? '<span class="badge badge-amber">Draft</span>' : ''}</div>
            <h1 class="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">${esc(event.title)}</h1>
          </header>
          <section aria-labelledby="about-heading">
            <h2 id="about-heading" class="text-xl font-semibold">About this event</h2>
            <p class="prose-text mt-3 leading-relaxed text-slate-700">${esc(event.description || 'No description has been provided yet.')}</p>
          </section>
          ${isAdmin ? '<section id="attendees" aria-labelledby="attendees-heading" class="card p-6"></section>' : ''}
          <section id="feedback" aria-labelledby="feedback-heading" class="card p-6"></section>
        </div>
        <aside class="space-y-4 self-start lg:sticky lg:top-24" aria-label="Event summary">
          <div class="card divide-y divide-slate-100">
            <div class="flex gap-3 p-5">
              <span class="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">${icon('calendar')}</span>
              <div><h2 class="text-sm font-semibold text-slate-500">When</h2><p class="mt-0.5 font-medium">${dateRange(event.starts_at, event.ends_at)}</p></div>
            </div>
            <div class="flex gap-3 p-5">
              <span class="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">${icon('pin')}</span>
              <div class="min-w-0"><h2 class="text-sm font-semibold text-slate-500">Where</h2>
                <p class="mt-0.5 font-medium">${esc(event.location || 'To be announced')}</p>
                ${event.location ? `<a href="${utils.mapUrl(event.location)}" target="_blank" rel="noopener" class="mt-1 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">Open in Maps${icon('external', 'h-3.5 w-3.5')}<span class="sr-only">(opens in a new tab)</span></a>` : ''}
              </div>
            </div>
          </div>
          <div id="registration" class="card p-5" aria-live="polite"></div>
          ${isAdmin ? `
            <div class="card p-5">
              <h2 class="text-sm font-semibold text-slate-500">Admin actions</h2>
              <div class="mt-3 flex flex-wrap gap-2">${ui.adminControls('events', event)}</div>
            </div>` : ''}
        </aside>
      </article>`);

    if (isAdmin) {
      $('#registration').html(`<p class="text-sm text-slate-600">${icon('info', 'mr-1 inline h-4 w-4 text-brand-600')}Residents register from this page. You can see who’s attending below.</p>`);
      loadAttendees();
      loadAllFeedback();
    } else {
      loadRegistration();
      loadMyFeedback();
    }
  }

  /* ---------- Registration (users) ---------- */
  function renderRegistration(registration) {
    const $panel = $('#registration');
    const status = registration?.status;
    if (status === 'registered') {
      $panel.html(`
        <p class="flex items-center gap-2 font-semibold text-emerald-700">${icon('checkCircle')}You’re registered</p>
        <p class="mt-1 text-sm text-slate-600">Registered ${utils.timeAgo(registration.created_at)}.</p>
        ${utils.eventStatus(event) !== 'past' ? '<button type="button" class="btn btn-secondary mt-4 w-full" data-cancel>Cancel registration</button>' : ''}`);
    } else if (status === 'cancelled') {
      $panel.html(`
        <p class="font-semibold text-slate-800">Registration cancelled</p>
        <p class="mt-1 text-sm text-slate-600">You cancelled ${utils.timeAgo(registration.updated_at)}. Online re-registration isn’t available — <a class="font-medium text-brand-700 underline" href="mailto:${CE.config.supportEmail}">contact the organisers</a> if you’d like to attend.</p>`);
    } else if (utils.eventStatus(event) === 'past') {
      $panel.html('<p class="font-semibold text-slate-800">This event has ended</p><p class="mt-1 text-sm text-slate-600">Registration is closed. You can still share feedback below.</p>');
    } else {
      $panel.html(`
        <p class="font-semibold text-slate-900">Join this event</p>
        <p class="mt-1 text-sm text-slate-600">Free for all residents. Reserve your spot in one click.</p>
        <button type="button" class="btn btn-primary mt-4 w-full" data-register>Register for this event</button>`);
    }
  }

  async function loadRegistration() {
    ui.loading($('#registration'), '<div class="skeleton h-5 w-2/3"></div><div class="skeleton mt-3 h-10 w-full"></div>');
    try {
      const mine = await api.registrations.mine();
      renderRegistration(mine.find((r) => r.event_id === id));
    } catch (error) {
      ui.errorState($('#registration'), error, loadRegistration);
    }
  }

  $detail.on('click', '[data-register]', async (e) => {
    const $btn = $(e.currentTarget);
    ui.busy($btn, true, 'Registering…');
    try {
      renderRegistration(await api.registrations.register(id));
      ui.toast('success', 'You’re registered! We’ll see you there.');
    } catch (error) {
      ui.busy($btn, false);
      ui.handleError(error, () => $btn.trigger('click'));
    }
  });

  $detail.on('click', '[data-cancel]', async (e) => {
    const ok = await ui.confirm({ title: 'Cancel your registration?', message: `You’ll lose your spot at “${event.title}”. Online re-registration isn’t available after cancelling.`, confirmLabel: 'Cancel registration', danger: true });
    if (!ok) return;
    const $btn = $(e.currentTarget);
    ui.busy($btn, true, 'Cancelling…');
    try {
      renderRegistration(await api.registrations.cancel(id));
      ui.toast('success', 'Your registration has been cancelled.');
    } catch (error) {
      ui.busy($btn, false);
      ui.handleError(error, () => $btn.trigger('click'));
    }
  });

  /* ---------- Attendees (admin only) ---------- */
  async function loadAttendees() {
    const $section = $('#attendees');
    ui.loading($section, ui.skeleton.rows(2));
    try {
      const attendees = await api.get(`/event-registrations/event/${id}/attendees`);
      $section.removeAttr('aria-busy').html(`
        <div class="flex items-center justify-between gap-4">
          <h2 id="attendees-heading" class="text-xl font-semibold">Registrants</h2>
          <span class="badge badge-blue">${utils.plural(attendees.length, 'attendee')}</span>
        </div>
        ${attendees.length ? `
          <div class="-mx-6 mt-4 overflow-x-auto">
            <table class="w-full text-left text-sm">
              <caption class="sr-only">People registered for ${esc(event.title)}</caption>
              <thead class="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <tr><th scope="col" class="px-6 py-2">Name</th><th scope="col" class="px-6 py-2">Email</th><th scope="col" class="px-6 py-2">Registered</th></tr>
              </thead>
              <tbody class="divide-y divide-slate-100">${attendees.map((a) => `
                <tr><td class="px-6 py-3 font-medium">${esc(a.full_name)}</td><td class="px-6 py-3 text-slate-600">${esc(a.email)}</td><td class="whitespace-nowrap px-6 py-3 text-slate-600">${utils.formatDate(a.created_at)}</td></tr>`).join('')}
              </tbody>
            </table>
          </div>` : `<p class="mt-3 text-sm text-slate-600">No one has registered yet.</p>`}`);
    } catch (error) {
      ui.errorState($section, error, loadAttendees);
    }
  }

  /* ---------- Feedback ---------- */
  const feedbackHeading = (extra = '') => `<div class="flex flex-wrap items-center justify-between gap-3"><h2 id="feedback-heading" class="text-xl font-semibold">Feedback</h2>${extra}</div>`;

  function feedbackItem(f, { showAuthor }) {
    return `
      <li class="py-4">
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
          ${showAuthor ? `<span class="font-medium">${esc(f.full_name)}</span>` : ''}
          ${ui.stars(f.rating)}
          <time class="text-xs text-slate-500" datetime="${esc(f.created_at)}">${utils.formatDate(f.created_at)}</time>
        </div>
        ${f.comment ? `<p class="prose-text mt-2 text-slate-700">${esc(f.comment)}</p>` : ''}
      </li>`;
  }

  // ROLE GUARD (API): GET /event-feedback/event/:id is admin-only, so only admins see every review.
  async function loadAllFeedback() {
    const $section = $('#feedback');
    ui.loading($section, ui.skeleton.rows(2));
    try {
      const list = await api.get(`/event-feedback/event/${id}`);
      const average = list.length ? list.reduce((sum, f) => sum + f.rating, 0) / list.length : 0;
      const distribution = [5, 4, 3, 2, 1].map((n) => [n, list.filter((f) => f.rating === n).length]);
      $section.removeAttr('aria-busy').html(`
        ${feedbackHeading(`<span class="badge badge-gray">${utils.plural(list.length, 'review')}</span>`)}
        ${list.length ? `
          <div class="mt-4 grid gap-6 rounded-xl bg-slate-50 p-5 sm:grid-cols-[auto_1fr] sm:items-center">
            <div class="text-center">
              <p class="text-4xl font-bold">${average.toFixed(1)}</p>
              <div class="mt-1">${ui.stars(average)}</div>
              <p class="mt-1 text-xs text-slate-500">Average rating</p>
            </div>
            <dl class="space-y-1.5">${distribution.map(([n, count]) => `
              <div class="flex items-center gap-3 text-sm">
                <dt class="w-12 shrink-0 text-slate-600">${n} star</dt>
                <dd class="flex flex-1 items-center gap-3"><span class="h-2 flex-1 overflow-hidden rounded-full bg-slate-200"><span class="block h-full rounded-full bg-amber-400" style="width:${(count / list.length) * 100}%"></span></span><span class="w-6 text-right tabular-nums text-slate-600">${count}</span></dd>
              </div>`).join('')}
            </dl>
          </div>
          <ul class="mt-2 divide-y divide-slate-100">${list.map((f) => feedbackItem(f, { showAuthor: true })).join('')}</ul>`
        : '<p class="mt-3 text-sm text-slate-600">No feedback has been submitted for this event yet.</p>'}`);
    } catch (error) {
      ui.errorState($section, error, loadAllFeedback);
    }
  }

  async function loadMyFeedback() {
    const $section = $('#feedback');
    ui.loading($section, ui.skeleton.rows(1));
    try {
      const mine = (await api.get('/event-feedback/my-feedback')).find((f) => f.event_id === id);
      mine ? showMyFeedback(mine) : showFeedbackForm();
    } catch (error) {
      ui.errorState($section, error, loadMyFeedback);
    }
  }

  function showMyFeedback(feedback) {
    $('#feedback').removeAttr('aria-busy').html(`
      ${feedbackHeading(`<button type="button" class="btn btn-secondary btn-sm" data-edit-feedback>${icon('edit', 'h-4 w-4')}Edit</button>`)}
      <p class="mt-1 text-sm text-slate-600">Thanks for sharing your experience. You can update your review at any time.</p>
      <ul class="mt-2">${feedbackItem(feedback, { showAuthor: false })}</ul>`);
    $('#feedback [data-edit-feedback]').on('click', () => showFeedbackForm(feedback));
  }

  function showFeedbackForm(existing) {
    const rating = existing?.rating;
    const $section = $('#feedback');
    $section.removeAttr('aria-busy').html(`
      ${feedbackHeading()}
      <p class="mt-1 text-sm text-slate-600">${existing ? 'Update your review.' : 'How was it? Your feedback helps organisers improve future events. One review per event.'}</p>
      <form id="feedback-form" class="mt-4 space-y-4" novalidate>
        <fieldset class="field">
          <legend class="label">Your rating</legend>
          <div id="rating" class="stars-input">${[5, 4, 3, 2, 1].map((n) => `
            <input type="radio" name="rating" id="rating-${n}" value="${n}" ${rating === n ? 'checked' : ''}>
            <label for="rating-${n}"><span class="sr-only">${utils.plural(n, 'star')}</span>${icon('star', 'h-8 w-8 fill-current')}</label>`).join('')}
          </div>
        </fieldset>
        <div class="field">
          <label for="comment" class="label">Comment <span class="font-normal text-slate-500">(optional)</span></label>
          <textarea id="comment" name="comment" rows="4" maxlength="1000" class="input" aria-describedby="comment-count">${esc(existing?.comment || '')}</textarea>
          <p id="comment-count" class="hint"><span data-count>0</span>/1000 characters</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button type="submit" class="btn btn-primary">${existing ? 'Save changes' : 'Submit feedback'}</button>
          ${existing ? '<button type="button" class="btn btn-ghost" data-cancel-edit>Cancel</button>' : ''}
        </div>
      </form>`);

    const $form = $('#feedback-form');
    const $comment = $('#comment');
    const updateCount = () => $form.find('[data-count]').text($comment.val().length);
    updateCount();
    $comment.on('input', updateCount);
    $form.on('change', '[name=rating]', () => forms.setError($('#rating'), null));
    $form.find('[data-cancel-edit]').on('click', () => showMyFeedback(existing));

    $form.on('submit', async (e) => {
      e.preventDefault();
      const value = Number($form.find('[name=rating]:checked').val());
      if (!value) {
        forms.setError($('#rating'), 'Please choose a rating from 1 to 5 stars.');
        return $form.find('[name=rating]').last().trigger('focus');
      }
      const body = { rating: value, comment: $comment.val().trim() };
      const $button = $form.find('[type=submit]');
      ui.busy($button, true, 'Saving…');
      try {
        const saved = existing
          ? await api.put(`/event-feedback/${existing.id}`, body)
          : await api.post('/event-feedback', { ...body, event_id: id });
        ui.toast('success', existing ? 'Your review has been updated.' : 'Thanks! Your feedback has been submitted.');
        showMyFeedback(saved);
      } catch (error) {
        ui.busy($button, false);
        if (error.status === 409) {
          ui.toast('info', 'You’ve already reviewed this event — showing your existing feedback.');
          loadMyFeedback();
        } else {
          ui.handleError(error, () => $form.trigger('submit'));
        }
      }
    });
  }

  ui.loadDetail({ $el: $detail, type: 'events', render: (data) => { event = data; render(); } });
});
