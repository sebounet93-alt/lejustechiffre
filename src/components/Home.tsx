import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";
import {
  Target,
  Pencil,
  Zap,
  Shuffle,
  Sparkles,
  Check,
  Users,
  Trophy,
  Skull,
  Crown,
  Loader2,
  AlertCircle,
  ArrowRight,
  Share2,
} from "lucide-react";
import { supabase, type Duel, type DuelParticipant } from "@/lib/supabase";
import { getMyCreatedDuelIds, addMyCreatedDuelId, addSubmittedDuelId, markQuestionSeen, recordGame, getAverageAccuracy, getPlayerStats } from "@/lib/storage";
import { CATEGORIES, getStatsByCategory, getRandomStatByCategory, type Stat, type CategorySlug } from "@/data/stats";
import {
  calculateAccuracy,
  absoluteDifference,
  formatAccuracy,
  formatNumber,
  formatNumberInput,
  parseNumberInput,
  getReactionMessage,
} from "@/lib/scoring";
import ShareGrid from "@/components/ShareGrid";
import StatsModal from "@/components/StatsModal";
import { BarChart as BarChartIcon } from "lucide-react";

interface HomeProps {
  nickname: string;
  onEditNickname: () => void;
}

type Tab = "solo" | "traps";
type Phase = "play" | "verdict";

