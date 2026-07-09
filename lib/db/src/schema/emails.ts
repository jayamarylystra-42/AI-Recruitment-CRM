import { pgTable, text, serial, timestamp, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const emailsTable = pgTable("emails", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id"),
  campaignId: integer("campaign_id"),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  signature: text("signature"),
  templateType: text("template_type"),
  tone: text("tone"),
  status: text("status").notNull().default("draft"),
  gmailMessageId: text("gmail_message_id"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("emails_company_id_idx").on(table.companyId),
  index("emails_campaign_id_idx").on(table.campaignId),
  index("emails_status_idx").on(table.status),
  index("emails_created_at_idx").on(table.createdAt),
]);

export const insertEmailSchema = createInsertSchema(emailsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  sentAt: true,
});

export type InsertEmail = z.infer<typeof insertEmailSchema>;
export type Email = typeof emailsTable.$inferSelect;
