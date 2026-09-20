import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import confetti from "canvas-confetti";
import {
  Target,
  Sparkles,
  Zap,
  Skull,
  Crown,
  Trophy,
  AlertCircle,
  Loader2,
  Lock,
  Check,
  Users,
} from "lucide-react";
import { supabase, type Duel, type DuelParticipant } from "@/lib/supabase";
import {
  getNickname,
  setNickname,
  hasSubmittedDuel,
  addSubmittedDuelId,
  getMyCreatedDuelIds,
  recordGame,
  getAverageAccuracy,
  getPlayerStats,
} from "@/lib/storage";
import {
  calculateAccuracy,
  absoluteDifference,
  formatAccuracy,
  formatNumber,
  formatNumberInput,
  parseNumberInput,
} from "@/lib/scoring";
import ShareGrid from "@/components/ShareGrid";
import StatsModal from "@/components/StatsModal";
import { BarChart as BarChartIcon } from "lucide-react";

interface DuelScreenProps {
  nickname: string;
  onEditNickname: () => void;
}

type Phase = "loading" | "play" | "leaderboard" | "notfound";

export default function DuelScreen({ nickname }: DuelScreenProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>("loading");
  const [duel, setDuel] = useState<Duel | null>(null);
  const [participants, setParticipants] = useState<DuelParticipant[]>([]);
  const [playerName, setPlayerName] = useState(nickname);
  const [guess, setGuess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [avgAccuracy, setAvgAccuracy] = useState(0);

  const fetchDuelAndParticipants = useCallback(async () => {
    if (!id) {
      setPhase("notfound");
      return;
    }

    const submitted = hasSubmittedDuel(id);
    const createdIds = getMyCreatedDuelIds();
    const creator = createdIds.includes(id);
    setAlreadySubmitted(submitted);
    setIsCreator(creator);

    const { data, error } = await supabase
      .from("duels")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) {
      setPhase("notfound");
      return;
    }

    const fetchedDuel = data as Duel;
    setDuel(fetchedDuel);

    const { data: partsData } = await supabase
      .from("duel_participants")
      .select("*")
      .eq("duel_id", id);

    const parts = ((partsData ?? []) as DuelParticipant[]).sort(
      (a, b) => absoluteDifference(Number(a.player_guess), Number(fetchedDuel.real_answer)) - absoluteDifference(Number(b.player_guess), Number(fetchedDuel.real_answer))
    );
    setParticipants(parts);

    if (submitted || creator) {
      setPhase("leaderboard");
    } else {
      setPhase("play");
    }
  }, [id]);

  useEffect(() => {
    fetchDuelAndParticipants();
  }, [fetchDuelAndParticipants]);

  const handleSubmit = async () => {
    if (!duel || !id) return;
    const guessNum = parseNumberInput(guess);
    if (!guessNum || guessNum <= 0) return;

    const nameToUse = playerName.trim().length >= 2 ? playerName.trim() : "Anonyme";

    setSubmitting(true);
    setSubmitError(null);

    const accuracy = calculateAccuracy(guessNum, Number(duel.real_answer));

    const { error: insertError } = await supabase
      .from("duel_participants")
      .insert({
        duel_id: id,
        player_name: nameToUse,
        player_guess: guessNum,
        accuracy_percentage: accuracy,
      });

    setSubmitting(false);

    if (insertError) {
      setSubmitError("Erreur lors de l'envoi. Réessaie.");
      return;
    }

    addSubmittedDuelId(id);
    if (!getNickname()) {
      setNickname(nameToUse);
    }

    const updatedStats = recordGame(accuracy);
    setAvgAccuracy(getAverageAccuracy(updatedStats));

    const { data: refetchedParts } = await supabase
      .from("duel_participants")
      .select("*")
      .eq("duel_id", id);
    if (refetchedParts) {
      const sorted = (refetchedParts as DuelParticipant[]).sort(
        (a, b) => absoluteDifference(Number(a.player_guess), Number(duel.real_answer)) - absoluteDifference(Number(b.player_guess), Number(duel.real_answer))
      );
      setParticipants(sorted);
    }

    setAlreadySubmitted(true);
    setPhase("leaderboard");
  };

  const realAnswerNum = Number(duel?.real_answer ?? 0);
  const sortedParticipants = [...participants].sort(
    (a, b) => absoluteDifference(Number(a.player_guess), realAnswerNum) - absoluteDifference(Number(b.player_guess), realAnswerNum)
  );

  const currentParticipant = sortedParticipants.find(
    (p) => p.player_name === nickname || p.player_name === playerName.trim()
  );
  const currentRank = currentParticipant
    ? sortedParticipants.findIndex((p) => p.id === currentParticipant.id) + 1
    : 0;

  useEffect(() => {
    if (phase === "leaderboard" && currentRank === 1 && !alreadySubmitted) {
      confetti({
        particleCount: 100,
        spread: 75,
        origin: { y: 0.5 },
        colors: ["#22c55e", "#ffffff", "#22c55e"],
      });
    }
  }, [phase, currentRank, alreadySubmitted]);

  const leaderboardShareText = duel && sortedParticipants.length > 0
    ? `🎯 Classement du défi Le Juste Chiffre sur "${duel.question_text.length > 40 ? duel.question_text.slice(0, 40) + '...' : duel.question_text}" :\n${sortedParticipants.slice(0, 3).map((p, i) => `${["🥇", "🥈", "🥉"][i]} ${p.player_name} (${formatAccuracy(Number(p.accuracy_percentage))}%)`).join('\n')}\nTu penses pouvoir faire mieux ? ${window.location.href}`
    : "";
  const leaderboardShareUrl = window.location.href;

  // --- Render: Loading ---
  if (phase === "loading") {
    return (
      <div className="min-h-screen bg-charcoal-900 flex flex-col items-center justify-center">
        <div className="noise-overlay" />
        <Loader2 className="w-8 h-8 text-volt-500 animate-spin" />
      </div>
    );
  }

  // --- Render: Not Found ---
  if (phase === "notfound" || !duel) {
    return (
      <div className="relative min-h-screen bg-charcoal-900 flex flex-col items-center justify-center px-5 text-center">
        <div className="noise-overlay" />
        <Skull className="w-16 h-16 text-crimson-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Défi introuvable</h1>
        <p className="text-charcoal-400 mb-6">Ce lien semble cassé ou le défi n'existe plus.</p>
        <button
          onClick={() => navigate("/")}
          className="bg-volt-500 text-charcoal-900 font-bold py-3 px-8 rounded-2xl transition-all hover:scale-105"
        >
          Lancer mon propre défi
        </button>
      </div>
    );
  }

  // --- Render: Leaderboard ---
  if (phase === "leaderboard") {
    return (
      <div className="relative min-h-screen w-full bg-charcoal-900 flex flex-col items-center justify-start px-5 pt-8 pb-8">
        <div className="noise-overlay" />

        <div className="flex items-center gap-2 self-start">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-volt-500 flex items-center justify-center">
              <Target className="w-5 h-5 text-charcoal-900" strokeWidth={2.5} />
            </div>
            <span className="text-lg font-extrabold tracking-tight">
              Le Juste <span className="text-volt-500">Chiffre</span>
            </span>
          </div>
          <button
            onClick={() => setShowStats(true)}
            className="ml-auto w-10 h-10 rounded-full bg-charcoal-700 border border-charcoal-600 flex items-center justify-center hover:border-volt-500/50 hover:text-volt-500 transition-colors text-charcoal-400"
            aria-label="Mes statistiques"
          >
            <BarChartIcon className="w-5 h-5" />
          </button>
        </div>

        {alreadySubmitted && (
          <div className="w-full max-w-sm mb-4 flex items-center gap-2 bg-charcoal-700 border border-charcoal-500 rounded-xl px-4 py-2.5">
            <Lock className="w-4 h-4 text-charcoal-400 flex-shrink-0" />
            <p className="text-xs text-charcoal-400">Tu as déjà répondu à ce défi.</p>
          </div>
        )}

        {isCreator && !alreadySubmitted && (
          <div className="w-full max-w-sm mb-4 flex items-center gap-2 bg-volt-500/10 border border-volt-500/30 rounded-xl px-4 py-2.5">
            <Crown className="w-4 h-4 text-volt-500 flex-shrink-0" />
            <p className="text-xs text-volt-500">Tu es le créateur de ce défi. Voici le classement en direct.</p>
          </div>
        )}

        <div className="w-full max-w-sm space-y-5">
          {/* Result Card */}
          <div className="bg-gradient-to-b from-charcoal-800 to-charcoal-900 border border-charcoal-600 rounded-3xl p-6 space-y-5">
            <div className="text-center pb-2 border-b border-charcoal-600">
              <div className="inline-flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-volt-500" />
                <span className="text-xs font-bold uppercase tracking-widest text-charcoal-400">
                  Classement du défi
                </span>
              </div>
              <p className="text-sm font-semibold text-white leading-snug px-2">
                {duel.question_text}
              </p>
              {duel.source && (
                <p className="text-[11px] text-charcoal-500 mt-2 px-2">
                  Source : {duel.source}
                </p>
              )}
            </div>

            {/* Reality */}
            <div className="bg-volt-500/10 border border-volt-500/30 rounded-2xl p-4 animate-scale-in">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-volt-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-volt-500">
                  La Réalité
                </span>
              </div>
              <p className="text-3xl font-extrabold font-mono text-volt-500">
                {formatNumber(Number(duel.real_answer))} {duel.unit}
              </p>
            </div>

            {/* Participant count */}
            <div className="flex items-center justify-center gap-2 text-charcoal-400">
              <Users className="w-4 h-4" />
              <span className="text-sm font-medium">
                {sortedParticipants.length} {sortedParticipants.length === 1 ? "participant" : "participants"}
              </span>
            </div>

            {/* Leaderboard */}
            <div className="space-y-2">
              {sortedParticipants.length === 0 ? (
                <p className="text-center text-charcoal-500 text-sm py-4">
                  Aucun participant pour l'instant.
                </p>
              ) : (
                sortedParticipants.map((p, index) => {
                  const rank = index + 1;
                  const isCurrentUser = p.player_name === nickname || p.player_name === playerName.trim();
                  const isFirst = rank === 1;
                  const isTop3 = rank <= 3;

                  return (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between p-3 rounded-xl border animate-slide-up transition-all ${
                        isCurrentUser
                          ? "bg-volt-500/10 border-volt-500/40 ring-1 ring-volt-500/30"
                          : isFirst
                          ? "bg-volt-500/5 border-volt-500/20"
                          : "bg-charcoal-800 border-charcoal-600"
                      }`}
                      style={{ animationDelay: `${0.1 + index * 0.08}s`, animationFillMode: "both" }}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                          isFirst ? "bg-volt-500 text-charcoal-900" :
                          isTop3 ? "bg-charcoal-600 text-volt-500" :
                          "bg-charcoal-700 text-charcoal-400"
                        }`}>
                          {isFirst ? (
                            <Crown className="w-4 h-4" />
                          ) : (
                            rank
                          )}
                        </div>
                        <div>
                          <p className={`text-sm font-bold ${isCurrentUser ? "text-volt-500" : "text-white"}`}>
                            {p.player_name}
                            {isCurrentUser && (
                              <span className="ml-1.5 text-[10px] font-bold uppercase bg-volt-500 text-charcoal-900 px-1.5 py-0.5 rounded">
                                Toi
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-charcoal-400 font-mono">
                            {formatNumber(Number(p.player_guess))} {duel.unit}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-xl font-extrabold font-mono ${
                            isFirst ? "text-volt-500" : "text-charcoal-300"
                          }`}
                        >
                          {formatAccuracy(Number(p.accuracy_percentage))}%
                        </p>
                        <p className="text-[10px] font-bold uppercase text-charcoal-500 tracking-wider">
                          précision
                        </p>
                        {isCurrentUser && avgAccuracy > 0 && (
                          <p className="text-[10px] text-charcoal-400 mt-0.5">
                            Moyenne : <span className="font-bold text-volt-500">{avgAccuracy.toFixed(1).replace(".", ",")}%</span>
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <ShareGrid url={leaderboardShareUrl} text={leaderboardShareText} />

            <button
              onClick={() => navigate("/")}
              className="w-full bg-charcoal-700 border border-charcoal-500 text-white font-bold py-4 rounded-2xl text-lg transition-all duration-300 hover:bg-charcoal-600 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
            >
              <Zap className="w-5 h-5 text-volt-500" />
              Lancer un autre défi
            </button>
          </div>
        </div>

        {showStats && <StatsModal onClose={() => setShowStats(false)} />}
      </div>
    );
  }

  // --- Render: Play (not submitted, not creator) ---
  return (
    <div className="relative min-h-screen w-full bg-charcoal-900 flex flex-col items-center justify-start px-5 pt-8 pb-8">
      <div className="noise-overlay" />

      <div className="flex items-center gap-2 mb-6 self-start">
        <div className="w-8 h-8 rounded-lg bg-volt-500 flex items-center justify-center">
          <Target className="w-5 h-5 text-charcoal-900" strokeWidth={2.5} />
        </div>
        <span className="text-lg font-extrabold tracking-tight">
          Le Juste <span className="text-volt-500">Chiffre</span>
        </span>
        <button
          onClick={() => setShowStats(true)}
          className="ml-auto w-10 h-10 rounded-full bg-charcoal-700 border border-charcoal-600 flex items-center justify-center hover:border-volt-500/50 hover:text-volt-500 transition-colors text-charcoal-400"
          aria-label="Mes statistiques"
        >
          <BarChartIcon className="w-5 h-5" />
        </button>
      </div>

      <div className="w-full max-w-sm space-y-6">
        {/* Challenge intro */}
        <div className="text-center animate-slide-up">
          <div className="inline-flex items-center gap-2 bg-crimson-500/10 border border-crimson-500/30 rounded-full px-4 py-2 mb-4">
            <Skull className="w-4 h-4 text-crimson-500" />
            <span className="text-crimson-500 text-xs font-bold uppercase tracking-wider">
              Tu as été défié
            </span>
          </div>
          <h1 className="text-2xl font-extrabold leading-tight">
            <span className="text-volt-500">{duel.challenger_name}</span> te met au défi !
          </h1>
        </div>

        {/* Question card */}
        <div className="bg-gradient-to-br from-charcoal-700 to-charcoal-800 border border-charcoal-500 rounded-3xl p-5 animate-slide-up">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-volt-500 mt-1 flex-shrink-0" />
            <p className="text-lg font-bold leading-snug">{duel.question_text}</p>
          </div>
        </div>

        {/* Name + Guess input */}
        <div className="space-y-4 animate-slide-up">
          <div className="space-y-2">
            <label className="text-charcoal-400 text-sm font-medium uppercase tracking-wider">
              Ton pseudo
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Entre ton nom..."
              maxLength={20}
              className="w-full bg-charcoal-700 border border-charcoal-500 rounded-2xl px-5 py-4 text-lg font-bold text-white placeholder:text-charcoal-500 focus:outline-none focus:border-volt-500 focus:ring-2 focus:ring-volt-500/30 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-charcoal-400 text-sm font-medium uppercase tracking-wider">
              Ton estimation
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={guess}
              onChange={(e) => setGuess(formatNumberInput(e.target.value))}
              onKeyDown={(e) => e.key === "Enter" && parseNumberInput(guess) > 0 && handleSubmit()}
              placeholder="?"
              autoFocus
              className="w-full bg-charcoal-700 border border-charcoal-500 rounded-2xl px-5 py-5 text-4xl font-extrabold font-mono text-volt-500 placeholder:text-charcoal-500 focus:outline-none focus:border-volt-500 focus:ring-2 focus:ring-volt-500/30 transition-all text-center"
            />
            <p className="text-charcoal-400 text-xs text-center">En {duel.unit}</p>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-500 font-medium">
              Attention : tu n'as le droit qu'à un seul essai. Pas de retour en arrière possible.
            </p>
          </div>

          {submitError && (
            <div className="flex items-center gap-2 bg-crimson-500/10 border border-crimson-500/30 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 text-crimson-500 flex-shrink-0" />
              <p className="text-sm text-crimson-500">{submitError}</p>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!guess || parseNumberInput(guess) <= 0 || submitting}
            className="w-full bg-volt-500 text-charcoal-900 font-bold py-4 rounded-2xl text-lg transition-all duration-300 hover:bg-volt-400 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 disabled:hover:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Validation...
              </>
            ) : (
              <>
                <Check className="w-5 h-5" /> Valider mon estimation (définitif)
              </>
            )}
          </button>
        </div>
      </div>

      {showStats && <StatsModal onClose={() => setShowStats(false)} />}
    </div>
  );
}
