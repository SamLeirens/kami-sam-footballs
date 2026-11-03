import { loadClub, todayISO } from "@/lib/data";
import { isPlayed } from "@/lib/stats";
import { PastMatchForm } from "./PastMatchForm";

export default async function PastMatchPage() {
  const { players, matches, season } = await loadClub();
  const active = players.filter((p) => p.active);
  const today = todayISO();
  const recent = matches
    .filter(isPlayed)
    .slice(0, 8)
    .map((m) => ({ id: m.id, date: m.date, scoreA: m.scoreA, scoreB: m.scoreB }));

  return (
    <PastMatchForm
      players={active.map((p) => ({ id: p.id, name: p.name, position: p.position, isGuest: p.isGuest }))}
      today={today}
      seasonStart={season?.start}
      recent={recent}
    />
  );
}
