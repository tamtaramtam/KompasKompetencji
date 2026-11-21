import { useState } from 'react';
import { Sparkles, ArrowLeft, Save, Loader2, Calendar, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { generateInitialTalkHelp, type InitialTalkAiTopic } from '../lib/ai';
import type { EvaluationRecord } from '../types/evaluation';

interface Props {
  record: EvaluationRecord;
  onBack: () => void;
  onSaved: (updated: EvaluationRecord) => void;
}

export function InitialTalkView({ record, onBack, onSaved }: Props) {
  const talk = record.initial_talk_data;

  const [initialTalkDate, setInitialTalkDate] = useState(
    talk?.initialTalkDate || new Date().toISOString().slice(0, 10)
  );
  const [reportDeadlineFrom, setReportDeadlineFrom] = useState(talk?.reportDeadlineFrom || '');
  const [reportDeadlineTo, setReportDeadlineTo] = useState(talk?.reportDeadlineTo || '');
  const [evaluationPeriodFrom, setEvaluationPeriodFrom] = useState(talk?.evaluationPeriodFrom || '');
  const [evaluationPeriodTo, setEvaluationPeriodTo] = useState(talk?.evaluationPeriodTo || '');

  // Stan do testowania Asystenta AI
  const [userNotes, setUserNotes] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [activeTopic, setActiveTopic] = useState<InitialTalkAiTopic | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleAskAi = async (topic: InitialTalkAiTopic) => {
    setActiveTopic(topic);
    setAiError(null);
    try {
      const response = await generateInitialTalkHelp(record, topic, userNotes);
      setAiResult(response);
    } catch (err) {
      console.error(err);
      setAiError('Błąd wywołania Gemini API. Sprawdź VITE_GEMINI_API_KEY w .env.local.');
    } finally {
      setActiveTopic(null);
    }
  };

  const handleSave = async (completeTalk: boolean) => {
    setSaving(true);
    const updatedTalkData = {
      initialTalkDate,
      reportDeadlineFrom,
      reportDeadlineTo,
      evaluationPeriodFrom,
      evaluationPeriodTo,
    };

    const { data, error } = await supabase
      .from('evaluations')
      .update({
        initial_talk_data: updatedTalkData,
        status: completeTalk ? 'IN_PROGRESS' : record.status,
      })
      .eq('id', record.id)
      .select()
      .single();

    setSaving(false);
    if (!error && data) {
      onSaved(data as EvaluationRecord);
    }
  };

  const emp = record.employee_data;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" /> Wróć do pulpitu przełożonego
      </button>

      {/* Nagłówek pracownika */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="inline-block px-2.5 py-1 rounded-md text-xs font-medium bg-amber-100 text-amber-800 mb-2">
            Załącznik nr 2 • Część I: Rozmowa wstępna (§ 3)
          </span>
          <h1 className="text-2xl font-bold text-slate-900">
            {emp.firstName} {emp.lastName}
          </h1>
          <p className="text-slate-600 text-sm">
            {emp.position} • {emp.department}
          </p>
        </div>
        <div className="text-sm text-slate-600 bg-slate-50 px-4 py-2.5 rounded-lg border border-slate-200">
          Data nawiązania stosunku pracy:{' '}
          <strong className="text-slate-900">{emp.startDate}</strong>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEWA KOLUMNA: Oficjalny arkusz Części I (Załącznik nr 2) */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Calendar className="w-5 h-5 text-slate-700" />
            <h2 className="font-bold text-slate-900">Harmonogram i daty z Części I</h2>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Data przeprowadzenia rozmowy wstępnej (max 21 dni od zatrudnienia)
            </label>
            <input
              type="date"
              value={initialTalkDate}
              onChange={(e) => setInitialTalkDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Termin sprawozdania (od)
              </label>
              <input
                type="date"
                value={reportDeadlineFrom}
                onChange={(e) => setReportDeadlineFrom(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Termin sprawozdania (do)
              </label>
              <input
                type="date"
                value={reportDeadlineTo}
                onChange={(e) => setReportDeadlineTo(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Okres dokonania oceny (od)
              </label>
              <input
                type="date"
                value={evaluationPeriodFrom}
                onChange={(e) => setEvaluationPeriodFrom(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Okres dokonania oceny (do)
              </label>
              <input
                type="date"
                value={evaluationPeriodTo}
                onChange={(e) => setEvaluationPeriodTo(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave(false)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 cursor-pointer"
            >
              <Save className="w-4 h-4" /> Zapisz szkic
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" /> Zatwierdź rozmowę wstępną
            </button>
          </div>
        </div>

        {/* PRAWA KOLUMNA: Panel Asystenta AI */}
        <div className="bg-indigo-50/60 rounded-xl border border-indigo-200 p-6 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <h2 className="font-bold text-indigo-950">Asystent AI Rozmowy Wstępnej</h2>
          </div>

          <p className="text-xs text-indigo-900/80 mb-3">
            Wpisz opcjonalne wskazówki lub wygeneruj gotowe materiały do rozmowy na bazie stanowiska (<strong>{emp.position}</strong>) i Rozporządzenia z 2015 r.
          </p>

          <textarea
            rows={3}
            value={userNotes}
            onChange={(e) => setUserNotes(e.target.value)}
            placeholder="Opcjonalny kontekst dla AI (np. 'pracownik będzie obsługiwał przetargi powyżej progów unijnych, potrzebuje wdrożenia w system e-Zamówienia')..."
            className="w-full rounded-lg border border-indigo-200 bg-white p-3 text-sm mb-3 focus:border-indigo-500 focus:outline-none"
          />

          <div className="flex flex-wrap gap-2 mb-4">
            <button
              type="button"
              disabled={activeTopic !== null}
              onClick={() => handleAskAi('discussion_agenda')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
            >
              {activeTopic === 'discussion_agenda' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              1. Zakres rozmowy i obowiązki
            </button>

            <button
              type="button"
              disabled={activeTopic !== null}
              onClick={() => handleAskAi('expectations_and_goals')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-indigo-700 border border-indigo-300 hover:bg-indigo-50 disabled:opacity-50 cursor-pointer"
            >
              {activeTopic === 'expectations_and_goals' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              2. Oczekiwania i cele (8 mies.)
            </button>

            <button
              type="button"
              disabled={activeTopic !== null}
              onClick={() => handleAskAi('interview_questions')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-indigo-700 border border-indigo-300 hover:bg-indigo-50 disabled:opacity-50 cursor-pointer"
            >
              {activeTopic === 'interview_questions' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              3. Pytania do pracownika
            </button>
          </div>

          {aiError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs mb-3">
              {aiError}
            </div>
          )}

          <div className="flex-1 bg-white rounded-lg border border-indigo-100 p-4 text-sm text-slate-800 whitespace-pre-wrap overflow-y-auto min-h-[220px]">
            {aiResult || (
              <span className="text-slate-400 text-xs">
                Kliknij jeden z przycisków powyżej, aby przetestować odpowiedź modelu Gemini 2.5 Flash...
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}