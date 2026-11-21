import { useEffect, useState } from 'react';
import { fetchEvaluations } from './lib/supabase';
import type { EvaluationRecord } from './types/evaluation';
import { Clock, User, AlertCircle } from 'lucide-react';
import { InitialTalkView } from './components/InitialTalkView';

export default function App() {
  const [evaluations, setEvaluations] = useState<EvaluationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<EvaluationRecord | null>(null);

  useEffect(() => {
    fetchEvaluations().then((data) => {
      setEvaluations(data);
      setLoading(false);
    });
  }, []);

  if (selectedRecord) {
    return (
      <div className="min-h-screen bg-slate-50">
        <InitialTalkView
          record={selectedRecord}
          onBack={() => setSelectedRecord(null)}
          onSaved={(updated) => {
            setEvaluations((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
            setSelectedRecord(updated);
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Kompas Kompetencji</h1>
            <p className="text-sm text-slate-500">
              System pierwszej oceny w służbie cywilnej (Dz. U. z 2015 r. poz. 1144)
            </p>
          </div>
          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
            Widok: Bezpośredni Przełożony
          </span>
        </header>

        {loading ? (
          <p className="text-slate-500">Ładowanie danych z Supabase...</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {evaluations.map((item) => {
              const isUrgent =
                item.status === 'NEW_INITIAL_TALK' || item.status === 'READY_FOR_EVALUATION';

              return (
                <div
                  key={item.id}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
                >
                  <div>
                    {/* Górny pasek karty: Status + Timer */}
                    <div className="mb-4 flex items-center justify-between">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                          isUrgent
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {isUrgent ? <AlertCircle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                        {item.status === 'NEW_INITIAL_TALK' && 'Wymagana rozmowa wstępna'}
                        {item.status === 'READY_FOR_EVALUATION' && 'Gotowy do oceny'}
                        {item.status === 'COMPLETED' && 'Zakończono'}
                      </span>
                    </div>

                    {/* Środek karty: Dane pracownika */}
                    <div className="mb-4">
                      <div className="flex items-center gap-2">
                        <User className="h-5 w-5 text-slate-400" />
                        <h2 className="text-lg font-semibold">
                          {item.employee_data.firstName} {item.employee_data.lastName}
                        </h2>
                      </div>
                      <p className="mt-1 text-sm font-medium text-slate-600">
                        {item.employee_data.position}
                      </p>
                      <p className="text-xs text-slate-400">{item.employee_data.department}</p>
                      <p className="mt-3 text-xs text-slate-500">
                        Data zatrudnienia: <strong className="text-slate-700">{item.employee_data.startDate}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Dół karty: Przycisk akcji */}
                  <button
                    onClick={() => setSelectedRecord(item)}
                    className="mt-4 w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    {item.status === 'NEW_INITIAL_TALK'
                      ? 'Rozpocznij rozmowę wstępną'
                      : 'Przeprowadź pierwszą ocenę'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}