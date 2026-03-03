import {
  boolean,
  date,
  integer,
  index,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Better Auth tables
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  idToken: text("idToken"),
  password: text("password"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// Fintech enums
export const transactionTypeEnum = pgEnum("transaction_type", [
  "CREDIT",
  "DEBIT",
  "TRANSFER_IN",
  "TRANSFER_OUT",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "ACTIVE",
  "PENDING",
  "CANCELLED",
  "INACTIVE",
]);

export const groupMemberRoleEnum = pgEnum("group_member_role", [
  "OWNER",
  "MEMBER",
]);

export const splitTypeEnum = pgEnum("split_type", ["EQUAL", "CUSTOM"]);

export const internalTransferStatusEnum = pgEnum("internal_transfer_status", [
  "PENDING",
  "COMPLETED",
]);

export const walletMoneyRequestStatusEnum = pgEnum("wallet_money_request_status", [
  "PENDING",
  "PAID",
  "CANCELLED",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "GROUP_REQUEST_ACCEPTED",
  "GROUP_REQUEST_REJECTED",
]);

export const transactionStatusEnum = pgEnum("transaction_status", [
  "PENDING",
  "SUCCESSFUL",
]);

export const groupSplitPaymentStatusEnum = pgEnum("group_split_payment_status", [
  "PENDING",
  "ACCEPTED",
  "REJECTED",
  "PAID",
  "REMOVED",
]);

export const groupDeleteRequestStatusEnum = pgEnum("group_delete_request_status", [
  "NONE",
  "PENDING",
]);

export const groupMemberRemovalStatusEnum = pgEnum("group_member_removal_status", [
  "NONE",
  "PENDING",
  "REMOVED",
]);

// Fintech tables
export const escrowAccount = pgTable("escrow_account", {
  id: uuid("id").defaultRandom().primaryKey(),
  totalBalance: numeric("total_balance", { precision: 14, scale: 2 })
    .default("0")
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const wallet = pgTable("wallet", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  pxId: text("px_id")
    .notNull()
    .unique()
    .default(
      sql`concat('px-', substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))`,
    ),
  balance: numeric("balance", { precision: 14, scale: 2 })
    .default("0")
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    walletId: uuid("wallet_id")
      .notNull()
      .references(() => wallet.id, { onDelete: "cascade" }),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    type: transactionTypeEnum("type").notNull(),
    referenceType: text("reference_type").notNull(),
    referenceId: uuid("reference_id").notNull(),
    description: text("description"),
    status: transactionStatusEnum("status").default("SUCCESSFUL").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userCreatedAtIdx: index("transactions_user_id_created_at_idx").on(
      table.userId,
      table.createdAt,
    ),
    walletCreatedAtIdx: index("transactions_wallet_id_created_at_idx").on(
      table.walletId,
      table.createdAt,
    ),
  }),
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    serviceName: text("service_name").notNull(),
    serviceKey: text("service_key"),
    planName: text("plan_name"),
    planDurationMonths: integer("plan_duration_months"),
    planMembers: integer("plan_members"),
    basePrice: numeric("base_price", { precision: 14, scale: 2 }),
    gstAmount: numeric("gst_amount", { precision: 14, scale: 2 }),
    totalPrice: numeric("total_price", { precision: 14, scale: 2 }),
    externalAccountEmail: text("external_account_email"),
    externalAccountPassword: text("external_account_password"),
    freeTrialTaken: boolean("free_trial_taken").default(false).notNull(),
    freeTrialEndsAt: timestamp("free_trial_ends_at"),
    pendingSince: timestamp("pending_since"),
    monthlyCost: numeric("monthly_cost", { precision: 14, scale: 2 }).notNull(),
    status: subscriptionStatusEnum("status").default("ACTIVE").notNull(),
    nextBillingDate: date("next_billing_date").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueActiveAccountPerServiceIdx: uniqueIndex(
      "subscriptions_unique_active_account_service_idx",
    )
      .on(table.userId, table.serviceKey, table.externalAccountEmail, table.planName)
      .where(
        sql`${table.status} = 'ACTIVE' and ${table.serviceKey} is not null and ${table.externalAccountEmail} is not null and ${table.planName} is not null`,
      ),
  }),
);

export const subscriptionServiceAccounts = pgTable(
  "subscription_service_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    serviceKey: text("service_key").notNull(),
    serviceName: text("service_name").notNull(),
    username: text("username").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    passwordPlain: text("password_plain"),
    acceptedTerms: boolean("accepted_terms").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userServiceEmailIdx: index("subscription_accounts_user_service_email_idx").on(
      table.userId,
      table.serviceKey,
      table.email,
    ),
  }),
);

export const groups = pgTable("groups", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  createdBy: text("created_by")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const groupMembers = pgTable(
  "group_members",
  {
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: groupMemberRoleEnum("role").default("MEMBER").notNull(),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.groupId, table.userId] }),
  }),
);

