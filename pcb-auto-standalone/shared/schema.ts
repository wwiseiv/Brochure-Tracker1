import { pgTable, varchar, integer, text, boolean, timestamp, numeric, jsonb, serial, uniqueIndex, unique, date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================================
// PCB Auto - Auto Repair Shop Management SaaS
// ============================================================================

export const AUTO_SHOP_ROLES = ["owner", "manager", "service_advisor", "technician"] as const;
export type AutoShopRole = typeof AUTO_SHOP_ROLES[number];

export const AUTO_RO_STATUSES = ["estimate", "approved", "in_progress", "completed", "invoiced", "paid", "void"] as const;
export type AutoROStatus = typeof AUTO_RO_STATUSES[number];

export const AUTO_LINE_ITEM_TYPES = ["labor", "parts", "sublet", "fee", "discount"] as const;
export type AutoLineItemType = typeof AUTO_LINE_ITEM_TYPES[number];

export const AUTO_PAYMENT_METHODS = ["cash", "card", "check", "financing", "other"] as const;
export type AutoPaymentMethod = typeof AUTO_PAYMENT_METHODS[number];

export const AUTO_PAYMENT_STATUSES = ["pending", "processing", "completed", "failed", "refunded"] as const;
export type AutoPaymentStatus = typeof AUTO_PAYMENT_STATUSES[number];

export const AUTO_DVI_CONDITIONS = ["good", "fair", "poor", "critical"] as const;
export type AutoDVICondition = typeof AUTO_DVI_CONDITIONS[number];

export const AUTO_APPOINTMENT_STATUSES = ["scheduled", "confirmed", "checked_in", "in_progress", "completed", "cancelled", "no_show"] as const;
export type AutoAppointmentStatus = typeof AUTO_APPOINTMENT_STATUSES[number];

export const AUTO_INVITATION_STATUSES = ["pending", "accepted", "expired", "revoked"] as const;
export type AutoInvitationStatus = typeof AUTO_INVITATION_STATUSES[number];

// 1. Auto Shops
export const autoShops = pgTable("auto_shops", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 2 }),
  zip: varchar("zip", { length: 10 }),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 255 }),
  website: varchar("website", { length: 255 }),
  timezone: varchar("timezone", { length: 50 }).default("America/New_York"),
  taxRate: numeric("tax_rate", { precision: 5, scale: 4 }).default("0"),
  laborRate: numeric("labor_rate", { precision: 8, scale: 2 }).default("0"),
  cardFeePercent: numeric("card_fee_percent", { precision: 5, scale: 4 }).default("0"),
  laborTaxable: boolean("labor_taxable").default(false),
  partsTaxRate: numeric("parts_tax_rate", { precision: 5, scale: 3 }).default("0"),
  laborTaxRate: numeric("labor_tax_rate", { precision: 5, scale: 3 }).default("0"),
  debitPosture: varchar("debit_posture", { length: 20 }).default("signature"),
  terminalFeeLock: boolean("terminal_fee_lock").default(true),
  defaultPartsMarkupPct: numeric("default_parts_markup_pct", { precision: 5, scale: 2 }).default("0"),
  shopSupplyMethod: varchar("shop_supply_method", { length: 20 }).default("none"),
  shopSupplyEnabled: boolean("shop_supply_enabled").default(false),
  shopSupplyRatePct: numeric("shop_supply_rate_pct", { precision: 5, scale: 2 }).default("0"),
  shopSupplyMaxAmount: numeric("shop_supply_max_amount", { precision: 10, scale: 2 }).default("0"),
  shopSupplyTaxable: boolean("shop_supply_taxable").default(true),
  brandingColors: jsonb("branding_colors").default({}),
  invoiceFooter: text("invoice_footer"),
  logoUrl: text("logo_url"),
  settings: jsonb("settings").default({}),
  rollfiEnabled: boolean("rollfi_enabled").default(false),
  rollfiCompanyId: varchar("rollfi_company_id", { length: 100 }),
  rollfiApiKey: text("rollfi_api_key"),
  rollfiKybStatus: varchar("rollfi_kyb_status", { length: 30 }).default("not_started"),
  rollfiKybCompletedAt: timestamp("rollfi_kyb_completed_at"),
  rollfiPayFrequency: varchar("rollfi_pay_frequency", { length: 20 }).default("biweekly"),
  rollfiNextPayDate: date("rollfi_next_pay_date"),
  rollfiCheckDate: date("rollfi_check_date"),
  rollfiBankVerified: boolean("rollfi_bank_verified").default(false),
  isActive: boolean("is_active").default(true),
  createdById: varchar("created_by_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const autoShopsRelations = relations(autoShops, ({ many }) => ({
  users: many(autoUsers),
  customers: many(autoCustomers),
  vehicles: many(autoVehicles),
  repairOrders: many(autoRepairOrders),
  bays: many(autoBays),
  appointments: many(autoAppointments),
  invitations: many(autoInvitations),
  messageTemplates: many(autoMessageTemplates),
  paymentLinks: many(autoPaymentLinks),
  timeClock: many(autoTimeClock),
  payrollRuns: many(autoPayrollRuns),
  cannedServices: many(autoCannedServices),
}));

export const insertAutoShopSchema = createInsertSchema(autoShops).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAutoShop = z.infer<typeof insertAutoShopSchema>;
export type AutoShop = typeof autoShops.$inferSelect;

// 2. Auto Users
export const autoUsers = pgTable("auto_users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  shopId: integer("shop_id").notNull().references(() => autoShops.id),
  email: varchar("email", { length: 255 }).notNull(),
  passwordHash: text("password_hash").notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  role: varchar("role", { length: 50 }).notNull(),
  pin: varchar("pin", { length: 10 }),
  payType: varchar("pay_type", { length: 20 }).default("hourly"),
  payRate: numeric("pay_rate", { precision: 8, scale: 2 }),
  hoursPerWeek: numeric("hours_per_week", { precision: 5, scale: 2 }).default("40"),
  rollfiEmployeeId: varchar("rollfi_employee_id", { length: 100 }),
  rollfiOnboardStatus: varchar("rollfi_onboard_status", { length: 30 }).default("not_started"),
  rollfiOnboardedAt: timestamp("rollfi_onboarded_at"),
  rollfiLastSyncAt: timestamp("rollfi_last_sync_at"),
  resetToken: text("reset_token"),
  resetTokenExpiresAt: timestamp("reset_token_expires_at"),
  employeeNumber: varchar("employee_number", { length: 10 }),
  isActive: boolean("is_active").default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueShopEmail: unique().on(table.shopId, table.email),
}));

export const autoUsersRelations = relations(autoUsers, ({ one }) => ({
  shop: one(autoShops, {
    fields: [autoUsers.shopId],
    references: [autoShops.id],
  }),
}));

