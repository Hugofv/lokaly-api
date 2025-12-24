CREATE INDEX "product_images_product_id_idx" ON "product_images" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_stock_product_id_idx" ON "product_stock" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_stock_warehouse_id_idx" ON "product_stock" USING btree ("warehouse_id");--> statement-breakpoint
CREATE INDEX "product_stock_variant_id_idx" ON "product_stock" USING btree ("variant_id");--> statement-breakpoint
ALTER TABLE "product_stock" ADD CONSTRAINT "product_stock_product_id_variant_id_warehouse_id_unique" UNIQUE("product_id","variant_id","warehouse_id");