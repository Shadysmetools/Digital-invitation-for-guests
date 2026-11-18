'use client';

import { useEffect, useRef, useState } from 'react';
import { COPY } from '@/lib/copy';
import { eventStart } from '@/lib/events';
import { whatsappUrl } from '@/lib/phone';

const VENUE_PHOTO = process.env.NEXT_PUBLIC_VENUE_PHOTO;
// Events that count as the guest's first interaction. Only some of them let a browser start sound,
// so every attempt is checked and the video goes back to muted playback if the browser refuses.
const WAKE_EVENTS = ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'click', 'keydown', 'scroll', 'wheel'];

/**
 * Ties the invitation film to the page scroll. The film is a sequence of still frames drawn on a canvas,
 * which works in every browser and in-app browser (WhatsApp, Telegram, Instagram), unlike seeking a video.
 * With reduced motion the frames simply play through on a loop.
 */
function useScrollFrames(canvas, box, frames) {
  useEffect(() => {
    const c = canvas.current;
    const el = box.current;
    if (!c || !el) return undefined;
    const ctx = c.getContext('2d');
    const last = frames.count - 1;
    const imgs = [];
    let want = 0;
    let drawn = -1;
    let raf = 0;
    const draw = () => {
      raf = 0;
      for (let i = want; i >= 0; i -= 1) {
        const im = imgs[i];
        if (im?.complete && im.naturalWidth) {
          if (i !== drawn) {
            ctx.drawImage(im, 0, 0, c.width, c.height);
            drawn = i;
          }
          return;
        }
      }
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(draw);
    };
    const load = (i) => {
      if (imgs[i]) return;
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => {
        if (i <= want && i > drawn) kick();
      };
      im.src = `${frames.dir}${String(i + 1).padStart(3, '0')}.webp`;
      imgs[i] = im;
    };
    // first frame, then every eighth so any scroll position has a near frame early, then the rest
    load(0);
    for (let i = 8; i <= last; i += 8) load(i);
    for (let i = 1; i <= last; i += 1) load(i);

    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.classList.add('still');
      const timer = setInterval(() => {
        want = (want + 1) % frames.count;
        kick();
      }, 100);
      return () => clearInterval(timer);
    }
    const measure = () => {
      const total = el.offsetHeight - window.innerHeight;
      const p = total > 0 ? Math.min(1, Math.max(0, -el.getBoundingClientRect().top / total)) : 0;
      el.style.setProperty('--p', p.toFixed(4));
      el.classList.toggle('done', p > 0.92);
      el.classList.toggle('top', p < 0.05);
      want = Math.round(p * last);
      kick();
    };
    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    measure();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, [canvas, box, frames]);
}

/** Plays the video with sound when the browser allows it, otherwise muted until the first interaction. */
function useSound(video) {
  const [muted, setMuted] = useState(true);
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    const v = video.current;
    if (!v) return undefined;
    let done = false;
    const stop = () => WAKE_EVENTS.forEach((e) => window.removeEventListener(e, wake, true));
    const fallBack = () => {
      v.muted = true;
      v.play().catch(() => {});
    };
    const tryUnmute = () => {
      v.muted = false;
      return v.play().then(() => {
        if (v.paused || v.muted) throw new Error('blocked');
        done = true;
        stop();
        setMuted(false);
        setWaiting(false);
      });
    };
    function wake() {
      if (done) return;
      tryUnmute().catch(fallBack);
    }
    if (localStorage.getItem('sound') === 'off') {
      fallBack();
      return undefined;
    }
    tryUnmute().catch(() => {
      fallBack();
      setWaiting(true);
      WAKE_EVENTS.forEach((e) => window.addEventListener(e, wake, { capture: true, passive: true }));
    });
    return () => {
      done = true;
      stop();
    };
  }, [video]);

  function toggle() {
    const v = video.current;
    if (!v) return;
    const next = !v.muted;
    v.muted = next;
    if (!next) v.play().catch(() => {});
    localStorage.setItem('sound', next ? 'off' : 'on');
    setMuted(next);
    setWaiting(false);
  }

  return { muted, waiting, toggle };
}

