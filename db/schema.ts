import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const articles = sqliteTable("articles", {
  id: integer("id").primaryKey({ autoIncrement:true }),
  tractate: text("tractate").notNull(), ref: text("ref").notNull(),
  title: text("title").notNull(), translation: text("translation").notNull(), explanation: text("explanation").notNull(),
  unitRef: text("unit_ref"), partsJson: text("parts_json").notNull().default("[]"),
  rashiJson: text("rashi_json").notNull().default("[]"), tosafotJson: text("tosafot_json").notNull().default("[]"),
  provider: text("provider").notNull(), authorUserId: text("author_user_id").notNull(),
  createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
}, (table) => [uniqueIndex("articles_tractate_ref_unique").on(table.tractate, table.ref)]);

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement:true }),
  userId: text("user_id").notNull(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  role: text("role", { enum:["reader","editor","admin"] }).notNull().default("reader"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [uniqueIndex("users_user_id_unique").on(table.userId)]);

// Private editorial queues; never returned from the public articles API.
export const batches = sqliteTable('editor_batches', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  tractate: text('tractate').notNull(),
  page: text('page').notNull(),
  stateJson: text('state_json').notNull(),
  revision: integer('revision').notNull().default(0),
  writeToken: text('write_token').notNull().default(''),
  updatedAt: text('updated_at').notNull(),
}, table=>[uniqueIndex('editor_batches_owner_page').on(table.userId,table.tractate,table.page)]);
