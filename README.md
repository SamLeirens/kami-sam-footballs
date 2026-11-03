# ⚽ Kami FC

Web app for running our weekly football: rate players, generate fair teams, record results, track win % and other stats.

## Features

- **Teams are Blue and Orange**, the colours of our two shirts (stored as A/B in the database; names live in `src/lib/teams.ts`).
- **Players**: rate each player 1–10 on attack, defence, passing and fitness, plus a main position (DEF/MID/ATT). Each player page has a chart of their rating over time.
- **Guests**: add a one-off player from the team picker with just a name, level and position. Guests play in matches and count for results, but stay out of leaderboards and club stats.
- **Who's in?**: plan a match (Matches → Plan match; the date defaults to the next game on your usual weekday) and share its link. Players pick their name and tap *I'm in* / *Maybe* / *Can't*. Their phone remembers who they are, so next week it's one tap. You can also set replies yourself. *Pick teams* then starts with everyone who's in ticked (maybes are listed), and the same link switches to show the teams.
  - **Share invite** (on the match page and on Home) opens the phone's share sheet with a Dutch message and the link: pick Messenger, then the team chat. On a computer it copies the message instead. Once replies come in it becomes **Share reminder**, which lists who hasn't answered yet.
  - Facebook doesn't let apps post in group chats, so sharing is one tap by hand.
- **Fair teams**: tick who's playing and get the 3 fairest splits into two teams (5v5, 5v6, …).
  - Tries every possible split (up to ~24 players), so the result is the best possible, not a guess.
  - Balances total strength; with odd numbers the smaller team gets stronger players.
  - Defenders and attackers are spread out over both teams.
  - Avoids repeating last week's exact teams when an equally fair split exists.
  - Swap players by hand and the balance bar updates live.
  - **Copy teams** copies a Dutch message ("Ploegen voor …", 🔵 Blauw / 🟠 Oranje) to paste in the group chat.
- **Results**: score, optional goals and assists per player, man of the match, late arrivals, players switching sides.
- **Past matches** (Matches → Add past match): enter games that were already played in one go: date, who played for Blue and Orange, the score, and optionally goals, assists and MOTM. After each save the date moves on a week, ready for the next game. Enter them in any order; stats and Elo replay by date.
- **Match page to share** (`/m/<link>`, no login needed). Before teams are picked it asks who's in; after the match it shows the result: score, scorers, line-ups and club leaders, plus a **man of the match vote**.
  - Each player picks their own name and votes; a name can only vote once, and you can't vote for yourself.
  - Everyone can see who has voted, so a vote cast in someone else's name gets noticed. The admin can remove votes, close voting, or pick the MOTM themselves (that overrides the vote).
  - Player ratings are never shown on this page.
- **Stats**: played/W/D/L, win %, goals, assists, last-5 form, Elo, sortable leaderboard.
- **Seasons**: add seasons in Settings (each runs until the next one starts). Stats, leaderboards and player pages show the current season by default, with an All-time option. Team strength always uses every match.
- **Teammate stats**: on each player's page, their win % with and against every other player, plus their best partner and toughest opponent. The stats page lists the best and worst duos.
- **Results adjust strength**: each player's Elo, based on wins and losses, nudges their rating for team picking (capped at ±2, adjustable in Settings).
- **Admin only**: one password, set as an environment variable. Shared match pages are the only public part.

## Stack (all free)

- Next.js 16 (App Router, server actions) + Tailwind
- Postgres on [Neon](https://neon.tech) (free tier: 0.5 GB, far more than this needs; it sleeps when idle and wakes in under a second)
- Drizzle ORM
- Hosted on [Vercel](https://vercel.com) Hobby (free)

## Deploy (about 10 minutes)

1. **Database**: sign up at neon.tech → create a project → copy the **pooled** connection string (`postgres://…-pooler…/neondb?sslmode=require`).
2. **Hosting**: sign up at vercel.com with GitHub → *Add New → Project* → import this repo.
3. Add these environment variables in Vercel:
   - `DATABASE_URL`: the Neon string
   - `ADMIN_PASSWORD`: the password you'll log in with
4. Deploy. The build runs the database migrations automatically.

Every push to `main` redeploys. Changing `ADMIN_PASSWORD` logs everyone out.

## Local development

```bash
cp .env.example .env   # set DATABASE_URL (local Postgres or a Neon dev branch) + ADMIN_PASSWORD
npm install
npm run db:migrate
npm run db:seed        # optional demo data
npm run dev
```

| Script | |
| --- | --- |
| `npm test` | unit tests (team balancer, stats) |
| `npm run db:generate` | create a migration after editing `src/db/schema.ts` |
| `npm run db:migrate` | apply migrations |

## Code map

- `src/lib/balance.ts`: team balancing algorithm
- `src/lib/stats.ts`: win/draw/loss, form, Elo
- `src/lib/rsvp.ts`: who's-in answers, Dutch chat messages, suggested game day
- `src/lib/rating.ts`: overall rating and strength
- `src/db/schema.ts`: database tables
- `src/app/(app)/…`: pages; `actions.ts` files hold server actions
- `src/proxy.ts`: login gate
