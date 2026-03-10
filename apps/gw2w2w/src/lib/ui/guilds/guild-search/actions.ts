'use server';

import { redirect } from 'next/navigation';

export async function searchGuild(formData: FormData) {
  const value = (formData.get('guild') as string | null)?.trim();
  if (value) redirect(`/guilds/${encodeURIComponent(value)}`);
}
