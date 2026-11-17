import "server-only";

/**
 * Push a notification to the admin's phone via ntfy (https://ntfy.sh).
 * Does nothing unless NTFY_TOPIC is set. Never throws: a failed push must not break anything.
 */
export async function notify({ title, message, click }: { title: string; message: string; click?: string }) {
  const topic = process.env.NTFY_TOPIC;
  if (!topic) return;
  const server = (process.env.NTFY_SERVER || "https://ntfy.sh").replace(/\/+$/, "");
  try {
    // JSON publishing keeps emoji and accents intact (HTTP headers can't carry them).
    const res = await fetch(server, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, title, message, click }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) console.error(`ntfy: ${res.status} ${await res.text()}`);
  } catch (e) {
    console.error("ntfy: send failed", e);
  }
}