export default function Home({ nickname, onEditNickname }: HomeProps) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("solo");

  const [stat, setStat] = useState<Stat>(() => getRandomStatByCategory("all")!);
  const [category, setCategory] = useState<CategorySlug>("all");
  const [guess, setGuess] = useState("");
  const [phase, setPhase] = useState<Phase>("play");
  const [revealedDuel, setRevealedDuel] = useState<Duel | null>(null);
  const [creatingDuel, setCreatingDuel] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creatingMatch, setCreatingMatch] = useState(false);
  const [myDuels, setMyDuels] = useState<Duel[]>([]);
  const [participantCounts, setParticipantCounts] = useState<Record<string, number>>({});
  const [topParticipants, setTopParticipants] = useState<Record<string, DuelParticipant | null>>({});
  const [loadingDuels, setLoadingDuels] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [avgAccuracy, setAvgAccuracy] = useState(() => getAverageAccuracy(getPlayerStats()));

  const guessNum = parseNumberInput(guess);
  const accuracy = phase !== "play" && guessNum > 0 ? calculateAccuracy(guessNum, stat.answer) : 0;

  useEffect(() => {
    markQuestionSeen(stat.id);
  }, [stat.id]);

  const shareUrl = revealedDuel
    ? `${window.location.origin}/duel/${revealedDuel.id}`
    : "";

  const fetchMyDuels = useCallback(async () => {
    const ids = getMyCreatedDuelIds();
    if (ids.length === 0) {
      setMyDuels([]);
      return;
    }
    setLoadingDuels(true);
    const { data, error } = await supabase
      .from("duels")
      .select("*")
      .in("id", ids)
      .order("created_at", { ascending: false });
    if (!error && data) {
      const duels = data as Duel[];
      setMyDuels(duels);

      const counts: Record<string, number> = {};
      const tops: Record<string, DuelParticipant | null> = {};
      await Promise.all(
        duels.map(async (duel) => {
          const { data: parts } = await supabase
            .from("duel_participants")
            .select("*")
            .eq("duel_id", duel.id);
          if (parts) {
            const sorted = (parts as DuelParticipant[]).sort(
              (a, b) =>
                absoluteDifference(Number(a.player_guess), Number(duel.real_answer)) -
                absoluteDifference(Number(b.player_guess), Number(duel.real_answer))
            );
            counts[duel.id] = sorted.length;
            tops[duel.id] = sorted[0] ?? null;
          }
        })
      );
      setParticipantCounts(counts);
      setTopParticipants(tops);
    }
    setLoadingDuels(false);
  }, []);

  useEffect(() => {
    if (tab === "traps") {
      fetchMyDuels();
    }
  }, [tab, fetchMyDuels]);

  const handleRandomStat = useCallback(() => {
    const next = getRandomStatByCategory(category, stat.id);
    if (next) setStat(next);
  }, [category, stat.id]);

  const handleSelectCategory = useCallback((slug: CategorySlug) => {
    setCategory(slug);
    const next = getRandomStatByCategory(slug);
    if (next) setStat(next);
  }, []);

  const categoryEmpty = getStatsByCategory(category).length === 0;

  const handleValidate = () => {
    if (!guessNum || guessNum <= 0) return;
    const acc = calculateAccuracy(guessNum, stat.answer);
    const updated = recordGame(acc);
    setAvgAccuracy(getAverageAccuracy(updated));
    setPhase("verdict");
    if (calculateAccuracy(guessNum, stat.answer) >= 90) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#22c55e", "#ffffff", "#22c55e"],
      });
    }
  };

  const handlePlayAgain = () => {
    setPhase("play");
    setGuess("");
    setStat(getRandomStatByCategory(category, stat.id)!);
  };

  const handleLaunchMatch = () => {
    setCreatingMatch(true);
    navigate("/match");
  };

  const fireConfetti = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#22c55e", "#ffffff", "#22c55e"],
    });
  };

  return (
    <div className="relative min-h-screen w-full bg-charcoal-900 flex flex-col px-5 pt-6 pb-8">
      <div className="noise-overlay" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-volt-500 flex items-center justify-center">
            <Target className="w-5 h-5 text-charcoal-900" strokeWidth={2.5} />
          </div>
          <span className="text-lg font-extrabold tracking-tight">
            Le Juste <span className="text-volt-500">Chiffre</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowStats(true)}
            className="w-10 h-10 rounded-full bg-charcoal-700 border border-charcoal-600 flex items-center justify-center hover:border-volt-500/50 hover:text-volt-500 transition-colors text-charcoal-400"
            aria-label="Mes statistiques"
          >
            <BarChartIcon className="w-5 h-5" />
          </button>
          <button
            onClick={onEditNickname}
            className="flex items-center gap-2 bg-charcoal-700 border border-charcoal-600 rounded-full pl-3 pr-2 py-1.5 hover:border-volt-500/50 transition-colors group"
          >
            <span className="text-sm font-semibold text-white max-w-[100px] truncate">{nickname}</span>
            <div className="w-6 h-6 rounded-full bg-charcoal-600 flex items-center justify-center group-hover:bg-volt-500/20 transition-colors">
              <Pencil className="w-3 h-3 text-charcoal-400 group-hover:text-volt-500 transition-colors" />
            </div>
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 bg-charcoal-700 rounded-2xl p-1 mb-6">
        <button
          onClick={() => setTab("solo")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${
            tab === "solo"
              ? "bg-volt-500 text-charcoal-900"
              : "text-charcoal-400 hover:text-white"
          }`}
        >
          <Zap className="w-4 h-4" />
          Solo Infini
        </button>
        <button
          onClick={() => setTab("traps")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${
            tab === "traps"
              ? "bg-volt-500 text-charcoal-900"
              : "text-charcoal-400 hover:text-white"
          }`}
        >
          <Trophy className="w-4 h-4" />
          Mes défis actifs
        </button>
      </div>

      <div className="w-full max-w-sm mx-auto flex-1">
        {/* SOLO TAB */}
        {tab === "solo" && (
          <div className="animate-fade-in space-y-5">
            {/* PHASE 1: PLAY */}
            {phase === "play" && (
              <>
                {/* Category Chips */}
                <div className="-mx-5 px-5 overflow-x-auto no-scrollbar">
                  <div className="flex gap-2 pb-1 w-max">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.slug}
                        onClick={() => handleSelectCategory(cat.slug)}
                        className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all duration-200 ${
                          category === cat.slug
                            ? "bg-volt-500 text-charcoal-900 border border-volt-500"
                            : "bg-charcoal-700 text-charcoal-400 border border-charcoal-600 hover:border-volt-500/50 hover:text-white"
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative bg-gradient-to-br from-charcoal-700 to-charcoal-800 border border-charcoal-500 rounded-3xl p-5">
                  {categoryEmpty ? (
                    <div className="text-center py-8 space-y-2">
                      <Sparkles className="w-6 h-6 text-charcoal-500 mx-auto" />
                      <p className="text-base font-bold text-charcoal-300">Bientôt disponible !</p>
                      <p className="text-xs text-charcoal-500">
                        Cette catégorie n'a pas encore de questions. Reviens bientôt !
                      </p>
                      <button
                        onClick={() => handleSelectCategory("all")}
                        className="text-volt-500 font-bold text-sm hover:underline mt-2"
                      >
                        Voir toutes les questions
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start gap-3 mb-4">
                        <Sparkles className="w-5 h-5 text-volt-500 mt-1 flex-shrink-0" />
                        <p className="text-lg font-bold leading-snug">{stat.text}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <button
                          onClick={handleRandomStat}
                          className="flex items-center gap-2 text-charcoal-400 hover:text-volt-500 transition-colors text-sm font-medium"
                        >
                          <Shuffle className="w-4 h-4" />
                          Une autre
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {!categoryEmpty && (
                  <div className="space-y-2">
                    <label className="text-charcoal-400 text-sm font-medium uppercase tracking-wider">
                      Ton estimation
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={guess}
                      onChange={(e) => setGuess(formatNumberInput(e.target.value))}
                      onKeyDown={(e) => e.key === "Enter" && parseNumberInput(guess) > 0 && handleValidate()}
                      placeholder="?"
                      className="w-full bg-charcoal-700 border border-charcoal-500 rounded-2xl px-5 py-4 text-3xl font-extrabold font-mono text-volt-500 placeholder:text-charcoal-500 focus:outline-none focus:border-volt-500 focus:ring-2 focus:ring-volt-500/30 transition-all text-center"
                    />
                    <p className="text-charcoal-400 text-xs text-center">
                      En {stat.unit}. Estime le chiffre, tu verras la réponse juste après !
                    </p>
                  </div>
                )}

                {!categoryEmpty && (
                  <button
                    onClick={handleValidate}
                    disabled={!guess || parseNumberInput(guess) <= 0}
                    className="w-full bg-volt-500 text-charcoal-900 font-bold py-4 rounded-2xl text-lg transition-all duration-300 hover:bg-volt-400 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 disabled:hover:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Check className="w-5 h-5" /> Valider mon estimation
                  </button>
                )}
              </>
            )}

            {/* PHASE 2: VERDICT */}
            {phase === "verdict" && (
              <div className="animate-slide-up space-y-5">
                {/* Question recall */}
                <div className="bg-gradient-to-br from-charcoal-700 to-charcoal-800 border border-charcoal-500 rounded-3xl p-5">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-volt-500 mt-1 flex-shrink-0" />
                    <p className="text-sm font-semibold leading-snug">{stat.text}</p>
                  </div>
                </div>

                {/* Real Answer */}
                <div className="bg-volt-500/10 border border-volt-500/30 rounded-3xl p-6 text-center animate-scale-in">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-volt-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-volt-500">
                      La Réalité
                    </span>
                  </div>
                  <p className="text-4xl font-extrabold font-mono text-volt-500 mb-1">
                    {formatNumber(stat.answer)} {stat.unit}
                  </p>
                  {stat.source && (
                    <p className="text-[11px] text-charcoal-500 mt-2">
                      Source : {stat.source}
                    </p>
                  )}
                </div>

                {/* Player's guess + score */}
                <div className="bg-charcoal-700 border border-charcoal-500 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-xs text-charcoal-400 uppercase tracking-wider mb-1">
                        Ton estimation
                      </p>
                      <p className="text-2xl font-bold font-mono text-white">
                        {formatNumber(guessNum)} {stat.unit}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-charcoal-400 uppercase tracking-wider mb-1">
                        Précision
                      </p>
                      <p className="text-3xl font-extrabold font-mono text-volt-500">
                        {formatAccuracy(accuracy)}%
                      </p>
                    </div>
                  </div>
                  <p className="text-center text-base font-bold pt-3 border-t border-charcoal-600">
                    {getReactionMessage(accuracy)}
                  </p>
                  {avgAccuracy > 0 && (
                    <div className="flex items-center justify-center gap-1.5 mt-2 text-xs text-charcoal-400">
                      <BarChartIcon className="w-3 h-3" />
                      <span>Moyenne globale : <span className="font-bold text-volt-500">{avgAccuracy.toFixed(1).replace(".", ",")}%</span></span>
                    </div>
                  )}
                </div>

                {createError && (
                  <div className="flex items-center gap-2 bg-crimson-500/10 border border-crimson-500/30 rounded-xl px-4 py-3">
                    <AlertCircle className="w-4 h-4 text-crimson-500 flex-shrink-0" />
                    <p className="text-sm text-crimson-500">{createError}</p>
                  </div>
                )}

                {/* Primary: Next question */}
                <button
                  onClick={handlePlayAgain}
                  className="w-full bg-volt-500 text-charcoal-900 font-bold py-4 rounded-2xl text-lg transition-all duration-300 hover:bg-volt-400 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <ArrowRight className="w-5 h-5" /> Question suivante
                </button>

                {/* Secondary: Launch match */}
                <button
                  onClick={handleLaunchMatch}
                  disabled={creatingMatch}
                  className="w-full bg-charcoal-700 border border-volt-500/30 text-white font-bold py-3.5 rounded-2xl text-sm transition-all duration-300 hover:bg-charcoal-600 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Trophy className="w-4 h-4 text-volt-500" /> Envie de défier des amis ? Lance un match en 5 manches
                </button>
              </div>
            )}
          </div>
        )}

        {/* TRAPS TAB */}
        {tab === "traps" && (
          <div className="animate-fade-in space-y-4">
            {loadingDuels ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-volt-500 animate-spin" />
              </div>
            ) : myDuels.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-charcoal-700 mb-2">
                  <Skull className="w-8 h-8 text-charcoal-500" />
                </div>
                <p className="text-charcoal-400 font-medium">
                  Aucun défi actif pour l'instant.
                </p>
                <button
                  onClick={() => setTab("solo")}
                  className="text-volt-500 font-bold text-sm hover:underline"
                >
                  Jouer en solo
                </button>
              </div>
            ) : (
              myDuels.map((duel) => (
                <ActiveDuelCard
                  key={duel.id}
                  duel={duel}
                  participantCount={participantCounts[duel.id] ?? 0}
                  topParticipant={topParticipants[duel.id] ?? null}
                  onView={() => navigate(`/duel/${duel.id}`)}
                  onWin={fireConfetti}
                />
              ))
            )}
          </div>
        )}
      </div>
      {showStats && <StatsModal onClose={() => setShowStats(false)} />}
    </div>
  );
}

