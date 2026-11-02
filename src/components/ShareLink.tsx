"use client";

import { useState, useSyncExternalStore } from "react";

const noop = () => () => {};

export function ShareLink({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  const origin = useSyncExternalStore(noop, () => window.location.origin, () => "");
  const url = `${origin}${path}`;
  return (
    <div className="space-y-2">
      <input readOnly value={url} className="input font-mono text-xs" onFocus={(e) => e.target.select()} />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-secondary"
          onClick={() =>
            navigator.clipboard.writeText(url).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            })
          }
        >
          {copied ? "Copied ✓" : "Copy link"}
        </button>
        <a className="btn-secondary" href={path} target="_blank" rel="noreferrer">Open ↗</a>
      </div>
    </div>
  );
}
