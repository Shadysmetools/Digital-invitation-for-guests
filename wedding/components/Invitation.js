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
  const [mode, setMode] = useState('idle'); // idle, play, done
  const t = COPY[lang];

  useIso(() => {
    const el = stage.current;
    let width = window.innerWidth;
    fitStage(el);
    const onResize = () => {
      if (window.innerWidth === width) return; // mobile URL bar and keyboard only change height
      width = window.innerWidth;
      fitStage(el);
    };
    window.addEventListener('resize', onResize);

    const stored = localStorage.getItem('lang');
    setLang(stored === 'ar' || stored === 'en' ? stored : navigator.language?.startsWith('ar') ? 'ar' : 'en');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const slow = ['slow-2g', '2g'].includes(navigator.connection?.effectiveType);
    if (localStorage.getItem('opened') || reduce || slow) setMode('done');
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

  function toggleLang(e) {
    e.stopPropagation();
    const next = lang === 'en' ? 'ar' : 'en';
    localStorage.setItem('lang', next);
    setLang(next);
  }

  const started = mode !== 'idle';
  const finished = mode === 'done' || mode === 'done2';

  return (
    <main className="invite">
      <div className="stagewrap">
        <div
          ref={stage}
          className={`stage ${started ? 'play' : ''} ${mode === 'done' ? 'done' : ''}`}
          onClick={open}
        >
          <div className="prop tile" />
          <div className="prop damask" />
          <img className="prop pom" src="/art/pomegranate.webp" alt="" />
          <img className="prop lily" src="/art/lily.webp" alt="" />

          <div className="env">
            <div className="back" />
            <div className="inner">
              <div className="of">{t.weddingOf}</div>
              <div className="nm">{t.names}</div>
            </div>
            <svg className="pocket" viewBox="0 0 312 232" aria-hidden="true">
              <defs>
                <linearGradient id="pk" x1="0" y1="0" x2=".15" y2="1"><stop offset="0" stopColor="#6b1a23" /><stop offset="1" stopColor="#520f17" /></linearGradient>
                <linearGradient id="fl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6d1b24" /><stop offset="1" stopColor="#7c222c" /></linearGradient>
                <pattern id="gr" width="140" height="140" patternUnits="userSpaceOnUse"><image href="/art/grain.webp" width="140" height="140" /></pattern>
                <pattern id="lp" width="150" height="132" patternUnits="userSpaceOnUse">
                  <image href="/art/liner.webp" width="150" height="132" preserveAspectRatio="xMidYMid slice" />
                </pattern>
              </defs>
              <polygon points="0,0 156,104 312,0 312,232 0,232" fill="url(#pk)" />
              <polygon points="0,0 156,104 312,0 312,232 0,232" fill="url(#gr)" />
              <path d="M0 232L156 104L312 232" fill="none" stroke="#3a0a10" strokeOpacity=".5" />
            </svg>
            <div className="foil">
              <b>{t.names}</b>
              <span>{t.dateCaps}</span>
            </div>
            <div className="flap">
              <i className="in">
                <svg viewBox="0 0 312 122" width="312" height="122" aria-hidden="true">
                  <polygon points="0,0 312,0 156,122" fill="#5e141c" />
                  <polygon points="17,0 295,0 156,108" fill="url(#lp)" />
                  <polygon points="17,0 295,0 156,108" fill="none" stroke="#c9a266" strokeOpacity=".55" />
                </svg>
              </i>
              <i className="out">
                <svg viewBox="0 0 312 122" width="312" height="122" aria-hidden="true">
                  <polygon points="0,0 312,0 156,122" fill="url(#fl)" />
                  <polygon points="0,0 312,0 156,122" fill="url(#gr)" />
                  <path d="M0 .5L156 122.500L312 .5" fill="none" stroke="#2a060b" strokeOpacity=".5" />
                </svg>
              </i>
            </div>
            <div className="sheen" />
            <img className="seal" src="/art/seal.webp" alt="" />
          </div>
          <button type="button" className="hint" disabled={started}>{t.tap}</button>

          <div className="full">
            <div className="band" />
            <div className="arch" />
            <div className="text">
              <div className="o1" style={{ '--d': '3.05s' }}>{t.invited}</div>
              <div className="o2" style={{ '--d': '3.45s' }}>{t.weddingOf}</div>
              <div className="names" style={{ '--d': '3.85s' }}>{t.names}</div>
              <div className="rule" style={{ '--d': '4.95s' }} />
              <div className="date" style={{ '--d': '5.15s' }}>{t.dateLong}</div>
              <div className="place" style={{ '--d': '5.6s' }}>{t.place}</div>
              <a className="cta" style={{ '--d': '6.05s' }} href="#rsvp" onClick={(e) => e.stopPropagation()}>{t.cta}</a>
            </div>
            <div className="edge p"><img src="/art/pomegranate.webp" alt="" /></div>
            <div className="edge l"><img src="/art/lily.webp" alt="" /></div>
            <svg className="dove" viewBox="0 -12 48 32" aria-hidden="true"><path d={DOVE} /></svg>
            <svg className="dove two" viewBox="0 -12 48 32" aria-hidden="true"><path d={DOVE} /></svg>
            <div className="cover">
              <div className="covertext">
                <div className="of">{t.weddingOf}</div>
                <div className="nm">{t.names}</div>
              </div>
            </div>
          </div>

          <button type="button" className="icon lang" onClick={toggleLang} aria-label="English / العربية">{t.switchTo}</button>
          {!finished && <button type="button" className="icon skip" onClick={skip}>{t.skip}</button>}
        </div>
        <script dangerouslySetInnerHTML={{ __html: FIT_NOW }} />
      </div>

      {finished && (
        <>
          <Details t={t} facts={facts} />
          <Rsvp t={t} lang={lang} max={facts.maxParty} closed={closed} />
          {assistant && <Chat t={t} name={facts.assistantName} whatsapp={facts.whatsapp} />}
        </>
      )}
    </main>
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
                    <button type="button" key={n} aria-pressed={party === n} className={party === n ? 'on' : ''} onClick={() => setParty(n)}>{n}</button>
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
