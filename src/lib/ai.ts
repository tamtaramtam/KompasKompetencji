import type { EvaluationRecord } from '../types/evaluation';

export type InitialTalkAiTopic =
  | 'discussion_agenda'
  | 'expectations_and_goals'
  | 'interview_questions';

const LEGAL_CONTEXT = `
Jesteś ekspertem HR i doradcą prawnym w polskiej służbie cywilnej.
Pracujesz w oparciu o Rozporządzenie Prezesa Rady Ministrów z dnia 23 lipca 2015 r. w sprawie szczegółowych warunków i sposobu dokonywania pierwszej oceny w służbie cywilnej (Dz. U. poz. 1144).
Zgodnie z § 3 oraz Załącznikiem nr 2 (Część I - Rozmowa wstępna), w terminie 21 dni od nawiązania stosunku pracy bezpośredni przełożony przeprowadza rozmowę wstępną, podczas której:
1. Omawia główne obowiązki wynikające z opisu stanowiska pracy, sposób ich realizacji oraz oczekiwania co do wyników pracy.
2. Zapoznaje ocenianego ze sposobem i kryteriami dokonywania pierwszej oceny (5 kryteriów: rzetelność, wiedza specjalistyczna i umiejętność jej wykorzystania, organizacja pracy i orientacja na osiąganie celów, komunikacja, współpraca).
3. Wskazuje termin złożenia sprawozdania przez ocenianego oraz termin przeprowadzenia pierwszej oceny.
`;

export async function generateInitialTalkHelp(
  record: EvaluationRecord,
  topic: InitialTalkAiTopic,
  userNotes: string
): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Brak zmiennej VITE_GEMINI_API_KEY w .env.local (zrestartuj serwer npm run dev).');
  }

  const emp = record.employee_data;
  const talk = record.initial_talk_data;

  const taskInstructions: Record<InitialTalkAiTopic, string> = {
    discussion_agenda: `Przygotuj konkretną agendę i punkty do omówienia przez przełożonego podczas rozmowy wstępnej na tym stanowisku (główne obowiązki, standardy pracy w urzędzie, zasady oceny w 5 kryteriach z Załącznika nr 2).`,
    expectations_and_goals: `Zaproponuj 4-5 mierzalnych oczekiwań i celów wdrożeniowych na okres 8 miesięcy dla tego stanowiska, sformułowanych w profesjonalnym języku administracji publicznej.`,
    interview_questions: `Zaproponuj 4 konkretne pytania otwarte, które przełożony może zadać pracownikowi podczas rozmowy wstępnej, aby zbadać jego dotychczasowe doświadczenie, potrzeby wdrożeniowe i rozumienie roli.`
  };

  const prompt = `
${LEGAL_CONTEXT}

DANE PRACOWNIKA:
- Imię i nazwisko: ${emp.firstName} ${emp.lastName}
- Stanowisko: ${emp.position}
- Komórka organizacyjna: ${emp.department}
- Data zatrudnienia: ${emp.startDate}
- Czy na zastępstwo: ${record.is_replacement ? 'Tak' : 'Nie'}
- Termin sprawozdania: ${talk?.reportDeadlineFrom || 'brak'} – ${talk?.reportDeadlineTo || 'brak'}
- Okres dokonania oceny: ${talk?.evaluationPeriodFrom || 'brak'} – ${talk?.evaluationPeriodTo || 'brak'}

DODATKOWY KONTEKST / NOTATKI PRZEŁOŻONEGO:
"${userNotes || 'Brak własnych notatek — wygeneruj pełną propozycję bazową dla tego stanowiska.'}"

ZADANIE:
${taskInstructions[topic]}

WYMAGANIA:
- Odpowiadaj konkretnie, bez wstępów ("Oto propozycja...") ani podsumowań.
- Używaj klarownych wypunktowań i poprawnej polszczyzny urzędowej.
`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Błąd Gemini API (${res.status}): ${errBody}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
}