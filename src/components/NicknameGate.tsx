import { useState } from "react";
import { Target, Zap } from "lucide-react";
import { setNickname } from "@/lib/storage";

interface NicknameGateProps {
  onSet: (name: string) => void;
}

export default function NicknameGate({ onSet }: NicknameGateProps) {
  const [name, setName] = useState("");
  const canSubmit = name.trim().length >= 2;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const trimmed = name.trim();
    setNickname(trimmed);
    onSet(trimmed);
  };

  return (
    <div className="relative min-h-screen w-full bg-charcoal-900 flex flex-col items-center justify-center px-5">
      <div className="noise-overlay" />

      <div className="w-full max-w-sm space-y-8 animate-slide-up">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2">
            <div className="w-12 h-12 rounded-2xl bg-volt-500 flex items-center justify-center">
              <Target className="w-7 h-7 text-charcoal-900" strokeWidth={2.5} />
            </div>
          </div>
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight">
              Le Juste <span className="text-volt-500">Chiffre</span>
            </h1>
            <p className="text-charcoal-400 text-sm mt-2">
              Le duel d'estimation entre amis. Piège-les avec des chiffres impossibles.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-charcoal-400 text-sm font-medium uppercase tracking-wider">
              Choisis ton pseudo
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Sébastien"
              maxLength={20}
              autoFocus
              className="w-full bg-charcoal-700 border border-charcoal-500 rounded-2xl px-5 py-4 text-xl font-bold text-white placeholder:text-charcoal-500 focus:outline-none focus:border-volt-500 focus:ring-2 focus:ring-volt-500/30 transition-all"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full bg-volt-500 text-charcoal-900 font-bold py-4 rounded-2xl text-lg transition-all duration-300 hover:bg-volt-400 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 disabled:hover:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Zap className="w-5 h-5" />
            Commencer à piéger
          </button>
        </div>
      </div>
    </div>
  );
}
