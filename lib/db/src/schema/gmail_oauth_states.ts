import { pgTable, text, serial, timestamp, index } from "drizzle-orm/pg-core";

export const gmailOAuthStatesTable = pgTable("gmail_oauth_states", {
  id: serial("id").primaryKey(),
  state: text("state").notNull().unique(),
  userId: text("user_id").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("gmail_oauth_states_state_idx").on(table.state),
  index("gmail_oauth_states_expires_idx").on(table.expiresAt),
]);

export type GmailOAuthState = typeof gmailOAuthStatesTable.$inferSelect;
