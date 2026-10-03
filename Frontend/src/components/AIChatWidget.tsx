import { useState, useRef, useEffect } from "react";
import type { AppUser } from "../App";
import logo from "../assets/attach1.png";

interface Message {
  id: number;
  role: "user" | "ai";
  text: string;
}

const quickPrompts = [
  "How do I apply for an internship?",
  "Write me a cover letter",
  "What companies are hiring?",
  "Help me prepare for interviews",
];

function getResponse(input: string): string {
  const q = input.toLowerCase();
  if (q.includes("apply") || q.includes("application")) {
    return `To apply for an internship on Fortune Intern Network:\n\n1. Browse Programs and find a role that interests you\n2. Click "Apply Now" and complete the application form\n3. Upload one Resume or CV and review your details\n4. Pay the GH₵4 application fee securely with Paystack\n5. Download your application letter after successful submission\n6. Track progress live on your Dashboard.`;
  }
  if (q.includes("cover letter") || q.includes("letter")) {
    return `I can help you write a professional cover letter! Here's a template:\n\nDear Hiring Manager,\n\nI am [Your Name], a [Year] student of [Programme] at [University]. I am writing to express my strong interest in the [Role] position at [Company].\n\nWith experience in [Skills], I am confident I would contribute meaningfully to your team. I am particularly drawn to [Company] because of [reason].\n\nI would welcome the opportunity to discuss my application further.\n\nWarm regards,\n[Your Name]\n\nWant me to customize this for a specific company?`;
  }
  if (q.includes("compan") || q.includes("hiring")) {
    return `Currently hiring on FIN:\n\nFlutterwave — Software Engineering Intern\nAccess Bank Ghana — Finance Intern\nAndela — Product Management Intern\nMTN Ghana — Marketing Intern\nTelecel Ghana — Data Analytics Intern\nHubtel — Software Dev Intern\n\nGo to "Programs" to explore all current openings with filters.`;
  }
  if (q.includes("interview") || q.includes("prepare")) {
    return `Top interview tips for Ghana internships:\n\n✅ Research the company before the interview\n✅ Prepare 2–3 projects to discuss\n✅ Know your CV inside out\n✅ Practice STAR method answers (Situation, Task, Action, Result)\n✅ Dress professionally even for video calls\n✅ Arrive 10 minutes early\n\nCommon questions:\n• "Tell me about yourself"\n• "Why do you want this internship?"\n• "What's your greatest strength?"\n• "Where do you see yourself in 5 years?"\n\nWant to do a mock interview?`;
  }
  if (
    q.includes("payment") ||
    q.includes("paystack") ||
    q.includes("pay") ||
    q.includes("price")
  ) {
    return `Fortune Intern Network payments:\n\nBrowsing programs is free. The application fee is GH₵4 and is shown only at the final Paystack payment step.\n\nPayments are secured by Paystack and support cards, mobile money, USSD, and bank transfer.`;
  }
  return `Hello! I'm the FIN AI Assistant for students. I can help with cover letters, internship discovery, interview preparation, application tracking, and Paystack payment questions.\n\nWhat can I help you with today?`;
}

export default function AIChatWidget({ user }: { user: AppUser }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      role: "ai",
      text: `Hi ${user.name.split(" ")[0]}. I'm Super, your FIN AI Assistant. I help students and companies navigate Fortune Intern Network. How can I help you today?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(1);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setUnread(0);
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [open, messages]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    setMessages((p) => [...p, { id: Date.now(), role: "user", text }]);
    setInput("");
    setLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    const reply = getResponse(text);
    setMessages((p) => [...p, { id: Date.now() + 1, role: "ai", text: reply }]);
    setLoading(false);
    if (!open) setUnread((u) => u + 1);
  };

  return (
    <div className="chat-widget">
      {/* Chat window */}
      {open && (
        <div
          className="mb-3 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-border overflow-hidden slide-in"
          style={{ maxHeight: "calc(100vh - 160px)" }}
        >
          {/* Header */}
          <div
            className="px-4 py-3 flex items-center gap-3"
            style={{ background: "linear-gradient(135deg, #2D3561, #3d4a8a)" }}
          >
            <div className="w-9 h-9 rounded-xl bg-white overflow-hidden flex items-center justify-center">
              <img
                src={logo}
                alt="Fortune Intern Network"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-white text-sm">Super — FIN AI</p>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" />
                <span className="text-white/60 text-xs">
                  Online · AI Powered
                </span>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded hover:bg-white/10 transition-colors"
            >
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div
            className="overflow-y-auto p-3 space-y-3"
            style={{ maxHeight: "340px" }}
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                {msg.role === "ai" && (
                  <div className="w-7 h-7 rounded-lg bg-white border border-border overflow-hidden flex-shrink-0 mt-1">
                    <img
                      src={logo}
                      alt=""
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed whitespace-pre-line ${
                    msg.role === "user"
                      ? "text-white rounded-tr-sm"
                      : "bg-muted text-foreground rounded-tl-sm"
                  }`}
                  style={
                    msg.role === "user"
                      ? {
                          background:
                            "linear-gradient(135deg, #2D3561, #3d4a8a)",
                        }
                      : {}
                  }
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-lg bg-white border border-border overflow-hidden flex-shrink-0">
                  <img
                    src={logo}
                    alt=""
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="bg-muted rounded-2xl rounded-tl-sm px-3 py-2">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick prompts */}
          {messages.length <= 1 && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5">
              {quickPrompts.map((p) => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  className="text-[10px] px-2.5 py-1.5 rounded-full border border-border hover:bg-secondary transition-colors text-foreground font-medium"
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-3 pb-3 pt-2 border-t border-border">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                placeholder="Ask me anything..."
                className="flex-1 px-3 py-2 rounded-xl border border-border bg-muted/30 text-xs focus:outline-none focus:ring-2"
              />
              <button
                onClick={() => send(input)}
                disabled={!input.trim() || loading}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white hover:opacity-90 transition-opacity disabled:opacity-40"
                style={{
                  background: "linear-gradient(135deg, #2D3561, #3d4a8a)",
                }}
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className="w-14 h-14 rounded-full shadow-2xl flex items-center justify-center relative hover:scale-105 transition-transform"
        style={{ background: "linear-gradient(135deg, #2D3561, #3d4a8a)" }}
      >
        {open ? (
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ) : (
          <>
            <span className="w-11 h-11 rounded-full bg-white overflow-hidden flex items-center justify-center">
              <img
                src={logo}
                alt="Open FIN AI Assistant"
                className="w-full h-full object-contain"
              />
            </span>
            {unread > 0 && (
              <span
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
                style={{ background: "#F5B731", color: "#1a1f3a" }}
              >
                {unread}
              </span>
            )}
          </>
        )}
      </button>
    </div>
  );
}
