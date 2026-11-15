'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { COPY } from '@/lib/copy';
import { whatsappUrl } from '@/lib/phone';

const useIso = typeof window === 'undefined' ? useEffect : useLayoutEffect;
const FIT_NOW = "(function(){var e=document.querySelector('.stage'),w=innerWidth,h=innerHeight,c=Math.min(w,h*.62,480);if(h/(c/360)<660)c=h/660*360;var s=c/360;e.style.setProperty('--h',h/s+'px');document.documentElement.style.setProperty('--column',c+'px');e.style.transform='scale('+s+')';e.style.visibility='visible'})()";
const OPEN_MS = 6000; // sections must exist before the RSVP button appears at 6.05s
const DOVE = 'M0 8C8 2 16 3 22 8C26 0 32-7 44-10C39-3 36 5 30 11C37 11 42 13 46 17C36 16 28 18 21 16C12 18 5 14 0 8Z';

function fitStage(stage) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  let column = Math.min(w, h * 0.62, 480);
  if (h / (column / 360) < 660) column = (h / 660) * 360;
  const scale = column / 360;
  stage.style.setProperty('--h', `${h / scale}px`);
  document.documentElement.style.setProperty('--column', `${column}px`);
  stage.style.transform = `scale(${scale})`;
  stage.style.visibility = 'visible';
}

