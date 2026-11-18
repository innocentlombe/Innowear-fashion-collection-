import React, { useMemo, useState } from 'react';
import { ShoppingBag, X, Plus, Minus, CheckCircle2, Truck, Store } from 'lucide-react';
import { Order, OrderItem, Product, ProductCategory } from '../types';
import { useInnoWear, getProductTotalStock } from '../store/useInnoWearStore';
import { ProductImage } from '../components/ProductImage';
import { Modal } from '../components/Modal';
import { IMAGES } from '../data/seedData';

export const StorefrontView: React.FC = () => {
  const { state, completeSale, notify } = useInnoWear();
  const c = state.settings.currencySymbol;

  const [category, setCategory] = useState<'All' | ProductCategory>('All');
  const [bag, setBag] = useState<OrderItem[]>([]);
  const [bagOpen, setBagOpen] = useState(false);

  // Product detail modal
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [chosenSize, setChosenSize] = useState('');
  const [chosenColour, setChosenColour] = useState('');

  // Checkout state
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryType, setDeliveryType] = useState<'Courier Dispatch' | 'Store Collection'>('Courier Dispatch');
  const [paymentMethod, setPaymentMethod] = useState<'Card' | 'Mobile Money' | 'Cash on Delivery'>('Card');
  const [promoCode, setPromoCode] = useState('');
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  const categories: Array<'All' | ProductCategory> = [
    'All',
    'Tailoring',
    'Outerwear',
    'Dresses',
    'Footwear',
    'Accessories',
  ];

  const visibleProducts = useMemo(
    () => state.products.filter((p) => category === 'All' || p.category === category),
    [state.products, category]
  );

  const openPdp = (prod: Product) => {
    setActiveProduct(prod);
    const firstAvail = prod.sizes.find((s) => (prod.stockBySize[s] ?? 0) > 0) || prod.sizes[0];
    setChosenSize(firstAvail);
    setChosenColour(prod.colours[0] || 'Obsidian Black');
  };

  const addToBag = (prod: Product, size: string, colour: string) => {
    const avail = prod.stockBySize[size] ?? 0;
    if (avail <= 0) {
      notify(`Size ${size} is currently sold out.`);
      return;
    }
    setBag((prev) => {
      const idx = prev.findIndex(
        (i) => i.productId === prod.id && i.size === size && i.colour === colour
      );
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: Math.min(avail, next[idx].qty + 1) };
        return next;
      }
      return [
        ...prev,
        {
          productId: prod.id,
          sku: prod.sku,
          name: prod.name,
          size,
          colour,
          qty: 1,
          unitPrice: prod.price,
          unitCost: prod.cost,
        },
      ];
    });
    setActiveProduct(null);
    setBagOpen(true);
  };

  const updateBagQty = (idx: number, delta: number) => {
    setBag((prev) => {
      const target = prev[idx];
      if (!target) return prev;
      const nextQty = target.qty + delta;
      if (nextQty <= 0) return prev.filter((_, i) => i !== idx);
      const next = [...prev];
      next[idx] = { ...target, qty: nextQty };
      return next;
    });
  };

  const subtotal = bag.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  const activePromo = state.campaigns.find(
    (cam) => cam.promoCode.toUpperCase() === promoCode.trim().toUpperCase() && cam.status === 'Active'
  );
  const discount = activePromo ? Number(((subtotal * activePromo.discountPercent) / 100).toFixed(2)) : 0;
  const deliveryFee =
    deliveryType === 'Courier Dispatch' && subtotal > 0 && subtotal < state.settings.freeDeliveryThreshold
      ? state.settings.deliveryFeeStandard
      : 0;
  const tax = Number((((subtotal - discount) * state.settings.taxRate) / 100).toFixed(2));
  const total = Number((subtotal - discount + deliveryFee + tax).toFixed(2));

  const placeOnlineOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (bag.length === 0 || !customerName.trim()) return;

    const order = completeSale({
      items: bag,
      channel: 'Online',
      paymentMethod,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: customerEmail.trim(),
      deliveryAddress:
        deliveryType === 'Store Collection'
          ? 'InnoWear Flagship Boutique'
          : deliveryAddress.trim() || 'Lusaka City Center',
      deliveryType,
      promoCode: activePromo ? activePromo.promoCode : undefined,
    });

    setConfirmedOrder(order);
    setBag([]);
    setBagOpen(false);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setDeliveryAddress('');
    setPromoCode('');
  };

  return (
    <div className="space-y-8">
      {/* Storefront Header Bar */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-[var(--border-hairline)]">
        <div>
          <span className="font-display text-2xl font-semibold tracking-wide text-[var(--text-primary)]">
            INNOWEAR
          </span>
          <span className="ml-3 text-xs text-[var(--text-muted)]">
            Online Storefront · Live Sync with Inventory & Orders
          </span>
        </div>
        <button
          type="button"
          onClick={() => setBagOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] transition-colors whitespace-nowrap shrink-0"
        >
          <ShoppingBag className="w-4 h-4" />
          Shopping Bag ({bag.reduce((s, i) => s + i.qty, 0)})
        </button>
      </div>

      {/* Campaign Hero */}
      <section className="relative rounded-lg overflow-hidden border border-[var(--border-hairline)] min-h-[340px] flex items-end">
        <ProductImage
          src={IMAGES.hero}
          alt="InnoWear Fashion Collection Autumn/Winter Campaign"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/15" />
        <div className="relative z-10 p-8 sm:p-10 max-w-2xl">
          <p className="text-xs font-medium text-[var(--accent)] tracking-wider mb-2">
            Autumn / Winter Atelier Edition
          </p>
          <h1 className="font-display text-3xl sm:text-5xl font-semibold text-white leading-tight text-balance">
            Architectural Tailoring & Evening Silhouettes
          </h1>
          <p className="text-sm text-neutral-200 mt-3 max-w-lg">
            Complimentary express courier delivery on orders over {c}
            {state.settings.freeDeliveryThreshold}. Use code INNO10 for 10% off your seasonal order.
          </p>
        </div>
      </section>

      {/* Collection Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                category === cat
                  ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                  : 'bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <span className="text-xs text-[var(--text-muted)]">
          Showing {visibleProducts.length} pieces
        </span>
      </div>

      {/* 3-Column Luxury Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleProducts.map((prod) => {
          const totalStock = getProductTotalStock(prod);
          return (
            <div
              key={prod.id}
              className="group rounded-lg overflow-hidden bg-[var(--bg-surface)] border border-[var(--border-hairline)] hover:border-[var(--accent)] transition-all flex flex-col"
            >
              <button
                type="button"
                onClick={() => openPdp(prod)}
                className="aspect-[4/3] w-full overflow-hidden bg-[var(--bg-elevated)] block"
              >
                <ProductImage
                  src={prod.image}
                  alt={prod.name}
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                />
              </button>
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <p className="text-xs text-[var(--text-muted)]">
                    {prod.category}
                    {prod.isNewArrival ? ' · New Arrival' : ''}
                    {' · '}
                    {totalStock > 0 ? 'In Stock' : 'Sold Out'}
                  </p>
                  <h3 className="text-base font-semibold text-[var(--text-primary)] mt-1">
                    {prod.name}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1.5 line-clamp-2">
                    {prod.description}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 mt-4 border-t border-[var(--border-hairline)]">
                  <span className="font-mono-tabular text-base font-semibold text-[var(--accent)]">
                    {c}
                    {prod.price.toFixed(2)}
                  </span>
                  <button
                    type="button"
                    onClick={() => openPdp(prod)}
                    disabled={totalStock === 0}
                    className="px-3.5 py-2 text-xs font-semibold rounded-md bg-[var(--bg-elevated)] border border-[var(--border-strong)] text-[var(--text-primary)] hover:bg-[var(--accent)] hover:text-[var(--accent-fg)] hover:border-[var(--accent)] disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
                  >
                    Select Size
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Product Detail & Size Selector Modal */}
      <Modal
        open={!!activeProduct}
        onClose={() => setActiveProduct(null)}
        title={activeProduct?.name || ''}
        subtitle={activeProduct ? `${activeProduct.category} · ${activeProduct.sku}` : ''}
        maxWidth="max-w-2xl"
      >
        {activeProduct && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="aspect-[4/3] rounded-md overflow-hidden bg-[var(--bg-elevated)]">
              <ProductImage
                src={activeProduct.image}
                alt={activeProduct.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="space-y-4">
              <div className="font-mono-tabular text-2xl font-semibold text-[var(--accent)]">
                {c}
                {activeProduct.price.toFixed(2)}
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {activeProduct.description}
              </p>

              <div>
                <span className="block text-xs font-medium text-[var(--text-primary)] mb-2">
                  Size
                </span>
                <div className="flex flex-wrap gap-2">
                  {activeProduct.sizes.map((sz) => {
                    const qty = activeProduct.stockBySize[sz] ?? 0;
                    return (
                      <button
                        key={sz}
                        type="button"
                        disabled={qty <= 0}
                        onClick={() => setChosenSize(sz)}
                        className={`px-3 py-1.5 rounded-md border text-xs font-medium transition-colors disabled:opacity-35 ${
                          chosenSize === sz
                            ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text-primary)]'
                            : 'border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
                        }`}
                      >
                        {sz} ({qty})
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className="block text-xs font-medium text-[var(--text-primary)] mb-2">
                  Colour
                </span>
                <div className="flex flex-wrap gap-2">
                  {activeProduct.colours.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setChosenColour(col)}
                      className={`px-3 py-1.5 rounded-md border text-xs font-medium transition-colors ${
                        chosenColour === col
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text-primary)]'
                          : 'border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {col}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => addToBag(activeProduct, chosenSize, chosenColour)}
                className="w-full py-2.5 px-4 text-sm font-semibold rounded-md bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] transition-colors"
              >
                Add to Shopping Bag
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Slide-Over Shopping Bag & Checkout Drawer */}
      {bagOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs"
          onClick={() => setBagOpen(false)}
        >
          <div
            className="w-full max-w-md h-full bg-[var(--bg-surface)] border-l border-[var(--border-strong)] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-hairline)]">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                Shopping Bag & Checkout
              </h2>
              <button
                type="button"
                onClick={() => setBagOpen(false)}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {bag.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)] text-center py-12">
                  Your shopping bag is currently empty.
                </p>
              ) : (
                <>
                  <div className="space-y-3">
                    {bag.map((item, idx) => (
                      <div
                        key={`${item.productId}-${item.size}-${item.colour}`}
                        className="flex items-center justify-between gap-3 pb-3 border-b border-[var(--border-hairline)]"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                            {item.name}
                          </p>
                          <p className="text-xs text-[var(--text-muted)]">
                            Size {item.size} · {item.colour} · {c}
                            {item.unitPrice.toFixed(2)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => updateBagQty(idx, -1)}
                            className="p-1 rounded bg-[var(--bg-elevated)]"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-mono-tabular text-xs">{item.qty}</span>
                          <button
                            type="button"
                            onClick={() => updateBagQty(idx, 1)}
                            className="p-1 rounded bg-[var(--bg-elevated)]"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Customer Checkout Form */}
                  <form id="storefront-checkout" onSubmit={placeOnlineOrder} className="space-y-3 text-xs">
                    <p className="font-semibold text-[var(--text-primary)] text-sm">
                      Customer & Delivery Details
                    </p>
                    <input
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Full Name"
                      className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        required
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="Phone Number"
                        className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
                      />
                      <input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="Email Address"
                        className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setDeliveryType('Courier Dispatch')}
                        className={`flex items-center justify-center gap-1.5 py-2 rounded-md border font-medium ${
                          deliveryType === 'Courier Dispatch'
                            ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text-primary)]'
                            : 'border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
                        }`}
                      >
                        <Truck className="w-3.5 h-3.5" />
                        Courier Delivery
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeliveryType('Store Collection')}
                        className={`flex items-center justify-center gap-1.5 py-2 rounded-md border font-medium ${
                          deliveryType === 'Store Collection'
                            ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text-primary)]'
                            : 'border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
                        }`}
                      >
                        <Store className="w-3.5 h-3.5" />
                        Boutique Pickup
                      </button>
                    </div>

                    {deliveryType === 'Courier Dispatch' && (
                      <input
                        required
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        placeholder="Delivery Street Address & Area"
                        className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
                      />
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={paymentMethod}
                        onChange={(e) =>
                          setPaymentMethod(
                            e.target.value as 'Card' | 'Mobile Money' | 'Cash on Delivery'
                          )
                        }
                        className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
                      >
                        <option value="Card">Debit / Credit Card</option>
                        <option value="Mobile Money">Mobile Money</option>
                        <option value="Cash on Delivery">Cash on Delivery (COD)</option>
                      </select>
                      <input
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        placeholder="Promo (INNO10)"
                        className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)] uppercase"
                      />
                    </div>

                    <div className="pt-3 border-t border-[var(--border-hairline)] space-y-1.5">
                      <div className="flex justify-between text-[var(--text-secondary)]">
                        <span>Subtotal</span>
                        <span className="font-mono-tabular">
                          {c}
                          {subtotal.toFixed(2)}
                        </span>
                      </div>
                      {discount > 0 && (
                        <div className="flex justify-between text-emerald-400">
                          <span>Promo ({activePromo?.promoCode})</span>
                          <span className="font-mono-tabular">
                            -{c}
                            {discount.toFixed(2)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-[var(--text-secondary)]">
                        <span>Delivery</span>
                        <span className="font-mono-tabular">
                          {deliveryFee === 0 ? 'Complimentary' : `${c}${deliveryFee.toFixed(2)}`}
                        </span>
                      </div>
                      <div className="flex justify-between text-[var(--text-secondary)]">
                        <span>Tax ({state.settings.taxRate}%)</span>
                        <span className="font-mono-tabular">
                          {c}
                          {tax.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-base font-semibold text-[var(--text-primary)] pt-2 border-t border-[var(--border-hairline)]">
                        <span>Total</span>
                        <span className="font-mono-tabular text-[var(--accent)]">
                          {c}
                          {total.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </form>
                </>
              )}
            </div>

            {bag.length > 0 && (
              <div className="p-6 border-t border-[var(--border-hairline)]">
                <button
                  type="submit"
                  form="storefront-checkout"
                  className="w-full py-3 px-4 text-sm font-semibold rounded-md bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] transition-colors"
                >
                  Place Order · {c}
                  {total.toFixed(2)}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Order Confirmation Modal */}
      <Modal
        open={!!confirmedOrder}
        onClose={() => setConfirmedOrder(null)}
        title="Online Order Confirmed"
        subtitle={confirmedOrder ? `${confirmedOrder.orderNumber} · Preparing Shipment` : ''}
      >
        {confirmedOrder && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
              <CheckCircle2 className="w-4 h-4" />
              <span>Order logged in Orders, Delivery Dispatch, Inventory, and Accounting.</span>
            </div>
            <div className="p-4 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] space-y-2">
              <p className="text-[var(--text-primary)] font-medium">
                {confirmedOrder.customerName} · {confirmedOrder.paymentMethod} ({confirmedOrder.paymentStatus})
              </p>
              <p className="text-[var(--text-muted)]">
                Destination: {confirmedOrder.deliveryAddress}
              </p>
              <div className="pt-2 border-t border-[var(--border-hairline)] flex justify-between font-semibold text-sm text-[var(--text-primary)]">
                <span>Order Total</span>
                <span className="font-mono-tabular text-[var(--accent)]">
                  {c}
                  {confirmedOrder.total.toFixed(2)}
                </span>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setConfirmedOrder(null)}
                className="px-4 py-2 font-semibold rounded-md bg-[var(--accent)] text-[var(--accent-fg)]"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
