import React, { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { apiFetch } from '../utils/api.ts';
import type { Department, Doctor, LabTest, Medicine, PublicPage } from '../types/hms.ts';

interface GlobalSearchModalProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (page: PublicPage) => void;
  onSelectDoctor: (doctorId: number) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  open,
  onClose,
  onNavigate,
  onSelectDoctor,
}) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    doctors: Doctor[];
    departments: Department[];
    labTests: LabTest[];
    medicines: Medicine[];
  }>({ doctors: [], departments: [], labTests: [], medicines: [] });

  useEffect(() => {
    if (!open || !query.trim()) {
      setResults({ doctors: [], departments: [], labTests: [], medicines: [] });
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await apiFetch<typeof results>(
          `/api/public/search?q=${encodeURIComponent(query.trim())}`
        );
        setResults(data);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => clearTimeout(timer);
  }, [query, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-start justify-center pt-20 px-4">
      <div className="bg-white w-full max-w-2xl rounded-xl border border-slate-200 shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search specialists, departments, lab tests, or medicines..."
            className="w-full text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto p-4 space-y-5">
          {!query.trim() && (
            <p className="text-sm text-slate-500 text-center py-6">
              Type a doctor name, symptom specialty, diagnostic test, or medicine.
            </p>
          )}
          {loading && <p className="text-sm text-slate-500 text-center py-4">Searching catalog...</p>}

          {results.doctors.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 mb-2">Specialists</h4>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                {results.doctors.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      onSelectDoctor(d.id);
                      onClose();
                    }}
                    className="w-full text-left px-3 py-2.5 hover:bg-slate-50 flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{d.fullName}</div>
                      <div className="text-xs text-slate-500">{d.specialization}</div>
                    </div>
                    <span className="text-xs font-mono text-teal-700">₹{d.consultationFee}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {results.departments.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 mb-2">Medical Departments</h4>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                {results.departments.map((dept) => (
                  <button
                    key={dept.id}
                    type="button"
                    onClick={() => {
                      onNavigate('departments');
                      onClose();
                    }}
                    className="w-full text-left px-3 py-2.5 hover:bg-slate-50 cursor-pointer"
                  >
                    <div className="text-sm font-semibold text-slate-900">{dept.name}</div>
                    <div className="text-xs text-slate-500">{dept.floorLocation}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {results.labTests.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 mb-2">Laboratory Tests</h4>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                {results.labTests.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      onNavigate('lab-tests');
                      onClose();
                    }}
                    className="w-full text-left px-3 py-2.5 hover:bg-slate-50 flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{t.name}</div>
                      <div className="text-xs text-slate-500">{t.category} · {t.turnaroundHours}h turnaround</div>
                    </div>
                    <span className="text-xs font-mono text-slate-700">₹{t.price}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {results.medicines.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 mb-2">Pharmacy Formulary</h4>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                {results.medicines.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      onNavigate('pharmacy');
                      onClose();
                    }}
                    className="w-full text-left px-3 py-2.5 hover:bg-slate-50 flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{m.name}</div>
                      <div className="text-xs text-slate-500">{m.genericName} · {m.category}</div>
                    </div>
                    <span className="text-xs font-mono text-slate-700">₹{m.unitPrice}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
