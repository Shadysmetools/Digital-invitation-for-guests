'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { isPhone, whatsappUrl } from '@/lib/phone';

const inviteText = (reply, link) =>
  reply.lang === 'ar'
    ? `${reply.name}، دي دعوتكم الخاصة لفرح شادي وهنا: ${link}`
    : `Dear ${reply.name}, here is your private invitation to Shady & Hana’s wedding: ${link}`;

const admin = (payload) =>
  fetch('/api/admin', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });

export function Login() {
  const router = useRouter();
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    const res = await admin({ action: 'login', password: new FormData(e.currentTarget).get('password') });
    if (res.ok) router.refresh();
    else setError(res.status === 429 ? 'Too many tries. Please wait 15 minutes.' : 'That password isn’t right. Please try again.');
  }

  return (
    <main className="login">
      <h1>Shady &amp; Hana</h1>
      <form onSubmit={submit}>
        <label>Dashboard password<input name="password" type="password" required autoComplete="current-password" /></label>
        <button className="primary">Sign in</button>
        {error && <p className="msg" role="alert">{error}</p>}
      </form>
    </main>
  );
}

export default function Dashboard({ replies, settings, questions }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState(settings);
  const [saved, setSaved] = useState('');
  const [copied, setCopied] = useState('');
  const [origin, setOrigin] = useState('');

  useEffect(() => setOrigin(location.origin), []);

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh();
    }, 60000);
    return () => clearInterval(id);
  }, [router]);

  const coming = replies.filter((r) => r.attending);
  const people = coming.reduce((sum, r) => sum + r.party, 0);
  const declined = replies.length - coming.length;

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return replies.filter(
      (r) =>
        (filter === 'all' || (filter === 'coming') === r.attending) &&
        (!q || r.name.toLowerCase().includes(q) || r.email.includes(q)),
    );
  }, [replies, search, filter]);

  async function remove(reply) {
    if (!confirm(`Remove ${reply.name}'s reply? Their private card will stop working.`)) return;
    await admin({ action: 'removeReply', id: reply.id });
    router.refresh();
  }

  async function dismiss(id) {
    await admin({ action: 'removeQuestion', id });
    router.refresh();
  }

  async function copy(reply) {
    await navigator.clipboard.writeText(`${location.origin}/i/${reply.token}`);
    setCopied(reply.id);
    setTimeout(() => setCopied(''), 1500);
  }

  async function save(e) {
    e.preventDefault();
    setSaved('Saving…');
    const res = await admin({ action: 'settings', settings: form });
    setSaved(res.ok ? 'Saved. Guests see this now.' : 'That didn’t save. Please try again.');
    if (res.ok) router.refresh();
  }

  async function logout() {
    await admin({ action: 'logout' });
    router.refresh();
  }

  const field = (key, label, props = {}) => (
    <label key={key}>
      {label}
      <input value={form[key] ?? ''} onChange={(e) => setForm({ ...form, [key]: e.target.value })} {...props} />
    </label>
  );

  return (
    <main className="dash">
      <header className="top">
        <h1>Shady &amp; Hana</h1>
        <button type="button" className="secondary" style={{ padding: '0 16px' }} onClick={logout}>Sign out</button>
      </header>

      <div className="total">
        <b>{people}</b>
        <span>{people === 1 ? 'person is coming' : 'people are coming'}</span>
        <small>{coming.length} {coming.length === 1 ? 'reply' : 'replies'} coming · {declined} can’t come</small>
      </div>

      <h2>Guests</h2>
      <div className="tools">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email" aria-label="Search guests" />
        <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter guests" className="secondary" style={{ padding: '0 10px' }}>
          <option value="all">Everyone</option>
          <option value="coming">Coming</option>
          <option value="declined">Can’t come</option>
        </select>
        <a className="secondary" href="/api/admin/export">Download CSV</a>
      </div>
      <div className="tablewrap">
        {shown.length === 0 ? (
          <p className="empty">{replies.length ? 'No guests match that search.' : 'No replies yet. They’ll appear here as guests answer.'}</p>
        ) : (
          <table>
            <thead><tr><th>Name</th><th>Email or phone</th><th>Reply</th><th>People</th><th>Replied</th><th>Private link</th><th /></tr></thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id}>
                  <td dir="auto">{r.name}</td>
                  <td>{r.email}</td>
                  <td>{r.attending ? 'Coming' : 'Can’t come'}</td>
                  <td>{r.party}</td>
                  <td>{new Date(r.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                  <td>
                    <button type="button" onClick={() => copy(r)}>{copied === r.id ? 'Copied' : 'Copy'}</button>
                    {isPhone(r.email) && origin && (
                      <a className="rowwa" href={whatsappUrl(r.email, inviteText(r, `${origin}/i/${r.token}`))} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                    )}
                  </td>
                  <td><button type="button" onClick={() => remove(r)}>Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="grid2">
        <form onSubmit={save}>
          <h2>Wedding details and assistant</h2>
          {field('time', 'Time', { type: 'time' })}
          {field('venue', 'Venue name', { placeholder: 'Mit Rehan' })}
          {field('mapUrl', 'Google Maps link', { type: 'url', placeholder: 'https://' })}
          {field('dressCode', 'Dress code')}
          {field('deadline', 'Reply by', { type: 'date' })}
          {field('whatsapp', 'Your WhatsApp number, for guests who need you', { type: 'tel', placeholder: '2010…' })}
          {field('maxParty', 'Most people per reply', { type: 'number', min: 1, max: 10 })}
          <label>
            Anything else the assistant may tell guests
            <textarea value={form.note ?? ''} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </label>
          {field('assistantName', 'Assistant’s name')}
          <label>
            Assistant’s personality
            <textarea value={form.persona ?? ''} onChange={(e) => setForm({ ...form, persona: e.target.value })} />
          </label>
          <button className="primary">Save</button>
          {saved && <p className="msg" role="status">{saved}</p>}
        </form>

        <section>
          <h2>Questions the assistant couldn’t answer</h2>
          {questions.length === 0 && <p className="empty">None yet.</p>}
          {questions.map((q) => (
            <div className="q" key={q.id}>
              <span dir="auto">{q.question}</span>
              <button type="button" onClick={() => dismiss(q.id)}>Done</button>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
