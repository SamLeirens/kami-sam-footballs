CREATE TABLE "poll_replies" (
	"poll_id" integer NOT NULL,
	"player_id" integer NOT NULL,
	"answer" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "poll_replies_poll_id_player_id_pk" PRIMARY KEY("poll_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "polls" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"token" text NOT NULL,
	"open" boolean DEFAULT true NOT NULL,
	"match_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "polls_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "poll_replies" ADD CONSTRAINT "poll_replies_poll_id_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."polls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_replies" ADD CONSTRAINT "poll_replies_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "polls" ADD CONSTRAINT "polls_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE set null ON UPDATE no action;