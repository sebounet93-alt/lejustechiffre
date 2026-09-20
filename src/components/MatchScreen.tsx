import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import confetti from "canvas-confetti";
import {
  Target,
  Pencil,
  Check,
  Loader2,
  AlertCircle,
  ArrowRight,
  Trophy,
  Crown,
  Share2,
  Sparkles,
  Lock,
  BarChart as BarChartIcon,
} from "lucide-react";
import { supabase, type Match, type MatchParticipant } from "@/lib/supabase";
import { STATS, type Stat, type CategorySlug, getRandomStatByCategory } from "@/data/stats";
import {
  calculateAccuracy,
  formatAccuracy,
  formatNumber,
  formatNumberInput,
  parseNumberInput,
} from "@/lib/scoring";
import {
  getNickname,
  setNickname,
  hasSubmittedMatch,
  addSubmittedMatchId,
  recordGame,
  getAverageAccuracy,
  getPlayerStats,
} from "@/lib/storage";
import ShareGrid from "@/components/ShareGrid";
import StatsModal from "@/components/StatsModal";

interface MatchScreenProps {
  nickname: string;
  onEditNickname: () => void;
}

type Screen = "loading" | "error" | "play" | "round-verdict" | "finished" | "already-played";
type CreateState = "idle" | "creating" | "created";

const MATCH_SIZE = 5;

function pick5Questions(category: CategorySlug): Stat[] {
  const pool = STATS.filter((s) => category === "all" || s.category === category);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, MATCH_SIZE);
}

