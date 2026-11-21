import { createClient } from '@supabase/supabase-js';
import type { EvaluationRecord } from '../types/evaluation';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function fetchEvaluations(): Promise<EvaluationRecord[]> {
  const { data, error } = await supabase
    .from('evaluations')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Błąd pobierania z Supabase:', error);
    return [];
  }

  return data as EvaluationRecord[];
}