function ActiveDuelCard({
  duel,
  participantCount,
  topParticipant,
  onView,
  onWin,
}: {
  duel: Duel;
  participantCount: number;
  topParticipant: DuelParticipant | null;
  onView: () => void;
  onWin: () => void;
}) {
  const handleClick = () => {
    if (topParticipant && topParticipant.player_name === duel.challenger_name) {
      onWin();
    }
    onView();
  };

  return (
    <div
      onClick={handleClick}
      className="bg-gradient-to-br from-charcoal-700 to-charcoal-800 border border-charcoal-500 rounded-2xl p-4 cursor-pointer hover:border-volt-500/50 transition-all duration-300 active:scale-[0.98]"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-volt-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm font-semibold leading-snug line-clamp-2">{duel.question_text}</p>
        </div>
        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-charcoal-600 text-charcoal-300 px-2 py-1 rounded-full flex-shrink-0">
          <Users className="w-3 h-3" /> {participantCount} {participantCount === 1 ? "joueur" : "joueurs"}
        </span>
      </div>

      {topParticipant && (
        <div className="flex items-center justify-between pt-2 border-t border-charcoal-600">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-volt-500" />
            <span className="text-xs text-charcoal-400">
              En tête : <span className="font-bold text-white">{topParticipant.player_name}</span>
            </span>
          </div>
          <span className="text-sm font-mono font-bold text-volt-500">
            +{formatAccuracy(Number(topParticipant.accuracy_percentage))}%
          </span>
        </div>
      )}

      {participantCount === 0 && (
        <div className="pt-2 border-t border-charcoal-600">
          <span className="text-xs text-charcoal-500">En attente de participants...</span>
        </div>
      )}

      <div className="mt-2 flex justify-end">
        <span className="text-xs text-volt-500 font-bold hover:underline">Voir le classement →</span>
      </div>
    </div>
  );
}
