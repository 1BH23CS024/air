import { useState, useRef, useCallback, useEffect } from "react";
import {
  summarizeCSV,
  answerFromSummary,
  mergeSummaries,
  generalSearch,
} from "./lib/summarizeCSV";
import { parseKeywords } from "./lib/keywordParser";
import Logo from "/svg/app_logo.svg";
import Back from "/svg/back.svg";

type Message = {
  id: number;
  type: "summary" | "question" | "answer";
  text: string;
  isUser: boolean;
  initialQuery?: string;
};
type SearchMode = "general" | "merge" | "followup" | "rss";

const KeywordMarquee: React.FC<{
  keywords: string[];
  onKeywordClick: (k: string) => void;
  isSearching: boolean;
}> = ({ keywords, onKeywordClick, isSearching }) => {
  if (!keywords.length) return null;
  const rows = Array.from({ length: 6 }, (_, i) => ({
    id: i,
    items: [
      ...keywords.slice((i * 7) % keywords.length),
      ...keywords.slice(0, (i * 7) % keywords.length),
    ],
    dir: i % 2 === 0 ? "animate-marquee-left" : "animate-marquee-right",
    dur: `${(keywords.length + 6) * 0.2 + i * 0.5}s`,
  }));

  return (
    <div className="absolute top-full left-0 right-0 mt-4 overflow-hidden h-60">
      {rows.map(({ id, items, dir, dur }) => (
        <div
          key={id}
          className={`flex whitespace-nowrap ${dir} h-10 items-center`}
          style={
            {
              width: "200%",
              "--marquee-duration": dur,
              animationPlayState: isSearching ? "paused" : "running",
            } as React.CSSProperties
          }
        >
          {[...items, ...items].map((k, j) => (
            <button
              key={j}
              onClick={() => onKeywordClick(k)}
              disabled={isSearching}
              className={`inline-flex items-center px-4 py-2 mx-2 text-sm font-mono rounded-full transition-all duration-300 bg-transparent hover:bg-neutral-300 dark:hover:bg-neutral-700 ${isSearching ? "opacity-50" : "hover:scale-[1.02]"}`}
            >
              {k}
            </button>
          ))}
        </div>
      ))}
      <div className="absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-gray-100 dark:from-neutral-900 to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-gray-100 dark:from-neutral-900 to-transparent pointer-events-none" />
    </div>
  );
};

const Searchbar: React.FC<{
  query: string;
  setQuery: (s: string) => void;
  isSearching: boolean;
  onSearchSubmit: (t: string) => void;
  hasSummary: boolean;
}> = ({ query, setQuery, isSearching, onSearchSubmit, hasSummary }) => (
  <div className="relative">
    <input
      type="text"
      placeholder={
        hasSummary
          ? " 🤔 Follow up or use '~' for new topics"
          : " 🔍 Search or '~' for direct AI chat"
      }
      className={`w-full p-3 pr-10 rounded-full border shadow-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-gray-900 dark:bg-neutral-700 dark:text-neutral-100 dark:border-neutral-700 ${isSearching ? "opacity-80" : ""}`}
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      onKeyDown={(e) =>
        e.key === "Enter" &&
        !isSearching &&
        query.trim() &&
        onSearchSubmit(query.trim())
      }
      disabled={isSearching}
    />
    {isSearching && (
      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 animate-spin">
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
      </div>
    )}
  </div>
);

const ChatDisplay: React.FC<{ conversation: Message[] }> = ({
  conversation,
}) => (
  <div className="w-full max-w-2xl flex flex-col gap-4">
    {conversation.map(({ id, isUser, type, text, initialQuery }) => (
      <div
        key={id}
        id={`message-${id}`}
        className={`flex ${isUser ? "justify-end" : "justify-start"}`}
      >
        <div
          className={`max-w-[min(90vw,80ch)] p-4 rounded-xl shadow leading-relaxed whitespace-pre-wrap break-words transition-all duration-300 ${isUser ? "bg-neutral-200 dark:bg-neutral-700 rounded-br-none" : "bg-white dark:bg-neutral-800/33 rounded-bl-none text-gray-900 dark:text-neutral-100"}`}
        >
          {type === "summary" && (
            <h3 className="font-semibold text-lg mb-2 pb-1">{initialQuery}</h3>
          )}
          {text}
        </div>
      </div>
    ))}
  </div>
);

