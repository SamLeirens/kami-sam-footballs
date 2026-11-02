export type Vote = { matchId: number; voterId: number; candidateId: number };

/** Vote counts for one match, most votes first. Leader is null when nobody has voted or it's a tie. */
export function tally(votes: Vote[]) {
  const counts = new Map<number, number>();
  for (const v of votes) counts.set(v.candidateId, (counts.get(v.candidateId) ?? 0) + 1);
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const leader = ranked.length && (ranked.length === 1 || ranked[0][1] > ranked[1][1]) ? ranked[0][0] : null;
  return { ranked, leader, total: votes.length };
}

/** The admin's pick wins; otherwise the players' vote decides. */
export function effectiveMotm(adminPick: number | null, votes: Vote[]): number | null {
  return adminPick ?? tally(votes).leader;
}
