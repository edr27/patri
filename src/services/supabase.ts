import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Verifica se as credenciais do Supabase foram realmente configuradas com valores reais
export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('YOUR_PROJECT_REF') &&
  !supabaseUrl.includes('SEU_PROJETO') &&
  !supabaseUrl.includes('placeholder') &&
  !supabaseAnonKey.includes('SUA_ANON_KEY') &&
  !supabaseAnonKey.includes('YOUR_ANON_KEY') &&
  supabaseUrl.startsWith('https://')
);

// Fallback seguro caso as variáveis não estejam preenchidas, impedindo tela branca (crash) na inicialização
const safeUrl = isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co';
const safeKey = isSupabaseConfigured ? supabaseAnonKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder';

// Client sem generics - para operações de dados (from, rpc, insert, update)
export const supabase = createClient(safeUrl, safeKey, {
  auth: {
    autoRefreshToken: isSupabaseConfigured,
    persistSession: isSupabaseConfigured,
    detectSessionInUrl: isSupabaseConfigured,
  },
});
