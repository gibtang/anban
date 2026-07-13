'use client';

import React from 'react';

/**
 * Renders text with URLs (https://...) as clickable links that open in a new tab.
 * Non-URL text segments are preserved as-is.
 */
export function LinkifyText({ text, className }: { text: string; className?: string }) {
  const urlRegex = /(https?:\/\/[^\s<>"']+)/g;
  const parts = text.split(urlRegex);

  return (
    <div className={className}>
      {parts.map((part, i) => {
        if (/^https?:\/\//.test(part)) {
          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-800 underline break-all"
            >
              {part}
            </a>
          );
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </div>
  );
}
