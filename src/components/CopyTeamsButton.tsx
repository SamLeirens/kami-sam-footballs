"use client";

import { useState } from "react";
import { teamsText } from "@/lib/teams";

export function CopyTeamsButton({
  date,
  blue,
  orange,
  className = "btn-secondary",
}: {
  date: string;
  blue: string[];
  orange: string[];
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={() =>
        navigator.clipboard.writeText(teamsText(date, blue, orange)).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        })
      }
    >
      {copied ? "Copied ✓" : "Copy teams"}
    </button>
  );
}
