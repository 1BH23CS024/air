import { useState, useRef, useCallback, useEffect } from "react";
import { summarizeCSV, answerFromSummary } from "./lib/summarizeCSV";
import { parseKeywords } from "./lib/keywordParser";
import Logo from "/logo.svg";

interface Message {
  id: number;
  type: "summary" | "question" | "answer";
  text: string;
  isUser: boolean;
  initialQuery?: string;
}

interface SearchbarProps {
  query: string;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
  isSearching: boolean;
  onSearchSubmit: (text: string) => Promise<void>;
  hasInitialSummary: boolean;
}

const KeywordMarquee: React.FC<{
  keywords: string[];
  onKeywordClick: (keyword: string) => Promise<void>;
  isSearching: boolean;
}> = ({ keywords, onKeywordClick, isSearching }) => {
  if (keywords.length === 0) return null;

  const NUM_ROWS = 6;
  const animationPlayState = isSearching ? "paused" : "running";

  const L = keywords.length;

  const rows = Array.from({ length: NUM_ROWS }, (_, i) => {
    const offset = (i * 7) % L;

    const offsetKeywords = [
      ...keywords.slice(offset),
      ...keywords.slice(0, offset),
    ];
    const directionClass =
      i % 2 === 0 ? "animate-marquee-left" : "animate-marquee-right";
    const duration = `${(keywords.length + 6) * 0.2 + i * 0.5}s`;

    return {
      id: i,
      keywords: offsetKeywords,
      directionClass,
      duration,
    };
  });

  return (
    <div className="absolute top-full left-0 right-0 mt-4 overflow-hidden h-60">
      {rows.map(({ id, keywords: rowKeywords, directionClass, duration }) => (
        <div
          key={id}
          className={`flex whitespace-nowrap ${directionClass} h-10 items-center`}
          style={
            {
              width: "200%",
              "--marquee-duration": duration,
              animationPlayState,
            } as React.CSSProperties
          }
        >
          {[...rowKeywords, ...rowKeywords].map((keyword, index) => (
            <button
              key={index}
              onClick={() => onKeywordClick(keyword)}
              disabled={isSearching}
              className={`
                inline-flex items-center px-4 py-2 mx-2 text-sm font-mono rounded-full transition-all duration-300
                bg-transparent hover:bg-neutral-300 dark:hover:bg-neutral-700
                ${isSearching ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:scale-[1.02]"}
              `}
            >
              {keyword}
            </button>
          ))}
        </div>
      ))}
      <div className="absolute top-0 left-0 w-10 h-full bg-gradient-to-r from-gray-100 dark:from-neutral-900 to-transparent pointer-events-none" />
      <div className="absolute top-0 right-0 w-10 h-full bg-gradient-to-l from-gray-100 dark:from-neutral-900 to-transparent pointer-events-none" />
    </div>
  );
};

