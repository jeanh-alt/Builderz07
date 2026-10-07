import { createClient } from '@supabase/supabase-js';

// Récupère les variables d'environnement
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Vérifie que les variables sont bien définies
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('⚠️  Erreur : Les variables SUPABASE_URL et SUPABASE_ANON_KEY ne sont pas définies !');
  console.error('   Ajoutez-les dans votre fichier .env.local :');
  console.error('   NEXT_PUBLIC_SUPABASE_URL=votre-url-supabase');
  console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-cle-anon');
}

// Crée et exporte le client Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
