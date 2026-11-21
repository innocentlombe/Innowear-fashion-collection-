import { Order, Product, StoreSettings } from '../types';
import { buildBusinessAppLinks } from './appLinks';

/**
 * Strips formatting from a phone number for https://wa.me/<digits>.
 * If a 10-digit local Zambian number starting with 0 is supplied (e.g. 0971000001),
 * automatically prefixes country code 260.
 */
export function sanitizeWhatsAppNumber(phone: string): string {
  const digits = (phone || '').replace(/\D+/g, '');
  if (!digits) return '';
  if (digits.startsWith('0') && digits.length === 10) {
    return `260${digits.slice(1)}`;
  }
  return digits;
}

export function getBoutiqueWhatsAppNumber(
  settings: Pick<StoreSettings, 'whatsappOrderPhone' | 'storePhone'>
): string {
  return (settings.whatsappOrderPhone || '').trim() || settings.storePhone;
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const digits = sanitizeWhatsAppNumber(phone);
  const encoded = encodeURIComponent(message);
  if (!digits) {
    return `https://wa.me/?text=${encoded}`;
  }
  return `https://wa.me/${digits}?text=${encoded}`;
}

export function buildWhatsAppOrderMessage(
  order: Order,
  settings: StoreSettings,
  deliveryType?: 'Courier Dispatch' | 'Store Collection'
): string {
  const c = settings.currencySymbol;
  const resolvedDelivery =
    deliveryType ||
    (order.deliveryAddress === 'InnoWear Flagship Boutique'
      ? 'Store Collection'
      : 'Courier Dispatch');

  const lines: string[] = [
    `*NEW WHATSAPP ORDER — ${settings.storeName.toUpperCase()}*`,
    `Order #: ${order.orderNumber}`,
    `Date: ${order.date}`,
    '',
    '*Customer Details*',
    `Name: ${order.customerName}`,
  ];

  if (order.customerPhone) {
    lines.push(`Phone: ${order.customerPhone}`);
  }

  lines.push(
    `Fulfillment: ${resolvedDelivery}`,
    `Location: ${order.deliveryAddress || settings.storeAddress}`,
    '',
    '*Items Ordered*'
  );

  for (const item of order.items) {
    const lineTotal = (item.unitPrice * item.qty).toFixed(2);
    lines.push(
      `• ${item.qty}× ${item.name} [${item.sku}] — Size ${item.size}, ${item.colour} — ${c}${lineTotal}`
    );
  }

  lines.push('');

  if (order.discount > 0) {
    lines.push(
      `Promo Discount${order.promoCode ? ` (${order.promoCode})` : ''}: -${c}${order.discount.toFixed(2)}`
    );
  }

  lines.push(
    `Delivery: ${order.deliveryFee === 0 ? 'Complimentary' : `${c}${order.deliveryFee.toFixed(2)}`}`
  );

  if (order.paymentCharge && order.paymentCharge > 0) {
    lines.push(
      `${order.paymentChargeLabel || 'Payment Charge'}: ${c}${order.paymentCharge.toFixed(2)}`
    );
  }

  lines.push(
    `*TOTAL (ZMW): ${c}${order.total.toFixed(2)}*`,
    `Payment Method: ${order.paymentMethod} (${order.paymentStatus})`
  );

  if (order.receiptNotes) {
    lines.push(`Notes: ${order.receiptNotes}`);
  }

  const { customerOrderAppUrl } = buildBusinessAppLinks(settings);
  lines.push('', `Placed via ${settings.storeName} App: ${customerOrderAppUrl}`);

  return lines.join('\n');
}

export function buildWhatsAppSingleItemMessage(params: {
  product: Product;
  size: string;
  colour: string;
  settings: StoreSettings;
}): string {
  const { product, size, colour, settings } = params;
  const c = settings.currencySymbol;
  return [
    `Hello *${settings.storeName}*, I would like to place a WhatsApp order for:`,
    '',
    `• Product: ${product.name}`,
    `• SKU: ${product.sku}`,
    `• Size: ${size}`,
    `• Colour: ${colour}`,
    `• Quantity: 1`,
    `• Price (ZMW): ${c}${product.price.toFixed(2)}`,
    '',
    'Please confirm availability and delivery / pickup details.',
  ].join('\n');
}

export function buildWhatsAppOrderUpdateMessage(order: Order, settings: StoreSettings): string {
  const c = settings.currencySymbol;
  return [
    `Hello ${order.customerName},`,
    `Update on your *${settings.storeName}* order *${order.orderNumber}*:`,
    `• Current Status: ${order.fulfillmentStatus}`,
    `• Order Total (ZMW): ${c}${order.total.toFixed(2)} (${order.paymentMethod} — ${order.paymentStatus})`,
    order.deliveryAddress ? `• Delivery / Pickup: ${order.deliveryAddress}` : '',
    '',
    `Thank you for shopping with ${settings.storeName}.`,
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildWhatsAppGeneralInquiryMessage(settings: StoreSettings): string {
  return `Hello *${settings.storeName}*, I would like to place an order via WhatsApp.`;
}