const Searchbar: React.FC<SearchbarProps> = ({
  query,
  setQuery,
  isSearching,
  onSearchSubmit,
  hasInitialSummary,
}) => {
  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isSearching) {
      const trimmed = query.trim();
      if (trimmed) await onSearchSubmit(trimmed);
    }
  };

  const placeholder = hasInitialSummary
    ? "📰 Ask for a follow-up"
    : "🔍 Search what's happening";
  const baseClasses =
    "w-full p-3 pr-10 rounded-full border shadow-lg focus:outline-none focus:ring-1 focus:ring-blue-500 ";
  const colorClasses =
    "bg-white text-gray-900 placeholder-gray-500 border-gray-200 dark:bg-neutral-700 dark:text-neutral-100 dark:placeholder-neutral-400 dark:border-neutral-700 ";
  const disabledClass = isSearching ? "opacity-80" : "";

  return (
    <div className="relative">
      <input
        type="text"
        placeholder={placeholder}
        className={baseClasses + colorClasses + disabledClass}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        aria-label="Search"
        aria-busy={isSearching}
        disabled={isSearching}
      />
      {isSearching && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
          <svg
            className="animate-spin h-5 w-5 text-blue-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
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
};

const ChatDisplay: React.FC<{ conversation: Message[] }> = ({
  conversation,
}) => (
  <div className="w-full max-w-2xl flex flex-col gap-4">
    {conversation.map((message) => {
      const { id, isUser, type, text, initialQuery } = message;
      const bubbleClasses = isUser
        ? "bg-blue-600 text-white rounded-br-none"
        : type === "summary"
          ? "bg-white text-gray-900 dark:bg-neutral-800/33 dark:text-neutral-100 rounded-bl-none"
          : "bg-neutral-200 text-gray-900 dark:bg-neutral-700 dark:text-neutral-100 rounded-bl-none";
      const alignmentClass = isUser ? "justify-end" : "justify-center";

      return (
        <div key={id} id={`message-${id}`} className={`flex ${alignmentClass}`}>
          <div
            className={`max-w-[min(90vw,80ch)] p-4 rounded-xl shadow leading-relaxed whitespace-pre-wrap break-words transition-all duration-300 ${bubbleClasses}`}
          >
            {type === "summary" && (
              <h3 className="font-semibold text-lg mb-2 border-b pb-1 dark:border-neutral-600">
                Briefing on: {initialQuery}
              </h3>
            )}
            {text}
          </div>
        </div>
      );
    })}
  </div>
);

const App: React.FC = () => {
  const [query, setQuery] = useState("");
  const [conversation, setConversation] = useState<Message[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [keywordList, setKeywordList] = useState<string[]>([]);
  const [lastInitialQuery, setLastInitialQuery] = useState<string | null>(null);

  const nextIdRef = useRef(0);
  const generateUniqueId = () => nextIdRef.current++;

  useEffect(() => {
    const fetchKeywords = async () => {
      try {
        const response = await fetch("/keywords.txt");
        if (!response.ok)
          throw new Error(
            `Failed to fetch keywords. Status: ${response.status}`
          );

        const fileContent = await response.text();
        setKeywordList(parseKeywords(fileContent));
      } catch (error) {
        console.error("Error loading keywords from /keywords.txt:", error);
        setKeywordList([]);
      }
    };
    fetchKeywords();
  }, []);

  const hasInitialSummary = conversation.length > 0;
  const initialSummaryText =
    conversation.find((m) => m.type === "summary")?.text || "";

  const handleNewMessage = (message: Message) => {
    setConversation((prev) => [...prev, message]);
  };

  const handleBack = () => {
    setConversation([]);
    setLastInitialQuery(null);
    setQuery("");
  };

  const handleRefresh = async () => {
    if (lastInitialQuery) {
      // setConversation([]);
      await executeSearch(lastInitialQuery, true);
    }
  };

  const executeSearch = useCallback(
    async (text: string, forceInitialSummary = false) => {
      const trimmed = text.trim();
      if (!trimmed || isSearching) return;

      setIsSearching(true);
      setQuery("");

      const shouldBeFollowUp = hasInitialSummary && !forceInitialSummary;

      let currentInitialQuery: string | undefined;
      const messageId = generateUniqueId();
      let messageType: "summary" | "answer" = "answer";

      if (shouldBeFollowUp) {
        handleNewMessage({
          id: generateUniqueId(),
          type: "question",
          text: trimmed,
          isUser: true,
        });
      } else {
        currentInitialQuery = trimmed;
        messageType = "summary";
        setLastInitialQuery(trimmed);
      }

      try {
        let responseText: string;

        if (shouldBeFollowUp) {
          responseText = await answerFromSummary(initialSummaryText, trimmed);
        } else {
          const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(trimmed)}&hl=en-IN&gl=IN&ceid=IN:en`;
          const res = await fetch("/api/parse-rss", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: rssUrl }),
          });

          if (!res.ok) throw new Error(`Network error: ${res.status}`);

          const output = await res.text();
          responseText = await summarizeCSV(output);
        }

        if (forceInitialSummary) {
          setConversation([]);
        }

        const modelResponseMessage: Message = {
          id: messageId,
          type: messageType,
          text: responseText,
          isUser: false,
          initialQuery: currentInitialQuery,
        };

        handleNewMessage(modelResponseMessage);

        setTimeout(() => {
          document
            .getElementById(`message-${modelResponseMessage.id}`)
            ?.scrollIntoView({ behavior: "smooth", block: "end" });
        }, 50);
      } catch (err: any) {
        console.error(err);
        handleNewMessage({
          id: messageId,
          type: "answer",
          text: `⚠️ Error fetching results. ${err?.message ?? ""}`,
          isUser: false,
        });
      } finally {
        setIsSearching(false);
      }
    },
    [hasInitialSummary, initialSummaryText, isSearching, setConversation]
  );

  const logoBaseClass = "transition-all duration-500 ease-in-out";
  const titleClass = hasInitialSummary ? "text-3xl" : "text-5xl sm:text-6xl";
  const taglineClass = hasInitialSummary
    ? "opacity-0 h-0"
    : "opacity-100 h-auto mb-4";
  const headerContainerClass = hasInitialSummary
    ? "sticky top-0 pt-3 pb-2 bg-gray-100 dark:bg-neutral-900"
    : "mt-20 md:mt-28";
  const resultsVisibilityClass = hasInitialSummary
    ? "opacity-100 pointer-events-auto"
    : "opacity-0 pointer-events-none";
  const searchbarPositionClass = hasInitialSummary
    ? "fixed left-0 right-0 bottom-24"
    : "mt-12 md:mt-20";

  return (
    <div className="min-h-screen w-full bg-gray-100 dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 overflow-auto">
      <style>{`
        @keyframes marquee-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes marquee-right {
          0% { transform: translateX(-50%); } 
          100% { transform: translateX(0); }
        }
        .animate-marquee-left {
          animation: marquee-left var(--marquee-duration) linear infinite;
        }
        .animate-marquee-right {
          animation: marquee-right var(--marquee-duration) linear infinite;
        }
      `}</style>

      <div
        className={`flex flex-col items-center gap-3 ${logoBaseClass} z-10 ${headerContainerClass}`}
      >
        <div className="w-full flex justify-center relative">
          {hasInitialSummary && (
            <button
              onClick={handleBack}
              disabled={isSearching}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 p-2 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
              aria-label="Back to initial search"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
            </button>
          )}
          <div className="flex items-center">
            <img src={Logo} alt="App Logo" className="h-10 w-auto" />
            <h1
              className={`ml-3 font-semibold pointer-events-none ${logoBaseClass} ${titleClass}`}
            >
              AIR
            </h1>
          </div>

          {hasInitialSummary && (
            <button
              onClick={handleRefresh}
              disabled={isSearching}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
              aria-label="Refresh search results"
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
          className={`text-gray-500 dark:text-neutral-400 text-base transition-opacity duration-300 ${taglineClass}`}
        >
          A News Engine powered by AI + RSS feeds
        </div>
      </div>

      <div
        id="results"
        className={`w-full flex justify-center transition-all duration-300 ease-out py-4 px-4 ${resultsVisibilityClass}`}
      >
        <ChatDisplay conversation={conversation} />
      </div>

      <div className="px-4">
        <div className="w-full max-w-3xl mx-auto py-6">
          <p className="text-sm text-muted-foreground"></p>
        </div>
      </div>

      <div
        className={`w-full flex justify-center z-50 px-4 pointer-events-auto transition-all duration-500 ${searchbarPositionClass}`}
      >
        <div className="w-full max-w-xl relative">
          <Searchbar
            query={query}
            setQuery={setQuery}
            isSearching={isSearching}
            onSearchSubmit={executeSearch}
            hasInitialSummary={hasInitialSummary}
          />
          {!hasInitialSummary && (
            <KeywordMarquee
              keywords={keywordList}
              onKeywordClick={executeSearch}
              isSearching={isSearching}
            />
          )}
        </div>
      </div>

      <div className={hasInitialSummary ? "h-40" : "h-20"} />
    </div>
  );
};

export default App;
