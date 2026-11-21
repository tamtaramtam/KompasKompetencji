import type { EvaluationRecord } from '../types/evaluation';
import { getLegalContextForStage } from './legal';

export type InitialTalkAiTopic =
  | 'discussion_agenda'
  | 'expectations_and_goals'
  | 'interview_questions'
  | 'custom_prompt';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const TEXT_MODELS_CHAIN = [
  'openai/gpt-oss-120b',
  'qwen/qwen3.8-27b',
  'openai/gpt-oss-20b',
];

function buildOfflineLegalFallback(record: EvaluationRecord, topic: InitialTalkAiTopic): string {
  const emp = record.employee_data;
  const talk = record.initial_talk_data;

  if (topic === 'discussion_agenda') {
    return [
      `Omówienie głównych obowiązków na stanowisku: ${emp.position} (${emp.department}) oraz standardów realizacji zadań w urzędzie (§ 3 pkt 2 Rozporządzenia).`,
      `Przedstawienie zasad i trybu dokonywania pierwszej oceny w służbie cywilnej oraz 5 elementów oceny z Załącznika nr 1: rzetelność, wykorzystywanie wiedzy i doskonalenie zawodowe, organizacja pracy i orientacja na osiąganie celów, komunikacja, współpraca (§ 2 i § 3 pkt 1).`,
      `Określenie oczekiwań co do postawy, zaangażowania, relacji w zespole i terminowości (§ 3 pkt 3).`,
      `Wyznaczenie harmonogramu: termin złożenia sprawozdania (${talk?.reportDeadlineFrom || 'do ustalenia'} – ${talk?.reportDeadlineTo || 'do ustalenia'}) oraz planowany okres dokonania pierwszej oceny (${talk?.evaluationPeriodFrom || 'do ustalenia'} – ${talk?.evaluationPeriodTo || 'do ustalenia'}).`
    ].join('\n');
  }

  if (topic === 'expectations_and_goals') {
    return [
      `Rzetelność i terminowość: bezbłędne oraz terminowe realizowanie powierzonych zadań na stanowisku ${emp.position} zgodnie z obowiązującymi procedurami i przepisami prawa.`,
      `Wykorzystywanie wiedzy i doskonalenie zawodowe: opanowanie obiegu dokumentów w komórce (${emp.department}), samodzielne korzystanie z baz wiedzy oraz przygotowanie do egzaminu ze służby przygotowawczej.`,
      `Organizacja pracy i orientacja na osiąganie celów: prawidłowe ustalanie priorytetów zadań oraz sprawne raportowanie postępów bezpośredniemu przełożonemu.`,
      `Komunikacja i współpraca: jasne formułowanie pism urzędowych, aktywne włączanie się w prace zespołu oraz dbanie o sprawny przepływ informacji.`
    ].join('\n');
  }

  return [
    `Które z głównych obowiązków przypisanych do stanowiska ${emp.position} są dla Pana/Pani najbardziej znane, a w jakich obszarach potrzebuje Pan/Pani szczegółowego wdrożenia na starcie?`,
    `Jakie narzędzia, systemy informatyczne lub akty prawne stosowane w komórce (${emp.department}) wymagają w pierwszej kolejności wspólnego omówienia lub szkolenia?`,
    `W jaki sposób dotychczas organizował(a) Pan/Pani pracę przy kilku równoległych zadaniach i jak radzi sobie Pan/Pani z dotrzymywaniem terminów?`,
    `Jakiego wsparcia ze strony bezpośredniego przełożonego i zespołu oczekuje Pan/Pani w ciągu pierwszych 3 miesięcy wdrożenia?`
  ].join('\n');
}

