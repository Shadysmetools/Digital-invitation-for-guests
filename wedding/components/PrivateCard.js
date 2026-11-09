'use client';

import { useEffect, useState } from 'react';
import { COPY, hasArabic } from '@/lib/copy';

const fit = (name) => (name.length <= 14 ? 52 : name.length <= 22 ? 40 : name.length <= 32 ? 31 : 25);

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

async function renderCard(t, name, message, rtl) {
  const W = 1080;
  const H = 1512;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const c = canvas.getContext('2d');
  const css = getComputedStyle(document.documentElement);
  const family = (v) => css.getPropertyValue(v).trim();
  const body = rtl ? family('--f-arabic') : family('--f-serif');
  const nameFont = hasArabic(name) ? family('--f-arabic-script') : family('--f-script');
  const size = Math.round(fit(name) * 2.84);
  await Promise.all([document.fonts.load(`${size}px ${nameFont}`, name), document.fonts.load(`40px ${body}`, t.cardFor)]);

  c.fillStyle = '#faf1e5';
  c.fillRect(0, 0, W, H);
  c.strokeStyle = '#581119';
  c.lineWidth = 34;
  c.strokeRect(17, 17, W - 34, H - 34);
  c.strokeStyle = '#b98f4e';
  c.lineWidth = 2;
  c.strokeRect(62, 62, W - 124, H - 124);

  const seal = new Image();
  seal.src = '/art/seal.webp';
  await seal.decode();
  const sw = 190;
  c.drawImage(seal, (W - sw) / 2, 300, sw, (sw * seal.height) / seal.width);

  c.textAlign = 'center';
  c.direction = rtl ? 'rtl' : 'ltr';
  c.fillStyle = '#4a0e15';
  const line = (text, y, font, spacing = '0px') => {
    c.font = font;
    c.letterSpacing = rtl ? '0px' : spacing;
    c.fillText(text, W / 2, y);
  };
  line(t.cardFor, 620, `600 ${rtl ? 46 : 36}px ${body}`, '9px');
  c.direction = hasArabic(name) ? 'rtl' : 'ltr';
  line(name, 790, `${size}px ${nameFont}`);
  c.direction = rtl ? 'rtl' : 'ltr';
  const font = `${rtl ? '' : 'italic '}52px ${body}`;
  c.font = font;
  c.letterSpacing = '0px';
  const lines = wrap(c, message, W - 260);
  let y = 915;
  for (const l of lines) {
    line(l, y, font);
    y += 72;
  }
  c.fillStyle = '#a98a78';
  c.fillRect(W / 2 - 70, y, 140, 2);
  c.fillStyle = '#4a0e15';
  line(t.names, y + 105, `600 ${rtl ? 46 : 36}px ${body}`, '9px');
  line(`${t.dateCaps} · ${t.place}`, y + 175, `500 ${rtl ? 44 : 34}px ${body}`, '7px');
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

export default function PrivateCard({ token, guest, maxParty, closed, googleUrl }) {
  const t = COPY[guest.lang === 'ar' ? 'ar' : 'en'];
  const rtl = t.dir === 'rtl';
  const [attending, setAttending] = useState(guest.attending);
  const [party, setParty] = useState(guest.party || 1);
  const [current, setCurrent] = useState(guest.attending);
  const [welcome, setWelcome] = useState(guest.welcome);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [image, setImage] = useState('');

  useEffect(() => {
    document.documentElement.lang = guest.lang;
    document.documentElement.dir = t.dir;
  }, [guest.lang, t.dir]);

  const line = welcome || (current ? t.cardYes : t.cardNo);

  async function save() {
    const blob = await renderCard(t, guest.name, line, rtl);
    const file = new File([blob], 'shady-and-hana-invitation.png', { type: 'image/png' });
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
      <article className="card">
        <img src="/art/seal.webp" alt="" />
        <div className="rs">{t.cardFor}</div>
        <div className={`gn ${hasArabic(guest.name) ? 'ar' : ''}`} dir="auto" style={{ '--fit': `${fit(guest.name)}px` }}>{guest.name}</div>
        <div className="m" dir="auto">{line}</div>
        <div className="bar" />
        <div className="rs">{t.names}</div>
        <div className="rs" style={{ marginTop: 8, fontWeight: 500 }}>{t.dateCaps} · {t.place}</div>
      </article>

      <section className="actions">
        <button type="button" className="primary" onClick={save}>{t.save}</button>
        {current && <a className="secondary" href={googleUrl} target="_blank" rel="noopener noreferrer">{t.google}</a>}
        {current && <a className="secondary" href="/calendar.ics">{t.apple}</a>}
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
                    <button type="button" key={n} aria-pressed={party === n} className={party === n ? 'on' : ''} onClick={() => setParty(n)}>{n}</button>
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
