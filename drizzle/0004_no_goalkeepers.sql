-- No goalkeepers: former GKs become MID, and their overall (now without goalkeeping) is logged.
INSERT INTO "rating_history" ("player_id", "overall")
SELECT "id", round(("attack" + "defence" + "passing" + "fitness") / 4.0, 1) FROM "players" WHERE "position" = 'GK';--> statement-breakpoint
UPDATE "players" SET "position" = 'MID' WHERE "position" = 'GK';--> statement-breakpoint
ALTER TABLE "players" DROP COLUMN "goalkeeping";