export async function generateInitialTalkHelp(
  record: EvaluationRecord,
  topic: InitialTalkAiTopic,
  userNotes: string
): Promise<string> {
  const rawApiKey = import.meta.env.VITE_GROQ_API_KEY;
if (!rawApiKey) {
  throw new Error('Brak zmiennej VITE_GROQ_API_KEY w pliku .env.local');
}
const apiKey = rawApiKey.trim();

  // 1. Pobieramy przepisy 1:1 z bazy Supabase (tabela legal_documents)
  const { formattedPromptContext } = await getLegalContextForStage('INITIAL_TALK');

  const emp = record.employee_data;
  const talk = record.initial_talk_data;
  const report = record.employee_report;

  const taskInstructions: Record<InitialTalkAiTopic, string> = {
    discussion_agenda: `Przygotuj konkretną agendę i punkty do omówienia przez przełożonego podczas rozmowy wstępnej na tym stanowisku (główne obowiązki, standardy pracy w urzędzie, zasady oceny w 5 kryteriach z Załącznika nr 1 i nr 2). Uwzględnij dotychczasowe obserwacje o pracowniku, jeśli są dostępne.`,
    expectations_and_goals: `Zaproponuj 4-5 mierzalnych oczekiwań i celów wdrożeniowych na okres 8 miesięcy dla tego stanowiska, nawiązujących wprost do 5 elementów oceny z Załącznika nr 1, sformułowanych w profesjonalnym języku administracji publicznej. Dostosuj je do mocnych stron i obszarów do poprawy pracownika, jeśli zostały podane.`,
    interview_questions: `Zaproponuj 4 konkretne pytania otwarte, które przełożony może zadać pracownikowi podczas rozmowy wstępnej, aby zbadać jego doświadczenie, potrzeby wdrożeniowe i rozumienie kryteriów z Załącznika nr 1 (nawiązując do jego mocnych stron lub obszarów wymagających wsparcia, jeśli są podane).`,
    custom_prompt: `Odpowiedz na pytanie lub polecenie przełożonego z sekcji DODATKOWY KONTEKST / NOTATKI PRZEŁOŻONEGO. Jeśli dotyczy przepisów, oprzyj się na bazie wiedzy prawnej; jeśli pytanie dotyczy charakterystyki lub oceny pracownika, przeanalizuj wszystkie dostępne informacje z sekcji DANE PRACOWNIKA Z ARKUSZA (w tym mocne strony, obszary do poprawy i notatki przełożonego). Jeśli pytanie jest ogólne, odpowiedz rzeczowo z własnej wiedzy, nie zmyślając faktów.`
  };

  const prompt = `
ROLA:
Jesteś ekspertem HR i doradcą prawnym w polskiej służbie cywilnej.

BAZA WIEDZY PRAWNEJ (źródło przepisów — gdy cytujesz lub interpretujesz przepisy, opieraj się na niej i nie zmyślaj numerów paragrafów ani treści):
${formattedPromptContext}

DANE PRACOWNIKA Z ARKUSZA (ZANONIMIZOWANE ZE WZGLĘDU NA RODO):
- Podmiot oceny: Oceniany pracownik (dane osobowe zanonimizowane)
- Stanowisko: ${emp.position}
- Komórka organizacyjna: ${emp.department}
- Data zatrudnienia: ${emp.startDate}
- Czy umowa na zastępstwo: ${record.is_replacement ? 'Tak (zgodnie z § 3 obowiązuje 21 dni od ustalenia, że podlega pierwszej ocenie)' : 'Nie'}
- Termin sprawozdania: ${talk?.reportDeadlineFrom || 'nie wyznaczono'} – ${talk?.reportDeadlineTo || 'nie wyznaczono'}
- Okres dokonania oceny: ${talk?.evaluationPeriodFrom || 'nie wyznaczono'} – ${talk?.evaluationPeriodTo || 'nie wyznaczono'}
- Główne obowiązki z rozmowy wstępnej: ${talk?.mainDuties || 'brak danych'}

PROFIL KOMPETENCYJNY I OBSERWACJE Z BAZY:
- Mocne strony: ${emp.strengths || 'brak wpisu w bazie'}
- Obszary do poprawy / ryzyka: ${emp.areasForImprovement || 'brak wpisu w bazie'}
- Dotychczasowe notatki przełożonego: ${emp.supervisorNotes || 'brak wpisu w bazie'}

STATUS FORMALNY I SPRAWOZDANIE (jeśli dotyczy etapu):
- Egzamin ze służby przygotowawczej: ${record.exam_status || 'brak danych / nie dotyczy'}
- Sprawozdanie złożone w terminie: ${record.report_on_time === true ? 'Tak' : record.report_on_time === false ? 'Nie' : 'brak danych'}
- Zrealizowane zadania (ze sprawozdania): ${report?.tasksPerformed || 'brak sprawozdania'}
- Napotkane problemy i rozwiązania: ${report?.problemsAndSolutions || 'brak danych'}
- Zdobyte umiejętności: ${report?.skillsAcquired || 'brak danych'}
- Wnioski usprawniające pracownika: ${report?.improvements || 'brak danych'}

DODATKOWY KONTEKST / POLECENIE PRZEŁOŻONEGO:
"${userNotes || 'Brak własnych notatek — wygeneruj pełną propozycję bazową dla tego stanowiska.'}"

ZADANIE:
${taskInstructions[topic]}

WYMAGANIA:
- Każde twierdzenie o przepisach (paragrafy, terminy, progi punktowe, warunki oceny) musi wynikać z BAZY WIEDZY PRAWNEJ. Jeśli czegoś w niej nie ma, powiedz to wprost zamiast zgadywać.
- Analizując pracownika, odnoś się bezpośrednio do jego cech, notatek i sprawozdania podanych w prompcie (np. łącząc jego zachowania z konkretnymi kryteriami z Załącznika nr 1).
- W pozostałych kwestiach (pomysły na rozmowę, sformułowania, porady) korzystaj ze swojej wiedzy i własnego osądu.
- Odpowiadaj konkretnie, bez wstępów ("Oto propozycja...") ani podsumowań, poprawną polszczyzną.
- Ze względu na anonimizację nie używaj imion, nazwisk ani form z ukośnikami (np. „pracownik/czka”). Jeśli z wiadomości przełożonego jednoznacznie wynika płeć osoby ocenianej (np. używa zaimków „ona/jej” lub „on/jego”), dopasuj do niej formy gramatyczne w swojej odpowiedzi. W pozostałych przypadkach stosuj wyłącznie neutralną terminologię z rozporządzenia: „oceniany” lub „pracownik służby cywilnej” (w rodzaju męskim gramatycznym, zgodnie z językiem aktu prawnego).
`;

    for (const model of TEXT_MODELS_CHAIN) {
        try {
            const res = await fetch(GROQ_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model,
                    messages: [{ role: 'user', content: prompt }],
                }),
            });

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            }

            const json = await res.json();
            const text = json.choices?.[0]?.message?.content?.trim();
            if (text) return text;
        } catch (err) {
            console.warn(`[AI] Model ${model} błąd:`, err);
        }
    }

  return `[Błąd agenta, tryb awaryjny — wygenerowano na podstawie przepisów Dz. U. poz. 1144]\n\n${buildOfflineLegalFallback(record, topic)}`;
}