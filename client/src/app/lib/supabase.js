import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function uploadProfilePicture(file, userId) {
  const path = `${userId}-avatar`;

  const { error } = await supabase.storage
    .from('profile-pictures')
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) throw error;

  const { data } = supabase.storage
    .from('profile-pictures')
    .getPublicUrl(path);

  return `${data.publicUrl}?t=${Date.now()}`;
}

export async function deleteProfilePicture(userId) {
  const path = `${userId}-avatar`;
  const { error } = await supabase.storage
    .from('profile-pictures')
    .remove([path]);
  if (error) throw error;
}

export async function uploadMediaFile(file, userId) {
  const ext = file.name.split('.').pop();
  const path = `${userId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from('game-film')
    .upload(path, file, { contentType: file.type });

  if (error) throw error;

  const { data } = supabase.storage
    .from('game-film')
    .getPublicUrl(path);

  return data.publicUrl;
}

export async function uploadDMMedia(file, userId) {
  const ext = file.name.split('.').pop();
  const path = `${userId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from('dm-media')
    .upload(path, file, { contentType: file.type });

  if (error) throw error;

  const { data } = supabase.storage
    .from('dm-media')
    .getPublicUrl(path);

  return { url: data.publicUrl, media_type: file.type.startsWith('video/') ? 'video' : 'image' };
}

export async function deleteMediaFile(url) {
  // Extract path from public URL
  const parts = url.split('/game-film/');
  if (parts.length < 2) return;
  const path = parts[1].split('?')[0];
  await supabase.storage.from('game-film').remove([path]);
}
