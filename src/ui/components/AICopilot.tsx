// apps/web/src/ui/components/AICopilot.tsx
import React from "react";
import {
  aiClientSummary,
  fetchClientInsights,
  type AiHistoryItem,
} from "../../api";
import "./AICopilot.css";

type Msg = {
  role: "user" | "ai";
  text: string;
  time?: string;
  meta?: {
    riskScore?: number;
    riskBand?: string;
    model?: string | null;
    opportunityCount?: number;
  };
  sources?: Array<{ label?: string; available?: boolean; count?: number }>;
};

function formatTime(date = new Date()) {
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function toHistory(messages: Msg[]): AiHistoryItem[] {
  return messages
    .filter((m) => m.role === "user" || m.role === "ai")
    .slice(-8)
    .map((m) => ({
      role: m.role,
      text: m.text,
      time: m.time,
    }));
}

export default function AICopilot({
  clientId,
  clientName,
  status,
}: {
  clientId: string;
  clientName?: string;
  status?: string;
}) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [input, setInput] = React.useState("");
  const [messages, setMessages] = React.useState<Msg[]>([
    {
      role: "ai",
      text: `I’m your Client 360 Copilot.\nAsk me anything about ${
        clientName || clientId
      } — billing, renewals, tasks, risks, growth opportunities, and next best actions.`,
      time: formatTime(),
    },
  ]);

  const bodyRef = React.useRef<HTMLDivElement | null>(null);
  const loadedInsightsRef = React.useRef(false);

  const quickPrompts = React.useMemo(
    () => [
      "Give me a full client health summary",
      "What risks should we address first?",
      "What revenue or upsell opportunities exist?",
      "What should the account manager do next?",
      "Summarize billing, renewals, and open invoices",
      "Summarize tasks, blockers, and priorities",
      "Predict churn risk and explain why",
    ],
    [],
  );

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCollapsed(true);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  React.useEffect(() => {
    if (!bodyRef.current) return;
    bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, busy, collapsed]);

  React.useEffect(() => {
    if (!clientId || loadedInsightsRef.current) return;
    loadedInsightsRef.current = true;

    let cancelled = false;

    fetchClientInsights(clientId)
      .then((data) => {
        if (cancelled || !data?.summary) return;

        setMessages((m) => {
          if (m.length > 1) return m;
          return [
            ...m,
            {
              role: "ai",
              text: [
                data.summary,
                "",
                ...(data.alerts?.length
                  ? [
                      "Top alerts:",
                      ...data.alerts.slice(0, 3).map((x) => `• ${x}`),
                      "",
                    ]
                  : []),
                ...(data.next_best_actions?.length
                  ? [
                      "Next best actions:",
                      ...data.next_best_actions
                        .slice(0, 3)
                        .map((x, i) => `${i + 1}. ${x}`),
                    ]
                  : []),
              ]
                .filter(Boolean)
                .join("\n"),
              time: formatTime(),
              meta: {
                riskScore:
                  typeof data?.metrics?.risk_score === "number"
                    ? data.metrics.risk_score
                    : undefined,
                riskBand:
                  typeof data?.metrics?.risk_band === "string"
                    ? data.metrics.risk_band
                    : undefined,
                opportunityCount: Array.isArray(data?.opportunities)
                  ? data.opportunities.length
                  : undefined,
              },
              sources: Array.isArray(data?.sources)
                ? data.sources.map((label) => ({ label }))
                : [],
            },
          ];
        });
      })
      .catch(() => {
        // keep copilot usable even if auto insights fail
      });

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  async function send(question?: string) {
    const q = (question ?? input).trim();
    if (!q || busy) return;

    const nextUserMessage: Msg = {
      role: "user",
      text: q,
      time: formatTime(),
    };

    const history = toHistory([...messages, nextUserMessage]);

    setMessages((m) => [...m, nextUserMessage]);
    setInput("");
    setBusy(true);

    try {
      const data = await aiClientSummary({
        clientId,
        clientName,
        status,
        question: q,
        history,
      });

      setMessages((m) => [
        ...m,
        {
          role: "ai",
          text: data.reply || "…",
          time: formatTime(),
          meta: {
            riskScore:
              typeof data?.meta?.risk_score === "number"
                ? data.meta.risk_score
                : undefined,
            riskBand:
              typeof data?.meta?.risk_band === "string"
                ? data.meta.risk_band
                : undefined,
            model: data?.meta?.model ?? null,
            opportunityCount:
              typeof data?.meta?.opportunity_count === "number"
                ? data.meta.opportunity_count
                : undefined,
          },
          sources: Array.isArray(data?.sources) ? data.sources : [],
        },
      ]);
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        {
          role: "ai",
          text: `Sorry — I couldn’t answer that. (${e?.message || "error"})`,
          time: formatTime(),
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  const showEmptyState = messages.length === 1 && messages[0]?.role === "ai";

  return (
    <aside className={`copilot ${collapsed ? "collapsed" : "copilotOpen"}`}>
      {!collapsed ? (
        <>
          <div className="copilotHeader">
            <div className="copilotTitle">
              <div className="copilotBadge">AI</div>

              <div className="copilotTitleText">
                <div className="copilotName">Copilot</div>
                <div className="copilotSub">
                  {clientName || clientId} • {status || "active"}
                </div>
              </div>
            </div>

            <div className="copilotActions">
              <button
                className="copilotIconBtn"
                onClick={() => setCollapsed(true)}
                title="Collapse"
                aria-label="Collapse Copilot"
              >
                —
              </button>
            </div>
          </div>

          {showEmptyState ? (
            <div className="copilotEmpty">
              <div className="copilotEmptyIcon">✦</div>
              <div className="copilotEmptyTitle">Ready to help</div>
              <div className="copilotEmptySub">
                Ask for client health, risks, renewals, billing insights, task
                blockers, churn signals, or account growth recommendations for{" "}
                {clientName || clientId}.
              </div>

              <div className="copilotPromptGrid">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    className="copilotPromptChip"
                    onClick={() => send(prompt)}
                    disabled={busy}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="copilotBody" ref={bodyRef}>
            {messages.map((m, idx) => (
              <div key={idx} className={`bubble ${m.role}`}>
                <div className="bubbleTop">
                  <div className="bubbleRole">
                    {m.role === "ai" ? "Copilot" : "You"}
                  </div>
                  <div className="bubbleTime">{m.time || ""}</div>
                </div>

                <div className="bubbleText">{m.text}</div>

                {m.role === "ai" &&
                (m.meta || (m.sources && m.sources.length > 0)) ? (
                  <div className="copilotMetaBlock">
                    {m.meta ? (
                      <div className="copilotMetaRow">
                        {typeof m.meta.riskScore === "number" ? (
                          <span className="copilotMiniTag">
                            Risk {m.meta.riskScore}
                            {m.meta.riskBand ? ` • ${m.meta.riskBand}` : ""}
                          </span>
                        ) : null}
                        {typeof m.meta.opportunityCount === "number" ? (
                          <span className="copilotMiniTag">
                            Opportunities {m.meta.opportunityCount}
                          </span>
                        ) : null}
                        {m.meta.model ? (
                          <span className="copilotMiniTag">{m.meta.model}</span>
                        ) : null}
                      </div>
                    ) : null}

                    {m.sources && m.sources.length > 0 ? (
                      <div className="copilotSourceList">
                        {m.sources
                          .filter((s) => s?.label)
                          .slice(0, 4)
                          .map((s, sourceIdx) => (
                            <span key={sourceIdx} className="copilotSourceTag">
                              {s.label}
                              {typeof s.count === "number"
                                ? ` (${s.count})`
                                : ""}
                            </span>
                          ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}

            {busy && (
              <div className="bubble ai dim">
                <div className="bubbleTop">
                  <div className="bubbleRole">Copilot</div>
                  <div className="bubbleTime">Thinking</div>
                </div>

                <div className="typingDots" aria-label="Copilot is typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
          </div>

          <div className="copilotComposer">
            <input
              className="copilotInput"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about billing, renewals, risks, or recommendations…"
              onKeyDown={(e) => {
                if (e.key === "Enter") send();
              }}
              disabled={busy}
            />

            <button
              className="copilotSend"
              onClick={() => send()}
              disabled={busy || !input.trim()}
            >
              Send
            </button>
          </div>
        </>
      ) : (
        <button
          className="copilotFab"
          onClick={() => setCollapsed(false)}
          aria-label="Open Copilot"
          title="Open Copilot"
        >
          <span className="copilotFabIcon">AI</span>
          <span className="copilotFabText">Copilot</span>
          <span className="copilotFabHint">⟷</span>
        </button>
      )}
    </aside>
  );
}