export default function MatchScreen({ nickname, onEditNickname }: MatchScreenProps) {
  const navigate = useNavigate();
  const params = useParams<{ id?: string }>();
  const matchId = params.id ?? null;

  const [screen, setScreen] = useState<Screen>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [match, setMatch] = useState<Match | null>(null);
  const [questions, setQuestions] = useState<Stat[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [guesses, setGuesses] = useState<number[]>([]);
  const [accuracies, setAccuracies] = useState<number[]>([]);
  const [guessInput, setGuessInput] = useState("");
  const [roundAccuracy, setRoundAccuracy] = useState(0);
  const [participants, setParticipants] = useState<MatchParticipant[]>([]);
  const [playerName, setPlayerName] = useState(nickname);
  const [nameInput, setNameInput] = useState(nickname);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [avgAccuracy, setAvgAccuracy] = useState(() => getAverageAccuracy(getPlayerStats()));
  const [createState, setCreateState] = useState<CreateState>("idle");
  const [category, setCategory] = useState<CategorySlug>("all");

  const guessNum = parseNumberInput(guessInput);
  const currentQuestion = questions[currentRound];

  // --- Match creation (no matchId provided) ---
  const createMatch = useCallback(async () => {
    setCreateState("creating");
    const picked = pick5Questions(category);
    const questionIds = picked.map((q) => q.id);

    const { data, error } = await supabase
      .from("matches")
      .insert({ question_ids: questionIds })
      .select()
      .maybeSingle();

    if (error || !data) {
      setCreateState("idle");
      setErrorMsg("Erreur lors de la création du match. Réessaie.");
      setScreen("error");
      return;
    }

    const newMatch = data as Match;
    setMatch(newMatch);
    setQuestions(picked);
    setScreen("play");
    setCreateState("created");
  }, [category]);

  // --- Load existing match ---
  useEffect(() => {
    if (matchId) {
      (async () => {
        const { data, error } = await supabase
          .from("matches")
          .select("*")
          .eq("id", matchId)
          .maybeSingle();

        if (error || !data) {
          setErrorMsg("Ce match n'existe pas ou a expiré.");
          setScreen("error");
          return;
        }

        const m = data as Match;
        const ids = m.question_ids as number[];
        const qs = ids.map((id) => STATS.find((s) => s.id === id)).filter(Boolean) as Stat[];
        if (qs.length !== MATCH_SIZE) {
          setErrorMsg("Questions introuvables pour ce match.");
          setScreen("error");
          return;
        }

        setMatch(m);
        setQuestions(qs);

        if (hasSubmittedMatch(m.id)) {
          const { data: parts } = await supabase
            .from("match_participants")
            .select("*")
            .eq("match_id", m.id)
            .order("average_accuracy", { ascending: false });
          setParticipants((parts ?? []) as MatchParticipant[]);
          setScreen("already-played");
        } else {
          setScreen("play");
        }
      })();
    } else {
      createMatch();
    }
  }, [matchId, createMatch]);

  const handleValidateRound = () => {
    if (!guessNum || guessNum <= 0 || !currentQuestion) return;
    const acc = calculateAccuracy(guessNum, currentQuestion.answer);
    const newGuesses = [...guesses, guessNum];
    const newAccuracies = [...accuracies, acc];
    setGuesses(newGuesses);
    setAccuracies(newAccuracies);
    setRoundAccuracy(acc);
    setScreen("round-verdict");
  };

  const handleNextRound = () => {
    setGuessInput("");
    if (currentRound + 1 < MATCH_SIZE) {
      setCurrentRound(currentRound + 1);
      setScreen("play");
    } else {
      setScreen("finished");
    }
  };

  const handleSubmitMatch = async () => {
    if (!match || !playerName.trim()) return;
    setSubmitting(true);
    setSubmitError(null);

    const avg = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;
    const roundedAvg = Math.round(avg * 10) / 10;

    const { error } = await supabase.from("match_participants").insert({
      match_id: match.id,
      player_name: playerName.trim(),
      guesses: guesses,
      accuracies: accuracies,
      average_accuracy: roundedAvg,
    });

    if (error) {
      setSubmitting(false);
      setSubmitError("Erreur lors de l'enregistrement. Réessaie.");
      return;
    }

    addSubmittedMatchId(match.id);

    const { data: parts } = await supabase
      .from("match_participants")
      .select("*")
      .eq("match_id", match.id)
      .order("average_accuracy", { ascending: false });
    setParticipants((parts ?? []) as MatchParticipant[]);

    // Update local stats for each round
    accuracies.forEach((acc) => recordGame(acc));
    setAvgAccuracy(getAverageAccuracy(getPlayerStats()));

    setSubmitting(false);
    setScreen("finished");

    if (roundedAvg >= 80) {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#22c55e", "#ffffff", "#22c55e"],
      });
    }
  };

  const handleNameSubmit = () => {
    const trimmed = nameInput.trim();
    if (trimmed.length < 2) return;
    setPlayerName(trimmed);
    setNickname(trimmed);
  };

  // --- Derived values ---
  const matchUrl = match ? `${window.location.origin}/match/${match.id}` : "";
  const myAverage = accuracies.length > 0
    ? accuracies.reduce((a, b) => a + b, 0) / accuracies.length
    : 0;

  const shareText = match
    ? `J'ai fait ${formatAccuracy(Math.round(myAverage * 10) / 10)}% sur ce match de 5 chiffres sur Le Juste Chiffre ! Viens me battre : ${matchUrl}`
    : "";

  // --- Loading ---
  if (screen === "loading") {
    return (
      <div className="relative min-h-screen w-full bg-charcoal-900 flex flex-col items-center justify-center">
        <div className="noise-overlay" />
        <Loader2 className="w-10 h-10 text-volt-500 animate-spin" />
        <p className="text-charcoal-400 text-sm mt-4">
          {createState === "creating" ? "Création du match..." : "Chargement du match..."}
        </p>
      </div>
    );
  }

  // --- Error ---
  if (screen === "error") {
    return (
      <div className="relative min-h-screen w-full bg-charcoal-900 flex flex-col items-center justify-center px-5">
        <div className="noise-overlay" />
        <AlertCircle className="w-10 h-10 text-crimson-500 mb-4" />
        <p className="text-charcoal-300 text-center mb-6">{errorMsg}</p>
        <button
          onClick={() => navigate("/")}
          className="bg-volt-500 text-charcoal-900 font-bold py-3 px-8 rounded-2xl hover:scale-105 transition-all"
        >
          Retour à l'accueil
        </button>
      </div>
    );
  }

  // --- Already played ---
  if (screen === "already-played" && match) {
    return (
      <div className="relative min-h-screen w-full bg-charcoal-900 flex flex-col px-5 pt-6 pb-8">
        <div className="noise-overlay" />
        {renderHeader(nickname, onEditNickname, () => setShowStats(true))}
        <div className="w-full max-w-sm mx-auto flex-1 flex flex-col items-center justify-center text-center space-y-6">
          <Lock className="w-10 h-10 text-charcoal-500" />
          <p className="text-charcoal-300 font-medium">Tu as déjà participé à ce match.</p>
          <Leaderboard participants={participants} playerName={playerName} />
          <ShareGrid url={matchUrl} text={shareText} />
          <button
            onClick={() => navigate("/")}
            className="text-volt-500 font-bold text-sm hover:underline"
          >
            Retour à l'accueil
          </button>
        </div>
        {showStats && <StatsModal onClose={() => setShowStats(false)} />}
      </div>
    );
  }

  // --- Finished (recap + leaderboard) ---
  if (screen === "finished" && match) {
    return (
      <div className="relative min-h-screen w-full bg-charcoal-900 flex flex-col px-5 pt-6 pb-8">
        <div className="noise-overlay" />
        {renderHeader(nickname, onEditNickname, () => setShowStats(true))}
        <div className="w-full max-w-sm mx-auto flex-1 space-y-5 animate-slide-up">
          {/* Score recap */}
          <div className="text-center space-y-2 pt-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-volt-500/10 border-2 border-volt-500 mb-2">
              <Trophy className="w-8 h-8 text-volt-500" />
            </div>
            <h2 className="text-2xl font-extrabold">Match terminé !</h2>
            <p className="text-charcoal-400 text-sm">5 manches jouées</p>
          </div>

          <div className="bg-volt-500/10 border border-volt-500/30 rounded-3xl p-6 text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-volt-500 mb-2">
              Ta précision moyenne
            </p>
            <p className="text-5xl font-extrabold font-mono text-volt-500">
              {formatAccuracy(Math.round(myAverage * 10) / 10)}%
            </p>
            {avgAccuracy > 0 && (
              <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-charcoal-400">
                <BarChartIcon className="w-3 h-3" />
                <span>Moyenne globale : <span className="font-bold text-volt-500">{avgAccuracy.toFixed(1).replace(".", ",")}%</span></span>
              </div>
            )}
          </div>

          {/* Need name? */}
          {(!playerName || playerName.trim().length < 2) ? (
            <div className="space-y-3">
              <label className="text-charcoal-400 text-sm font-medium uppercase tracking-wider">
                Ton pseudo pour le classement
              </label>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && nameInput.trim().length >= 2 && handleNameSubmit()}
                placeholder="Sébastien"
                maxLength={20}
                className="w-full bg-charcoal-700 border border-charcoal-500 rounded-2xl px-5 py-4 text-xl font-bold text-white placeholder:text-charcoal-500 focus:outline-none focus:border-volt-500 focus:ring-2 focus:ring-volt-500/30 transition-all"
              />
              <button
                onClick={handleNameSubmit}
                disabled={nameInput.trim().length < 2}
                className="w-full bg-volt-500 text-charcoal-900 font-bold py-4 rounded-2xl text-lg disabled:opacity-30 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Confirmer mon pseudo
              </button>
            </div>
          ) : participants.length === 0 ? (
            <button
              onClick={handleSubmitMatch}
              disabled={submitting}
              className="w-full bg-volt-500 text-charcoal-900 font-bold py-4 rounded-2xl text-lg disabled:opacity-50 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Enregistrement...</> : <><Check className="w-5 h-5" /> Enregistrer mon score</>}
            </button>
          ) : (
            <>
              {submitError && (
                <div className="flex items-center gap-2 bg-crimson-500/10 border border-crimson-500/30 rounded-xl px-4 py-3">
                  <AlertCircle className="w-4 h-4 text-crimson-500 flex-shrink-0" />
                  <p className="text-sm text-crimson-500">{submitError}</p>
                </div>
              )}

              <Leaderboard participants={participants} playerName={playerName} />

              {/* Share section */}
              <div className="space-y-3">
                <div className="bg-charcoal-700 border border-charcoal-500 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Share2 className="w-4 h-4 text-volt-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-charcoal-400">
                      Défie tes potes
                    </span>
                  </div>
                  <p className="text-xs font-mono text-charcoal-300 break-all leading-relaxed">
                    {matchUrl}
                  </p>
                </div>
                <ShareGrid url={matchUrl} text={shareText} />
              </div>

              <button
                onClick={() => navigate("/")}
                className="w-full text-charcoal-400 hover:text-white font-medium py-3 text-sm transition-colors"
              >
                Retour à l'accueil
              </button>
            </>
          )}
        </div>
        {showStats && <StatsModal onClose={() => setShowStats(false)} />}
      </div>
    );
  }

  // --- Play or round-verdict ---
  const isLastRound = currentRound === MATCH_SIZE - 1;

  return (
    <div className="relative min-h-screen w-full bg-charcoal-900 flex flex-col px-5 pt-6 pb-8">
      <div className="noise-overlay" />
      {renderHeader(nickname, onEditNickname, () => setShowStats(true))}

      <div className="w-full max-w-sm mx-auto flex-1 space-y-5">
        {/* Progress bar */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: MATCH_SIZE }).map((_, i) => (
            <div
              key={i}
              className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                i < currentRound
                  ? "bg-volt-500"
                  : i === currentRound
                  ? "bg-volt-500/60"
                  : "bg-charcoal-600"
              }`}
            />
          ))}
        </div>
        <p className="text-center text-sm font-bold text-charcoal-400">
          Manche {currentRound + 1} / {MATCH_SIZE}
        </p>

        {screen === "play" && currentQuestion && (
          <div className="animate-fade-in space-y-5">
            <div className="relative bg-gradient-to-br from-charcoal-700 to-charcoal-800 border border-charcoal-500 rounded-3xl p-5">
              <div className="flex items-start gap-3 mb-4">
                <Sparkles className="w-5 h-5 text-volt-500 mt-1 flex-shrink-0" />
                <p className="text-lg font-bold leading-snug">{currentQuestion.text}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-charcoal-400 text-sm font-medium uppercase tracking-wider">
                Ton estimation
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={guessInput}
                onChange={(e) => setGuessInput(formatNumberInput(e.target.value))}
                onKeyDown={(e) => e.key === "Enter" && guessNum > 0 && handleValidateRound()}
                placeholder="?"
                autoFocus
                className="w-full bg-charcoal-700 border border-charcoal-500 rounded-2xl px-5 py-4 text-3xl font-extrabold font-mono text-volt-500 placeholder:text-charcoal-500 focus:outline-none focus:border-volt-500 focus:ring-2 focus:ring-volt-500/30 transition-all text-center"
              />
              <p className="text-charcoal-400 text-xs text-center">
                En {currentQuestion.unit}. Estime le chiffre !
              </p>
            </div>

            <button
              onClick={handleValidateRound}
              disabled={!guessNum || guessNum <= 0}
              className="w-full bg-volt-500 text-charcoal-900 font-bold py-4 rounded-2xl text-lg transition-all duration-300 hover:bg-volt-400 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 disabled:hover:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" /> Valider
            </button>
          </div>
        )}

        {screen === "round-verdict" && currentQuestion && (
          <div className="animate-slide-up space-y-5">
            {/* Real answer */}
            <div className="bg-volt-500/10 border border-volt-500/30 rounded-3xl p-6 text-center animate-scale-in">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-volt-500">
                  La Réalité
                </span>
              </div>
              <p className="text-4xl font-extrabold font-mono text-volt-500 mb-1">
                {formatNumber(currentQuestion.answer)} {currentQuestion.unit}
              </p>
              {currentQuestion.source && (
                <p className="text-[11px] text-charcoal-500 mt-2">
                  Source : {currentQuestion.source}
                </p>
              )}
            </div>

            {/* Round score */}
            <div className="bg-charcoal-700 border border-charcoal-500 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-charcoal-400 uppercase tracking-wider mb-1">
                    Ton estimation
                  </p>
                  <p className="text-2xl font-bold font-mono text-white">
                    {formatNumber(guesses[currentRound])} {currentQuestion.unit}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-charcoal-400 uppercase tracking-wider mb-1">
                    Précision
                  </p>
                  <p className="text-3xl font-extrabold font-mono text-volt-500">
                    {formatAccuracy(roundAccuracy)}%
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleNextRound}
              className="w-full bg-volt-500 text-charcoal-900 font-bold py-4 rounded-2xl text-lg transition-all duration-300 hover:bg-volt-400 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {isLastRound ? (
                <>Voir le résultat final <Trophy className="w-5 h-5" /></>
              ) : (
                <>Manche suivante ({currentRound + 2}/{MATCH_SIZE}) <ArrowRight className="w-5 h-5" /></>
              )}
            </button>
          </div>
        )}
      </div>
      {showStats && <StatsModal onClose={() => setShowStats(false)} />}
    </div>
  );
}

function renderHeader(
  nickname: string,
  onEditNickname: () => void,
  onShowStats: () => void
) {
  return (
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
          onClick={onShowStats}
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
  );
}

function Leaderboard({ participants, playerName }: { participants: MatchParticipant[]; playerName: string }) {
  if (participants.length === 0) {
    return (
      <div className="text-center py-8 space-y-2">
        <Trophy className="w-8 h-8 text-charcoal-500 mx-auto" />
        <p className="text-charcoal-400 text-sm">Aucun participant pour l'instant.</p>
        <p className="text-charcoal-500 text-xs">Sois le premier à défier tes potes !</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-extrabold flex items-center gap-2">
        <Trophy className="w-5 h-5 text-volt-500" /> Classement
      </h3>
      <div className="space-y-2">
        {participants.map((p, i) => {
          const isCurrentUser = p.player_name === playerName;
          const medals = ["🥇", "🥈", "🥉"];
          return (
            <div
              key={p.id}
              className={`flex items-center gap-3 rounded-2xl p-3 border transition-all ${
                isCurrentUser
                  ? "bg-volt-500/10 border-volt-500/40"
                  : "bg-charcoal-700 border-charcoal-600"
              }`}
            >
              <span className="text-xl w-7 text-center flex-shrink-0">
                {i < 3 ? medals[i] : <span className="text-charcoal-400 text-sm font-bold">{i + 1}</span>}
              </span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold truncate ${isCurrentUser ? "text-volt-500" : "text-white"}`}>
                  {p.player_name} {isCurrentUser && "(toi)"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-extrabold font-mono text-volt-500">
                  {formatAccuracy(Number(p.average_accuracy))}%
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