export default function Invitation({ facts, closed, assistant }) {
  const stage = useRef(null);
  const timer = useRef(null);
  const [lang, setLang] = useState('en');
  const [mode, setMode] = useState('done');
  const video = useRef(null);
  const [muted, setMuted] = useState(true);
  const t = COPY[lang];

  useIso(() => {
    const el = stage.current;
    let width = window.innerWidth;
    if (el) fitStage(el);
    const onResize = () => {
      if (window.innerWidth === width) return; // mobile URL bar and keyboard only change height
      width = window.innerWidth;
      if (el) fitStage(el);
    };
    window.addEventListener('resize', onResize);

    const stored = localStorage.getItem('lang');
    setLang(stored === 'ar' || stored === 'en' ? stored : navigator.language?.startsWith('ar') ? 'ar' : 'en');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const slow = ['slow-2g', '2g'].includes(navigator.connection?.effectiveType);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = t.dir;
  }, [lang, t.dir]);

  useEffect(() => {
    document.documentElement.style.overflow = mode === 'done' || mode === 'done2' ? '' : 'hidden';
  }, [mode]);

  useEffect(() => () => clearTimeout(timer.current), []);


  function open() {
    if (mode !== 'idle') return;
    setMode('play');
    localStorage.setItem('opened', '1');
    timer.current = setTimeout(() => setMode('done2'), OPEN_MS);
  }

  function skip(e) {
    e.stopPropagation();
    clearTimeout(timer.current);
    localStorage.setItem('opened', '1');
    setMode('done');
  }

  function toggleSound() {
    const v = video.current;
    if (!v) return;
    v.muted = !v.muted;
    if (!v.muted) v.play().catch(() => {});
    setMuted(v.muted);
  }

  function toggleLang(e) {
    e.stopPropagation();
    const next = lang === 'en' ? 'ar' : 'en';
    localStorage.setItem('lang', next);
    setLang(next);
  }

  const started = mode !== 'idle';
  const finished = mode === 'done' || mode === 'done2';

  useEffect(() => {
    if (!finished || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const items = [...document.querySelectorAll('.invite .sheet, .herocta')];
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
  }, [finished, lang]);

  return (
    <main className="invite">
      <section className="hero">
        <video
          ref={video}
          src="/invitation.mp4"
          poster="/invitation-poster.jpg"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-label={`${t.weddingOf} ${t.names} · ${t.dateLong} · ${t.place}`}
        />
        <button type="button" className="icon lang" onClick={toggleLang} aria-label="English / العربية">{t.switchTo}</button>
        <button type="button" className="icon sound" onClick={toggleSound} aria-pressed={!muted} aria-label={muted ? 'Sound on' : 'Sound off'}>
          {muted ? '♪ off' : '♪ on'}
        </button>
      </section>
      <a className="primary herocta" href="#rsvp">{t.cta}</a>
      <div className="sparkles" aria-hidden="true">
        {[8, 22, 37, 51, 66, 80, 93].map((top, i) => (
          <svg key={top} className={`spark s${i % 4}`} style={{ top: `${top}%` }} viewBox="0 0 20 20"><path d="M10 0L12.5 7.5L20 10L12.5 12.5L10 20L7.5 12.5L0 10L7.5 7.5Z" /></svg>
        ))}
      </div>

      {finished && (
        <>
          <Countdown t={t} time={facts.time} />
          <Details t={t} facts={facts} />
          <Rsvp t={t} lang={lang} max={facts.maxParty} closed={closed} />
          {assistant && <Chat t={t} name={facts.assistantName} whatsapp={facts.whatsapp} />}
        </>
      )}
    </main>
  );
}

/** Wedding start in Cairo (UTC+2 in December); defaults to 4 PM until a time is saved. */
function weddingStart(time) {
  const [h, m] = /^\d{2}:\d{2}$/.test(time) ? time.split(':').map(Number) : [16, 0];
  return Date.UTC(2026, 11, 18, h - 2, m);
}

function Countdown({ t, time }) {
  const [left, setLeft] = useState(null);
  useEffect(() => {
    const target = weddingStart(time);
    const tick = () => setLeft(Math.max(0, target - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [time]);
  if (left === null) return null;
  const s = Math.floor(left / 1000);
  const parts = [Math.floor(s / 86400), Math.floor(s / 3600) % 24, Math.floor(s / 60) % 60, s % 60];
  const fmt = new Intl.NumberFormat(t.dir === 'rtl' ? 'ar-EG' : 'en-GB');
  return (
    <section className="sheet countdown" aria-label={t.countdown}>
      <h2>{t.countdown}</h2>
      {left === 0 ? (
        <p className="note">{t.married}</p>
      ) : (
        <div className="cd">
          {parts.map((n, i) => (
            <div key={t.units[i]}><b key={n}>{fmt.format(n)}</b><span>{t.units[i]}</span></div>
          ))}
        </div>
      )}
    </section>
  );
}

function Details({ t, facts }) {
  const rows = [
    [t.date, t.dateLong],
    facts.time && [t.time, facts.time],
    [t.venue, facts.venue || t.place],
    facts.dressCode && [t.dress, facts.dressCode],
    facts.deadline && [t.deadline, facts.deadline],
  ].filter(Boolean);
  return (
    <section className="sheet">
      <h2>{t.details}</h2>
      <dl className="facts">
        {rows.map(([k, v]) => (
          <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
        ))}
      </dl>
      {facts.mapUrl && <a className="textlink" href={facts.mapUrl} target="_blank" rel="noopener noreferrer">{t.map}</a>}
      {facts.note && <p className="note">{facts.note}</p>}
    </section>
  );
}

function Rsvp({ t, lang, max, closed }) {
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
          attending,
          party: attending ? party : 0,
          lang,
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

  return (
    <section className="sheet rsvp" id="rsvp">
      <h2>{t.rsvp}</h2>
      {closed ? (
        <p role="status">{t.closed}</p>
      ) : (
        <>
          <p className="sub">{t.rsvpSub}</p>
          <p className="adults">{t.adults}</p>
          <form onSubmit={submit}>
            <label>{t.name}<input name="name" required maxLength={80} autoComplete="name" /></label>
            <label>{t.email}<input name="email" type="text" required maxLength={254} autoComplete="off" dir="ltr" /></label>
            <input className="trap" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
            <div className="choice" role="radiogroup" aria-label={t.rsvp}>
              <button type="button" role="radio" aria-checked={attending} className={attending ? 'on' : ''} onClick={() => setAttending(true)}>{t.yes}</button>
              <button type="button" role="radio" aria-checked={!attending} className={!attending ? 'on' : ''} onClick={() => setAttending(false)}>{t.no}</button>
            </div>
            {attending && (
              <div className="party">
                <span id="party-label">{t.party}</span>
                <div role="group" aria-labelledby="party-label">
                  {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
                    <button type="button" key={n} aria-pressed={party === n} className={party === n ? 'on' : ''} onClick={() => setParty(n)}>{max === 2 ? (n === 1 ? t.justMe : t.plusOne) : n}</button>
                  ))}
                </div>
              </div>
            )}
            <button className="primary" disabled={status === 'sending'}>{status === 'sending' ? t.sending : t.send}</button>
            {message && <p className="msg" role="alert">{message}</p>}
          </form>
        </>
      )}
    </section>
  );
}

function Chat({ t, name, whatsapp }) {
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
        body: JSON.stringify({ messages: next.slice(-8) }),
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