const App: React.FC = () => {
  const [query, setQuery] = useState("");
  const [conversation, setConversation] = useState<Message[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [lastQuery, setLastQuery] = useState<string | null>(null);
  const [rootQuery, setRootQuery] = useState<string | null>(null);
  const [isNewsSession, setIsNewsSession] = useState(false);

  // New State: Controls layout (sticky header vs centered) independently of conversation content
  const [isResultMode, setIsResultMode] = useState(false);

  const nextId = useRef(0);

  useEffect(() => {
    fetch("/keywords.txt")
      .then((r) => (r.ok ? r.text() : ""))
      .then((t) => setKeywords(parseKeywords(t)))
      .catch(() => setKeywords([]));
  }, []);

  const hasSummary = conversation.length > 0;
  // Only extract context from News Summaries (📰), ignoring General Search bubbles (🔍)
  const summaryText =
    [...conversation]
      .reverse()
      .find((m) => m.type === "summary" && m.initialQuery?.startsWith("📰"))
      ?.text || "";

  const addMsg = (msg: Partial<Message>) =>
    setConversation((p) => [
      ...p,
      {
        id: nextId.current++,
        isUser: false,
        type: "answer",
        text: "",
        ...msg,
      } as Message,
    ]);

  const reset = () => {
    setConversation([]);
    setLastQuery(null);
    setRootQuery(null);
    setQuery("");
    setIsNewsSession(false);
    setIsResultMode(false); // Only reset layout on manual Back
  };

  const executeSearch = useCallback(
    async (text: string, forceNew = false) => {
      if (!text || isSearching) return;
      setIsSearching(true);
      setQuery("");

      const isGeneral = text.startsWith("~");
      const isMerge = text.startsWith("+") && hasSummary && isNewsSession;

      const clean = (isMerge || isGeneral ? text.slice(1) : text).trim();
      if (!clean) {
        setIsSearching(false);
        return;
      }

      const mode: SearchMode = isGeneral
        ? "general"
        : isMerge
          ? "merge"
          : hasSummary && !forceNew && isNewsSession
            ? "followup"
            : "rss";

      // Lock layout to "Result Mode" immediately
      setIsResultMode(true);

      if (mode === "rss") setIsNewsSession(true);

      // UI Updates
      if (mode === "followup") {
        addMsg({ type: "question", text: `📰 ${clean}`, isUser: true });
      } else if (mode === "merge") {
        addMsg({
          type: "question",
          text: `➕ Adding "${clean}"...`,
          isUser: true,
        });
      } else {
        // Logic Change:
        // 1. If RSS (New Topic): Clear immediately. Layout stays sticky due to isResultMode.
        // 2. If Refresh (forceNew): Do NOT clear yet. Keep old result visible while loading.
        if (mode === "rss" && !forceNew) setConversation([]);

        if (mode === "general")
          addMsg({ type: "question", text: `🔍 ${clean}`, isUser: true });
      }

      const currentCleanQuery =
        mode === "merge" ? `${lastQuery} + ${clean}` : clean;
      if (mode !== "followup" && mode !== "general") {
        setLastQuery(currentCleanQuery);
        if (mode !== "merge") setRootQuery(clean);
      }

      try {
        let result = "";
        const fetchRSS = async () => {
          const res = await fetch("/api/parse-rss", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url: `https://news.google.com/rss/search?q=${encodeURIComponent(clean)}&hl=en-IN&gl=IN&ceid=IN:en`,
            }),
          });
          if (!res.ok) throw new Error(res.statusText);
          return summarizeCSV(await res.text());
        };

        switch (mode) {
          case "general":
            result = await generalSearch(clean);
            break;
          case "followup":
            result = await answerFromSummary(summaryText, clean);
            break;
          case "merge":
            result = await mergeSummaries(summaryText, await fetchRSS());
            break;
          case "rss":
            result = await fetchRSS();
            break;
        }

        const resMsgId = nextId.current;
        const headerIcon = mode === "general" ? "🔍" : "📰";
        const displayQuery = `${headerIcon} ${currentCleanQuery}`;
        const newMessage: Message = {
          id: resMsgId,
          type: mode === "followup" ? "answer" : "summary",
          text: result,
          initialQuery: displayQuery,
          isUser: false,
        };

        // Handle Refresh/Replacement logic here
        if (forceNew || (mode === "rss" && !forceNew)) {
          // If refreshing or new RSS, we replace the conversation.
          // For 'rss', we already cleared above, so this acts as set.
          // For 'forceNew', we overwrite the old result now.
          setConversation([newMessage]);
          nextId.current++; // Increment ref since we manually created the object
        } else {
          addMsg(newMessage);
        }

        setTimeout(
          () =>
            document
              .getElementById(`message-${resMsgId}`)
              ?.scrollIntoView({ behavior: "smooth", block: "end" }),
          50
        );
      } catch (err: any) {
        addMsg({ text: `⚠️ Error: ${err.message}` });
      } finally {
        setIsSearching(false);
      }
    },
    [hasSummary, summaryText, isSearching, lastQuery, isNewsSession]
  );

  return (
    <div className="min-h-screen w-full bg-gray-100 dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 overflow-auto">
      <style>{`
        @keyframes marquee-left { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @keyframes marquee-right { 0% { transform: translateX(-50%); } 100% { transform: translateX(0); } }
        .animate-marquee-left { animation: marquee-left var(--marquee-duration) linear infinite; }
        .animate-marquee-right { animation: marquee-right var(--marquee-duration) linear infinite; }
      `}</style>

      <div
        className={`flex flex-col items-center gap-3 transition-all duration-500 z-10 ${isResultMode ? "sticky top-0 pt-3 pb-2 bg-gray-100 dark:bg-neutral-900" : "mt-20 md:mt-28"}`}
      >
        <div className="w-full flex justify-center relative">
          {isResultMode && (
            <button
              onClick={reset}
              disabled={isSearching}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-800 disabled:opacity-50"
            >
              <img src={Back} alt="Back" className="h-6 w-6" />
            </button>
          )}
          <div className="flex items-center">
            <img src={Logo} alt="Logo" className="h-10 w-auto" />
            <h1
              className={`ml-3 font-semibold pointer-events-none transition-all duration-500 ${isResultMode ? "text-3xl" : "text-6xl"}`}
            >
              AIR
            </h1>
          </div>
          {isResultMode && (
            <button
              onClick={() => rootQuery && executeSearch(rootQuery, true)}
              disabled={isSearching}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-800 disabled:opacity-50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-6 w-6 ${isSearching ? "animate-spin" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          )}
        </div>
        <div
          className={`text-gray-500 dark:text-neutral-400 transition-opacity duration-300 ${isResultMode ? "opacity-0 h-0" : "opacity-100 mb-4"}`}
        >
          A News Engine powered by AI + RSS feeds
        </div>
      </div>

      <div
        id="results"
        className={`w-full flex justify-center transition-all duration-300 py-4 px-4 ${isResultMode ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        <ChatDisplay conversation={conversation} />
      </div>

      <div
        className={`w-full flex justify-center z-50 px-4 transition-all duration-500 ${isResultMode ? "fixed left-0 right-0 bottom-24" : "mt-12 md:mt-20"}`}
      >
        <div className="w-full max-w-xl relative">
          <Searchbar
            query={query}
            setQuery={setQuery}
            isSearching={isSearching}
            onSearchSubmit={executeSearch}
            hasSummary={hasSummary}
          />
          {!isResultMode && (
            <KeywordMarquee
              keywords={keywords}
              onKeywordClick={executeSearch}
              isSearching={isSearching}
            />
          )}
        </div>
      </div>
      <div className={isResultMode ? "h-40" : "h-20"} />
    </div>
  );
};

export default App;
