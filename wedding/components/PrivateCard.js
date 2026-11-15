'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { COPY, hasArabic } from '@/lib/copy';
import { whatsappUrl } from '@/lib/phone';

// Hana's card design is used as images: the closed envelope, the two open flaps, and the inner card.
// The guest's own words are written over the blank part of the inner card.
const fit = (name) => (name.length <= 14 ? 52 : name.length <= 22 ? 40 : name.length <= 32 ? 31 : 25);

/** Text sizes as a percentage of the inner card's width, shared by the page and the saved image. */
function sizes(rtl, name, message) {
  return {
    title: 3.2,
    name: fit(name) * 0.13,
    message: (rtl ? 3.3 : 3) * (message.length > 120 ? 0.88 : 1),
    detail: rtl ? 2.6 : 1.95,
  };
}

function detailLines(t, ev, rtl) {
  return [`${rtl ? ev.label : ev.label.toUpperCase()} · ${t.friday}`, `${ev.time} · ${t.villa}`];
}

function wrap(c, text, max) {
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (line && c.measureText(next).width > max) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function loadImage(src) {
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
}

/** Draws the inner card with the guest's words, in the same place as on the page. */
async function renderCard({ t, ev, name, message, rtl }) {
  const W = 1212;
  const H = 828;
  const u = W / 100;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const c = canvas.getContext('2d');
  const css = getComputedStyle(document.documentElement);
  const family = (v) => css.getPropertyValue(v).trim();
  const body = rtl ? family('--f-arabic') : family('--f-serif');
  const nameFont = hasArabic(name) ? family('--f-arabic-script') : family('--f-script');
  const size = sizes(rtl, name, message);
  await Promise.all([
    document.fonts.load(`${size.name * u}px ${nameFont}`, name),
    document.fonts.load(`italic 40px ${body}`, message),
    document.fonts.load(`600 40px ${body}`, ev.label),
  ]);
  c.imageSmoothingQuality = 'high';
  c.drawImage(await loadImage('/art/gf-inner.webp'), 0, 0, W, H);

  // Same box as .sc-text, measured on the inner-card image.
  const box = { top: 0.45 * H, bottom: 0.87 * H, width: 50 * u };
  const dir = rtl ? 'rtl' : 'ltr';
  let blocks;
  let total;
  for (let k = 1; k >= 0.55; k -= 0.05) {
    const f = {
      title: `600 ${size.title * k * u}px ${body}`,
      name: `${size.name * k * u}px ${nameFont}`,
      message: `${rtl ? '' : 'italic '}${size.message * k * u}px ${body}`,
      detail: `500 ${size.detail * k * u}px ${rtl ? body : family('--f-sans')}`,
    };
    c.font = f.message;
    c.letterSpacing = '0px';
    const lines = wrap(c, message, box.width);
    blocks = [
      ...(rtl ? [{ text: t.noteTitleAr, font: f.title, h: size.title * 1.5 * k }, { gap: 0.8 * k }] : []),
      { text: name, font: f.name, h: size.name * 1.2 * k, dir: hasArabic(name) ? 'rtl' : 'ltr', color: '#7d1f2e' },
      { gap: 0.6 * k },
      ...lines.map((text) => ({ text, font: f.message, h: size.message * 1.38 * k })),
      { gap: 1.8 * k },
      ...detailLines(t, ev, rtl).map((text) => ({ text, font: f.detail, h: size.detail * 1.7 * k, spacing: rtl ? 0 : 0.12, color: '#7d1f2e' })),
    ];
    total = blocks.reduce((sum, b) => sum + (b.gap ?? b.h), 0) * u;
    if (total <= box.bottom - box.top) break;
  }
  let y = box.top + (box.bottom - box.top - total) / 2;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  for (const b of blocks) {
    if (b.gap) {
      y += b.gap * u;
      continue;
    }
    const h = b.h * u;
    c.font = b.font;
    c.fillStyle = b.color ?? '#5a1220';
    c.direction = b.dir ?? dir;
    c.letterSpacing = b.spacing ? `${b.spacing * (parseFloat(b.font.match(/([\d.]+)px/)[1]))}px` : '0px';
    c.fillText(b.text, W / 2, y + h / 2);
    y += h;
  }
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

/** Shrinks the card text until it fits the blank area of the card. */
function useFit(ref, deps) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let k = 1;
    el.style.setProperty('--k', '1');
    while (el.scrollHeight > el.clientHeight + 1 && k > 0.55) {
      k -= 0.05;
      el.style.setProperty('--k', String(k));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export default function PrivateCard({ token, event, guest, maxParty, closed, googleUrl, companions: initialCompanions = [], companion = false }) {
  const t = COPY[guest.lang === 'ar' ? 'ar' : 'en'];
  const ev = event[guest.lang === 'ar' ? 'ar' : 'en'];
  const rtl = t.dir === 'rtl';
  const [attending, setAttending] = useState(guest.attending);
  const [party, setParty] = useState(guest.party || 1);
  const [current, setCurrent] = useState(guest.attending);
  const [welcome, setWelcome] = useState(guest.welcome);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [image, setImage] = useState('');
  const [open, setOpen] = useState(false);
  const [companions, setCompanions] = useState(initialCompanions);
  const [names, setNames] = useState(() => initialCompanions.reduce((list, c) => { list[c.slot] = c.name; return list; }, []));
  const text = useRef(null);

  useEffect(() => {
    document.documentElement.lang = guest.lang;
    document.documentElement.dir = t.dir;
  }, [guest.lang, t.dir]);

  const line = welcome || (current ? t.cardYes : t.cardNo);
  const num = new Intl.NumberFormat(guest.lang === 'ar' ? 'ar-EG' : 'en-GB');
  const size = sizes(rtl, guest.name, line);
  const cq = (v) => `calc(var(--k, 1) * ${v}cqw)`;
  useFit(text, [line, guest.name, open]);

  async function save() {
    const blob = await renderCard({ t, ev, name: guest.name, message: line, rtl });
    const file = new File([blob], `shady-and-hana-${event.key}.png`, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file] }).catch(() => {});
      return;
    }
    const url = URL.createObjectURL(blob);
    setImage(url); // in-app browsers can silently drop downloads, so also show it for press-and-hold
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
  }

  async function update() {
    setBusy(true);
    setMessage('');
    try {
      const res = await fetch(`/api/rsvp/${token}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ attending, party: attending ? party : 0, guestNames: attending ? Array.from({ length: Math.min(party - 1, 20) }, (_, i) => names[i] ?? '') : [] }),
      });
      if (!res.ok) throw new Error('failed');
      const data = await res.json();
      setWelcome(data.welcome);
      setCompanions(data.companions ?? []);
      setCurrent(attending);
      setEditing(false);
      setMessage(t.saved);
    } catch {
      setMessage(t.failed);
    }
    setBusy(false);
  }

  return (
    <main className="private">
      <div className={`sc ${open ? 'is-open' : ''}`}>
        <div className="sc-closed" aria-hidden={open}>
          <img src="/art/gf-closed.webp" alt="" width="736" height="460" />
          {!open && <button type="button" className="sc-seal" onClick={() => setOpen(true)} aria-label={t.openCard} />}
        </div>
        <div className="sc-open" aria-hidden={!open}>
          <img className="sc-flap l" src="/art/gf-flap-l.webp" alt="" width="268" height="448" />
          <article className="sc-card">
            <img src="/art/gf-card.webp" alt={t.noteTitle.join(' ')} width="606" height="448" />
            <div className="sc-text" ref={text} dir={t.dir}>
              {rtl && <p className="sc-artitle" style={{ fontSize: cq(size.title) }}>{t.noteTitleAr}</p>}
              <p className={`sc-name ${hasArabic(guest.name) ? 'ar' : ''}`} dir="auto" style={{ fontSize: cq(size.name) }}>{guest.name}</p>
              <p className="sc-msg" dir="auto" style={{ fontSize: cq(size.message) }}>{line}</p>
              {detailLines(t, ev, rtl).map((d) => <p key={d} className="sc-detail" style={{ fontSize: cq(size.detail) }}>{d}</p>)}
            </div>
          </article>
          <img className="sc-flap r" src="/art/gf-flap-r.webp" alt="" width="267" height="448" />
        </div>
      </div>
      <p className={`gf-hint ${open ? 'gone' : ''}`} aria-hidden={open}>{t.tapSeal}</p>

      <section className="actions">
        <button type="button" className="primary" onClick={save}>{t.save}</button>
        {current && <a className="secondary" href={googleUrl} target="_blank" rel="noopener noreferrer">{t.google}</a>}
        {current && <a className="secondary" href={`/calendar.ics?event=${event.key}`}>{t.apple}</a>}
        {!companion && !closed && !editing && <button type="button" className="secondary" onClick={() => { setEditing(true); setMessage(''); }}>{t.change}</button>}
        {editing && (
          <div>
            <div className="choice" role="radiogroup" aria-label={t.rsvp}>
              <button type="button" role="radio" aria-checked={attending} className={attending ? 'on' : ''} onClick={() => setAttending(true)}>{t.yes}</button>
              <button type="button" role="radio" aria-checked={!attending} className={!attending ? 'on' : ''} onClick={() => setAttending(false)}>{t.no}</button>
            </div>
            {attending && (
              <div className="party">
                <label>{t.party}
                  <select value={party} onChange={(e) => setParty(Number(e.target.value))}>
                    {Array.from({ length: maxParty }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n === 1 ? t.justMe : num.format(n - 1)}</option>)}
                  </select>
                </label>
                {Array.from({ length: Math.min(party - 1, 20) }, (_, i) => (
                  <label key={i}>{t.guestName.replace('{n}', num.format(i + 1))}
                    <input value={names[i] ?? ''} maxLength={80} autoComplete="off" dir="auto" onChange={(e) => setNames((list) => { const next = [...list]; next[i] = e.target.value; return next; })} />
                  </label>
                ))}
              </div>
            )}
            <button type="button" className="primary" disabled={busy} onClick={update}>{busy ? t.sending : t.update}</button>
          </div>
        )}
        {image && <img className="savedcard" src={image} alt={guest.name} />}
        {message && <p className="msg" role="status">{message}</p>}
        {!companion && <p className="keep">{t.keep}</p>}
      </section>
      {!companion && current && companions.length > 0 && <GuestCards t={t} ev={ev} companions={companions} />}
    </main>
  );
}

function GuestCards({ t, ev, companions }) {
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState('');
  useEffect(() => setOrigin(location.origin), []);
  const link = (c) => `${origin}/c/${c.token}`;
  async function copy(c) {
    await navigator.clipboard?.writeText(link(c)).catch(() => {});
    setCopied(c.token);
    setTimeout(() => setCopied(''), 1500);
  }
  return (
    <section className="actions guests">
      <h2>{t.forGuests}</h2>
      <p className="keep">{t.forGuestsSub}</p>
      <ul>
        {companions.map((c) => (
          <li key={c.token}>
            <span className="gname" dir="auto">{c.name}</span>
            <span className="gbtns">
              <a className="secondary" href={`/c/${c.token}`} target="_blank" rel="noopener noreferrer">{t.openGuestCard}</a>
              {origin && (
                <a className="secondary wa" href={whatsappUrl('', t.waInvite.replace('{name}', c.name).replace('{event}', ev.waName).replace('{link}', link(c)))} target="_blank" rel="noopener noreferrer">{t.shareWa}</a>
              )}
              <button type="button" className="secondary" onClick={() => copy(c)}>{copied === c.token ? t.copied : t.copyLink}</button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
