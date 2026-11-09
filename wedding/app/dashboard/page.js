import Dashboard, { Login } from '@/components/Dashboard';
import { isAdmin } from '@/lib/auth';
import { getSettings, listQuestions, listReplies } from '@/lib/store';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Guest dashboard · Shady & Hana', robots: { index: false, follow: false } };

export default async function Page() {
  if (!(await isAdmin())) return <Login />;
  const [replies, settings, questions] = await Promise.all([listReplies(), getSettings(), listQuestions()]);
  return <Dashboard replies={replies} settings={settings} questions={questions} />;
}
