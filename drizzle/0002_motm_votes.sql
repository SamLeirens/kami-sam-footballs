CREATE TABLE "motm_votes" (
	"match_id" integer NOT NULL,
	"voter_id" integer NOT NULL,
	"candidate_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "motm_votes_match_id_voter_id_pk" PRIMARY KEY("match_id","voter_id")
);
--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "share_token" text;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "voting_open" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "motm_votes" ADD CONSTRAINT "motm_votes_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "motm_votes" ADD CONSTRAINT "motm_votes_voter_id_players_id_fk" FOREIGN KEY ("voter_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "motm_votes" ADD CONSTRAINT "motm_votes_candidate_id_players_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_share_token_unique" UNIQUE("share_token");