export const insertAutoUserSchema = createInsertSchema(autoUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAutoUser = z.infer<typeof insertAutoUserSchema>;
export type AutoUser = typeof autoUsers.$inferSelect;

// 3. Auto Invitations
export const autoInvitations = pgTable("auto_invitations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  shopId: integer("shop_id").notNull().references(() => autoShops.id),
  email: varchar("email", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull(),
  invitedById: integer("invited_by_id").notNull().references(() => autoUsers.id),
  token: varchar("token", { length: 255 }).notNull().unique(),
  status: varchar("status", { length: 20 }).default("pending"),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const autoInvitationsRelations = relations(autoInvitations, ({ one }) => ({
  shop: one(autoShops, {
    fields: [autoInvitations.shopId],
    references: [autoShops.id],
  }),
  invitedBy: one(autoUsers, {
    fields: [autoInvitations.invitedById],
    references: [autoUsers.id],
  }),
}));

export const insertAutoInvitationSchema = createInsertSchema(autoInvitations).omit({
  id: true,
  createdAt: true,
});
export type InsertAutoInvitation = z.infer<typeof insertAutoInvitationSchema>;
export type AutoInvitation = typeof autoInvitations.$inferSelect;

// 4. Auto Customers
export const autoCustomers = pgTable("auto_customers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  shopId: integer("shop_id").notNull().references(() => autoShops.id),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 2 }),
  zip: varchar("zip", { length: 10 }),
  notes: text("notes"),
  tags: text("tags").array(),
  preferredContactMethod: varchar("preferred_contact_method", { length: 20 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const autoCustomersRelations = relations(autoCustomers, ({ one, many }) => ({
  shop: one(autoShops, {
    fields: [autoCustomers.shopId],
    references: [autoShops.id],
  }),
  vehicles: many(autoVehicles),
  repairOrders: many(autoRepairOrders),
}));

export const insertAutoCustomerSchema = createInsertSchema(autoCustomers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAutoCustomer = z.infer<typeof insertAutoCustomerSchema>;
export type AutoCustomer = typeof autoCustomers.$inferSelect;

// 5. Auto Vehicles
export const autoVehicles = pgTable("auto_vehicles", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  shopId: integer("shop_id").notNull().references(() => autoShops.id),
  customerId: integer("customer_id").notNull().references(() => autoCustomers.id),
  year: integer("year"),
  make: varchar("make", { length: 100 }),
  model: varchar("model", { length: 100 }),
  trim: varchar("trim", { length: 100 }),
  vin: varchar("vin", { length: 17 }),
  licensePlate: varchar("license_plate", { length: 20 }),
  color: varchar("color", { length: 50 }),
  engineSize: varchar("engine_size", { length: 20 }),
  transmission: varchar("transmission", { length: 20 }),
  mileage: integer("mileage"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const autoVehiclesRelations = relations(autoVehicles, ({ one, many }) => ({
  shop: one(autoShops, {
    fields: [autoVehicles.shopId],
    references: [autoShops.id],
  }),
  customer: one(autoCustomers, {
    fields: [autoVehicles.customerId],
    references: [autoCustomers.id],
  }),
  repairOrders: many(autoRepairOrders),
}));

export const insertAutoVehicleSchema = createInsertSchema(autoVehicles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAutoVehicle = z.infer<typeof insertAutoVehicleSchema>;
export type AutoVehicle = typeof autoVehicles.$inferSelect;

// 12. Auto Bays (defined before repair_orders since it references bays)
export const autoBays = pgTable("auto_bays", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  shopId: integer("shop_id").notNull().references(() => autoShops.id),
  name: varchar("name", { length: 50 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  sellableHoursPerDay: numeric("sellable_hours_per_day", { precision: 4, scale: 1 }).default("8"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const autoBaysRelations = relations(autoBays, ({ one }) => ({
  shop: one(autoShops, {
    fields: [autoBays.shopId],
    references: [autoShops.id],
  }),
}));

export const insertAutoBaySchema = createInsertSchema(autoBays).omit({
  id: true,
  createdAt: true,
});
export type InsertAutoBay = z.infer<typeof insertAutoBaySchema>;
export type AutoBay = typeof autoBays.$inferSelect;

// 6. Auto Repair Orders
export const autoRepairOrders = pgTable("auto_repair_orders", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  shopId: integer("shop_id").notNull().references(() => autoShops.id),
  roNumber: varchar("ro_number", { length: 20 }).notNull(),
  customerId: integer("customer_id").notNull().references(() => autoCustomers.id),
  vehicleId: integer("vehicle_id").notNull().references(() => autoVehicles.id),
  status: varchar("status", { length: 20 }).notNull().default("estimate"),
  serviceAdvisorId: integer("service_advisor_id").references(() => autoUsers.id),
  technicianId: integer("technician_id").references(() => autoUsers.id),
  bayId: integer("bay_id").references(() => autoBays.id),
  customerConcern: text("customer_concern"),
  internalNotes: text("internal_notes"),
  promisedDate: timestamp("promised_date"),
  completedAt: timestamp("completed_at"),
  subtotalCash: numeric("subtotal_cash", { precision: 10, scale: 2 }).default("0"),
  subtotalCard: numeric("subtotal_card", { precision: 10, scale: 2 }).default("0"),
  taxAmount: numeric("tax_amount", { precision: 10, scale: 2 }).default("0"),
  totalCash: numeric("total_cash", { precision: 10, scale: 2 }).default("0"),
  totalCard: numeric("total_card", { precision: 10, scale: 2 }).default("0"),
  approvalToken: varchar("approval_token", { length: 100 }).unique(),
  approvalShortCode: varchar("approval_short_code", { length: 12 }).unique(),
  approvedAt: timestamp("approved_at"),
  approvedBy: varchar("approved_by", { length: 100 }),
  estimateSentAt: timestamp("estimate_sent_at"),
  hideCashDiscount: boolean("hide_cash_discount").default(false),
  taxPartsAmount: numeric("tax_parts_amount", { precision: 10, scale: 2 }).default("0"),
  taxLaborAmount: numeric("tax_labor_amount", { precision: 10, scale: 2 }).default("0"),
  totalAdjustable: numeric("total_adjustable", { precision: 10, scale: 2 }).default("0"),
  totalNonAdjustable: numeric("total_non_adjustable", { precision: 10, scale: 2 }).default("0"),
  feeAmount: numeric("fee_amount", { precision: 10, scale: 2 }).default("0"),
  approvalDeclinedAt: timestamp("approval_declined_at"),
  approvalDeclinedReason: text("approval_declined_reason"),
  approvalQuestion: text("approval_question"),
  approvalQuestionAt: timestamp("approval_question_at"),
  approvalCustomerNote: text("approval_customer_note"),
  approvalSignatureData: text("approval_signature_data"),
  invoiceNumber: varchar("invoice_number", { length: 20 }),
  invoicedAt: timestamp("invoiced_at"),
  paidAt: timestamp("paid_at"),
  mileageIn: integer("mileage_in"),
  mileageOut: integer("mileage_out"),
  paidAmount: numeric("paid_amount", { precision: 10, scale: 2 }).default("0"),
  balanceDue: numeric("balance_due", { precision: 10, scale: 2 }).default("0"),
  shopSupplyAmountCash: numeric("shop_supply_amount_cash", { precision: 10, scale: 2 }).default("0"),
  shopSupplyAmountCard: numeric("shop_supply_amount_card", { precision: 10, scale: 2 }).default("0"),
  discountAmountCash: numeric("discount_amount_cash", { precision: 10, scale: 2 }).default("0"),
  discountAmountCard: numeric("discount_amount_card", { precision: 10, scale: 2 }).default("0"),
  isEstimate: boolean("is_estimate").default(false),
  estimateNumber: varchar("estimate_number", { length: 20 }),
  convertedFromEstimateId: integer("converted_from_estimate_id"),
  convertedToRoId: integer("converted_to_ro_id"),
  locationId: integer("location_id"),
  advisorEmployeeId: integer("advisor_employee_id"),
  customerSignatureData: text("customer_signature_data"),
  customerSignatureTimestamp: timestamp("customer_signature_timestamp"),
  customerSignatureIp: varchar("customer_signature_ip", { length: 45 }),
  customerSignatureMethod: varchar("customer_signature_method", { length: 20 }).default("digital"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueShopRoNumber: unique().on(table.shopId, table.roNumber),
}));

export const autoRepairOrdersRelations = relations(autoRepairOrders, ({ one, many }) => ({
  shop: one(autoShops, {
    fields: [autoRepairOrders.shopId],
    references: [autoShops.id],
  }),
  customer: one(autoCustomers, {
    fields: [autoRepairOrders.customerId],
    references: [autoCustomers.id],
  }),
  vehicle: one(autoVehicles, {
    fields: [autoRepairOrders.vehicleId],
    references: [autoVehicles.id],
  }),
  serviceAdvisor: one(autoUsers, {
    fields: [autoRepairOrders.serviceAdvisorId],
    references: [autoUsers.id],
    relationName: "serviceAdvisorOrders",
  }),
  technician: one(autoUsers, {
    fields: [autoRepairOrders.technicianId],
    references: [autoUsers.id],
    relationName: "technicianOrders",
  }),
  bay: one(autoBays, {
    fields: [autoRepairOrders.bayId],
    references: [autoBays.id],
  }),
  lineItems: many(autoLineItems),
  payments: many(autoPayments),
  dviInspections: many(autoDviInspections),
  paymentLinks: many(autoPaymentLinks),
  roEvents: many(autoRoEvents),
}));

export const insertAutoRepairOrderSchema = createInsertSchema(autoRepairOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAutoRepairOrder = z.infer<typeof insertAutoRepairOrderSchema>;
export type AutoRepairOrder = typeof autoRepairOrders.$inferSelect;

// 7. Auto Line Items
export const autoLineItems = pgTable("auto_line_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  repairOrderId: integer("repair_order_id").notNull().references(() => autoRepairOrders.id),
  type: varchar("type", { length: 20 }).notNull(),
  description: text("description").notNull(),
  partNumber: varchar("part_number", { length: 100 }),
  quantity: numeric("quantity", { precision: 8, scale: 2 }).default("1"),
  unitPriceCash: numeric("unit_price_cash", { precision: 10, scale: 2 }).notNull(),
  unitPriceCard: numeric("unit_price_card", { precision: 10, scale: 2 }).notNull(),
  totalCash: numeric("total_cash", { precision: 10, scale: 2 }).notNull(),
  totalCard: numeric("total_card", { precision: 10, scale: 2 }).notNull(),
  laborHours: numeric("labor_hours", { precision: 6, scale: 2 }),
  laborRate: numeric("labor_rate", { precision: 8, scale: 2 }),
  estimatedHours: numeric("estimated_hours", { precision: 6, scale: 2 }),
  vendorId: varchar("vendor_id", { length: 100 }),
  isTaxable: boolean("is_taxable").default(true),
  isAdjustable: boolean("is_adjustable").default(true),
  isNtnf: boolean("is_ntnf").default(false),
  costPrice: numeric("cost_price", { precision: 10, scale: 2 }),
  sortOrder: integer("sort_order").default(0),
  status: varchar("status", { length: 20 }).default("pending"),
  discountPercent: numeric("discount_percent", { precision: 5, scale: 2 }),
  discountAmountCash: numeric("discount_amount_cash", { precision: 10, scale: 2 }).default("0"),
  discountAmountCard: numeric("discount_amount_card", { precision: 10, scale: 2 }).default("0"),
  discountReason: text("discount_reason"),
  approvalStatus: varchar("approval_status", { length: 20 }).default("pending"),
  approvedAt: timestamp("approved_at"),
  declinedAt: timestamp("declined_at"),
  declinedReason: text("declined_reason"),
  isShopSupply: boolean("is_shop_supply").default(false),
  warrantyMonths: integer("warranty_months"),
  warrantyMiles: integer("warranty_miles"),
  partsPayType: varchar("parts_pay_type", { length: 20 }).default("customer_pay"),
  laborPayType: varchar("labor_pay_type", { length: 20 }).default("customer_pay"),
  retailValueOverride: numeric("retail_value_override", { precision: 10, scale: 2 }),
  warrantyVendor: varchar("warranty_vendor", { length: 100 }),
  warrantyClaimNumber: varchar("warranty_claim_number", { length: 100 }),
  lineOrigin: varchar("line_origin", { length: 20 }).default("original"),
  addedByUserId: integer("added_by_user_id"),
  addedAt: timestamp("added_at"),
  presentedToCustomer: boolean("presented_to_customer").default(false),
  presentedAt: timestamp("presented_at"),
  presentedByAdvisorId: integer("presented_by_advisor_id"),
  customerRespondedAt: timestamp("customer_responded_at"),
  authorizationMethod: varchar("authorization_method", { length: 20 }),
  authorizationTimestamp: timestamp("authorization_timestamp"),
  authorizationConfirmationSent: boolean("authorization_confirmation_sent").default(false),
  authorizationConfirmationId: varchar("authorization_confirmation_id", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const autoLineItemsRelations = relations(autoLineItems, ({ one }) => ({
  repairOrder: one(autoRepairOrders, {
    fields: [autoLineItems.repairOrderId],
    references: [autoRepairOrders.id],
  }),
}));

export const insertAutoLineItemSchema = createInsertSchema(autoLineItems).omit({
  id: true,
  createdAt: true,
});
export type InsertAutoLineItem = z.infer<typeof insertAutoLineItemSchema>;
export type AutoLineItem = typeof autoLineItems.$inferSelect;

// 8. Auto Payments
export const autoPayments = pgTable("auto_payments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  repairOrderId: integer("repair_order_id").notNull().references(() => autoRepairOrders.id),
  shopId: integer("shop_id").notNull().references(() => autoShops.id),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  method: varchar("method", { length: 20 }).notNull(),
  status: varchar("status", { length: 20 }).default("pending"),
  transactionId: varchar("transaction_id", { length: 255 }),
  cardBrand: varchar("card_brand", { length: 20 }),
  cardLast4: varchar("card_last4", { length: 4 }),
  authCode: varchar("auth_code", { length: 50 }),
  tipAmount: numeric("tip_amount", { precision: 10, scale: 2 }),
  refundedAmount: numeric("refunded_amount", { precision: 10, scale: 2 }),
  refundedAt: timestamp("refunded_at"),
  gatewayResponse: jsonb("gateway_response"),
  paymentToken: varchar("payment_token", { length: 100 }).unique(),
  notes: text("notes"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const autoPaymentsRelations = relations(autoPayments, ({ one }) => ({
  repairOrder: one(autoRepairOrders, {
    fields: [autoPayments.repairOrderId],
    references: [autoRepairOrders.id],
  }),
  shop: one(autoShops, {
    fields: [autoPayments.shopId],
    references: [autoShops.id],
  }),
}));

export const insertAutoPaymentSchema = createInsertSchema(autoPayments).omit({
  id: true,
  createdAt: true,
});
export type InsertAutoPayment = z.infer<typeof insertAutoPaymentSchema>;
export type AutoPayment = typeof autoPayments.$inferSelect;

// Auto Payment Links
export const autoPaymentLinks = pgTable("auto_payment_links", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  shopId: integer("shop_id").notNull().references(() => autoShops.id),
  repairOrderId: integer("repair_order_id").notNull().references(() => autoRepairOrders.id),
  token: varchar("token", { length: 100 }).notNull().unique(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  isCardPrice: boolean("is_card_price").default(true),
  url: text("url").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  deliveryChannel: varchar("delivery_channel", { length: 10 }),
  deliveredTo: varchar("delivered_to", { length: 255 }),
  deliveryStatus: varchar("delivery_status", { length: 20 }).default("pending"),
  deliverySid: varchar("delivery_sid", { length: 100 }),
  openedAt: timestamp("opened_at"),
  completedAt: timestamp("completed_at"),
  paymentId: integer("payment_id").references(() => autoPayments.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const autoPaymentLinksRelations = relations(autoPaymentLinks, ({ one }) => ({
  shop: one(autoShops, {
    fields: [autoPaymentLinks.shopId],
    references: [autoShops.id],
  }),
  repairOrder: one(autoRepairOrders, {
    fields: [autoPaymentLinks.repairOrderId],
    references: [autoRepairOrders.id],
  }),
  payment: one(autoPayments, {
    fields: [autoPaymentLinks.paymentId],
    references: [autoPayments.id],
  }),
}));

export const insertAutoPaymentLinkSchema = createInsertSchema(autoPaymentLinks).omit({
  id: true,
  createdAt: true,
});
export type InsertAutoPaymentLink = z.infer<typeof insertAutoPaymentLinkSchema>;
export type AutoPaymentLink = typeof autoPaymentLinks.$inferSelect;

// Auto Message Templates
export const autoMessageTemplates = pgTable("auto_message_templates", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  shopId: integer("shop_id").notNull().references(() => autoShops.id),
  name: varchar("name", { length: 100 }).notNull(),
  channel: varchar("channel", { length: 10 }).notNull(),
  subject: varchar("subject", { length: 255 }),
  body: text("body").notNull(),
  isSystem: boolean("is_system").default(false),
  isActive: boolean("is_active").default(true),
  category: varchar("category", { length: 50 }).default("transactional"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueShopNameChannel: unique().on(table.shopId, table.name, table.channel),
}));

export const autoMessageTemplatesRelations = relations(autoMessageTemplates, ({ one }) => ({
  shop: one(autoShops, {
    fields: [autoMessageTemplates.shopId],
    references: [autoShops.id],
  }),
}));

export const insertAutoMessageTemplateSchema = createInsertSchema(autoMessageTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAutoMessageTemplate = z.infer<typeof insertAutoMessageTemplateSchema>;
export type AutoMessageTemplate = typeof autoMessageTemplates.$inferSelect;

// Auto RO Events (RO timeline)
export const autoRoEvents = pgTable("auto_ro_events", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  repairOrderId: integer("repair_order_id").notNull().references(() => autoRepairOrders.id),
  shopId: integer("shop_id").notNull().references(() => autoShops.id),
  userId: integer("user_id").references(() => autoUsers.id),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  description: text("description").notNull(),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

export const autoRoEventsRelations = relations(autoRoEvents, ({ one }) => ({
  repairOrder: one(autoRepairOrders, {
    fields: [autoRoEvents.repairOrderId],
    references: [autoRepairOrders.id],
  }),
  shop: one(autoShops, {
    fields: [autoRoEvents.shopId],
    references: [autoShops.id],
  }),
  user: one(autoUsers, {
    fields: [autoRoEvents.userId],
    references: [autoUsers.id],
  }),
}));

export const insertAutoRoEventSchema = createInsertSchema(autoRoEvents).omit({
  id: true,
  createdAt: true,
});
export type InsertAutoRoEvent = z.infer<typeof insertAutoRoEventSchema>;
export type AutoRoEvent = typeof autoRoEvents.$inferSelect;

// Auto QBO Sync Log
export const autoQboSyncLog = pgTable("auto_qbo_sync_log", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  shopId: integer("shop_id").notNull().references(() => autoShops.id),
  entityType: varchar("entity_type", { length: 30 }).notNull(),
  entityId: integer("entity_id").notNull(),
  qboEntityId: varchar("qbo_entity_id", { length: 50 }),
  direction: varchar("direction", { length: 10 }).notNull(),
  status: varchar("status", { length: 20 }).notNull(),
  attemptCount: integer("attempt_count").default(1),
  errorMessage: text("error_message"),
  requestPayload: jsonb("request_payload"),
  responsePayload: jsonb("response_payload"),
  nextRetryAt: timestamp("next_retry_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const autoQboSyncLogRelations = relations(autoQboSyncLog, ({ one }) => ({
  shop: one(autoShops, {
    fields: [autoQboSyncLog.shopId],
    references: [autoShops.id],
  }),
}));

export const insertAutoQboSyncLogSchema = createInsertSchema(autoQboSyncLog).omit({
  id: true,
  createdAt: true,
});
export type InsertAutoQboSyncLog = z.infer<typeof insertAutoQboSyncLogSchema>;
export type AutoQboSyncLog = typeof autoQboSyncLog.$inferSelect;

// Auto Time Clock (tech time clock)
export const autoTimeClock = pgTable("auto_time_clock", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  shopId: integer("shop_id").notNull().references(() => autoShops.id),
  userId: integer("user_id").notNull().references(() => autoUsers.id),
  clockInAt: timestamp("clock_in_at").notNull(),
  clockOutAt: timestamp("clock_out_at"),
  repairOrderId: integer("repair_order_id").references(() => autoRepairOrders.id),
  breakMinutes: integer("break_minutes").default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const autoTimeClockRelations = relations(autoTimeClock, ({ one }) => ({
  shop: one(autoShops, {
    fields: [autoTimeClock.shopId],
    references: [autoShops.id],
  }),
  user: one(autoUsers, {
    fields: [autoTimeClock.userId],
    references: [autoUsers.id],
  }),
  repairOrder: one(autoRepairOrders, {
    fields: [autoTimeClock.repairOrderId],
    references: [autoRepairOrders.id],
  }),
}));

export const insertAutoTimeClockSchema = createInsertSchema(autoTimeClock).omit({
  id: true,
  createdAt: true,
});
export type InsertAutoTimeClock = z.infer<typeof insertAutoTimeClockSchema>;
export type AutoTimeClock = typeof autoTimeClock.$inferSelect;

// 9. Auto DVI Templates
export const autoDviTemplates = pgTable("auto_dvi_templates", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  shopId: integer("shop_id").references(() => autoShops.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  categories: jsonb("categories").notNull(),
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const autoDviTemplatesRelations = relations(autoDviTemplates, ({ one }) => ({
  shop: one(autoShops, {
    fields: [autoDviTemplates.shopId],
    references: [autoShops.id],
  }),
}));

export const insertAutoDviTemplateSchema = createInsertSchema(autoDviTemplates).omit({
  id: true,
  createdAt: true,
});
export type InsertAutoDviTemplate = z.infer<typeof insertAutoDviTemplateSchema>;
export type AutoDviTemplate = typeof autoDviTemplates.$inferSelect;

// 10. Auto DVI Inspections
export const autoDviInspections = pgTable("auto_dvi_inspections", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  repairOrderId: integer("repair_order_id").references(() => autoRepairOrders.id),
  shopId: integer("shop_id").notNull().references(() => autoShops.id),
  templateId: integer("template_id").references(() => autoDviTemplates.id),
  technicianId: integer("technician_id").notNull().references(() => autoUsers.id),
  customerId: integer("customer_id").references(() => autoCustomers.id),
  vehicleId: integer("vehicle_id").references(() => autoVehicles.id),
  vehicleMileage: integer("vehicle_mileage"),
  overallCondition: varchar("overall_condition", { length: 20 }),
  publicToken: varchar("public_token", { length: 100 }).unique(),
  status: varchar("status", { length: 20 }).default("in_progress"),
  completedAt: timestamp("completed_at"),
  sentToCustomerAt: timestamp("sent_to_customer_at"),
  customerViewedAt: timestamp("customer_viewed_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const autoDviInspectionsRelations = relations(autoDviInspections, ({ one, many }) => ({
  repairOrder: one(autoRepairOrders, {
    fields: [autoDviInspections.repairOrderId],
    references: [autoRepairOrders.id],
  }),
  shop: one(autoShops, {
    fields: [autoDviInspections.shopId],
    references: [autoShops.id],
  }),
  template: one(autoDviTemplates, {
    fields: [autoDviInspections.templateId],
    references: [autoDviTemplates.id],
  }),
  technician: one(autoUsers, {
    fields: [autoDviInspections.technicianId],
    references: [autoUsers.id],
  }),
  customer: one(autoCustomers, {
    fields: [autoDviInspections.customerId],
    references: [autoCustomers.id],
  }),
  vehicle: one(autoVehicles, {
    fields: [autoDviInspections.vehicleId],
    references: [autoVehicles.id],
  }),
  items: many(autoDviItems),
}));

export const insertAutoDviInspectionSchema = createInsertSchema(autoDviInspections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAutoDviInspection = z.infer<typeof insertAutoDviInspectionSchema>;
export type AutoDviInspection = typeof autoDviInspections.$inferSelect;

// 11. Auto DVI Items
export const autoDviItems = pgTable("auto_dvi_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  inspectionId: integer("inspection_id").notNull().references(() => autoDviInspections.id),
  categoryName: varchar("category_name", { length: 255 }).notNull(),
  itemName: varchar("item_name", { length: 255 }).notNull(),
  condition: varchar("condition", { length: 20 }).notNull(),
  notes: text("notes"),
  photoUrls: text("photo_urls").array(),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const autoDviItemsRelations = relations(autoDviItems, ({ one }) => ({
  inspection: one(autoDviInspections, {
    fields: [autoDviItems.inspectionId],
    references: [autoDviInspections.id],
  }),
}));

export const insertAutoDviItemSchema = createInsertSchema(autoDviItems).omit({
  id: true,
  createdAt: true,
});
export type InsertAutoDviItem = z.infer<typeof insertAutoDviItemSchema>;
export type AutoDviItem = typeof autoDviItems.$inferSelect;

// 13. Auto Appointments
export const autoAppointments = pgTable("auto_appointments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  shopId: integer("shop_id").notNull().references(() => autoShops.id),
  customerId: integer("customer_id").references(() => autoCustomers.id),
  vehicleId: integer("vehicle_id").references(() => autoVehicles.id),
  repairOrderId: integer("repair_order_id").references(() => autoRepairOrders.id),
  bayId: integer("bay_id").references(() => autoBays.id),
  technicianId: integer("technician_id").references(() => autoUsers.id),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 20 }).default("scheduled"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  estimatedDuration: integer("estimated_duration"),
  estimatedLaborHours: numeric("estimated_labor_hours", { precision: 6, scale: 2 }),
  color: varchar("color", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const autoAppointmentsRelations = relations(autoAppointments, ({ one }) => ({
  shop: one(autoShops, {
    fields: [autoAppointments.shopId],
    references: [autoShops.id],
  }),
  customer: one(autoCustomers, {
    fields: [autoAppointments.customerId],
    references: [autoCustomers.id],
  }),
  vehicle: one(autoVehicles, {
    fields: [autoAppointments.vehicleId],
    references: [autoVehicles.id],
  }),
  repairOrder: one(autoRepairOrders, {
    fields: [autoAppointments.repairOrderId],
    references: [autoRepairOrders.id],
  }),
  bay: one(autoBays, {
    fields: [autoAppointments.bayId],
    references: [autoBays.id],
  }),
  technician: one(autoUsers, {
    fields: [autoAppointments.technicianId],
    references: [autoUsers.id],
  }),
}));

export const insertAutoAppointmentSchema = createInsertSchema(autoAppointments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAutoAppointment = z.infer<typeof insertAutoAppointmentSchema>;
export type AutoAppointment = typeof autoAppointments.$inferSelect;

// 14. Auto Integration Configs
export const autoIntegrationConfigs = pgTable("auto_integration_configs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  shopId: integer("shop_id").notNull().references(() => autoShops.id).unique(),
  partstechApiKey: text("partstech_api_key"),
  partstechEnabled: boolean("partstech_enabled").default(false),
  fluidpayApiKey: text("fluidpay_api_key"),
  fluidpayEnabled: boolean("fluidpay_enabled").default(false),
  quickbooksRefreshToken: text("quickbooks_refresh_token"),
  quickbooksRealmId: varchar("quickbooks_realm_id", { length: 100 }),
  quickbooksEnabled: boolean("quickbooks_enabled").default(false),
  twilioPhoneNumber: varchar("twilio_phone_number", { length: 20 }),
  twilioEnabled: boolean("twilio_enabled").default(false),
  motorApiKey: text("motor_api_key"),
  motorEnabled: boolean("motor_enabled").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const autoIntegrationConfigsRelations = relations(autoIntegrationConfigs, ({ one }) => ({
  shop: one(autoShops, {
    fields: [autoIntegrationConfigs.shopId],
    references: [autoShops.id],
  }),
}));

export const insertAutoIntegrationConfigSchema = createInsertSchema(autoIntegrationConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAutoIntegrationConfig = z.infer<typeof insertAutoIntegrationConfigSchema>;
export type AutoIntegrationConfig = typeof autoIntegrationConfigs.$inferSelect;

// 15. Auto SMS Log
export const autoSmsLog = pgTable("auto_sms_log", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  shopId: integer("shop_id").notNull().references(() => autoShops.id),
  customerId: integer("customer_id").references(() => autoCustomers.id),
  repairOrderId: integer("repair_order_id").references(() => autoRepairOrders.id),
  toNumber: varchar("to_number", { length: 20 }).notNull(),
  fromNumber: varchar("from_number", { length: 20 }).notNull(),
  message: text("message").notNull(),
  status: varchar("status", { length: 20 }).default("sent"),
  externalId: varchar("external_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const autoSmsLogRelations = relations(autoSmsLog, ({ one }) => ({
  shop: one(autoShops, {
    fields: [autoSmsLog.shopId],
    references: [autoShops.id],
  }),
  customer: one(autoCustomers, {
    fields: [autoSmsLog.customerId],
    references: [autoCustomers.id],
  }),
  repairOrder: one(autoRepairOrders, {
    fields: [autoSmsLog.repairOrderId],
    references: [autoRepairOrders.id],
  }),
}));

export const insertAutoSmsLogSchema = createInsertSchema(autoSmsLog).omit({
  id: true,
  createdAt: true,
});
export type InsertAutoSmsLog = z.infer<typeof insertAutoSmsLogSchema>;
export type AutoSmsLog = typeof autoSmsLog.$inferSelect;

// 16. Auto Activity Log
export const autoActivityLog = pgTable("auto_activity_log", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  shopId: integer("shop_id").notNull().references(() => autoShops.id),
  userId: integer("user_id").references(() => autoUsers.id),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: integer("entity_id").notNull(),
  action: varchar("action", { length: 50 }).notNull(),
  details: jsonb("details").default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

export const autoActivityLogRelations = relations(autoActivityLog, ({ one }) => ({
  shop: one(autoShops, {
    fields: [autoActivityLog.shopId],
    references: [autoShops.id],
  }),
  user: one(autoUsers, {
    fields: [autoActivityLog.userId],
    references: [autoUsers.id],
  }),
}));

export const insertAutoActivityLogSchema = createInsertSchema(autoActivityLog).omit({
  id: true,
  createdAt: true,
});
export type InsertAutoActivityLog = z.infer<typeof insertAutoActivityLogSchema>;
export type AutoActivityLog = typeof autoActivityLog.$inferSelect;

// 17. Auto Payroll Runs
export const autoPayrollRuns = pgTable("auto_payroll_runs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  shopId: integer("shop_id").notNull().references(() => autoShops.id),
  payPeriodStart: date("pay_period_start").notNull(),
  payPeriodEnd: date("pay_period_end").notNull(),
  checkDate: date("check_date").notNull(),
  submissionDeadline: timestamp("submission_deadline"),
  rollfiPayrollId: varchar("rollfi_payroll_id", { length: 100 }),
  rollfiBatchId: varchar("rollfi_batch_id", { length: 100 }),
  status: varchar("status", { length: 30 }).default("draft"),
  totalGrossPay: numeric("total_gross_pay", { precision: 12, scale: 2 }),
  totalEmployeeTaxes: numeric("total_employee_taxes", { precision: 12, scale: 2 }),
  totalEmployerTaxes: numeric("total_employer_taxes", { precision: 12, scale: 2 }),
  totalDeductions: numeric("total_deductions", { precision: 12, scale: 2 }),
  totalNetPay: numeric("total_net_pay", { precision: 12, scale: 2 }),
  totalEmployerCost: numeric("total_employer_cost", { precision: 12, scale: 2 }),
  employeeCount: integer("employee_count"),
  idempotencyKey: varchar("idempotency_key", { length: 100 }).notNull().unique(),
  errorCode: varchar("error_code", { length: 50 }),
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0),
  maxRetries: integer("max_retries").default(3),
  initiatedById: integer("initiated_by_id").references(() => autoUsers.id),
  approvedById: integer("approved_by_id").references(() => autoUsers.id),
  approvedAt: timestamp("approved_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const autoPayrollRunsRelations = relations(autoPayrollRuns, ({ one, many }) => ({
  shop: one(autoShops, {
    fields: [autoPayrollRuns.shopId],
    references: [autoShops.id],
  }),
  initiatedBy: one(autoUsers, {
    fields: [autoPayrollRuns.initiatedById],
    references: [autoUsers.id],
    relationName: "payrollInitiator",
  }),
  approvedBy: one(autoUsers, {
    fields: [autoPayrollRuns.approvedById],
    references: [autoUsers.id],
    relationName: "payrollApprover",
  }),
  items: many(autoPayrollRunItems),
}));

export const insertAutoPayrollRunSchema = createInsertSchema(autoPayrollRuns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAutoPayrollRun = z.infer<typeof insertAutoPayrollRunSchema>;
export type AutoPayrollRun = typeof autoPayrollRuns.$inferSelect;

// 18. Auto Payroll Run Items (per-employee line items)
export const autoPayrollRunItems = pgTable("auto_payroll_run_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  shopId: integer("shop_id").notNull().references(() => autoShops.id),
  payrollRunId: integer("payroll_run_id").notNull().references(() => autoPayrollRuns.id),
  userId: integer("user_id").notNull().references(() => autoUsers.id),
  regularHours: numeric("regular_hours", { precision: 6, scale: 2 }).default("0"),
  overtimeHours: numeric("overtime_hours", { precision: 6, scale: 2 }).default("0"),
  holidayHours: numeric("holiday_hours", { precision: 6, scale: 2 }).default("0"),
  ptoHours: numeric("pto_hours", { precision: 6, scale: 2 }).default("0"),
  flaggedHours: numeric("flagged_hours", { precision: 6, scale: 2 }).default("0"),
  payRate: numeric("pay_rate", { precision: 8, scale: 2 }),
  overtimeRate: numeric("overtime_rate", { precision: 8, scale: 2 }),
  grossPay: numeric("gross_pay", { precision: 10, scale: 2 }),
  regularPay: numeric("regular_pay", { precision: 10, scale: 2 }),
  overtimePay: numeric("overtime_pay", { precision: 10, scale: 2 }),
  flatRatePay: numeric("flat_rate_pay", { precision: 10, scale: 2 }),
  bonusPay: numeric("bonus_pay", { precision: 10, scale: 2 }),
  additionalEarnings: jsonb("additional_earnings").default([]),
  federalIncomeTax: numeric("federal_income_tax", { precision: 10, scale: 2 }),
  stateIncomeTax: numeric("state_income_tax", { precision: 10, scale: 2 }),
  localIncomeTax: numeric("local_income_tax", { precision: 10, scale: 2 }),
  socialSecurityEmployee: numeric("social_security_employee", { precision: 10, scale: 2 }),
  medicareEmployee: numeric("medicare_employee", { precision: 10, scale: 2 }),
  socialSecurityEmployer: numeric("social_security_employer", { precision: 10, scale: 2 }),
  medicareEmployer: numeric("medicare_employer", { precision: 10, scale: 2 }),
  futa: numeric("futa", { precision: 10, scale: 2 }),
  suta: numeric("suta", { precision: 10, scale: 2 }),
  totalEmployeeTaxes: numeric("total_employee_taxes", { precision: 10, scale: 2 }),
  totalEmployerTaxes: numeric("total_employer_taxes", { precision: 10, scale: 2 }),
  deductions: jsonb("deductions").default([]),
  totalDeductions: numeric("total_deductions", { precision: 10, scale: 2 }).default("0"),
  netPay: numeric("net_pay", { precision: 10, scale: 2 }),
  paymentMethod: varchar("payment_method", { length: 20 }).default("direct_deposit"),
  rollfiItemId: varchar("rollfi_item_id", { length: 100 }),
  rollfiPaystubUrl: text("rollfi_paystub_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const autoPayrollRunItemsRelations = relations(autoPayrollRunItems, ({ one }) => ({
  shop: one(autoShops, {
    fields: [autoPayrollRunItems.shopId],
    references: [autoShops.id],
  }),
  payrollRun: one(autoPayrollRuns, {
    fields: [autoPayrollRunItems.payrollRunId],
    references: [autoPayrollRuns.id],
  }),
  user: one(autoUsers, {
    fields: [autoPayrollRunItems.userId],
    references: [autoUsers.id],
  }),
}));

export const insertAutoPayrollRunItemSchema = createInsertSchema(autoPayrollRunItems).omit({
  id: true,
  createdAt: true,
});
export type InsertAutoPayrollRunItem = z.infer<typeof insertAutoPayrollRunItemSchema>;
export type AutoPayrollRunItem = typeof autoPayrollRunItems.$inferSelect;

// 19. Auto Rollfi Webhook Log
export const autoRollfiWebhookLog = pgTable("auto_rollfi_webhook_log", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  eventId: varchar("event_id", { length: 100 }).notNull().unique(),
  payload: jsonb("payload").notNull(),
  signature: varchar("signature", { length: 255 }),
  shopId: integer("shop_id").references(() => autoShops.id),
  payrollRunId: integer("payroll_run_id").references(() => autoPayrollRuns.id),
  processed: boolean("processed").default(false),
  processedAt: timestamp("processed_at"),
  error: text("error"),
  receivedAt: timestamp("received_at").defaultNow(),
});

export const autoRollfiWebhookLogRelations = relations(autoRollfiWebhookLog, ({ one }) => ({
  shop: one(autoShops, {
    fields: [autoRollfiWebhookLog.shopId],
    references: [autoShops.id],
  }),
  payrollRun: one(autoPayrollRuns, {
    fields: [autoRollfiWebhookLog.payrollRunId],
    references: [autoPayrollRuns.id],
  }),
}));

export const insertAutoRollfiWebhookLogSchema = createInsertSchema(autoRollfiWebhookLog).omit({
  id: true,
  receivedAt: true,
});
export type InsertAutoRollfiWebhookLog = z.infer<typeof insertAutoRollfiWebhookLogSchema>;
export type AutoRollfiWebhookLog = typeof autoRollfiWebhookLog.$inferSelect;

// 20. Auto Canned Services (pre-configured service packages)
export const autoCannedServices = pgTable("auto_canned_services", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  shopId: integer("shop_id").notNull().references(() => autoShops.id),
  name: varchar("name", { length: 150 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }),
  isActive: boolean("is_active").default(true),
  defaultLaborHours: numeric("default_labor_hours", { precision: 6, scale: 2 }),
  defaultLaborRate: numeric("default_labor_rate", { precision: 8, scale: 2 }),
  defaultPriceCash: numeric("default_price_cash", { precision: 10, scale: 2 }),
  defaultPriceCard: numeric("default_price_card", { precision: 10, scale: 2 }),
  isTaxable: boolean("is_taxable").default(true),
  isAdjustable: boolean("is_adjustable").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const autoCannedServicesRelations = relations(autoCannedServices, ({ one, many }) => ({
  shop: one(autoShops, {
    fields: [autoCannedServices.shopId],
    references: [autoShops.id],
  }),
  items: many(autoCannedServiceItems),
}));

export const insertAutoCannedServiceSchema = createInsertSchema(autoCannedServices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAutoCannedService = z.infer<typeof insertAutoCannedServiceSchema>;
export type AutoCannedService = typeof autoCannedServices.$inferSelect;

// 21. Auto Canned Service Items (line items within a canned service)
export const autoCannedServiceItems = pgTable("auto_canned_service_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  cannedServiceId: integer("canned_service_id").notNull().references(() => autoCannedServices.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 20 }).notNull(),
  description: text("description").notNull(),
  partNumber: varchar("part_number", { length: 100 }),
  quantity: numeric("quantity", { precision: 8, scale: 2 }).default("1"),
  unitPriceCash: numeric("unit_price_cash", { precision: 10, scale: 2 }).notNull(),
  unitPriceCard: numeric("unit_price_card", { precision: 10, scale: 2 }),
  laborHours: numeric("labor_hours", { precision: 6, scale: 2 }),
  laborRate: numeric("labor_rate", { precision: 8, scale: 2 }),
  costPrice: numeric("cost_price", { precision: 10, scale: 2 }),
  isTaxable: boolean("is_taxable").default(true),
  isAdjustable: boolean("is_adjustable").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const autoCannedServiceItemsRelations = relations(autoCannedServiceItems, ({ one }) => ({
  cannedService: one(autoCannedServices, {
    fields: [autoCannedServiceItems.cannedServiceId],
    references: [autoCannedServices.id],
  }),
}));

export const insertAutoCannedServiceItemSchema = createInsertSchema(autoCannedServiceItems).omit({
  id: true,
  createdAt: true,
});
export type InsertAutoCannedServiceItem = z.infer<typeof insertAutoCannedServiceItemSchema>;
export type AutoCannedServiceItem = typeof autoCannedServiceItems.$inferSelect;

// 27. Auto Communication Log
export const autoCommunicationLog = pgTable("auto_communication_log", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  shopId: integer("shop_id").notNull().references(() => autoShops.id),
  customerId: integer("customer_id").notNull().references(() => autoCustomers.id),
  repairOrderId: integer("repair_order_id").references(() => autoRepairOrders.id),
  channel: varchar("channel", { length: 20 }).notNull(),
  direction: varchar("direction", { length: 20 }).default("outbound"),
  templateUsed: varchar("template_used", { length: 50 }),
  recipientPhone: varchar("recipient_phone", { length: 30 }),
  recipientEmail: varchar("recipient_email", { length: 255 }),
  subject: text("subject"),
  bodyPreview: text("body_preview"),
  invoiceUrl: text("invoice_url"),
  initiatedBy: integer("initiated_by").references(() => autoUsers.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const autoCommunicationLogRelations = relations(autoCommunicationLog, ({ one }) => ({
  shop: one(autoShops, {
    fields: [autoCommunicationLog.shopId],
    references: [autoShops.id],
  }),
  customer: one(autoCustomers, {
    fields: [autoCommunicationLog.customerId],
    references: [autoCustomers.id],
  }),
  repairOrder: one(autoRepairOrders, {
    fields: [autoCommunicationLog.repairOrderId],
    references: [autoRepairOrders.id],
  }),
  user: one(autoUsers, {
    fields: [autoCommunicationLog.initiatedBy],
    references: [autoUsers.id],
  }),
}));

export const insertAutoCommunicationLogSchema = createInsertSchema(autoCommunicationLog).omit({
  id: true,
  createdAt: true,
});
export type InsertAutoCommunicationLog = z.infer<typeof insertAutoCommunicationLogSchema>;
export type AutoCommunicationLog = typeof autoCommunicationLog.$inferSelect;

// 28. Auto Staff Availability
export const autoStaffAvailability = pgTable("auto_staff_availability", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  shopId: integer("shop_id").notNull().references(() => autoShops.id),
  userId: integer("user_id").notNull().references(() => autoUsers.id),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: varchar("start_time", { length: 5 }).notNull(),
  endTime: varchar("end_time", { length: 5 }).notNull(),
  isAvailable: boolean("is_available").default(true),
}, (table) => ({
  uniqueUserDay: unique().on(table.userId, table.dayOfWeek),
}));

export const autoStaffAvailabilityRelations = relations(autoStaffAvailability, ({ one }) => ({
  shop: one(autoShops, {
    fields: [autoStaffAvailability.shopId],
    references: [autoShops.id],
  }),
  user: one(autoUsers, {
    fields: [autoStaffAvailability.userId],
    references: [autoUsers.id],
  }),
}));

export const insertAutoStaffAvailabilitySchema = createInsertSchema(autoStaffAvailability).omit({
  id: true,
});
export type InsertAutoStaffAvailability = z.infer<typeof insertAutoStaffAvailabilitySchema>;
export type AutoStaffAvailability = typeof autoStaffAvailability.$inferSelect;

// 29. Auto Staff Time Off
export const autoStaffTimeOff = pgTable("auto_staff_time_off", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  shopId: integer("shop_id").notNull().references(() => autoShops.id),
  userId: integer("user_id").notNull().references(() => autoUsers.id),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  reason: text("reason"),
  status: varchar("status", { length: 20 }).default("approved"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const autoStaffTimeOffRelations = relations(autoStaffTimeOff, ({ one }) => ({
  shop: one(autoShops, {
    fields: [autoStaffTimeOff.shopId],
    references: [autoShops.id],
  }),
  user: one(autoUsers, {
    fields: [autoStaffTimeOff.userId],
    references: [autoUsers.id],
  }),
}));

export const insertAutoStaffTimeOffSchema = createInsertSchema(autoStaffTimeOff).omit({
  id: true,
  createdAt: true,
});
export type InsertAutoStaffTimeOff = z.infer<typeof insertAutoStaffTimeOffSchema>;
export type AutoStaffTimeOff = typeof autoStaffTimeOff.$inferSelect;

// 30. Auto Dashboard Visibility
export const autoDashboardVisibility = pgTable("auto_dashboard_visibility", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  shopId: integer("shop_id").notNull().references(() => autoShops.id),
  cardKey: varchar("card_key", { length: 50 }).notNull(),
  visibleToOwner: boolean("visible_to_owner").default(true),
  visibleToManager: boolean("visible_to_manager").default(true),
  visibleToAdvisor: boolean("visible_to_advisor").default(true),
  visibleToTech: boolean("visible_to_tech").default(false),
}, (table) => ({
  uniqueShopCard: unique().on(table.shopId, table.cardKey),
}));

export const autoDashboardVisibilityRelations = relations(autoDashboardVisibility, ({ one }) => ({
  shop: one(autoShops, {
    fields: [autoDashboardVisibility.shopId],
    references: [autoShops.id],
  }),
}));

export const insertAutoDashboardVisibilitySchema = createInsertSchema(autoDashboardVisibility).omit({
  id: true,
});
export type InsertAutoDashboardVisibility = z.infer<typeof insertAutoDashboardVisibilitySchema>;
export type AutoDashboardVisibility = typeof autoDashboardVisibility.$inferSelect;

// 31. Auto Locations
export const autoLocations = pgTable("auto_locations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  shopId: integer("shop_id").notNull().references(() => autoShops.id),
  locationNumber: integer("location_number").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  addressLine1: varchar("address_line1", { length: 255 }),
  addressLine2: varchar("address_line2", { length: 255 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 2 }),
  zip: varchar("zip", { length: 10 }),
  phone: varchar("phone", { length: 20 }),
  isPrimary: boolean("is_primary").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueShopLocation: unique().on(table.shopId, table.locationNumber),
}));

export const autoLocationsRelations = relations(autoLocations, ({ one }) => ({
  shop: one(autoShops, {
    fields: [autoLocations.shopId],
    references: [autoShops.id],
  }),
}));

export const insertAutoLocationSchema = createInsertSchema(autoLocations).omit({
  id: true,
  createdAt: true,
});
export type InsertAutoLocation = z.infer<typeof insertAutoLocationSchema>;
export type AutoLocation = typeof autoLocations.$inferSelect;

// 32. Auto RO Sequences
export const autoRoSequences = pgTable("auto_ro_sequences", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  shopId: integer("shop_id").notNull().references(() => autoShops.id),
  locationId: integer("location_id").notNull().references(() => autoLocations.id),
  currentNumber: integer("current_number").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueShopLocation: unique().on(table.shopId, table.locationId),
}));

export const autoRoSequencesRelations = relations(autoRoSequences, ({ one }) => ({
  shop: one(autoShops, {
    fields: [autoRoSequences.shopId],
    references: [autoShops.id],
  }),
  location: one(autoLocations, {
    fields: [autoRoSequences.locationId],
    references: [autoLocations.id],
  }),
}));

export const insertAutoRoSequenceSchema = createInsertSchema(autoRoSequences).omit({
  id: true,
});
export type InsertAutoRoSequence = z.infer<typeof insertAutoRoSequenceSchema>;
export type AutoRoSequence = typeof autoRoSequences.$inferSelect;

// 33. Auto Estimate Sequences
export const autoEstimateSequences = pgTable("auto_estimate_sequences", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  shopId: integer("shop_id").notNull().references(() => autoShops.id),
  currentNumber: integer("current_number").notNull().default(10000),
  prefix: varchar("prefix", { length: 10 }).default("EST-"),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueShop: unique().on(table.shopId),
}));

export const autoEstimateSequencesRelations = relations(autoEstimateSequences, ({ one }) => ({
  shop: one(autoShops, {
    fields: [autoEstimateSequences.shopId],
    references: [autoShops.id],
  }),
}));

export const insertAutoEstimateSequenceSchema = createInsertSchema(autoEstimateSequences).omit({
  id: true,
});
export type InsertAutoEstimateSequence = z.infer<typeof insertAutoEstimateSequenceSchema>;
export type AutoEstimateSequence = typeof autoEstimateSequences.$inferSelect;

// 34. Auto Tech Sessions
export const autoTechSessions = pgTable("auto_tech_sessions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  shopId: integer("shop_id").notNull().references(() => autoShops.id),
  repairOrderId: integer("repair_order_id").notNull().references(() => autoRepairOrders.id),
  serviceLineId: integer("service_line_id").notNull().references(() => autoLineItems.id),
  techEmployeeId: integer("tech_employee_id").notNull().references(() => autoUsers.id),
  clockIn: timestamp("clock_in").notNull().defaultNow(),
  clockOut: timestamp("clock_out"),
  durationMinutes: integer("duration_minutes"),
  isActive: boolean("is_active").default(true),
  autoClockOut: boolean("auto_clock_out").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const autoTechSessionsRelations = relations(autoTechSessions, ({ one }) => ({
  shop: one(autoShops, {
    fields: [autoTechSessions.shopId],
    references: [autoShops.id],
  }),
  repairOrder: one(autoRepairOrders, {
    fields: [autoTechSessions.repairOrderId],
    references: [autoRepairOrders.id],
  }),
  serviceLine: one(autoLineItems, {
    fields: [autoTechSessions.serviceLineId],
    references: [autoLineItems.id],
  }),
  techEmployee: one(autoUsers, {
    fields: [autoTechSessions.techEmployeeId],
    references: [autoUsers.id],
  }),
}));

export const insertAutoTechSessionSchema = createInsertSchema(autoTechSessions).omit({
  id: true,
  createdAt: true,
});
export type InsertAutoTechSession = z.infer<typeof insertAutoTechSessionSchema>;
export type AutoTechSession = typeof autoTechSessions.$inferSelect;

// 35. Auto Declined Services
export const autoDeclinedServices = pgTable("auto_declined_services", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  shopId: integer("shop_id").notNull().references(() => autoShops.id),
  customerId: integer("customer_id").notNull().references(() => autoCustomers.id),
  vehicleId: integer("vehicle_id").notNull().references(() => autoVehicles.id),
  repairOrderId: integer("repair_order_id").notNull().references(() => autoRepairOrders.id),
  serviceLineId: integer("service_line_id").notNull().references(() => autoLineItems.id),
  serviceDescription: text("service_description").notNull(),
  estimatedCost: numeric("estimated_cost", { precision: 10, scale: 2 }),
  declinedAt: timestamp("declined_at").notNull().defaultNow(),
  followUpSent: boolean("follow_up_sent").default(false),
  followUpSentAt: timestamp("follow_up_sent_at"),
  followUpResponse: varchar("follow_up_response", { length: 20 }),
  followUpCampaignId: integer("follow_up_campaign_id"),
  convertedToRoId: integer("converted_to_ro_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const autoDeclinedServicesRelations = relations(autoDeclinedServices, ({ one }) => ({
  shop: one(autoShops, {
    fields: [autoDeclinedServices.shopId],
    references: [autoShops.id],
  }),
  customer: one(autoCustomers, {
    fields: [autoDeclinedServices.customerId],
    references: [autoCustomers.id],
  }),
  vehicle: one(autoVehicles, {
    fields: [autoDeclinedServices.vehicleId],
    references: [autoVehicles.id],
  }),
  repairOrder: one(autoRepairOrders, {
    fields: [autoDeclinedServices.repairOrderId],
    references: [autoRepairOrders.id],
  }),
  serviceLine: one(autoLineItems, {
    fields: [autoDeclinedServices.serviceLineId],
    references: [autoLineItems.id],
  }),
}));

export const insertAutoDeclinedServiceSchema = createInsertSchema(autoDeclinedServices).omit({
  id: true,
  createdAt: true,
});
export type InsertAutoDeclinedService = z.infer<typeof insertAutoDeclinedServiceSchema>;
export type AutoDeclinedService = typeof autoDeclinedServices.$inferSelect;

// 36. Auto Campaign Settings
export const autoCampaignSettings = pgTable("auto_campaign_settings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  shopId: integer("shop_id").notNull().references(() => autoShops.id).unique(),
  declinedFollowupEnabled: boolean("declined_followup_enabled").default(true),
  declinedFollowupDays: text("declined_followup_days").default("3,7,14"),
  declinedFollowupChannel: varchar("declined_followup_channel", { length: 10 }).default("email"),
  declinedFollowupEmailTemplate: text("declined_followup_email_template"),
  declinedFollowupSmsTemplate: text("declined_followup_sms_template"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const autoCampaignSettingsRelations = relations(autoCampaignSettings, ({ one }) => ({
  shop: one(autoShops, {
    fields: [autoCampaignSettings.shopId],
    references: [autoShops.id],
  }),
}));

export const insertAutoCampaignSettingsSchema = createInsertSchema(autoCampaignSettings).omit({
  id: true,
  createdAt: true,
});
export type InsertAutoCampaignSettings = z.infer<typeof insertAutoCampaignSettingsSchema>;
export type AutoCampaignSettings = typeof autoCampaignSettings.$inferSelect;

// 37. Auto RO Close Snapshots
export const autoRoCloseSnapshots = pgTable("auto_ro_close_snapshots", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  shopId: integer("shop_id").notNull().references(() => autoShops.id),
  repairOrderId: integer("repair_order_id").notNull().references(() => autoRepairOrders.id).unique(),
  locationId: integer("location_id"),
  advisorEmployeeId: integer("advisor_employee_id"),
  roNumber: varchar("ro_number", { length: 20 }).notNull(),
  customerId: integer("customer_id"),
  vehicleId: integer("vehicle_id"),
  totalLines: integer("total_lines").notNull().default(0),
  originalLines: integer("original_lines").notNull().default(0),
  addonLines: integer("addon_lines").notNull().default(0),
  inspectionLines: integer("inspection_lines").notNull().default(0),
  approvedAddonLines: integer("approved_addon_lines").notNull().default(0),
  declinedAddonLines: integer("declined_addon_lines").notNull().default(0),
  totalPartsRevenue: numeric("total_parts_revenue", { precision: 10, scale: 2 }).default("0"),
  totalLaborRevenue: numeric("total_labor_revenue", { precision: 10, scale: 2 }).default("0"),
  totalFeesRevenue: numeric("total_fees_revenue", { precision: 10, scale: 2 }).default("0"),
  totalSubletRevenue: numeric("total_sublet_revenue", { precision: 10, scale: 2 }).default("0"),
  totalDiscount: numeric("total_discount", { precision: 10, scale: 2 }).default("0"),
  totalCustomerPay: numeric("total_customer_pay", { precision: 10, scale: 2 }).default("0"),
  totalInternalCharges: numeric("total_internal_charges", { precision: 10, scale: 2 }).default("0"),
  totalWarrantyCharges: numeric("total_warranty_charges", { precision: 10, scale: 2 }).default("0"),
  totalBilledHours: numeric("total_billed_hours", { precision: 8, scale: 2 }).default("0"),
  totalActualHours: numeric("total_actual_hours", { precision: 8, scale: 2 }).default("0"),
  techSummary: jsonb("tech_summary").default([]),
  closedAt: timestamp("closed_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const autoRoCloseSnapshotsRelations = relations(autoRoCloseSnapshots, ({ one }) => ({
  shop: one(autoShops, {
    fields: [autoRoCloseSnapshots.shopId],
    references: [autoShops.id],
  }),
  repairOrder: one(autoRepairOrders, {
    fields: [autoRoCloseSnapshots.repairOrderId],
    references: [autoRepairOrders.id],
  }),
}));

export const insertAutoRoCloseSnapshotSchema = createInsertSchema(autoRoCloseSnapshots).omit({
  id: true,
  createdAt: true,
});
export type InsertAutoRoCloseSnapshot = z.infer<typeof insertAutoRoCloseSnapshotSchema>;
export type AutoRoCloseSnapshot = typeof autoRoCloseSnapshots.$inferSelect;
