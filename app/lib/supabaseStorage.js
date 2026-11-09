import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Upload une image d'article vers Supabase Storage et retourne son URL publique
 */
export async function uploaderImageArticle(file) {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `articles/${fileName}`;

    // On envoie vers le bucket que vous venez de créer : 'articles-images'
    const { data, error } = await supabase.storage
      .from('articles-images')
      .upload(filePath, file);

    if (error) {
      console.error("Erreur d'upload :", error.message);
      return null;
    }

    // Récupération de l'URL publique de l'image
    const { data: publicUrlData } = supabase.storage
      .from('articles-images')
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;

  } catch (err) {
    console.error("Erreur inattendue :", err);
    return null;
  }
}