'use client';

import { useEffect, useRef, useState } from 'react';
import { CardFrame, DiamondColumn, SealArt } from '@/components/CardArt';
import { COPY, hasArabic } from '@/lib/copy';

const fit = (name) => (name.length <= 14 ? 52 : name.length <= 22 ? 40 : name.length <= 32 ? 31 : 25);

/** Text sizes as a percentage of the card's width, shared by the page and the saved image. */
function sizes(rtl, name) {
  return {
    title: rtl ? 5.4 : 4.2,
    name: fit(name) * 0.25,
    message: rtl ? 5.8 : 5.6,
    label: rtl ? 5.2 : 3.9,
    date: rtl ? 5.2 : 4.5,
  };
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

async function svgImage(svg) {
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`;
  await img.decode();
  return img;
}

async function renderCard({ t, ev, name, message, rtl, art }) {
  const W = 1080;
  const H = 1458;
  const u = W / 100; // one percent of the card's width
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const c = canvas.getContext('2d');
  const css = getComputedStyle(document.documentElement);
  const family = (v) => css.getPropertyValue(v).trim();
  const body = rtl ? family('--f-arabic') : family('--f-serif');
  const nameFont = hasArabic(name) ? family('--f-arabic-script') : family('--f-script');
  const size = sizes(rtl, name);
  await Promise.all([
    document.fonts.load(`${size.name * u}px ${nameFont}`, name),
    document.fonts.load(`600 40px ${body}`, t.noteTitle.join(' ')),
    document.fonts.load(`italic 40px ${body}`, message),
  ]);
  c.drawImage(await svgImage(art), 0, 0, W, H);

  const dir = rtl ? 'rtl' : 'ltr';
  const fonts = {
    title: `600 ${size.title * u}px ${body}`,
    name: `${size.name * u}px ${nameFont}`,
    message: `${rtl ? '' : 'italic '}${size.message * u}px ${body}`,
    label: `600 ${size.label * u}px ${body}`,
    date: `500 ${size.date * u}px ${body}`,
  };
  c.font = fonts.message;
  const lines = wrap(c, message, 66 * u);
  const blocks = [
    ...t.noteTitle.map((text) => ({ text, font: fonts.title, h: size.title * 1.5, spacing: 0.32 })),
    { gap: 3 },
    { rule: true, h: 1 },
    { gap: 3 },
    { text: name, font: fonts.name, h: size.name * 1.2, dir: hasArabic(name) ? 'rtl' : 'ltr' },
    { gap: 1.5 },
    ...lines.map((text) => ({ text, font: fonts.message, h: size.message * 1.38 })),
    { gap: 3.5 },
    { rule: true, h: 1 },
    { gap: 3.5 },
    { text: rtl ? ev.label : ev.label.toUpperCase(), font: fonts.label, h: size.label * 1.6, spacing: 0.28 },
    { text: t.friday, font: fonts.date, h: size.date * 1.45 },
    { text: `${ev.time} · ${t.villa}`, font: fonts.date, h: size.date * 1.45 },
  ];
  const total = blocks.reduce((sum, b) => sum + (b.gap ?? b.h), 0) * u;
  const top = 0.185 * H;
  const bottom = 0.85 * H;
  let y = top + (bottom - top - total) / 2;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillStyle = '#5a1220';
  for (const b of blocks) {
    if (b.gap) {
      y += b.gap * u;
      continue;
    }
    const h = b.h * u;
    if (b.rule) {
      c.fillStyle = '#7d1f2e';
      c.fillRect(W / 2 - 13 * u, y + h / 2, 26 * u, 2);
      c.save();
      c.translate(W / 2, y + h / 2 + 1);
      c.rotate(Math.PI / 4);
      c.fillRect(-0.8 * u, -0.8 * u, 1.6 * u, 1.6 * u);
      c.restore();
      c.fillStyle = '#5a1220';
    } else {
      c.font = b.font;
      c.direction = b.dir ?? dir;
      c.letterSpacing = !rtl && b.spacing ? `${b.spacing * u}px` : '0px';
      c.fillText(b.text, W / 2, y + h / 2);
    }
    y += h;
  }
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

export default function PrivateCard({ token, event, guest, maxParty, closed, googleUrl }) {
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
  const [settled, setSettled] = useState(false);
  const art = useRef(null);
  const timer = useRef(null);

  useEffect(() => {
    document.documentElement.lang = guest.lang;
    document.documentElement.dir = t.dir;
  }, [guest.lang, t.dir]);

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setOpen(true);
      setSettled(true);
    }
    return () => clearTimeout(timer.current);
  }, []);

  function openCard() {
    if (open) return;
    setOpen(true);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    timer.current = setTimeout(() => setSettled(true), reduce ? 0 : 1600);
  }

  const line = welcome || (current ? t.cardYes : t.cardNo);
  const size = sizes(rtl, guest.name);
  const cq = (v) => `${v}cqw`;

  async function save() {
    const blob = await renderCard({ t, ev, name: guest.name, message: line, rtl, art: art.current.querySelector('svg') });
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
        body: JSON.stringify({ attending, party: attending ? party : 0 }),
      });
      if (!res.ok) throw new Error('failed');
      const data = await res.json();
      setWelcome(data.welcome);
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
      <div className={`gf ${open ? 'is-open' : ''} ${settled ? 'is-settled' : ''}`}>
        <div className="gf-side l" aria-hidden="true"><DiamondColumn /></div>
        <div className="gf-side r" aria-hidden="true"><DiamondColumn /></div>
        <article className="gf-card" ref={art} aria-hidden={!open}>
          <CardFrame />
          <div className="gf-text" dir={t.dir}>
            <p className="gf-title" style={{ fontSize: cq(size.title) }}>{t.noteTitle[0]}<br />{t.noteTitle[1]}</p>
            <span className="gf-rule" />
            <p className={`gf-name ${hasArabic(guest.name) ? 'ar' : ''}`} dir="auto" style={{ fontSize: cq(size.name) }}>{guest.name}</p>
            <p className="gf-msg" dir="auto" style={{ fontSize: cq(size.message) }}>{line}</p>
            <span className="gf-rule" />
            <p className="gf-label" style={{ fontSize: cq(size.label) }}>{ev.label}</p>
            <p className="gf-date" style={{ fontSize: cq(size.date) }}>{t.friday}</p>
            <p className="gf-date" style={{ fontSize: cq(size.date) }}>{ev.time} · {t.villa}</p>
          </div>
        </article>
        {!settled && (
          <div className="gf-flaps" aria-hidden="true">
            <div className="gf-flap l"><span className="gf-dot" /></div>
            <div className="gf-flap r"><span className="gf-dot" /></div>
          </div>
        )}
        {!settled && (
          <button type="button" className="gf-seal" onClick={openCard} aria-label={t.openCard} aria-expanded={open}>
            <SealArt />
          </button>
        )}
      </div>
      <p className={`gf-hint ${open ? 'gone' : ''}`} aria-hidden={open}>{t.tapSeal}</p>

      <section className="actions">
        <button type="button" className="primary" onClick={save}>{t.save}</button>
        {current && <a className="secondary" href={googleUrl} target="_blank" rel="noopener noreferrer">{t.google}</a>}
        {current && <a className="secondary" href={`/calendar.ics?event=${event.key}`}>{t.apple}</a>}
        {!closed && !editing && <button type="button" className="secondary" onClick={() => { setEditing(true); setMessage(''); }}>{t.change}</button>}
        {editing && (
          <div>
            <div className="choice" role="radiogroup" aria-label={t.rsvp}>
              <button type="button" role="radio" aria-checked={attending} className={attending ? 'on' : ''} onClick={() => setAttending(true)}>{t.yes}</button>
              <button type="button" role="radio" aria-checked={!attending} className={!attending ? 'on' : ''} onClick={() => setAttending(false)}>{t.no}</button>
            </div>
            {attending && (
              <div className="party">
                <span>{t.party}</span>
                <div>
                  {Array.from({ length: maxParty }, (_, i) => i + 1).map((n) => (
                    <button type="button" key={n} aria-pressed={party === n} className={party === n ? 'on' : ''} onClick={() => setParty(n)}>{maxParty === 2 ? (n === 1 ? t.justMe : t.plusOne) : n}</button>
                  ))}
                </div>
              </div>
            )}
            <button type="button" className="primary" disabled={busy} onClick={update}>{busy ? t.sending : t.update}</button>
          </div>
        )}
        {image && <img className="savedcard" src={image} alt={guest.name} />}
        {message && <p className="msg" role="status">{message}</p>}
        <p className="keep">{t.keep}</p>
      </section>
    </main>
  );
}
