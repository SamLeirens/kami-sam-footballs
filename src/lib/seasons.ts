export type SeasonRange = { id: number; name: string; start: string; end: string | null };

/** Each season runs from its start date up to (not including) the next season's start. */
export function seasonRanges(seasons: { id: number; name: string; startDate: string }[]): SeasonRange[] {
  const sorted = [...seasons].sort((a, b) => a.startDate.localeCompare(b.startDate));
  return sorted.map((s, i) => ({ id: s.id, name: s.name, start: s.startDate, end: sorted[i + 1]?.startDate ?? null }));
}

export function inRange(date: string, r: SeasonRange) {
  return date >= r.start && (r.end === null || date < r.end);
}

/** The season `today` falls in, or null if none has started yet. */
export function currentSeason(ranges: SeasonRange[], today: string): SeasonRange | null {
  return ranges.find((r) => inRange(today, r)) ?? null;
}

/**
 * What a `?season=` param selects: "all" = all-time; an id = that season;
 * missing = the current season if there is one, else all-time.
 */
export function resolveSeason(ranges: SeasonRange[], param: string | undefined, today: string): SeasonRange | null {
  if (param === "all") return null;
  if (param) return ranges.find((r) => String(r.id) === param) ?? null;
  return currentSeason(ranges, today);
}
