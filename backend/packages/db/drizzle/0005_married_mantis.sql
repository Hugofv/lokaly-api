CREATE TABLE "addresses" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "addresses_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"customer_id" bigint NOT NULL,
	"type" text NOT NULL,
	"label" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"recipient_name" text,
	"recipient_phone" text,
	"street" text NOT NULL,
	"number" text NOT NULL,
	"complement" text,
	"neighborhood" text NOT NULL,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"zip_code" text NOT NULL,
	"country" text DEFAULT 'BR' NOT NULL,
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"delivery_instructions" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "couriers" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "couriers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"phone" text NOT NULL,
	"phone_verified" boolean DEFAULT false NOT NULL,
	"date_of_birth" timestamp,
	"avatar_url" text,
	"cpf" text NOT NULL,
	"rg" text,
	"cnh" text,
	"cnh_category" text,
	"vehicle_type" text NOT NULL,
	"vehicle_brand" text,
	"vehicle_model" text,
	"vehicle_year" integer,
	"license_plate" text,
	"vehicle_color" text,
	"status" text NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"current_latitude" numeric(10, 8),
	"current_longitude" numeric(11, 8),
	"last_location_update" timestamp,
	"total_deliveries" integer DEFAULT 0 NOT NULL,
	"total_rating" numeric(3, 2),
	"total_ratings" integer DEFAULT 0 NOT NULL,
	"on_time_delivery_rate" numeric(5, 2),
	"is_verified" boolean DEFAULT false NOT NULL,
	"verified_at" timestamp,
	"verified_by" bigint,
	"last_login_at" timestamp,
	"last_login_ip" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "couriers_email_unique" UNIQUE("email"),
	CONSTRAINT "couriers_cpf_unique" UNIQUE("cpf")
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "customers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"email" text NOT NULL,
	"password_hash" text,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"phone" text,
	"phone_verified" boolean DEFAULT false NOT NULL,
	"date_of_birth" timestamp,
	"gender" text,
	"avatar_url" text,
	"cpf" text,
	"cnpj" text,
	"company_name" text,
	"status" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"email_verified_at" timestamp,
	"email_verification_token" text,
	"language" text DEFAULT 'pt-BR',
	"currency" text DEFAULT 'BRL',
	"timezone" text DEFAULT 'America/Sao_Paulo',
	"marketing_consent" boolean DEFAULT false NOT NULL,
	"sms_consent" boolean DEFAULT false NOT NULL,
	"email_consent" boolean DEFAULT true NOT NULL,
	"loyalty_points" integer DEFAULT 0 NOT NULL,
	"loyalty_tier" text DEFAULT 'bronze',
	"total_orders" integer DEFAULT 0 NOT NULL,
	"total_spent" numeric(10, 2) DEFAULT '0.00',
	"last_login_at" timestamp,
	"last_login_ip" text,
	"password_changed_at" timestamp,
	"password_reset_token" text,
	"password_reset_expires_at" timestamp,
	"account_locked_until" timestamp,
	"failed_login_attempts" integer DEFAULT 0 NOT NULL,
	"social_provider" text,
	"social_id" text,
	"referral_code" text,
	"referred_by" bigint,
	"notes" text,
	"custom_attributes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "customers_email_unique" UNIQUE("email"),
	CONSTRAINT "customers_cpf_unique" UNIQUE("cpf"),
	CONSTRAINT "customers_cnpj_unique" UNIQUE("cnpj"),
	CONSTRAINT "customers_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"phone" text,
	"avatar_url" text,
	"department" text,
	"permissions" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"email_verified_at" timestamp,
	"last_login_at" timestamp,
	"last_login_ip" text,
	"password_changed_at" timestamp,
	"password_reset_token" text,
	"password_reset_expires_at" timestamp,
	"two_factor_enabled" boolean DEFAULT false NOT NULL,
	"two_factor_secret" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "delivery_assignments" ALTER COLUMN "courier_id" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "customer_id" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "cancelled_by" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "product_reviews" ALTER COLUMN "customer_id" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "delivery_assignments" ADD COLUMN "estimated_distance" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "delivery_assignments" ADD COLUMN "actual_distance" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_address_id" bigint;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "discount_amount" numeric(10, 2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_gateway" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "order_number" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "internal_notes" text;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD COLUMN "order_id" bigint;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD COLUMN "moderated_by" bigint;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD COLUMN "moderated_at" timestamp;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD COLUMN "moderation_notes" text;--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "couriers" ADD CONSTRAINT "couriers_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_referred_by_customers_id_fk" FOREIGN KEY ("referred_by") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "addresses_customer_id_idx" ON "addresses" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "addresses_zip_code_idx" ON "addresses" USING btree ("zip_code");--> statement-breakpoint
CREATE INDEX "couriers_email_idx" ON "couriers" USING btree ("email");--> statement-breakpoint
CREATE INDEX "couriers_phone_idx" ON "couriers" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "couriers_cpf_idx" ON "couriers" USING btree ("cpf");--> statement-breakpoint
CREATE INDEX "couriers_status_idx" ON "couriers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "couriers_available_idx" ON "couriers" USING btree ("is_available");--> statement-breakpoint
CREATE INDEX "customers_email_idx" ON "customers" USING btree ("email");--> statement-breakpoint
CREATE INDEX "customers_phone_idx" ON "customers" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "customers_cpf_idx" ON "customers" USING btree ("cpf");--> statement-breakpoint
CREATE INDEX "customers_status_idx" ON "customers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "customers_referral_code_idx" ON "customers" USING btree ("referral_code");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
ALTER TABLE "delivery_assignments" ADD CONSTRAINT "delivery_assignments_courier_id_couriers_id_fk" FOREIGN KEY ("courier_id") REFERENCES "public"."couriers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_delivery_address_id_addresses_id_fk" FOREIGN KEY ("delivery_address_id") REFERENCES "public"."addresses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_cancelled_by_users_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_moderated_by_users_id_fk" FOREIGN KEY ("moderated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_base_unit_id_units_id_fk" FOREIGN KEY ("base_unit_id") REFERENCES "public"."units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "delivery_assignments_order_id_idx" ON "delivery_assignments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "delivery_assignments_courier_id_idx" ON "delivery_assignments" USING btree ("courier_id");--> statement-breakpoint
CREATE INDEX "delivery_assignments_status_idx" ON "delivery_assignments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_customer_id_idx" ON "orders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_order_number_idx" ON "orders" USING btree ("order_number");--> statement-breakpoint
CREATE INDEX "orders_created_at_idx" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "product_reviews_product_id_idx" ON "product_reviews" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_reviews_customer_id_idx" ON "product_reviews" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "product_reviews_rating_idx" ON "product_reviews" USING btree ("rating");--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_department_id_code_unique" UNIQUE("department_id","code");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_order_number_unique" UNIQUE("order_number");--> statement-breakpoint
ALTER TABLE "subcategories" ADD CONSTRAINT "subcategories_category_id_code_unique" UNIQUE("category_id","code");