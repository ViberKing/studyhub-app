"use client";

import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import AppShell from "@/components/AppShell";

/* ─── types ─── */
interface Deck {
  id: number;
  user_id?: string;
  name: string;
  module: string;
  created_at?: string;
}
interface Card {
  id: number;
  deck_id: number;
  user_id?: string;
  term: string;
  definition: string;
  hint: string;
  starred: boolean;
  status: "new" | "learning" | "known";
  created_at?: string;
}

type Mode = "flashcards" | "learn" | "match" | "test" | "cards";

/* ─── string helpers ─── */
function editDistance(a: string, b: string): number {
  const m = a.length,
    n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}

function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - editDistance(a, b) / maxLen;
}

function answerMatches(typed: string, expected: string): boolean {
  if (!typed || !expected) return false;
  typed = typed.trim().toLowerCase();
  expected = expected.trim().toLowerCase();
  if (typed === expected) return true;
  const normalize = (s: string) =>
    s
      .replace(/[.,;:!?'"()\-\u2014\u2013]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  const tNorm = normalize(typed);
  const eNorm = normalize(expected);
  if (tNorm === eNorm) return true;
  if (Math.abs(tNorm.length - eNorm.length) < eNorm.length * 0.4 && similarity(tNorm, eNorm) >= 0.85) return true;
  const stop = new Set(["the", "a", "an", "of", "to", "in", "is", "are", "and", "or", "for", "with", "by", "on", "at"]);
  const words = (s: string) => s.split(" ").filter((w) => w.length > 2 && !stop.has(w));
  const tWords = words(tNorm);
  const eWords = words(eNorm);
  if (eWords.length === 0 || tWords.length === 0) return false;
  const matched = tWords.filter((w) => eWords.includes(w)).length;
  return matched >= eWords.length * 0.7 && matched >= tWords.length * 0.6;
}

/* ─── shuffle helper ─── */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ─── demo data ─── */
const demoDecks: Deck[] = [
  { id: 1, name: "Plato \u2014 Republic", module: "PH1011" },
  { id: 2, name: "IR theories", module: "IR2001" },
];

const demoCards: Card[] = [
  { id: 1001, deck_id: 1, term: "Theory of Forms", definition: "Plato\u2019s view that abstract Forms (perfect ideals) are more real than physical objects.", hint: "Perfect ideals beyond physical reality", starred: true, status: "known" },
  { id: 1002, deck_id: 1, term: "Allegory of the Cave", definition: "Prisoners see only shadows on a wall; the philosopher leaves the cave to see true reality.", hint: "Shadows vs reality", starred: false, status: "learning" },
  { id: 1003, deck_id: 1, term: "Philosopher King", definition: "A ruler with both wisdom and power, ideal in Plato\u2019s Republic.", hint: "Wise ruler", starred: false, status: "new" },
  { id: 1004, deck_id: 1, term: "Tripartite soul", definition: "Plato\u2019s division of the soul into reason, spirit, and appetite.", hint: "Three parts of the soul", starred: false, status: "new" },
  { id: 1005, deck_id: 1, term: "Noble lie", definition: "A myth told by rulers to maintain social harmony in the ideal state.", hint: "", starred: false, status: "new" },
  { id: 1006, deck_id: 1, term: "Form of the Good", definition: "The highest Form, the source of all reality and knowledge \u2014 like the sun in the cave allegory.", hint: "Highest Form", starred: true, status: "learning" },
  { id: 1007, deck_id: 1, term: "Three classes of citizens", definition: "Producers, auxiliaries (warriors), and guardians (rulers).", hint: "", starred: false, status: "new" },
  { id: 2001, deck_id: 2, term: "Realism", definition: "States act in self-interest; the international system is anarchic and power-driven.", hint: "Self-interest, anarchy", starred: false, status: "known" },
  { id: 2002, deck_id: 2, term: "Liberalism", definition: "Cooperation is possible through institutions, interdependence, and shared values.", hint: "Cooperation, institutions", starred: false, status: "learning" },
  { id: 2003, deck_id: 2, term: "Constructivism", definition: "International relations are shaped by ideas, identities, and norms \u2014 not just material power.", hint: "Ideas and norms", starred: true, status: "new" },
  { id: 2004, deck_id: 2, term: "Marxism in IR", definition: "Focuses on economic class struggle and how capitalism shapes global politics.", hint: "Class and capitalism", starred: false, status: "new" },
  { id: 2005, deck_id: 2, term: "Hegemonic stability", definition: "A single dominant power maintains international order and provides global public goods.", hint: "", starred: false, status: "new" },
  { id: 2006, deck_id: 2, term: "Security dilemma", definition: "When one state\u2019s defensive measures make others feel less secure, escalating tension.", hint: "Defensive moves cause fear", starred: false, status: "new" },
];

/* ─── Main inner component ─── */
function FlashcardsInner() {
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";
  const supabase = createClient();

  /* ─── global state ─── */
  const [decks, setDecks] = useState<Deck[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [openDeckId, setOpenDeckId] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>("flashcards");
  const [userId, setUserId] = useState<string | null>(null);

  /* deck form */
  const [newDeckName, setNewDeckName] = useState("");
  const [newDeckModule, setNewDeckModule] = useState("");

  /* card form */
  const [newTerm, setNewTerm] = useState("");
  const [newDef, setNewDef] = useState("");
  const [newHint, setNewHint] = useState("");

  /* flashcard review */
  const [reviewIdx, setReviewIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [starredOnly, setStarredOnly] = useState(false);

  /* learn */
  const [learnQueue, setLearnQueue] = useState<Card[]>([]);
  const [learnPhase, setLearnPhase] = useState<"mc" | "written">("mc");
  const [learnOptions, setLearnOptions] = useState<string[]>([]);
  const [learnAnswer, setLearnAnswer] = useState("");
  const [learnFeedback, setLearnFeedback] = useState<null | { correct: boolean; answer: string }>(null);
  const [learnDone, setLearnDone] = useState(false);

  /* match */
  interface MatchTile { id: string; cardId: number; text: string; type: "term" | "def"; matched: boolean; selected: boolean; wrong: boolean; }
  const [matchTiles, setMatchTiles] = useState<MatchTile[]>([]);
  const [matchFirst, setMatchFirst] = useState<string | null>(null);
  const [matchDone, setMatchDone] = useState(false);
  const [matchTime, setMatchTime] = useState(0);
  const matchTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* test */
  interface TestQ { card: Card; type: "mc" | "written"; options?: string[]; answer: string; }
  const [testQuestions, setTestQuestions] = useState<TestQ[]>([]);
  const [testAnswers, setTestAnswers] = useState<Record<number, string>>({});
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testResults, setTestResults] = useState<{ correct: boolean; correctAnswer: string }[]>([]);
  const [testScore, setTestScore] = useState(0);

  /* ─── load user / decks ─── */
  useEffect(() => {
    if (isDemo) {
      setDecks(demoDecks);
      setCards(demoCards.map((c) => ({ ...c })));
      return;
    }
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      setUserId(session.user.id);
      const { data } = await supabase.from("decks").select("*").eq("user_id", session.user.id);
      if (data) setDecks(data);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemo]);

  /* ─── load cards when deck opens ─── */
  const openDeck = useCallback(
    async (deckId: number) => {
      setOpenDeckId(deckId);
      setMode("flashcards");
      setReviewIdx(0);
      setFlipped(false);
      setStarredOnly(false);
      if (isDemo) return; // cards already loaded
      const { data } = await supabase.from("cards").select("*").eq("deck_id", deckId);
      if (data) setCards((prev) => [...prev.filter((c) => c.deck_id !== deckId), ...data]);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isDemo]
  );

  /* ─── helpers ─── */
  const deckCards = cards.filter((c) => c.deck_id === openDeckId);
  const reviewCards = (() => {
    let pool = starredOnly ? deckCards.filter((c) => c.starred) : deckCards;
    const order: Record<string, number> = { new: 0, learning: 1, known: 2 };
    pool = [...pool].sort((a, b) => (order[a.status] ?? 0) - (order[b.status] ?? 0));
    return pool;
  })();
  const currentDeck = decks.find((d) => d.id === openDeckId);

  /* ─── persist card field ─── */
  const updateCard = useCallback(
    async (cardId: number, patch: Partial<Card>) => {
      setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, ...patch } : c)));
      if (!isDemo) {
        await supabase.from("cards").update(patch).eq("id", cardId);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isDemo]
  );

  /* ─── deck CRUD ─── */
  const createDeck = async () => {
    if (!newDeckName.trim()) return;
    if (isDemo) {
      const id = Date.now();
      setDecks((prev) => [...prev, { id, name: newDeckName, module: newDeckModule }]);
    } else {
      const { data } = await supabase.from("decks").insert({ user_id: userId, name: newDeckName, module: newDeckModule }).select().single();
      if (data) setDecks((prev) => [...prev, data]);
    }
    setNewDeckName("");
    setNewDeckModule("");
  };

  const deleteDeck = async (id: number) => {
    if (!confirm("Delete this deck and all its cards?")) return;
    setDecks((prev) => prev.filter((d) => d.id !== id));
    setCards((prev) => prev.filter((c) => c.deck_id !== id));
    if (!isDemo) {
      await supabase.from("cards").delete().eq("deck_id", id);
      await supabase.from("decks").delete().eq("id", id);
    }
  };

  /* ─── card CRUD ─── */
  const addCard = async () => {
    if (!newTerm.trim() || !newDef.trim() || !openDeckId) return;
    const card: Card = { id: isDemo ? Date.now() : 0, deck_id: openDeckId, term: newTerm, definition: newDef, hint: newHint, starred: false, status: "new" };
    if (isDemo) {
      setCards((prev) => [...prev, card]);
    } else {
      const { data } = await supabase.from("cards").insert({ deck_id: openDeckId, user_id: userId, term: newTerm, definition: newDef, hint: newHint, starred: false, status: "new" }).select().single();
      if (data) setCards((prev) => [...prev, data]);
    }
    setNewTerm("");
    setNewDef("");
    setNewHint("");
  };

  const deleteCard = async (id: number) => {
    setCards((prev) => prev.filter((c) => c.id !== id));
    if (!isDemo) await supabase.from("cards").delete().eq("id", id);
  };

  const bulkImport = async () => {
    const text = prompt("Paste cards (one per line). Separate term and definition with tab, comma, semicolon, or \" - \".");
    if (!text || !openDeckId) return;
    const lines = text.split("\n").filter((l) => l.trim());
    const newCards: Omit<Card, "id" | "created_at">[] = [];
    for (const line of lines) {
      let parts: string[] = [];
      if (line.includes("\t")) parts = line.split("\t");
      else if (line.includes(";")) parts = line.split(";");
      else if (line.includes(" - ")) parts = line.split(" - ");
      else parts = line.split(",");
      if (parts.length >= 2) {
        newCards.push({ deck_id: openDeckId, user_id: userId ?? undefined, term: parts[0].trim(), definition: parts.slice(1).join(",").trim(), hint: "", starred: false, status: "new" });
      }
    }
    if (newCards.length === 0) return;
    if (isDemo) {
      setCards((prev) => [...prev, ...newCards.map((c, i) => ({ ...c, id: Date.now() + i } as Card))]);
    } else {
      const { data } = await supabase.from("cards").insert(newCards).select();
      if (data) setCards((prev) => [...prev, ...data]);
    }
  };

  /* ─── Flashcard mode keyboard ─── */
  useEffect(() => {
    if (openDeckId === null || mode !== "flashcards") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === " ") { e.preventDefault(); setFlipped((f) => !f); }
      if (e.key === "ArrowLeft") setReviewIdx((i) => Math.max(0, i - 1));
      if (e.key === "ArrowRight") setReviewIdx((i) => Math.min(reviewCards.length - 1, i + 1));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [openDeckId, mode, reviewCards.length]);

  /* ─── rate card ─── */
  const rateCard = (gotIt: boolean) => {
    const card = reviewCards[reviewIdx];
    if (!card) return;
    if (gotIt) {
      const next = card.status === "new" ? "learning" : card.status === "learning" ? "known" : "known";
      updateCard(card.id, { status: next });
    } else {
      updateCard(card.id, { status: "new" });
    }
    setFlipped(false);
    if (reviewIdx < reviewCards.length - 1) setReviewIdx((i) => i + 1);
  };

  /* ─── Learn mode helpers ─── */
  const startLearn = () => {
    const pool = deckCards.filter((c) => c.status !== "known");
    if (pool.length === 0) { setLearnDone(true); return; }
    setLearnQueue(shuffle(pool));
    setLearnPhase("mc");
    setLearnFeedback(null);
    setLearnAnswer("");
    setLearnDone(false);
    generateMcOptions(pool[0], deckCards);
  };

  const generateMcOptions = (card: Card, all: Card[]) => {
    const wrongs = shuffle(all.filter((c) => c.id !== card.id)).slice(0, 3).map((c) => c.definition);
    setLearnOptions(shuffle([card.definition, ...wrongs]));
  };

  useEffect(() => {
    if (mode === "learn") startLearn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const learnSelect = (answer: string) => {
    if (learnFeedback) return;
    const card = learnQueue[0];
    const correct = answer === card.definition;
    setLearnFeedback({ correct, answer: card.definition });
    if (correct) updateCard(card.id, { status: "learning" });
  };

  const learnSubmitWritten = () => {
    if (learnFeedback) return;
    const card = learnQueue[0];
    const correct = answerMatches(learnAnswer, card.definition);
    setLearnFeedback({ correct, answer: card.definition });
    if (correct) updateCard(card.id, { status: "known" });
  };

  const learnContinue = () => {
    const card = learnQueue[0];
    const wasCorrect = learnFeedback?.correct;
    setLearnFeedback(null);
    setLearnAnswer("");

    if (learnPhase === "mc" && wasCorrect) {
      // move to written phase for this card
      setLearnPhase("written");
      return;
    }
    if (learnPhase === "mc" && !wasCorrect) {
      // put card at back
      setLearnQueue((q) => [...q.slice(1), q[0]]);
      const next = learnQueue[1] || learnQueue[0];
      setLearnPhase("mc");
      generateMcOptions(next, deckCards);
      return;
    }
    // written phase done
    const remaining = learnQueue.slice(1);
    if (!wasCorrect) {
      // put at back, restart from mc
      const requeue = [...remaining, { ...card, status: "new" as const }];
      setLearnQueue(requeue);
      setLearnPhase("mc");
      if (requeue.length > 0) generateMcOptions(requeue[0], deckCards);
      else setLearnDone(true);
      return;
    }
    // correct written -> card known, remove from queue
    if (remaining.length === 0) { setLearnDone(true); return; }
    setLearnQueue(remaining);
    setLearnPhase("mc");
    generateMcOptions(remaining[0], deckCards);
  };

  /* ─── Match mode ─── */
  const startMatch = () => {
    if (deckCards.length < 3) return;
    const pool = shuffle(deckCards).slice(0, 6);
    const tiles: MatchTile[] = shuffle([
      ...pool.map((c) => ({ id: `t-${c.id}`, cardId: c.id, text: c.term, type: "term" as const, matched: false, selected: false, wrong: false })),
      ...pool.map((c) => ({ id: `d-${c.id}`, cardId: c.id, text: c.definition, type: "def" as const, matched: false, selected: false, wrong: false })),
    ]);
    setMatchTiles(tiles);
    setMatchFirst(null);
    setMatchDone(false);
    setMatchTime(0);
    if (matchTimerRef.current) clearInterval(matchTimerRef.current);
    matchTimerRef.current = setInterval(() => setMatchTime((t) => t + 0.25), 250);
  };

  useEffect(() => {
    if (mode === "match") startMatch();
    return () => { if (matchTimerRef.current) clearInterval(matchTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const clickMatchTile = (tileId: string) => {
    const tile = matchTiles.find((t) => t.id === tileId);
    if (!tile || tile.matched) return;

    if (!matchFirst) {
      setMatchFirst(tileId);
      setMatchTiles((prev) => prev.map((t) => (t.id === tileId ? { ...t, selected: true } : t)));
      return;
    }

    if (matchFirst === tileId) {
      setMatchFirst(null);
      setMatchTiles((prev) => prev.map((t) => (t.id === tileId ? { ...t, selected: false } : t)));
      return;
    }

    const first = matchTiles.find((t) => t.id === matchFirst)!;
    if (first.cardId === tile.cardId && first.type !== tile.type) {
      // match!
      const updated = matchTiles.map((t) =>
        t.id === first.id || t.id === tile.id ? { ...t, matched: true, selected: false } : t
      );
      setMatchTiles(updated);
      setMatchFirst(null);
      if (updated.every((t) => t.matched)) {
        setMatchDone(true);
        if (matchTimerRef.current) clearInterval(matchTimerRef.current);
      }
    } else {
      // wrong
      setMatchTiles((prev) =>
        prev.map((t) => (t.id === first.id || t.id === tile.id ? { ...t, wrong: true, selected: false } : t))
      );
      setMatchFirst(null);
      setTimeout(() => {
        setMatchTiles((prev) => prev.map((t) => ({ ...t, wrong: false, selected: false })));
      }, 600);
    }
  };

  /* ─── Test mode ─── */
  const startTest = () => {
    const pool = shuffle(deckCards).slice(0, 10);
    const qs: TestQ[] = pool.map((card, i) => {
      const type = i % 2 === 0 ? "mc" : "written";
      const options =
        type === "mc"
          ? shuffle([card.definition, ...shuffle(deckCards.filter((c) => c.id !== card.id)).slice(0, 3).map((c) => c.definition)])
          : undefined;
      return { card, type, options, answer: "" };
    });
    setTestQuestions(qs);
    setTestAnswers({});
    setTestSubmitted(false);
    setTestResults([]);
    setTestScore(0);
  };

  useEffect(() => {
    if (mode === "test") startTest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const submitTest = () => {
    const results = testQuestions.map((q, i) => {
      const given = testAnswers[i] || "";
      const correct = q.type === "mc" ? given === q.card.definition : answerMatches(given, q.card.definition);
      return { correct, correctAnswer: q.card.definition };
    });
    setTestResults(results);
    setTestScore(results.filter((r) => r.correct).length);
    setTestSubmitted(true);
  };

  /* ─── Render ─── */
  const knownCount = (deckId: number) => cards.filter((c) => c.deck_id === deckId && c.status === "known").length;
  const cardCount = (deckId: number) => cards.filter((c) => c.deck_id === deckId).length;
  const starredCount = deckCards.filter((c) => c.starred).length;
  const newCount = deckCards.filter((c) => c.status === "new").length;
  const learningCount = deckCards.filter((c) => c.status === "learning").length;
  const knownCountDeck = deckCards.filter((c) => c.status === "known").length;

  /* ─── Deck list view ─── */
  if (openDeckId === null) {
    return (
      <>
        <h2 className="font-serif" style={{ fontSize: 32, marginBottom: 20 }}>Flashcards</h2>

        {/* New deck form */}
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 12 }}>New Deck</h3>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input placeholder="Deck name" value={newDeckName} onChange={(e) => setNewDeckName(e.target.value)} style={{ flex: 2, minWidth: 160 }} />
            <input placeholder="Module (e.g. PH1011)" value={newDeckModule} onChange={(e) => setNewDeckModule(e.target.value)} style={{ flex: 1, minWidth: 120 }} />
            <button className="btn-grad" onClick={createDeck}>Create deck</button>
          </div>
        </div>

        {/* Deck list */}
        {decks.map((deck) => {
          const total = cardCount(deck.id);
          const known = knownCount(deck.id);
          const pct = total > 0 ? Math.round((known / total) * 100) : 0;
          return (
            <div className="card" key={deck.id} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div>
                  <strong>{deck.name}</strong>
                  <span style={{ marginLeft: 8, opacity: 0.6 }}>{deck.module}</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn" onClick={() => openDeck(deck.id)}>Open</button>
                  <button className="btn-ghost" onClick={() => deleteDeck(deck.id)}>Delete</button>
                </div>
              </div>
              <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 6 }}>{total} cards &middot; {known} known</div>
              <div className="progress-bar"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
            </div>
          );
        })}
        {decks.length === 0 && <p style={{ opacity: 0.6 }}>No decks yet. Create one above!</p>}
      </>
    );
  }

  /* ─── Deck detail view ─── */
  return (
    <div className="deck-detail">
      <button className="back-btn" onClick={() => { setOpenDeckId(null); setStarredOnly(false); }}>&larr; All decks</button>
      <h2 className="font-serif" style={{ fontSize: 28, marginBottom: 4 }}>{currentDeck?.name}</h2>
      <div style={{ fontSize: 14, opacity: 0.7, marginBottom: 12 }}>
        {currentDeck?.module} &middot; {deckCards.length} cards &middot; {starredCount} starred
      </div>

      <button className={`btn-ghost${starredOnly ? " active" : ""}`} style={{ marginBottom: 16 }} onClick={() => { setStarredOnly((s) => !s); setReviewIdx(0); setFlipped(false); }}>
        {starredOnly ? "\u2605 Starred only" : "\u2606 Study starred only"}
      </button>

      {/* Mode tabs */}
      <div className="mode-tabs">
        {(["flashcards", "learn", "match", "test", "cards"] as Mode[]).map((m) => (
          <button key={m} className={`mode-tab${mode === m ? " active" : ""}`} onClick={() => setMode(m)}>
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>

      {/* ────── FLASHCARDS MODE ────── */}
      {mode === "flashcards" && (
        <div className="qz-review">
          {reviewCards.length === 0 ? (
            <p style={{ textAlign: "center", padding: 40 }}>No cards to review.</p>
          ) : (
            <>
              <div className="qz-progress">
                <span className="qz-counter">{reviewIdx + 1} / {reviewCards.length}</span>
                <div className="qz-progress-bar"><div className="qz-progress-fill" style={{ width: `${((reviewIdx + 1) / reviewCards.length) * 100}%` }} /></div>
                <button className="qz-shuffle" onClick={() => { setReviewIdx(0); setFlipped(false); setCards((prev) => { const others = prev.filter((c) => c.deck_id !== openDeckId); const mine = shuffle(prev.filter((c) => c.deck_id === openDeckId)); return [...others, ...mine]; }); }}>
                  Shuffle
                </button>
              </div>

              <div className="qz-card-wrap" onClick={() => setFlipped((f) => !f)}>
                <div className={`qz-card${flipped ? " flipped" : ""}`}>
                  <div className="qz-face qz-front">
                    <button className={`card-star${reviewCards[reviewIdx]?.starred ? " starred" : ""}`} onClick={(e) => { e.stopPropagation(); updateCard(reviewCards[reviewIdx].id, { starred: !reviewCards[reviewIdx].starred }); }}>
                      {reviewCards[reviewIdx]?.starred ? "\u2605" : "\u2606"}
                    </button>
                    <div className="qz-label">Term</div>
                    <div style={{ fontSize: 22, fontWeight: 600 }}>{reviewCards[reviewIdx]?.term}</div>
                    {reviewCards[reviewIdx]?.hint && <div className="card-hint">{reviewCards[reviewIdx].hint}</div>}
                  </div>
                  <div className="qz-face qz-back">
                    <button className={`card-star${reviewCards[reviewIdx]?.starred ? " starred" : ""}`} onClick={(e) => { e.stopPropagation(); updateCard(reviewCards[reviewIdx].id, { starred: !reviewCards[reviewIdx].starred }); }}>
                      {reviewCards[reviewIdx]?.starred ? "\u2605" : "\u2606"}
                    </button>
                    <div className="qz-label">Definition</div>
                    <div style={{ fontSize: 18 }}>{reviewCards[reviewIdx]?.definition}</div>
                  </div>
                </div>
              </div>

              <div className="qz-controls">
                <div className="qz-nav">
                  <button onClick={() => { setReviewIdx((i) => Math.max(0, i - 1)); setFlipped(false); }}>&lsaquo;</button>
                  <button onClick={() => { setReviewIdx((i) => Math.min(reviewCards.length - 1, i + 1)); setFlipped(false); }}>&rsaquo;</button>
                </div>
                <div className="qz-rate">
                  <button className="btn-ghost" onClick={() => rateCard(false)}>Still learning</button>
                  <button className="btn" onClick={() => rateCard(true)}>Got it &rarr;</button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ────── LEARN MODE ────── */}
      {mode === "learn" && (
        <div>
          <div className="learn-stats">
            <div className="learn-stat"><strong>{newCount}</strong> New</div>
            <div className="learn-stat"><strong>{learningCount}</strong> Learning</div>
            <div className="learn-stat"><strong>{knownCountDeck}</strong> Known</div>
          </div>
          <div className="progress-bar" style={{ marginBottom: 20 }}><div className="progress-fill" style={{ width: `${deckCards.length > 0 ? (knownCountDeck / deckCards.length) * 100 : 0}%` }} /></div>

          {learnDone ? (
            <div style={{ textAlign: "center", padding: 40 }}>
              <div style={{ fontSize: 48 }}>&#127881;</div>
              <h3>All cards learned!</h3>
              <button className="btn" style={{ marginTop: 16 }} onClick={startLearn}>Restart Learn</button>
            </div>
          ) : learnQueue.length > 0 ? (
            <div className="learn-stage">
              <div className="learn-question-label">{learnPhase === "mc" ? "Multiple choice" : "Written answer"}</div>
              <div className="learn-question">{learnQueue[0].term}</div>

              {learnPhase === "mc" ? (
                <div className="learn-options">
                  {learnOptions.map((opt, i) => (
                    <button
                      key={i}
                      className={`learn-option${learnFeedback && opt === learnQueue[0].definition ? " correct" : ""}${learnFeedback && opt !== learnQueue[0].definition && opt === (learnFeedback ? testAnswers[-1] : "") ? " wrong" : ""}`}
                      onClick={() => learnSelect(opt)}
                      disabled={!!learnFeedback}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              ) : (
                <div>
                  <textarea className="learn-input" placeholder="Type the definition..." value={learnAnswer} onChange={(e) => setLearnAnswer(e.target.value)} rows={3} disabled={!!learnFeedback} />
                  {!learnFeedback && <button className="btn" onClick={learnSubmitWritten} style={{ marginTop: 8 }}>Submit</button>}
                </div>
              )}

              {learnFeedback && (
                <div className="learn-feedback">
                  <div className="learn-feedback-icon">{learnFeedback.correct ? "\u2705" : "\u274c"}</div>
                  <div className="learn-feedback-text">{learnFeedback.correct ? "Correct!" : "Not quite"}</div>
                  {!learnFeedback.correct && <div className="learn-correct-answer">Correct answer: {learnFeedback.answer}</div>}
                  <button className="btn" style={{ marginTop: 12 }} onClick={learnContinue}>Continue</button>
                </div>
              )}
            </div>
          ) : (
            <p style={{ textAlign: "center", padding: 20 }}>No cards to learn.</p>
          )}
        </div>
      )}

      {/* ────── MATCH MODE ────── */}
      {mode === "match" && (
        <div>
          {deckCards.length < 3 ? (
            <p style={{ textAlign: "center", padding: 40 }}>Need at least 3 cards to play match.</p>
          ) : matchDone ? (
            <div style={{ textAlign: "center", padding: 40 }}>
              <h3>Match complete!</h3>
              <p className="match-timer">{matchTime.toFixed(1)}s</p>
              <button className="btn" style={{ marginTop: 16 }} onClick={startMatch}>Play again</button>
            </div>
          ) : (
            <>
              <div className="match-header">
                <span className="match-counter">{matchTiles.filter((t) => t.matched).length / 2} / {matchTiles.length / 2} matched</span>
                <span className="match-timer">{matchTime.toFixed(1)}s</span>
              </div>
              <div className="match-grid">
                {matchTiles.map((tile) => (
                  <button
                    key={tile.id}
                    className={`match-tile${tile.selected ? " selected" : ""}${tile.matched ? " matched" : ""}${tile.wrong ? " wrong" : ""}`}
                    onClick={() => clickMatchTile(tile.id)}
                    disabled={tile.matched}
                  >
                    {tile.text}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ────── TEST MODE ────── */}
      {mode === "test" && (
        <div>
          {testSubmitted ? (
            <div style={{ textAlign: "center", padding: 24 }}>
              <div style={{ fontSize: 48 }}>
                {testScore / testQuestions.length >= 0.8 ? "\uD83C\uDFC6" : testScore / testQuestions.length >= 0.6 ? "\uD83D\uDC4D" : "\uD83D\uDCDA"}
              </div>
              <h3>{testScore} / {testQuestions.length}</h3>
              <p>{Math.round((testScore / testQuestions.length) * 100)}%</p>

              <div style={{ textAlign: "left", marginTop: 24 }}>
                {testQuestions.map((q, i) => (
                  <div key={i} className="test-result-item" style={{ borderLeft: `4px solid ${testResults[i]?.correct ? "#22c55e" : "#ef4444"}`, paddingLeft: 12, marginBottom: 12 }}>
                    <div className="test-result-icon">{testResults[i]?.correct ? "\u2705" : "\u274c"}</div>
                    <strong>{q.card.term}</strong>
                    {!testResults[i]?.correct && <div style={{ color: "#ef4444", fontSize: 13 }}>Correct: {testResults[i]?.correctAnswer}</div>}
                  </div>
                ))}
              </div>
              <button className="btn" style={{ marginTop: 16 }} onClick={startTest}>Take a new test</button>
            </div>
          ) : (
            <div>
              {testQuestions.map((q, i) => (
                <div key={i} className="test-question" style={{ marginBottom: 20 }}>
                  <div className="test-q-num">Q{i + 1}</div>
                  <div className="test-q-text">{q.card.term}</div>

                  {q.type === "mc" && q.options ? (
                    <div className="test-options">
                      {q.options.map((opt, j) => (
                        <label key={j} className={`test-option${testAnswers[i] === opt ? " selected" : ""}`}>
                          <input type="radio" name={`q-${i}`} value={opt} checked={testAnswers[i] === opt} onChange={() => setTestAnswers((prev) => ({ ...prev, [i]: opt }))} />
                          {opt}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <textarea className="test-written" placeholder="Type your answer..." value={testAnswers[i] || ""} onChange={(e) => setTestAnswers((prev) => ({ ...prev, [i]: e.target.value }))} rows={2} />
                  )}
                </div>
              ))}
              <button className="btn-grad" onClick={submitTest} style={{ marginTop: 8 }}>Submit test</button>
            </div>
          )}
        </div>
      )}

      {/* ────── CARDS LIST MODE ────── */}
      {mode === "cards" && (
        <div>
          {/* Add card form */}
          <div className="add-card-form card" style={{ marginBottom: 20 }}>
            <h3 style={{ marginBottom: 12 }}>Add card</h3>
            <input placeholder="Term" value={newTerm} onChange={(e) => setNewTerm(e.target.value)} style={{ marginBottom: 8 }} />
            <textarea placeholder="Definition" value={newDef} onChange={(e) => setNewDef(e.target.value)} rows={2} style={{ marginBottom: 8 }} />
            <input placeholder="Hint (optional)" value={newHint} onChange={(e) => setNewHint(e.target.value)} style={{ marginBottom: 8 }} />
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn" onClick={addCard}>Add card</button>
              <button className="btn-ghost" onClick={bulkImport}>Bulk import</button>
            </div>
          </div>

          {/* Card list */}
          {deckCards.map((card) => (
            <div key={card.id} className="card-list-item" style={{ marginBottom: 8 }}>
              <button className={`card-star${card.starred ? " starred" : ""}`} onClick={() => updateCard(card.id, { starred: !card.starred })}>
                {card.starred ? "\u2605" : "\u2606"}
              </button>
              <div style={{ flex: 1 }}>
                <strong>{card.term}</strong>
                <div style={{ fontSize: 13, opacity: 0.7 }}>{card.definition}</div>
                {card.hint && <div style={{ fontSize: 12, opacity: 0.5, fontStyle: "italic" }}>{card.hint}</div>}
              </div>
              <span className={`card-list-status ${card.status}`}>{card.status}</span>
              <button className="btn-ghost" onClick={() => deleteCard(card.id)} style={{ marginLeft: 8 }}>Delete</button>
            </div>
          ))}
          {deckCards.length === 0 && <p style={{ opacity: 0.6 }}>No cards yet. Add some above!</p>}
        </div>
      )}
    </div>
  );
}

export default function FlashcardsPage() {
  return (
    <Suspense>
      <AppShell>
        <FlashcardsInner />
      </AppShell>
    </Suspense>
  );
}
