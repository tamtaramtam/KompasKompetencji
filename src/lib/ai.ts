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

  const taskInstructions: Record<InitialTalkAiTopic, string> = {
    discussion_agenda: `Przygotuj konkretną agendę i punkty do omówienia przez przełożonego podczas rozmowy wstępnej na tym stanowisku (główne obowiązki, standardy pracy w urzędzie, zasady oceny w 5 kryteriach z Załącznika nr 1 i nr 2).`,
    expectations_and_goals: `Zaproponuj 4-5 mierzalnych oczekiwań i celów wdrożeniowych na okres 8 miesięcy dla tego stanowiska, nawiązujących wprost do 5 elementów oceny z Załącznika nr 1, sformułowanych w profesjonalnym języku administracji publicznej.`,
    interview_questions: `Zaproponuj 4 konkretne pytania otwarte, które przełożony może zadać pracownikowi podczas rozmowy wstępnej, aby zbadać jego doświadczenie, potrzeby wdrożeniowe i rozumienie kryteriów z Załącznika nr 1.`,
    custom_prompt: `Odpowiedz na pytanie lub polecenie przełożonego z sekcji DODATKOWY KONTEKST / NOTATKI PRZEŁOŻONEGO. Jeśli dotyczy przepisów oprzyj się na bazie wiedzy prawnej, jeśli pytanie pada o ocenę pracownika oprzyj się na danych pracownika. Jeśli jest ogólne lub spoza tematu, odpowiedz normalnie z własnej wiedzy zachowuj się wtedy normalnie, ale nie twórz nie prawdziwych informacji, na tematy na które nie masz wiedzy.`
  };

  const prompt = `
ROLA:
Jesteś ekspertem HR i doradcą prawnym w polskiej służbie cywilnej.

BAZA WIEDZY PRAWNEJ (źródło przepisów — gdy cytujesz lub interpretujesz przepisy, opieraj się na niej i nie zmyślaj numerów paragrafów ani treści):
${formattedPromptContext}

DANE PRACOWNIKA Z ARKUSZA:
- Imię i nazwisko: ${emp.firstName} ${emp.lastName}
- Stanowisko: ${emp.position}
- Komórka organizacyjna: ${emp.department}
- Data zatrudnienia: ${emp.startDate}
- Czy umowa na zastępstwo: ${record.is_replacement ? 'Tak (zgodnie z § 3 obowiązuje 21 dni od ustalenia, że podlega pierwszej ocenie)' : 'Nie'}
- Termin sprawozdania: ${talk?.reportDeadlineFrom || 'nie wyznaczono'} – ${talk?.reportDeadlineTo || 'nie wyznaczono'}
- Okres dokonania oceny: ${talk?.evaluationPeriodFrom || 'nie wyznaczono'} – ${talk?.evaluationPeriodTo || 'nie wyznaczono'}

DODATKOWY KONTEKST / NOTATKI PRZEŁOŻONEGO:
"${userNotes || 'Brak własnych notatek — wygeneruj pełną propozycję bazową dla tego stanowiska.'}"

ZADANIE:
${taskInstructions[topic]}

WYMAGANIA:
- Każde twierdzenie o przepisach (paragrafy, terminy, progi punktowe, warunki oceny) musi wynikać z BAZY WIEDZY PRAWNEJ. Jeśli czegoś w niej nie ma, powiedz to wprost zamiast zgadywać.
- W pozostałych kwestiach (pomysły na rozmowę, sformułowania, porady, pytania ogólne) korzystaj ze swojej wiedzy i własnego osądu.
- Odpowiadaj konkretnie, bez wstępów ("Oto propozycja...") ani podsumowań, poprawną polszczyzną.`;

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

  return `[Tryb awaryjny — wygenerowano na podstawie przepisów Dz. U. poz. 1144]\n\n${buildOfflineLegalFallback(record, topic)}`;
}