export const groupSubscriptions = pgTable("group_subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  groupId: uuid("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  subscriptionId: uuid("subscription_id").references(() => subscriptions.id, {
    onDelete: "cascade",
  }),
  serviceName: text("service_name").notNull(),
  serviceKey: text("service_key"),
  planName: text("plan_name"),
  externalAccountEmail: text("external_account_email"),
  externalAccountPassword: text("external_account_password"),
  totalCost: numeric("total_cost", { precision: 14, scale: 2 }).notNull(),
  splitType: splitTypeEnum("split_type").notNull(),
  nextBillingDate: date("next_billing_date").notNull(),
  deleteRequestStatus: groupDeleteRequestStatusEnum("delete_request_status")
    .default("NONE")
    .notNull(),
  deleteRequestedAt: timestamp("delete_requested_at"),
  deletedAt: timestamp("deleted_at"),
  status: subscriptionStatusEnum("status").default("ACTIVE").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const groupSubscriptionSplits = pgTable(
  "group_subscription_splits",
  {
    groupSubscriptionId: uuid("group_subscription_id")
      .notNull()
      .references(() => groupSubscriptions.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    sharePercentage: integer("share_percentage").notNull(),
    shareAmount: numeric("share_amount", { precision: 14, scale: 2 }).notNull(),
    paymentStatus: groupSplitPaymentStatusEnum("payment_status")
      .default("PENDING")
      .notNull(),
    removalRequestStatus: groupMemberRemovalStatusEnum("removal_request_status")
      .default("NONE")
      .notNull(),
    removalRequestedAt: timestamp("removal_requested_at"),
    removedAt: timestamp("removed_at"),
    paidAt: timestamp("paid_at"),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.groupSubscriptionId, table.userId] }),
  }),
);

export const internalTransfers = pgTable(
  "internal_transfers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    senderId: text("sender_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    receiverId: text("receiver_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    status: internalTransferStatusEnum("status").default("PENDING").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    senderCreatedAtIdx: index("internal_transfers_sender_created_at_idx").on(
      table.senderId,
      table.createdAt,
    ),
    receiverCreatedAtIdx: index("internal_transfers_receiver_created_at_idx").on(
      table.receiverId,
      table.createdAt,
    ),
  }),
);

export const walletMoneyRequests = pgTable(
  "wallet_money_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requesterId: text("requester_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    receiverId: text("receiver_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    status: walletMoneyRequestStatusEnum("status").default("PENDING").notNull(),
    internalTransferId: uuid("internal_transfer_id").references(
      () => internalTransfers.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    paidAt: timestamp("paid_at"),
  },
  (table) => ({
    receiverStatusCreatedAtIdx: index("wallet_money_requests_receiver_status_created_at_idx").on(
      table.receiverId,
      table.status,
      table.createdAt,
    ),
    requesterCreatedAtIdx: index("wallet_money_requests_requester_created_at_idx").on(
      table.requesterId,
      table.createdAt,
    ),
  }),
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    isRead: boolean("is_read").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userReadCreatedIdx: index("notifications_user_read_created_at_idx").on(
      table.userId,
      table.isRead,
      table.createdAt,
    ),
  }),
);

export const monitorTokens = pgTable(
  "monitor_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    tokenId: text("token_id").notNull(),
    tokenHash: text("token_hash").notNull(),
    isRevoked: boolean("is_revoked").default(false).notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    tokenIdIdx: uniqueIndex("monitor_tokens_token_id_idx").on(table.tokenId),
    userRevokedIdx: index("monitor_tokens_user_revoked_idx").on(
      table.userId,
      table.isRevoked,
    ),
  }),
);

export const usageLogs = pgTable(
  "usage_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    serviceName: text("service_name").notNull(),
    focusedMinutes: integer("focused_minutes").notNull(),
    date: date("date").notNull(),
    sourceEventId: text("source_event_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userDateIdx: index("usage_logs_user_date_idx").on(table.userId, table.date),
    userServiceDateIdx: index("usage_logs_user_service_date_idx").on(
      table.userId,
      table.serviceName,
      table.date,
    ),
    userEventIdx: uniqueIndex("usage_logs_user_event_idx").on(
      table.userId,
      table.sourceEventId,
    ),
  }),
);

export const ghostAgentRules = pgTable(
  "ghost_agent_rules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    subscriptionId: uuid("subscription_id")
      .notNull()
      .references(() => subscriptions.id, { onDelete: "cascade" }),
    enabled: boolean("enabled").default(false).notNull(),
    minUsageMinutes: integer("min_usage_minutes").default(60).notNull(),
    freeTrialAutoCancel: boolean("free_trial_auto_cancel").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userSubIdx: uniqueIndex("ghost_agent_rules_user_sub_idx").on(
      table.userId,
      table.subscriptionId,
    ),
  }),
);

export const groupMemberSettlements = pgTable(
  "group_member_settlements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupSubscriptionId: uuid("group_subscription_id")
      .notNull()
      .references(() => groupSubscriptions.id, { onDelete: "cascade" }),
    triggerMemberId: text("trigger_member_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    fromUserId: text("from_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    toUserId: text("to_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    internalTransferId: uuid("internal_transfer_id").references(
      () => internalTransfers.id,
      { onDelete: "set null" },
    ),
    status: internalTransferStatusEnum("status").default("PENDING").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
  },
  (table) => ({
    groupStatusIdx: index("group_member_settlements_group_status_idx").on(
      table.groupSubscriptionId,
      table.status,
    ),
  }),
);
