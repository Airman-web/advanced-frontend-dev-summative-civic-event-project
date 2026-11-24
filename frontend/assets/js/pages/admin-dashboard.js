/**
 * Admin dashboard (GET /api/dashboard/admin): KPI tiles and lightweight HTML/CSS
 * charts (no chart library — HTML, Tailwind & jQuery only). Every chart has a
 * legend or direct labels, hover titles and a screen-reader table. Data refreshes
 * every 60s while the tab is visible, and bars animate to their new values.
 * ROLE GUARD: access 'admin'.
 */
CE.page({ access: 'admin', active: 'admin-dashboard', admin: true }, () => {
  const { api, ui, utils, notifications } = CE;
  const { icon } = ui;
  const esc = utils.escape;
  const SERIES = ['#2a78d6', '#eb6834', '#1baf7a']; // validated categorical slots 1–3
  const BAR = '#2552eb'; // single-series charts use one brand hue
  const n = (value) => Number(value) || 0;

  const kpi = (iconName, label, value, sub, tone) => `
    <div class="card p-5">
      <div class="flex items-center justify-between"><span class="text-sm font-medium text-slate-600">${label}</span><span class="grid h-9 w-9 place-items-center rounded-lg ${tone}">${icon(iconName, 'h-5 w-5')}</span></div>
      <p class="mt-3 text-3xl font-bold tabular-nums">${value.toLocaleString()}</p>
      <p class="mt-1 text-xs text-slate-500">${sub}</p>
    </div>`;

  const srTable = (caption, rows) => `
    <table class="sr-only"><caption>${caption}</caption>
      <thead><tr><th scope="col">Category</th><th scope="col">Count</th></tr></thead>
      <tbody>${rows.map((r) => `<tr><th scope="row">${esc(r.label)}</th><td>${r.value}</td></tr>`).join('')}</tbody>
    </table>`;

  const chartCard = (id, title, subtitle, body, rows) => `
    <figure class="card p-6" aria-labelledby="${id}-title">
      <figcaption><h2 id="${id}-title" class="font-semibold">${title}</h2><p class="text-sm text-slate-500">${subtitle}</p></figcaption>
      <div class="mt-5" aria-hidden="true">${body}</div>
      ${srTable(title, rows)}
    </figure>`;

  /** Horizontal single-series bars with the value at the end of each bar. */
  function barChart(rows) {
    const max = Math.max(1, ...rows.map((r) => r.value));
    return `<div class="space-y-3">${rows.map((r) => `
      <div class="grid grid-cols-[7.5rem_1fr] items-center gap-3 text-sm" title="${esc(r.label)}: ${r.value}">
        <span class="truncate text-slate-600">${esc(r.label)}</span>
        <span class="flex items-center gap-2"><span class="bar h-3 rounded-r" style="width:0;background:${BAR}" data-width="${(r.value / max) * 85}%"></span><span class="font-semibold tabular-nums">${r.value}</span></span>
      </div>`).join('')}</div>`;
  }

  /** Vertical single-series column chart (time series). */
  function columnChart(rows) {
    const max = Math.max(1, ...rows.map((r) => r.value));
    return `<div class="flex h-48 items-end gap-3 border-b border-slate-200">${rows.map((r) => `
      <div class="flex h-full flex-1 flex-col items-center justify-end gap-1" title="${esc(r.label)}: ${r.value} new users">
        <span class="text-xs font-semibold tabular-nums">${r.value || ''}</span>
        <span class="bar w-full max-w-[2.5rem] rounded-t" style="height:0;background:${BAR}" data-height="${(r.value / max) * 85}%"></span>
      </div>`).join('')}</div>
      <div class="mt-2 flex gap-3">${rows.map((r) => `<span class="flex-1 text-center text-xs text-slate-500">${esc(r.label)}</span>`).join('')}</div>`;
  }

  /** Part-to-whole stacked bar with a 2px gap between segments and a valued legend. */
  function stackedBar(rows) {
    const total = rows.reduce((sum, r) => sum + r.value, 0);
    const segments = total
      ? rows.filter((r) => r.value).map((r) => `<span class="bar h-full first:rounded-l last:rounded-r" style="width:0;background:${SERIES[rows.indexOf(r)]}" data-width="${(r.value / total) * 100}%" title="${esc(r.label)}: ${r.value}"></span>`).join('')
      : '<span class="h-full w-full rounded bg-slate-200"></span>';
    return `
      <div class="flex h-5 gap-[2px]">${segments}</div>
      <ul class="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">${rows.map((r, i) => `
        <li class="flex items-center gap-2"><span class="h-3 w-3 rounded-sm" style="background:${SERIES[i]}"></span><span class="text-slate-600">${esc(r.label)}</span><span class="font-semibold tabular-nums">${r.value}</span>${total ? `<span class="text-slate-500">(${Math.round((r.value / total) * 100)}%)</span>` : ''}</li>`).join('')}
      </ul>`;
  }

  /** Last six calendar months, zero-filled where the API has no row. */
  function growthRows(growth) {
    const byMonth = Object.fromEntries(growth.map((g) => [g.month, n(g.new_users)]));
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - 5 + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return { label: d.toLocaleString(undefined, { month: 'short' }), value: byMonth[key] || 0 };
    });
  }

  function render(stats) {
    const users = { total: n(stats.users.total_users), active: n(stats.users.active_users), inactive: n(stats.users.inactive_users) };
    const events = { total: n(stats.events.total_events), upcoming: n(stats.events.upcoming_events), past: n(stats.events.past_events) };
    const unread = notifications.loaded ? notifications.unreadCount() : 0;

    $('#kpis').removeAttr('aria-busy').html([
      kpi('users', 'Users', users.total, `${users.active} active · ${users.inactive} disabled`, 'bg-brand-50 text-brand-700'),
      kpi('calendar', 'Events', events.total, `${events.upcoming} upcoming`, 'bg-emerald-50 text-emerald-700'),
      kpi('ticket', 'Registrations', n(stats.registrations.total_registrations), 'all time', 'bg-amber-50 text-amber-700'),
      kpi('bell', 'Unread notifications', unread, `of ${n(stats.notifications.total_notifications)} total`, 'bg-red-50 text-red-700'),
      kpi('video', 'Promos', n(stats.promos.total_promos), 'videos uploaded', 'bg-orange-50 text-orange-700'),
      kpi('megaphone', 'Announcements', n(stats.announcements.total_announcements), 'audio updates', 'bg-purple-50 text-purple-700'),
      kpi('star', 'Feedback', n(stats.feedbacks.total_feedback), 'event reviews', 'bg-yellow-50 text-yellow-700'),
      kpi('checkCircle', 'Active rate', `${users.total ? Math.round((users.active / users.total) * 100) : 0}%`, 'of accounts enabled', 'bg-teal-50 text-teal-700'),
    ].join(''));

    const activity = [
      { label: 'Registrations', value: n(stats.registrations.total_registrations) },
      { label: 'Feedback', value: n(stats.feedbacks.total_feedback) },
      { label: 'Notifications', value: n(stats.notifications.total_notifications) },
      { label: 'Events', value: events.total },
      { label: 'Announcements', value: n(stats.announcements.total_announcements) },
      { label: 'Promos', value: n(stats.promos.total_promos) },
    ];
    const eventStatus = [
      { label: 'Upcoming', value: events.upcoming },
      { label: 'Happening now', value: Math.max(0, events.total - events.upcoming - events.past) },
      { label: 'Ended', value: events.past },
    ];
    const accounts = [{ label: 'Active', value: users.active }, { label: 'Disabled', value: users.inactive }];
    const growth = growthRows(stats.user_growth || []);

    $('#charts').html([
      chartCard('activity-chart', 'Platform activity', 'Totals across all content and engagement', barChart(activity), activity),
      chartCard('growth-chart', 'New users', 'Sign-ups per month, last 6 months', columnChart(growth), growth),
      chartCard('events-chart', 'Events by status', `${utils.plural(events.total, 'event')} in total`, stackedBar(eventStatus), eventStatus),
      chartCard('accounts-chart', 'Account status', `${utils.plural(users.total, 'account')} in total`, stackedBar(accounts), accounts),
    ].join(''));

    // Animate bars from zero on the next frame.
    requestAnimationFrame(() => $('#charts .bar').each((_, el) => {
      if (el.dataset.width) el.style.width = el.dataset.width;
      if (el.dataset.height) el.style.height = el.dataset.height;
    }));
  }

  function renderActivity() {
    const items = notifications.items.slice(0, 5);
    $('#activity').html(items.length
      ? items.map((item) => notifications.itemHtml(item)).join('')
      : '<li class="py-6 text-center text-sm text-slate-600">No activity yet.</li>');
  }

  async function load() {
    const $refresh = $('#refresh');
    if (!$('#kpis').children().length) ui.loading($('#kpis'), ui.skeleton.rows(4));
    ui.busy($refresh, true, 'Refreshing…');
    try {
      const [stats] = await Promise.all([api.get('/dashboard/admin'), notifications.load()]);
      render(stats);
      renderActivity();
      $('#updated').text(`updated ${utils.formatTime(new Date())}`);
    } catch (error) {
      if (!$('#charts').children().length) ui.errorState($('#kpis'), error, load);
      else ui.handleError(error, load);
    } finally {
      ui.busy($refresh, false);
    }
  }

  $('#refresh').html(`${icon('refresh', 'h-4 w-4')}Refresh`).on('click', load);
  $(document).on('ce:notifications', renderActivity);
  setInterval(() => { if (document.visibilityState === 'visible') load(); }, 60000);
  load();
});
