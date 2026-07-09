import { pgTable, text, serial, timestamp, integer, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const companiesTable = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  industry: text("industry"),
  sector: text("sector"),
  email: text("email"),
  website: text("website"),
  linkedin: text("linkedin"),
  city: text("city"),
  contactPerson: text("contact_person"),
  employees: integer("employees"),
  openPositions: integer("open_positions"),
  hiringNow: boolean("hiring_now"),
  recruitmentIntensity: text("recruitment_intensity"),
  potentialClient: boolean("potential_client"),
  priority: text("priority").default("medium"),
  status: text("status").default("active"),
  aiRecommendation: text("ai_recommendation"),
  aiSummary: text("ai_summary"),
  aiLeadScore: integer("ai_lead_score"),
  aiPriorityScore: integer("ai_priority_score"),
  aiHiringProbability: integer("ai_hiring_probability"),
  aiEmailTone: text("ai_email_tone"),
  aiNextAction: text("ai_next_action"),
  aiAnalyzedAt: timestamp("ai_analyzed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("companies_priority_idx").on(table.priority),
  index("companies_sector_idx").on(table.sector),
  index("companies_hiring_now_idx").on(table.hiringNow),
  index("companies_created_at_idx").on(table.createdAt),
  index("companies_ai_lead_score_idx").on(table.aiLeadScore),
]);

export const insertCompanySchema = createInsertSchema(companiesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  aiAnalyzedAt: true,
});

export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companiesTable.$inferSelect;
