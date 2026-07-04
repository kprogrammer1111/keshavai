'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/auth-store';
import { userService, aiService } from '@/services/api-services';
import { useChatStore } from '@/stores/chat-store';
import { toast } from 'sonner';

const selectClass =
  'w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-neutral-400';

export default function SettingsPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const { selectedProvider, selectedModel, setModel } = useChatStore();
  const [name, setName] = useState('');
  const [providers, setProviders] = useState<Array<{ name: string; models: string[] }>>([]);
  const [usage, setUsage] = useState<{ totals: { totalTokens: number | null } } | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    setName(user?.name ?? '');
    aiService.listProviders().then(({ data }) => setProviders(data)).catch(() => {});
    userService.getUsage().then(({ data }) => setUsage(data)).catch(() => {});
  }, [isAuthenticated, user, router]);

  const handleSave = async () => {
    try {
      await userService.updateProfile({ name });
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to update profile');
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-white text-[var(--foreground)]">
      <header className="border-b border-[var(--border)] bg-white px-6 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to chat
        </Link>
      </header>

      <div className="mx-auto max-w-2xl space-y-8 p-6">
        <section>
          <h2 className="mb-4 text-lg font-semibold">Profile</h2>
          <div className="space-y-4 rounded-xl border border-[var(--border)] bg-white p-4">
            <div>
              <label className="mb-1 block text-sm text-[var(--muted)]">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-[var(--muted)]">Email</label>
              <Input value={user?.email ?? ''} disabled />
            </div>
            <Button onClick={handleSave}>Save changes</Button>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold">AI Model</h2>
          <div className="space-y-4 rounded-xl border border-[var(--border)] bg-white p-4">
            <div>
              <label className="mb-1 block text-sm text-[var(--muted)]">Provider</label>
              <select
                value={selectedProvider}
                onChange={(e) => {
                  const provider = e.target.value;
                  const models = providers.find((p) => p.name === provider)?.models ?? [];
                  setModel(provider, models[0] ?? '');
                }}
                className={selectClass}
              >
                {providers.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-[var(--muted)]">Model</label>
              <select
                value={selectedModel}
                onChange={(e) => setModel(selectedProvider, e.target.value)}
                className={selectClass}
              >
                {providers
                  .find((p) => p.name === selectedProvider)
                  ?.models.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold">Usage</h2>
          <div className="rounded-xl border border-[var(--border)] bg-white p-4">
            <p className="text-2xl font-bold text-[var(--foreground)]">
              {(usage?.totals?.totalTokens ?? 0).toLocaleString()}
            </p>
            <p className="text-sm text-[var(--muted)]">Total tokens used</p>
          </div>
        </section>
      </div>
    </div>
  );
}
