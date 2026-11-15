'use client';

import { useEffect, useRef, useState } from 'react';
import { COPY } from '@/lib/copy';
import { eventStart } from '@/lib/events';
import { whatsappUrl } from '@/lib/phone';

const VENUE_PHOTO = process.env.NEXT_PUBLIC_VENUE_PHOTO;
// Events that count as the guest's first interaction. Only some of them let a browser start sound,
// so every attempt is checked and the video goes back to muted playback if the browser refuses.
const WAKE_EVENTS = ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'click', 'keydown', 'scroll', 'wheel'];

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
  const video = useRef(null);
  const sound = useSound(video);
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
    const v = video.current;
    if (!v) return;
    v.currentTime = 0;
    v.play().catch(() => {});
  }

  return (
    <main className="invite">
      <div className="langpill" role="group" aria-label="Language">
        <button type="button" aria-pressed={lang === 'en'} onClick={() => choose('en')} lang="en">English</button>
        <button type="button" aria-pressed={lang === 'ar'} onClick={() => choose('ar')} lang="ar">العربية</button>
      </div>
      <section className="hero">
        <video
          ref={video}
          src={event.video}
          poster={event.poster}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-label={`${ev.title} · ${t.dateLong} · ${ev.time} · ${t.place}`}
        />
        {sound.waiting && sound.muted ? (
          <button type="button" className="musicpill" onClick={sound.toggle}>{t.tapMusic}</button>
        ) : (
          <button type="button" className="soundtoggle" onClick={sound.toggle} aria-pressed={!sound.muted} aria-label={sound.muted ? t.soundOn : t.soundOff}>
            {sound.muted ? '♪ ×' : '♪'}
          </button>
        )}
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
      <p className="when">{t.fridayLong} · {ev.short}</p>
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
        <div key={t.units[i]}><b key={n}>{fmt.format(n)}</b><span>{t.units[i]}</span></div>
      ))}
    </div>
  );
}

function Rsvp({ t, lang, event, max, closed }) {
  const [attending, setAttending] = useState(true);
  const [party, setParty] = useState(1);
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

  const guestLabel = (n) => (n === 1 ? t.justMe : `+${new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-GB').format(n - 1)}`);

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
              <select value={party} onChange={(e) => setParty(Number(e.target.value))}>
                {Array.from({ length: max }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{guestLabel(n)}</option>)}
              </select>
            </label>
          )}
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
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'turn guest' : 'turn host'}>
            <p className={m.role === 'user' ? 'u' : 'a'} dir="auto">{m.content}</p>
            {m.contactFor && whatsapp && (
              <a className="wa" href={whatsappUrl(whatsapp, `${t.chatWaText}${m.contactFor}`)} target="_blank" rel="noopener noreferrer">{t.chatWa}</a>
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
