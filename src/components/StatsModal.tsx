import { X, Gamepad2, BarChart3, Target } from "lucide-react";
import { getPlayerStats, getAverageAccuracy } from "@/lib/storage";

interface StatsModalProps {
  onClose: () => void;
}

export default function StatsModal({ onClose }: StatsModalProps) {
  const stats = getPlayerStats();
  const avg = getAverageAccuracy(stats);

  const rows = [
    {
      icon: <Gamepad2 className="w-6 h-6 text-volt-500" />,
      label: "Questions jouées",
      value: stats.gamesPlayed.toString(),
    },
    {
      icon: <BarChart3 className="w-6 h-6 text-volt-500" />,
      label: "Précision moyenne",
      value: `${avg.toFixed(1).replace(".", ",")}%`,
    },
    {
      icon: <Target className="w-6 h-6 text-volt-500" />,
      label: "Dans le mille (100%)",
      value: stats.perfectCount.toString(),
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-charcoal-800 border border-charcoal-600 rounded-3xl p-6 w-full max-w-sm space-y-5 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold">Mes statistiques</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-charcoal-700 flex items-center justify-center hover:bg-charcoal-600 transition-colors"
            aria-label="Fermer"
          >
            <X className="w-4 h-4 text-charcoal-400" />
          </button>
        </div>

        <div className="space-y-3">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-center gap-4 bg-charcoal-700 border border-charcoal-600 rounded-2xl p-4"
            >
              <div className="w-12 h-12 rounded-xl bg-volt-500/10 border border-volt-500/30 flex items-center justify-center flex-shrink-0">
                {row.icon}
              </div>
              <div>
                <p className="text-xs text-charcoal-400 uppercase tracking-wider">{row.label}</p>
                <p className="text-2xl font-extrabold font-mono">{row.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