export default function Invitation({ event, facts, closed, assistant }) {
  const [lang, setLang] = useState('en');
  const film = useRef(null);
  const scrolly = useRef(null);
  const music = useRef(null);
  const sound = useSound(music);
  useScrollFrames(film, scrolly, event.frames);
  const t = COPY[lang];
  const ev = event[lang];

  useEffect(() => {
    const stored = localStorage.getItem('lang');
    setLang(stored === 'ar' || stored === 'en' ? stored : navigator.language?.startsWith('ar') ? 'ar' : 'en');
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = t.dir;
  }, [lang, t.dir]);

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const items = [...document.querySelectorAll('.frame > section')];
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      }
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    for (const el of items) {
      el.classList.add('reveal');
      io.observe(el);
    }
    return () => io.disconnect();
  }, []);

  function choose(next) {
    localStorage.setItem('lang', next);
    setLang(next);
  }

  function replay() {
    window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  return (
    <main className="invite">
      <div className="langpill" role="group" aria-label="Language">
        <button type="button" aria-pressed={lang === 'en'} onClick={() => choose('en')} lang="en">English</button>
        <button type="button" aria-pressed={lang === 'ar'} onClick={() => choose('ar')} lang="ar">العربية</button>
      </div>
      <section className="hero scrolly" ref={scrolly}>
        <div className="stage" style={{ backgroundImage: `url(${event.poster})` }}>
          <canvas
            ref={film}
            width={464}
            height={848}
            role="img"
            aria-label={`${ev.title} · ${t.dateLong} · ${ev.time} · ${t.place}`}
          />
          <button
            type="button"
            className="cue start"
            onClick={() => {
              if (sound.muted) sound.toggle();
              window.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' });
            }}
          >
            {t.scrollCue}<span className="chev" />
          </button>
          <p className="cue end" aria-hidden="true">{t.scrollMore}<span className="chev" /></p>
          <div className="progress" aria-hidden="true"><i /></div>
          <button type="button" className={`soundtoggle${sound.waiting && sound.muted ? ' nudge' : ''}`} onClick={sound.toggle} aria-pressed={!sound.muted} aria-label={sound.muted ? t.soundOn : t.soundOff}>
            {sound.muted ? '♪ ×' : '♪'}
          </button>
        </div>
        <audio ref={music} src={event.music} loop preload="auto" />
      </section>

      <div className="frame">
        <Venue t={t} ev={ev} target={eventStart(event)} mapUrl={facts.mapUrl} />
        <section className="villa">
          <img src={VENUE_PHOTO || '/art/villa.webp'} alt={t.villaAlt} loading="lazy" decoding="async" width="652" height="488" />
          <p className="script green">{t.villaCaption}</p>
        </section>
        <section className="softcard adults">
          <Star />
          <p className="script wine">{t.adultsLine}</p>
          <p className="smallcaps">{t.adultsCaps}</p>
        </section>
        <Rsvp t={t} lang={lang} event={event.key} max={facts.maxParty} closed={closed} />
        <footer className="foot">
          <p className="signature">{t.names}</p>
          <button type="button" className="outline" onClick={replay}>{t.watchAgain}</button>
        </footer>
      </div>
      {assistant && <Chat t={t} event={event.key} name={facts.assistantName} whatsapp={facts.whatsapp} />}
    </main>
  );
}

function Star() {
  return (
    <svg className="star" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 1L11.6 8.4 19 10 11.6 11.6 10 19 8.4 11.6 1 10 8.4 8.4Z" /></svg>
  );
}

function Venue({ t, ev, target, mapUrl }) {
  return (
    <section className="venue">
      <p className="at">{t.at}</p>
      <h2 className="villaname">{t.villaName}</h2>
      <p className="where">{t.giza}</p>
      <div className="goldrule" aria-hidden="true"><i /></div>
      <p className="when">{`${t.fridayLong} · ${ev.short}`.split(/([0-9:]+)/).map((part, i) => (i % 2 ? <span key={i} className="digits">{part}</span> : part))}</p>
      <Countdown t={t} target={target} />
      {mapUrl && (
        <a className="pill" href={mapUrl} target="_blank" rel="noopener noreferrer">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" /></svg>
          {t.openMaps}
        </a>
      )}
    </section>
  );
}

