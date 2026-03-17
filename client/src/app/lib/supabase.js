import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function uploadProfilePicture(file, userId) {
  const path = `${userId}/avatar`;

  // Delete existing file first (ignore errors if it doesn't exist)
  await supabase.storage.from('profile-pictures').remove([path]);

  const { error } = await supabase.storage
    .from('profile-pictures')
    .upload(path, file, { contentType: file.type });

  if (error) throw error;

  const { data } = supabase.storage
    .from('profile-pictures')
    .getPublicUrl(path);

  // Cache-bust so browser shows new photo immediately
  return `${data.publicUrl}?t=${Date.now()}`;
}

export async function deleteProfilePicture(userId) {
  const path = `${userId}/avatar`;
  const { error } = await supabase.storage
    .from('profile-pictures')
    .remove([path]);
  if (error) throw error;
}
