"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Logger } from "@/utils/logger";

const logger = new Logger("UI:Markdown");

interface MarkdownProps {
  content: string;
}

export function Markdown({ content }: MarkdownProps) {
  logger.info("render", { length: content?.length || 0 });

  if (!content || typeof content !== "string") {
    logger.warn("empty-content");
    return null;
  }

  return (
    <div className="prose prose-invert max-w-none">
      <ReactMarkdown
        skipHtml
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          [rehypeHighlight, { detect: true, ignoreMissing: true }],
        ]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
