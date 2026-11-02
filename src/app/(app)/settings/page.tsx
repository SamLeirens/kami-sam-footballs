import { logout } from "@/app/login/actions";
import { getSettings } from "@/lib/data";
import { MAX_FORM_ADJUST } from "@/lib/rating";
import { saveSettings } from "./actions";

const WEIGHTS = [
  { value: 0, label: "Off", desc: "Only your ratings are used" },
  { value: 0.5, label: "Low", desc: "+0.5 per 100 Elo" },
  { value: 1, label: "Normal", desc: "+1 per 100 Elo" },
  { value: 1.5, label: "High", desc: "+1.5 per 100 Elo" },
];

export default async function SettingsPage() {
  const cfg = await getSettings();
  return (
    <div className="space-y-6">
      <h1 className="h1">Settings</h1>

      <form action={saveSettings} className="card space-y-4">
        <div>
          <h2 className="h2">Results adjust ratings</h2>
          <p className="text-sm text-muted">
            Team strength = your rating + an adjustment from results (Elo). Players who keep winning get nudged up, players who
            keep losing get nudged down — capped at ±{MAX_FORM_ADJUST} points.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-4">
          {WEIGHTS.map((w) => (
            <label key={w.value} className="flex cursor-pointer items-start gap-2 rounded-lg border border-line p-3 has-checked:border-accent has-checked:bg-accent-dim">
              <input type="radio" name="formWeight" value={w.value} defaultChecked={cfg.formWeight === w.value} className="mt-1 accent-accent" />
              <span>
                <span className="block font-semibold">{w.label}</span>
                <span className="text-xs text-muted">{w.desc}</span>
              </span>
            </label>
          ))}
        </div>
        <button className="btn">Save</button>
      </form>

      <section className="card space-y-2 text-sm text-soft">
        <h2 className="h2">How teams are picked</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Every possible split is checked (for up to ~24 players), and the 3 best are shown.</li>
          <li>Main goal: total strength of both teams as close as possible. With odd numbers (5 v 6) the smaller team gets stronger players to make up for it.</li>
          <li>Keepers are split one per team, and defenders/attackers are spread out.</li>
          <li>Repeating last match&apos;s exact teams is avoided when there&apos;s an equally fair alternative.</li>
          <li>You can always swap players by hand afterwards.</li>
        </ul>
      </section>

      <form action={logout}>
        <button className="btn-secondary">Log out</button>
      </form>
    </div>
  );
}