function Countdown({ t, target }) {
  const [left, setLeft] = useState(null);
  useEffect(() => {
    const tick = () => setLeft(Math.max(0, target - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  if (left === null) return <div className="cd" aria-hidden="true" />;
  const s = Math.floor(left / 1000);
  const parts = [Math.floor(s / 86400), Math.floor(s / 3600) % 24, Math.floor(s / 60) % 60, s % 60];
  const fmt = new Intl.NumberFormat(t.dir === 'rtl' ? 'ar-EG' : 'en-GB');
  if (left === 0) return <p className="when">{t.married}</p>;
  return (
    <div className="cd" role="timer" aria-label={t.countdown}>
      {parts.map((n, i) => (
        <div key={t.units[i]}><b key={n}>{i === 0 ? fmt.format(n) : fmt.format(n).padStart(2, fmt.format(0))}</b><span>{t.units[i]}</span></div>
      ))}
    </div>
  );
}

function Rsvp({ t, lang, event, max, closed }) {
  const [attending, setAttending] = useState(true);
  const [party, setParty] = useState(1);
  const [custom, setCustom] = useState(false);
  const [names, setNames] = useState([]);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (status === 'sending') return;
    setStatus('sending');
    setMessage('');
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: form.get('name'),
          email: form.get('email'),
          website: form.get('website'),
          message: form.get('message'),
          guestNames: attending ? names.slice(0, Math.min(party - 1, 20)) : [],
          attending,
          party: attending ? party : 0,
          lang,
          event,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.token) {
        window.location.assign(`/i/${data.token}`);
        return;
      }
      const key = { exists: 'exists', invalid: 'invalid', closed: 'closed', busy: 'busy' }[data.error] ?? 'failed';
      setMessage(t[key]);
    } catch {
      setMessage(t.failed);
    }
    setStatus('idle');
  }

  const num = new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-GB');
  const guestLabel = (n) => (n === 1 ? t.justMe : num.format(n - 1));
  const extra = attending ? Math.min(party - 1, 20) : 0;

  return (
    <section className="rsvp" id="rsvp">
      <h2 className="spaced">{t.rsvp}</h2>
      {closed ? (
        <p className="softcard" role="status">{t.closed}</p>
      ) : (
        <form className="softcard" onSubmit={submit}>
          <label>{t.name}<input name="name" required maxLength={80} autoComplete="name" /></label>
          <label>{t.email}<input name="email" type="text" required maxLength={254} autoComplete="off" dir="ltr" /></label>
          <input className="trap" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
          <fieldset className="attend">
            <legend>{t.attendQ}</legend>
            <label className={attending ? 'on' : ''}>
              <input type="radio" name="attending" checked={attending} onChange={() => setAttending(true)} />{t.yes}
            </label>
            <label className={!attending ? 'on' : ''}>
              <input type="radio" name="attending" checked={!attending} onChange={() => setAttending(false)} />{t.no}
            </label>
          </fieldset>
          {attending && (
            <label>{t.party}
              <select
                value={custom ? 'custom' : party}
                onChange={(e) => {
                  if (e.target.value === 'custom') {
                    setCustom(true);
                    setParty(6);
                  } else {
                    setCustom(false);
                    setParty(Number(e.target.value));
                  }
                }}
              >
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{guestLabel(n)}</option>)}
                <option value="custom">{t.otherNumber}</option>
              </select>
              {custom && (
                <input
                  className="customcount"
                  type="number"
                  inputMode="numeric"
                  min={5}
                  max={max - 1}
                  required
                  value={party - 1}
                  onChange={(e) => setParty(Math.min(max, Math.max(1, Number(e.target.value) || 0) + 1))}
                  aria-label={t.otherNumberLabel}
                  placeholder={t.otherNumberLabel}
                />
              )}
            </label>
          )}
          {Array.from({ length: extra }, (_, i) => (
            <label key={i}>{t.guestName.replace('{n}', num.format(i + 1))}
              <input
                value={names[i] ?? ''}
                maxLength={80}
                autoComplete="off"
                dir="auto"
                onChange={(e) => setNames((list) => { const next = [...list]; next[i] = e.target.value; return next; })}
              />
            </label>
          ))}
          <label>{t.messageLabel}<textarea name="message" maxLength={500} rows={3} dir="auto" /></label>
          <button className="primary" disabled={status === 'sending'}>{status === 'sending' ? t.sending : t.send}</button>
          {message && <p className="msg" role="alert">{message}</p>}
        </form>
      )}
    </section>
  );
}

function Chat({ t, event, name, whatsapp }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const log = useRef(null);

  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [messages, open]);

  async function send(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const text = new FormData(form).get('q').toString().trim();
    if (!text || busy) return;
    form.reset();
    ask(text);
  }

  async function ask(text) {
    if (busy) return;
    const next = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setBusy(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: next.slice(-8), event }),
      });
      const data = await res.json();
      const answered = res.ok && data.reply;
      setMessages([...next, {
        role: 'assistant',
        content: answered ? data.reply : res.status === 429 ? t.chatLimit : t.chatError,
        contactFor: !answered || data.needsCouple ? text : undefined,
        suggestions: answered && Array.isArray(data.suggestions) ? data.suggestions : [],
      }]);
    } catch {
      setMessages([...next, { role: 'assistant', content: t.chatError, contactFor: text }]);
    }
    setBusy(false);
  }

  if (!open) return <button type="button" className="chatopen" onClick={() => setOpen(true)}>{t.chatOpen}</button>;
  return (
    <aside className="chat" aria-label={name}>
      <header><strong>{name}</strong><button type="button" onClick={() => setOpen(false)}>{t.chatClose}</button></header>
      <div className="log" ref={log} aria-live="polite">
        <p className="a">{t.chatHello}</p>
        {messages.length === 0 && (
          <div className="chips">{t.chatStarters.map((q) => <button type="button" key={q} onClick={() => ask(q)}>{q}</button>)}</div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'turn guest' : 'turn host'}>
            <p className={m.role === 'user' ? 'u' : 'a'} dir="auto">{m.content}</p>
            {m.contactFor && whatsapp && (
              <a className="wa" href={whatsappUrl(whatsapp, `${t.chatWaText}${m.contactFor}`)} target="_blank" rel="noopener noreferrer">{t.chatWa}</a>
            )}
            {i === messages.length - 1 && !busy && m.suggestions?.length > 0 && (
              <div className="chips">{m.suggestions.map((q) => <button type="button" key={q} onClick={() => ask(q)} dir="auto">{q}</button>)}</div>
            )}
          </div>
        ))}
        {busy && <p className="a typing">…</p>}
      </div>
      <form onSubmit={send}>
        <input name="q" maxLength={300} placeholder={t.chatPlaceholder} autoComplete="off" dir="auto" aria-label={t.chatPlaceholder} />
        <button disabled={busy}>{t.chatSend}</button>
      </form>
    </aside>
  );
}
