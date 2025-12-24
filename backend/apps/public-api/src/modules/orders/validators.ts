/**
 * Public Orders Validators
 */

import { t } from 'elysia';
import { numericId } from '../../shared/validators';

export const ordersValidators = {
  create: {
    body: t.Object({
      items: t.Array(
        t.Object({
          productId: t.Numeric(),
          productVariantId: t.Optional(t.Numeric()),
          quantity: t.Numeric(),
          unitPrice: t.Numeric(),
          productName: t.String(),
          productSku: t.Optional(t.String()),
        })
      ),
      deliveryAddressId: t.Optional(t.Numeric()),
      deliveryAddress: t.String(),
      deliveryInstructions: t.Optional(t.String()),
      subtotalAmount: t.Numeric(),
      taxAmount: t.Optional(t.Numeric()),
      deliveryFee: t.Optional(t.Numeric()),
      discountAmount: t.Optional(t.Numeric()),
      paymentMethod: t.Optional(t.String()),
      notes: t.Optional(t.String()),
    }),
  },
  getById: {
    params: numericId,
  },
};
