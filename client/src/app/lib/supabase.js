import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function uploadProfilePicture(file, userId) {
  const ext = file.name.split('.').pop();
  const path = `${userId}.${ext}`;

  const { error } = await supabase.storage
    .from('profile-pictures')
    .upload(path, file, { upsert: true });

  if (error) throw error;

  const { data } = supabase.storage
    .from('profile-pictures')
    .getPublicUrl(path);

  return data.publicUrl;
}
