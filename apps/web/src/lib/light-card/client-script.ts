/**
 * The guest card's whole client side: vanilla JS, no framework, inlined into the HTML (ADR 014).
 * It never touches `eval`/`new Function`; the server passes data through `#hp-data` (JSON) so no
 * user-supplied text is ever interpolated into script source.
 */
export const CLIENT_SCRIPT = String.raw`
(function () {
  var D = JSON.parse(document.getElementById('hp-data').textContent);
  var T = D.t, S = D.s;
  // A missing element (a contribution card has no QR or RSVP) gets a throw-away one, so the rest still runs.
  var $ = function (s, r) { return (r || document).querySelector(s) || document.createElement('div'); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  function fmt(tpl, v) { return String(tpl).replace(/\{(\w+)\}/g, function (_, k) { return v && v[k] != null ? v[k] : ''; }); }
  function people(n) { return n === 1 ? T.people1 : fmt(T.peopleN, { n: n }); }
  var root = $('main');
  var party = Math.max(1, S.partyShown || 1);

  // ---- offline banner + service worker (the card, QR and code stay visible offline)
  function net() { var b = $('#hp-offline'); if (b) b.hidden = navigator.onLine; }
  window.addEventListener('online', function () { net(); flush(); });
  window.addEventListener('offline', net);
  net();
  if ('serviceWorker' in navigator && S.sw) {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(function () { return navigator.serviceWorker.ready; })
      .then(function (r) { if (r.active) r.active.postMessage({ type: 'cache-urls', urls: [location.pathname] }); }).catch(function () {});
  }

  // ---- language chip
  $$('[data-lang]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (b.getAttribute('aria-pressed') === 'true') return;
      document.cookie = 'NEXT_LOCALE=' + b.getAttribute('data-lang') + '; path=/; max-age=31536000; samesite=lax';
      location.reload();
    });
  });

  // ---- data adapters: real API, or the demo state in localStorage (mock mode only)
  var MOCK_KEY = 'harusi.mock.v1';
  function mockState() { try { return JSON.parse(localStorage.getItem(MOCK_KEY)); } catch (e) { return null; } }
  function mockGuest(st) { return st && st.guests && st.guests.filter(function (g) { return g.token === S.token && !g.deletedAt; })[0]; }
  var RANK = { created: 0, queued: 1, sent: 2, delivered: 3, opened: 4, confirmed: 5, declined: 5, checked_in: 6 };

  // No console state in this browser yet: keep the answer in a per-token overlay that MockRepository
  // folds into its state when the console (or the old card) first loads it.
  var OVERLAY = 'harusi.card.overlay.' + S.token;
  function overlay() { try { return JSON.parse(localStorage.getItem(OVERLAY)); } catch (e) { return null; } }
  var adapter = S.mode === 'mock' ? {
    // Overlay what this browser knows (RSVP, opened) on the server's seed snapshot.
    sync: function () {
      var st = mockState(), g = mockGuest(st);
      if (!st) { var o = overlay(); return o ? { state: 'ok', status: o.status === 'confirmed' ? 'confirmed' : 'declined', partySize: o.rsvpPartySize } : null; }
      if (!g && st.retiredTokens && st.retiredTokens[S.token]) return { state: 'reissued' };
      if (!g) return null;
      if (RANK[g.status] < RANK.opened) { g.status = 'opened'; g.updatedAt = new Date().toISOString(); localStorage.setItem(MOCK_KEY, JSON.stringify(st)); }
      return { state: 'ok', status: g.status === 'confirmed' || g.status === 'checked_in' ? 'confirmed' : g.status === 'declined' ? 'declined' : 'pending', partySize: g.rsvpPartySize };
    },
    rsvp: function (attending, size) {
      var st = mockState(), g = mockGuest(st);
      if (!S.rsvpOpen) return Promise.reject({ code: 'rsvp_closed' });
      var n = attending ? Math.max(1, Math.min(size, S.partyMax)) : 0, now = new Date().toISOString();
      if (!st) {
        var ov = { status: attending ? 'confirmed' : 'declined', rsvpPartySize: n, at: now };
        localStorage.setItem(OVERLAY, JSON.stringify(ov));
        return Promise.resolve({ status: ov.status, partySize: n });
      }
      if (!g) return Promise.reject({ code: 'invalid_token' });
      g.status = attending ? 'confirmed' : 'declined'; g.rsvpPartySize = n; g.updatedAt = now;
      g.timeline = g.timeline || {}; g.timeline[g.status] = now; delete g.timeline[attending ? 'declined' : 'confirmed'];
      localStorage.setItem(MOCK_KEY, JSON.stringify(st));
      return Promise.resolve({ status: g.status, partySize: n });
    }
  } : {
    sync: function () { return null; },
    rsvp: function (attending, size) {
      return fetch(S.api + '/v1/c/' + encodeURIComponent(S.token) + '/rsvp', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ attending: attending, partySize: attending ? size : 0 }) })
        .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw { code: (j.error && j.error.details && j.error.details.reason) || (j.error && j.error.code) || 'server' }; return { status: j.rsvp.status, partySize: j.rsvp.partySize }; }); })
        .catch(function (e) { throw e && e.code ? e : { code: 'offline' }; });
    }
  };

  // ---- RSVP UI
  var banner = $('#hp-rsvp-banner'), summary = $('#hp-rsvp-summary'), form = $('#hp-rsvp-form'), qrSec = $('#hp-qr');
  function setBanner(kind, text) {
    banner.hidden = !kind; banner.className = 'banner ' + (kind || '');
    banner.setAttribute('role', kind === 'error' ? 'alert' : 'status'); banner.textContent = text || '';
  }
  function show(state) {
    var answered = state.status !== 'pending';
    summary.hidden = !answered;
    if (answered) {
      $('#hp-rsvp-text', summary).textContent = state.status === 'confirmed' ? fmt(T.confirmedCompact, { people: people(state.partySize || 1) }) : T.declinedCompact;
      $('#hp-rsvp-icon', summary).textContent = state.status === 'confirmed' ? '✔' : '✖';
    }
    $('#hp-change', summary).hidden = !S.rsvpOpen;
    form.hidden = answered || !S.rsvpOpen;
    qrSec.hidden = state.status === 'declined';
    // After a "yes", the QR section moves up, right below the trust strip (§17.6).
    var anchor = $('#hp-trust-section');
    if (state.status === 'confirmed') anchor.parentNode.insertBefore(qrSec, anchor.nextSibling);
    else $('#hp-rsvp-section').parentNode.insertBefore(qrSec, $('#hp-rsvp-section').nextSibling);
  }
  function submit(attending, size) {
    var btns = $$('#hp-rsvp-form button'); btns.forEach(function (b) { b.disabled = true; });
    var pending = { attending: attending, size: size };
    localStorage.setItem('harusi.card.outbox.' + S.token, JSON.stringify(pending));
    setBanner('', ''); $('#hp-saving').hidden = false;
    adapter.rsvp(attending, size).then(function (st) {
      localStorage.removeItem('harusi.card.outbox.' + S.token);
      show(st); setBanner(navigator.onLine ? (attending ? 'success' : 'info') : 'offline', navigator.onLine ? (attending ? fmt(T.rsvpConfirmedBody, { people: people(st.partySize || 1) }) : T.rsvpDeclinedBody) : T.rsvpQueued);
      if (attending) qrSec.scrollIntoView({ block: 'start' });
    }).catch(function (e) {
      if (e && e.code === 'offline') { show({ status: attending ? 'confirmed' : 'declined', partySize: size }); setBanner('offline', T.rsvpQueued); }
      else { localStorage.removeItem('harusi.card.outbox.' + S.token); setBanner('error', e && e.code === 'rsvp_closed' ? T.rsvpClosed : T.rsvpFailed); }
    }).then(function () { $('#hp-saving').hidden = true; btns.forEach(function (b) { b.disabled = false; }); });
  }
  function flush() {
    var raw = localStorage.getItem('harusi.card.outbox.' + S.token);
    if (!raw || !navigator.onLine) return;
    var p = JSON.parse(raw);
    adapter.rsvp(p.attending, p.size).then(function (st) { localStorage.removeItem('harusi.card.outbox.' + S.token); show(st); }).catch(function (e) { if (!e || e.code !== 'offline') localStorage.removeItem('harusi.card.outbox.' + S.token); });
  }
  var panel = $('#hp-party-panel'), count = $('#hp-party-count');
  function setParty(n) { party = Math.max(1, Math.min(S.partyMax, n)); count.textContent = party; $('#hp-dec').disabled = party <= 1; $('#hp-inc').disabled = party >= S.partyMax; }
  $('#hp-yes').addEventListener('click', function () { if (S.partyMax > 1 && panel.hidden) { panel.hidden = false; $('#hp-answer-row').hidden = true; setParty(S.partyMax); } else submit(true, party); });
  $('#hp-no').addEventListener('click', function () { submit(false, 0); });
  $('#hp-send').addEventListener('click', function () { submit(true, party); });
  $('#hp-dec').addEventListener('click', function () { setParty(party - 1); });
  $('#hp-inc').addEventListener('click', function () { setParty(party + 1); });
  $('#hp-change').addEventListener('click', function () { summary.hidden = true; form.hidden = false; panel.hidden = true; $('#hp-answer-row').hidden = false; });

  // ---- downloads & WhatsApp sharing: exact previewed card image, QR PNG, calendar (.ics)
  function save(href, name) { var a = document.createElement('a'); a.href = href; a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
  function renderCardCanvas(scale) {
    scale = scale || 2;
    var W = 640, H = 940, c = document.createElement('canvas');
    c.width = W * scale; c.height = H * scale;
    var x = c.getContext('2d'); x.scale(scale, scale);
    x.fillStyle = '#F6F3EE'; x.fillRect(0, 0, W, H);
    var cx = 30, cy = 20, cw = 580, ch = 900;
    // Cover header
    x.fillStyle = S.primaryColor || '#0A3F35';
    x.fillRect(cx, cy, cw, 270);
    x.fillStyle = 'rgba(0,0,0,0.18)';
    x.fillRect(cx, cy, cw, 270);
    // Eyebrow
    x.fillStyle = S.onPrimaryColor || '#FFFFFF';
    x.font = 'bold 12px system-ui,sans-serif';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText((S.eyebrow || S.kindOf || 'MWALIKO').toUpperCase(), 320, cy + 40);
    // Couple names
    x.font = 'bold 32px Georgia,serif';
    x.fillText(S.couple || '—', 320, cy + 90);
    // Diamond ornament
    x.strokeStyle = S.onPrimaryColor || '#FFFFFF'; x.lineWidth = 1.4;
    x.beginPath(); x.moveTo(270, cy + 130); x.lineTo(300, cy + 130); x.stroke();
    x.beginPath(); x.moveTo(340, cy + 130); x.lineTo(370, cy + 130); x.stroke();
    x.beginPath(); x.moveTo(320, cy + 125); x.lineTo(326, cy + 130); x.lineTo(320, cy + 135); x.lineTo(314, cy + 130); x.closePath(); x.stroke();
    // Date & Time
    x.font = 'bold 15px system-ui,sans-serif';
    x.fillText((S.dateText || '') + (S.timeText ? ' · ' + S.timeText : ''), 320, cy + 170);
    // Venue
    x.font = '14px system-ui,sans-serif';
    x.fillText(S.venue || '', 320, cy + 205);
    // Card Body
    x.fillStyle = S.surfaceColor || '#FFFFFF';
    x.fillRect(cx, cy + 270, cw, ch - 270);
    // Guest line
    x.fillStyle = S.inkColor || '#1A202C';
    x.font = 'bold 18px system-ui,sans-serif';
    x.fillText(T.invitesYou ? fmt(T.invitesYou, { guest: S.guestName || '' }) : ('Mwaliko kwa: ' + (S.guestName || '')), 320, cy + 325);
    if (S.senderName) {
      x.font = '13px system-ui,sans-serif'; x.fillStyle = '#4A5568';
      x.fillText('Kutoka: ' + S.senderName, 320, cy + 355);
    }
    // QR Box
    var bw = 250, bh = 290, bx = (W - bw) / 2, by = cy + 385;
    x.fillStyle = '#FFFFFF'; x.strokeStyle = '#E2E8F0'; x.lineWidth = 2;
    x.fillRect(bx, by, bw, bh); x.strokeRect(bx, by, bw, bh);
    // QR Code
    if (S.qrPath && S.qrDim) {
      var qdim = 160, qmod = qdim / S.qrDim, qx = (W - qdim) / 2, qy = by + 16;
      x.fillStyle = '#000000';
      S.qrPath.replace(/M(\d+) (\d+)h(\d+)v1h-\d+z/g, function (_, a, b, w) {
        x.fillRect(qx + (+a * qmod), qy + (+b * qmod), +w * qmod, qmod);
        return '';
      });
      x.font = 'bold 26px ui-monospace,Menlo,monospace';
      x.fillText(S.shortCode || '', 320, by + 225);
      x.font = 'bold 11px system-ui,sans-serif'; x.fillStyle = '#718096';
      x.fillText('MSIMBO WA KUINGILIA GETINI', 320, by + 260);
    }
    // Card Outer Border
    x.strokeStyle = '#E2E8F0'; x.lineWidth = 2;
    x.strokeRect(cx, cy, cw, ch);
    // Brand Footer
    x.font = '12px system-ui,sans-serif'; x.fillStyle = '#A0AEC0';
    x.fillText('Kadi Sasa · Mwaliko Rasmi · ' + (S.domain || 'kadisasa.com'), 320, cy + ch - 25);
    return c;
  }
  $('#hp-share-wa').addEventListener('click', function () {
    var shareMsg = (T.shareCardText
      ? fmt(T.shareCardText, { couple: S.couple, kindOf: S.kindOf, guest: S.guestName, code: S.shortCode })
      : (S.couple + ' - ' + S.shortCode)) + '\n' + location.href;
    var waUrl = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(shareMsg);
    var c = renderCardCanvas(2);
    if (c && c.toBlob && navigator.share) {
      c.toBlob(function (blob) {
        if (!blob) { window.open(waUrl, '_blank'); return; }
        var file = new File([blob], 'kadi-' + S.shortCode + '.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({ title: S.couple, text: shareMsg, files: [file] }).catch(function (e) {
            if (!e || e.name !== 'AbortError') window.open(waUrl, '_blank');
          });
        } else {
          window.open(waUrl, '_blank');
        }
      }, 'image/png');
    } else {
      window.open(waUrl, '_blank');
    }
  });
  $('#hp-dl-card').addEventListener('click', function () {
    var c = renderCardCanvas(2);
    save(c.toDataURL('image/png'), 'kadi-' + S.shortCode + '.png');
  });
  $('#hp-dl-qr').addEventListener('click', function () {
    var q = 12, dim = S.qrDim, c = document.createElement('canvas'), label = Math.round(q * 5);
    c.width = dim * q; c.height = dim * q + label;
    var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.fillStyle = '#000';
    S.qrPath.replace(/M(\d+) (\d+)h(\d+)v1h-\d+z/g, function (_, a, b, w) { x.fillRect(+a * q, +b * q, +w * q, q); return ''; });
    x.font = 'bold ' + Math.round(q * 2.6) + 'px ui-monospace,Menlo,monospace'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(S.shortCode, c.width / 2, dim * q + label / 2 - q);
    save(c.toDataURL('image/png'), 'kadi-' + S.shortCode + '.png');
  });
  $('#hp-cal').addEventListener('click', function () {
    var s = new Date(S.start), e = new Date(s.getTime() + 5 * 36e5);
    function z(d) { return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }
    function esc(t) { return String(t).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n'); }
    var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Kadi Sasa//Kadi//SW', 'BEGIN:VEVENT', 'UID:' + S.token.slice(0, 12) + '@' + S.domain, 'DTSTAMP:' + z(new Date()), 'DTSTART:' + z(s), 'DTEND:' + z(e),
      'SUMMARY:' + esc(fmt(T.calendarTitle, { couple: S.couple, kind: S.kind, kindOf: S.kindOf })), 'LOCATION:' + esc(S.venue), 'DESCRIPTION:' + esc((S.dress ? fmt(T.dressCode, { dressCode: S.dress }) + '\n' : '') + T.codeLabel + ': ' + S.shortCode + '\n' + location.href),
      'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', 'DESCRIPTION:' + esc(fmt(T.calendarTitle, { couple: S.couple, kind: S.kind, kindOf: S.kindOf })), 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n') + '\r\n';
    var u = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' })); save(u, 'harusi-' + S.shortCode + '.ics'); setTimeout(function () { URL.revokeObjectURL(u); }, 2000);
  });
  var prompt;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); prompt = e; });
  $('#hp-install').addEventListener('click', function () { if (prompt) { prompt.prompt(); prompt = null; } else $('#hp-install-hint').hidden = false; });
  $('#hp-optout').addEventListener('click', function () {
    var msg = $('#hp-optout-msg'), btn = $('#hp-optout');
    function say(text) { msg.textContent = text; msg.hidden = false; }
    if (S.mode === 'mock') { say(T.stopRemindersDone); btn.hidden = true; return; }
    fetch(S.api + '/v1/c/' + encodeURIComponent(S.token) + '/reminders/opt-out', { method: 'POST' })
      .then(function (r) { if (!r.ok) throw 0; say(T.stopRemindersDone); btn.hidden = true; })
      .catch(function () { say(T.stopRemindersFailed); });
  });
  $('#hp-print').addEventListener('click', function () { window.print(); });

  // ---- start
  var st = adapter.sync();
  if (st && st.state === 'reissued') { location.replace(location.pathname + '?state=reissued'); return; }
  if (st && st.state === 'ok' && S.cardKind !== 'contribution') show(st);
  flush();
  root.setAttribute('data-ready', 'true');
})();
`;
