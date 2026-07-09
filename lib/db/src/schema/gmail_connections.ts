import { pgTable, text, serial, timestamp, index } from "drizzle-orm/pg-core";

export const gmailConnectionsTable = pgTable("gmail_connections", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  email: text("email").notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  grantedScopes: text("granted_scopes"),
  tokenExpiry: timestamp("token_expiry", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("gmail_connections_user_id_idx").on(table.userId),
]);

export type GmailConnection = typeof gmailConnectionsTable.$inferSelect;
