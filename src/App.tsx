import { useEffect, useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { getNickname, setNickname } from "@/lib/storage";
import NicknameGate from "@/components/NicknameGate";
import Home from "@/components/Home";
import DuelScreen from "@/components/DuelScreen";
import MatchScreen from "@/components/MatchScreen";

export default function App() {
  const [nickname, setNicknameState] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = getNickname();
    setNicknameState(stored);
    setChecking(false);
  }, []);

  const handleNicknameSet = (name: string) => {
    setNickname(name);
    setNicknameState(name);
  };

  const handleEditNickname = () => {
    setNicknameState(null);
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-charcoal-900 flex items-center justify-center">
        <div className="noise-overlay" />
        <div className="w-8 h-8 rounded-lg bg-volt-500 animate-pulse" />
      </div>
    );
  }

  if (!nickname) {
    return <NicknameGate onSet={handleNicknameSet} />;
  }

  return (
    <Routes>
      <Route
        path="/"
        element={<Home nickname={nickname} onEditNickname={handleEditNickname} />}
      />
      <Route
        path="/duel/:id"
        element={<DuelScreen nickname={nickname} onEditNickname={handleEditNickname} />}
      />
      <Route
        path="/match"
        element={<MatchScreen nickname={nickname} onEditNickname={handleEditNickname} />}
      />
      <Route
        path="/match/:id"
        element={<MatchScreen nickname={nickname} onEditNickname={handleEditNickname} />}
      />
      <Route
        path="*"
        element={
          <div className="min-h-screen bg-charcoal-900 flex flex-col items-center justify-center px-5 text-center">
            <div className="noise-overlay" />
            <p className="text-charcoal-400 mb-4">Page introuvable</p>
            <button
              onClick={() => navigate("/")}
              className="bg-volt-500 text-charcoal-900 font-bold py-3 px-8 rounded-2xl hover:scale-105 transition-all"
            >
              Retour à l'accueil
            </button>
          </div>
        }
      />
    </Routes>
  );
}
