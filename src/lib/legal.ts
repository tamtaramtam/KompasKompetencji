import { supabase } from './supabase';

export type LegalStage = 'INITIAL_TALK' | 'REPORT' | 'FINAL_EVALUATION' | 'GENERAL' | 'ALL_STAGES';

export interface LegalDocumentRow {
  id: string;
  code: string;
  title: string;
  stage: LegalStage;
  content: string;
}

let cachedDocs: LegalDocumentRow[] | null = null;

export async function getLegalContextForStage(stage: LegalStage): Promise<{
  formattedPromptContext: string;
  sources: LegalDocumentRow[];
}> {
  if (!cachedDocs) {
    const { data, error } = await supabase
      .from('legal_documents')
      .select('id, code, title, stage, content')
      .order('code', { ascending: true });

    if (error) {
      console.error('Błąd pobierania bazy wiedzy prawnej z Supabase:', error);
      return {
        formattedPromptContext: 'Brak połączenia z bazą aktów prawnych — stosuj przepisy Dz. U. poz. 1144.',
        sources: [],
      };
    }

    cachedDocs = (data || []) as LegalDocumentRow[];
  }

  // Filtrujemy przepisy ogólne + przepisy dedykowane dla aktualnego kroku formularza
  const relevantDocs = cachedDocs.filter(
    (doc) => doc.stage === 'GENERAL' || doc.stage === 'ALL_STAGES' || doc.stage === stage
  );

  const formattedPromptContext = relevantDocs
    .map((doc) => `[ŹRÓDŁO: ${doc.code} — ${doc.title}]\n${doc.content}`)
    .join('\n\n');

  return {
    formattedPromptContext,
    sources: relevantDocs,
  };
}