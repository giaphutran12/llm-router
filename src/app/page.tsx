"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import type { ReactElement } from "react";
import { Button } from "@/components/ui/button";
import { Logger } from "@/utils/logger";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Role = "user" | "assistant";

interface PerformanceMetrics {
  throughput: string;
  timeToFirstToken: string;
  tokensPerSecond: string;
  cost: string;
  actualTimeToFirstToken: string;
}

interface Message {
  id: string;
  role: Role;
  content: string;
  model?: string;
  reasoning?: string;
  performance?: PerformanceMetrics;
}

const logger = new Logger("Page:Chat");

function useChatMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const addMessage = (message: Message) => {
    setMessages(prev => {
      const next = [...prev, message];
      logger.info("useChatMessages:addMessage", { next });
      return next;
    });
  };
  const reset = () => {
    logger.info("useChatMessages:reset");
    setMessages([]);
  };
  logger.debug("useChatMessages:state", { messages });
  return { messages, addMessage, reset };
}

function formatAssistantReply(input: string): string {
  const reply = input.trim().length
    ? `You said: "${input.trim()}". Here is a helpful response.`
    : "Hello! Ask me anything.";
  logger.info("formatAssistantReply", { reply });
  return reply;
}

export default function Page(): ReactElement {
  logger.info("Page:render");

  const { messages, addMessage, reset } = useChatMessages();
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  const canSend = useMemo(
    () => input.trim().length > 0 && !isSending,
    [input, isSending]
  );

  const scrollToBottom = () => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
    logger.debug("scrollToBottom");
  };

  useEffect(() => {
    if (messages.length === 0) {
      addMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Hi! I am your AI assistant. How can I help you today?",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!canSend) return;
    const text = input.trim();
    setInput("");
    setIsSending(true);

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };
    addMessage(userMessage);
    logger.info("handleSend:userMessage", { userMessage });

    try {
      logger.info("handleSend:callingAPI");
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const json = await response.json();
      logger.info("handleSend:apiResponse", { status: response.status, json });

      let content: string;
      let model: string | undefined;
      let reasoning: string | undefined;
      let performance: PerformanceMetrics | undefined;

      if (json && typeof json === "object") {
        if (json.model && json.reply) {
          // New format with performance metrics
          content = json.reply;
          model = json.model;
          reasoning = json.reasoning;
          performance = json.performance;
        } else if (json.message) {
          // Legacy format
          content = json.message;
        } else {
          content = formatAssistantReply(text);
        }
      } else {
        content = formatAssistantReply(text);
      }

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content,
        model,
        reasoning,
        performance,
      };
      addMessage(assistantMessage);
      logger.info("handleSend:assistantMessage", { assistantMessage });
    } catch (err) {
      logger.error("handleSend:error", err);
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          "Sorry, there was a problem contacting the API. Please try again.",
      };
      addMessage(assistantMessage);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    logger.debug("handleKeyDown", { key: e.key, shift: e.shiftKey });
  };

  return (
    <div className="relative flex min-h-dvh flex-col bg-gradient-to-b from-black via-[#0b1a36] to-black text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-transparent px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/5">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between">
          <h1 className="text-base font-semibold tracking-tight text-white/90">
            Chat
          </h1>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={reset}
              disabled={messages.length <= 1}
              className="text-white/80 hover:bg-white/10 hover:text-white"
            >
              New chat
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleSend}
              disabled={!canSend}
              className="bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {isSending ? "Sending…" : "Send"}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-6">
        <div className="flex-1 space-y-6 overflow-y-auto pr-1">
          {messages.map(m => (
            <MessageBubble
              key={m.id}
              role={m.role}
              content={m.content}
              model={m.model}
              reasoning={m.reasoning}
              performance={m.performance}
            />
          ))}
          <div ref={endRef} />
        </div>

        <div className="sticky bottom-0 z-10 rounded-2xl border border-white/10 bg-white/5 p-3 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-white/5">
          <div className="relative">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message…"
              rows={3}
              className="w-full resize-none rounded-xl border border-white/10 bg-transparent px-3 py-2 pr-16 text-sm text-white placeholder:text-white/40 outline-none focus-visible:ring-1 focus-visible:ring-white/30"
            />
            <div className="pointer-events-none absolute bottom-2 right-2">
              <Button
                size="sm"
                className="pointer-events-auto bg-blue-600 text-white hover:bg-blue-500"
                onClick={handleSend}
                disabled={!canSend}
              >
                {isSending ? "..." : "Send"}
              </Button>
            </div>
          </div>
          <p className="mt-2 text-xs text-white/60">
            Enter to send • Shift+Enter for new line
          </p>
        </div>
      </main>
    </div>
  );
}

interface MessageBubbleProps {
  role: Role;
  content: string;
  model?: string;
  reasoning?: string;
  performance?: PerformanceMetrics;
}

function MessageBubble({
  role,
  content,
  model,
  reasoning,
  performance,
}: MessageBubbleProps): ReactElement {
  logger.debug("MessageBubble:render", { role });
  const isUser = role === "user";

  return (
    <div
      className={cn(
        "flex w-full gap-3",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && <Avatar label="AI" />}
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
          isUser
            ? "bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg"
            : "border border-white/10 bg-white/5 text-white backdrop-blur"
        )}
      >
        {!isUser && model && performance && (
          <div className="mb-4">
            <h4 className="mb-2 text-sm font-semibold text-white/90">
              Model Performance
            </h4>
            <div className="mb-3 overflow-hidden rounded-lg border border-white/10 bg-white/5">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-white/5">
                    <TableHead className="text-white/70">Model</TableHead>
                    <TableHead className="text-white/70">Throughput</TableHead>
                    <TableHead className="text-white/70">
                      Time to First Token
                    </TableHead>
                    <TableHead className="text-white/70">
                      Tokens/Second
                    </TableHead>
                    <TableHead className="text-white/70">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="border-white/10 hover:bg-white/5">
                    <TableCell className="font-medium text-white/90">
                      {model}
                    </TableCell>
                    <TableCell className="text-white/80">
                      {performance.throughput}
                    </TableCell>
                    <TableCell className="text-white/80">
                      {performance.actualTimeToFirstToken}
                    </TableCell>
                    <TableCell className="text-white/80">
                      {performance.tokensPerSecond}
                    </TableCell>
                    <TableCell className="text-white/80">
                      {performance.cost}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            {reasoning && (
              <div className="mb-3 rounded-lg bg-blue-600/20 p-3 border border-blue-500/30">
                <p className="text-xs text-blue-200 font-medium">Reasoning:</p>
                <p className="text-xs text-blue-100">{reasoning}</p>
              </div>
            )}
            <div className="mb-3 border-t border-white/10 pt-3">
              <h5 className="text-sm font-semibold text-white/90 mb-2">
                Answer:
              </h5>
            </div>
          </div>
        )}
        <div className="prose prose-invert max-w-none">{content}</div>
      </div>
      {isUser && <Avatar label="You" user />}
    </div>
  );
}

function Avatar({
  label,
  user = false,
}: {
  label: string;
  user?: boolean;
}): ReactElement {
  logger.debug("Avatar:render", { user, label });
  return (
    <div
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-md text-[10px] font-medium ring-1 ring-white/20",
        user ? "bg-blue-600 text-white" : "bg-white/10 text-white"
      )}
    >
      {label}
    </div>
  );
}
