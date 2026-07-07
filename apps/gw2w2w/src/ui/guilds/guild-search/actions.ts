'use server';

import { redirect } from 'next/navigation';

export async function searchGuild(formData: FormData) {
  const raw = formData.get('guild');
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (value) redirect(`/guilds/${encodeURIComponent(value)}`);
}
