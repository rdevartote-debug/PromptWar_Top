import React from 'react';
import { Scale } from 'lucide-react';

export const LegalDisclaimerBanner: React.FC = () => {
  return (
    <footer className="mt-12 border-t border-slate-800 bg-slate-950/80 py-6 px-4 backdrop-blur-md">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Informational Legal Navigator &mdash; Not Formal Legal Advice
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                This platform utilizes generative AI to provide automated clause translations and risk estimations.
                It does not create an attorney-client relationship. Consult a licensed attorney for jurisdictional representation.
              </p>
            </div>
          </div>
          <div className="shrink-0 text-xs font-mono text-slate-500">
            Powered by Google GenAI &bull; Phase 2 UI
          </div>
        </div>
      </div>
    </footer>
  );
};
