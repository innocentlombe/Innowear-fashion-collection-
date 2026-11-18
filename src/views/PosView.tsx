import React, { useMemo, useState } from 'react';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  Smartphone,
} from 'lucide-react';
import { Order, OrderItem, PaymentMethod, Product, ProductCategory } from '../types';
import { useInnoWear, getProductTotalStock } from '../store/useInnoWearStore';
import { ProductImage } from '../components/ProductImage';
import { Modal } from '../components/Modal';
import { AdvancedReceiptModal } from '../components/AdvancedReceiptModal';

export const PosView: React.FC = () => {
  const { state, completeSale, notify } = useInnoWear();
  const c = state.settings.currencySymbol;

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'All' | ProductCategory>('All');
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string>(state.staff[1]?.name || state.staff[0]?.name || 'Store Cashier');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Card');
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<string>('');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [receiptNotes, setReceiptNotes] = useState<string>('');

  // Variant selector state
  const [pickingProduct, setPickingProduct] = useState<Product | null>(null);
  const [pickSize, setPickSize] = useState<string>('');
  const [pickColour, setPickColour] = useState<string>('');

  // Completed receipt modal
  const [lastReceipt, setLastReceipt] = useState<Order | null>(null);

  const categories: Array<'All' | ProductCategory> = [
    'All',
    'Tailoring',
    'Outerwear',
    'Dresses',
    'Footwear',
    'Accessories',
  ];

  const filteredProducts = useMemo(() => {
    return state.products.filter((p) => {
      const matchCat = category === 'All' || p.category === category;
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [state.products, category, search]);

  const openVariantPicker = (product: Product) => {
    const availableSize =
      product.sizes.find((sz) => (product.stockBySize[sz] ?? 0) > 0) || product.sizes[0];
    setPickingProduct(product);
    setPickSize(availableSize);
    setPickColour(product.colours[0] || 'Black');
  };

  const addToCart = (product: Product, size: string, colour: string) => {
    const avail = product.stockBySize[size] ?? 0;
    if (avail <= 0) {
      notify(`Size ${size} is currently out of stock.`);
      return;
    }

    setCart((prev) => {
      const idx = prev.findIndex(
        (i) => i.productId === product.id && i.size === size && i.colour === colour
      );
      if (idx >= 0) {
        if (prev[idx].qty >= avail) {
          notify(`Only ${avail} unit(s) available in size ${size}.`);
          return prev;
        }
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        return next;
      }
      return [
        ...prev,
        {
          productId: product.id,
          sku: product.sku,
          name: product.name,
          size,
          colour,
          qty: 1,
          unitPrice: product.price,
          unitCost: product.cost,
        },
      ];
    });
    setPickingProduct(null);
  };

  const updateCartQty = (idx: number, delta: number) => {
    setCart((prev) => {
      const item = prev[idx];
      if (!item) return prev;
      const prod = state.products.find((p) => p.id === item.productId);
      const maxAvail = prod ? prod.stockBySize[item.size] ?? 99 : 99;
      const nextQty = item.qty + delta;
      if (nextQty <= 0) return prev.filter((_, i) => i !== idx);
      if (nextQty > maxAvail) {
        notify(`Only ${maxAvail} in stock for size ${item.size}.`);
        return prev;
      }
      const next = [...prev];
      next[idx] = { ...item, qty: nextQty };
      return next;
    });
  };

  const activeCampaign = state.campaigns.find(
    (cam) => cam.promoCode.toUpperCase() === appliedPromo.toUpperCase() && cam.status === 'Active'
  );

  const subtotal = cart.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);
  const promoDiscount = activeCampaign
    ? Number(((subtotal * activeCampaign.discountPercent) / 100).toFixed(2))
    : 0;
  const totalDiscount = Math.min(subtotal, promoDiscount);
  const taxable = Math.max(0, subtotal - totalDiscount);
  const tax = Number(((taxable * state.settings.taxRate) / 100).toFixed(2));
  const grandTotal = Number((taxable + tax).toFixed(2));

  const cashNumber = parseFloat(cashTendered) || 0;
  const changeDue = paymentMethod === 'Cash' && cashNumber > grandTotal ? cashNumber - grandTotal : 0;

  const handleApplyPromo = () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    const found = state.campaigns.find(
      (cam) => cam.promoCode.toUpperCase() === code && cam.status === 'Active'
    );
    if (!found) {
      notify(`Promo code "${code}" is invalid or inactive.`);
      return;
    }
    setAppliedPromo(found.promoCode);
    notify(`Applied ${found.promoCode} (${found.discountPercent}% off).`);
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      notify('Add at least one fashion item to complete a sale.');
      return;
    }
    const order = completeSale({
      items: cart,
      channel: 'POS',
      paymentMethod,
      customerName: 'Walk-in Guest',
      promoCode: appliedPromo || undefined,
      staffName: selectedStaff,
      cashTendered: paymentMethod === 'Cash' && cashNumber > 0 ? cashNumber : undefined,
      changeDue: paymentMethod === 'Cash' && changeDue > 0 ? Number(changeDue.toFixed(2)) : undefined,
      receiptNotes: receiptNotes.trim() || undefined,
    });
    setLastReceipt(order);
    setCart([]);
    setAppliedPromo('');
    setPromoInput('');
    setCashTendered('');
    setReceiptNotes('');
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      {/* Left 8 Columns: Product Catalog */}
      <div className="xl:col-span-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">
              POS & Boutique Terminal
            </h1>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Select garments or footwear, choose size & colour, and sync instantly with inventory
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search SKU or product..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-md bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
        </div>

        {/* Category Filter Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                category === cat
                  ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                  : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-hairline)] hover:text-[var(--text-primary)]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Catalog Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product) => {
            const totalStock = getProductTotalStock(product);
            return (
              <button
                key={product.id}
                type="button"
                onClick={() => openVariantPicker(product)}
                disabled={totalStock === 0}
                className="group text-left rounded-lg overflow-hidden bg-[var(--bg-surface)] border border-[var(--border-hairline)] hover:border-[var(--accent)] transition-all disabled:opacity-50"
              >
                <div className="aspect-[4/3] w-full overflow-hidden bg-[var(--bg-elevated)]">
                  <ProductImage
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                  />
                </div>
                <div className="p-4">
                  <p className="text-xs text-[var(--text-muted)]">
                    {product.category} · {product.sku}
                  </p>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] mt-1 line-clamp-1">
                    {product.name}
                  </h3>
                  <div className="flex items-center justify-between mt-3">
                    <span className="font-mono-tabular text-sm font-semibold text-[var(--accent)]">
                      {c}
                      {product.price.toFixed(2)}
                    </span>
                    <span className="font-mono-tabular text-xs text-[var(--text-secondary)]">
                      {totalStock} in stock
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right 4 Columns: Active POS Register */}
      <div className="xl:col-span-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] p-5 space-y-5 xl:sticky xl:top-20">
        <div className="flex items-center justify-between border-b border-[var(--border-hairline)] pb-3">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Current Basket</h2>
            <p className="text-xs text-[var(--text-muted)]">
              {cart.reduce((s, i) => s + i.qty, 0)} item(s) ready for checkout
            </p>
          </div>
          {cart.length > 0 && (
            <button
              type="button"
              onClick={() => setCart([])}
              className="text-xs text-[var(--text-muted)] hover:text-red-400 transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Sales Associate Select */}
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1">
            Sales Associate
          </label>
          <select
            value={selectedStaff}
            onChange={(e) => setSelectedStaff(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
          >
            {state.staff.map((stf) => (
              <option key={stf.id} value={stf.name}>
                {stf.name} — {stf.role}
              </option>
            ))}
          </select>
        </div>

        {/* Basket Items */}
        <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
          {cart.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-hairline)] rounded-md">
              Tap any item on the left to add it to the POS register.
            </div>
          ) : (
            cart.map((item, idx) => (
              <div
                key={`${item.productId}-${item.size}-${item.colour}`}
                className="flex items-center justify-between gap-3 pb-3 border-b border-[var(--border-hairline)] last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                    {item.name}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    Size {item.size} · {item.colour} · {c}
                    {item.unitPrice.toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => updateCartQty(idx, -1)}
                    className="p-1 rounded bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)]"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="font-mono-tabular text-xs w-5 text-center">{item.qty}</span>
                  <button
                    type="button"
                    onClick={() => updateCartQty(idx, 1)}
                    className="p-1 rounded bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)]"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => updateCartQty(idx, -item.qty)}
                    className="p-1 text-[var(--text-muted)] hover:text-red-400"
                    aria-label="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Promo Code Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={promoInput}
            onChange={(e) => setPromoInput(e.target.value)}
            placeholder="Promo code (e.g. INNO10)"
            className="flex-1 px-3 py-1.5 text-xs rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)] uppercase focus:outline-none focus:border-[var(--accent)]"
          />
          <button
            type="button"
            onClick={handleApplyPromo}
            className="px-3 py-1.5 text-xs font-medium rounded-md border border-[var(--border-strong)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] whitespace-nowrap shrink-0"
          >
            Apply
          </button>
        </div>

        {/* Payment Method */}
        <div>
          <span className="block text-xs text-[var(--text-muted)] mb-2">
            Payment Method (Kwacha · ZMW)
          </span>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: 'Card', icon: CreditCard },
                { id: 'Cash', icon: Banknote },
                { id: 'Mobile Money', icon: Smartphone },
              ] as const
            ).map((pm) => {
              const Icon = pm.icon;
              return (
                <button
                  key={pm.id}
                  type="button"
                  onClick={() => setPaymentMethod(pm.id)}
                  className={`flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-md border text-xs font-medium transition-colors ${
                    paymentMethod === pm.id
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text-primary)]'
                      : 'border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="truncate">{pm.id === 'Mobile Money' ? 'MoMo' : pm.id}</span>
                </button>
              );
            })}
          </div>
        </div>

        {paymentMethod === 'Cash' && (
          <div className="flex items-center justify-between gap-3">
            <label className="text-xs text-[var(--text-muted)] whitespace-nowrap">
              Cash Received ({c} / ZMW)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={cashTendered}
              onChange={(e) => setCashTendered(e.target.value)}
              placeholder={grandTotal.toFixed(2)}
              className="w-32 px-2.5 py-1.5 text-right font-mono-tabular text-xs rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
            />
          </div>
        )}

        {/* Optional Receipt Note */}
        <div>
          <input
            type="text"
            value={receiptNotes}
            onChange={(e) => setReceiptNotes(e.target.value)}
            placeholder="Receipt note (e.g. Tailoring pickup, gift box)"
            className="w-full px-3 py-1.5 text-xs rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
          />
        </div>

        {/* Totals Summary */}
        <div className="space-y-1.5 pt-3 border-t border-[var(--border-hairline)] text-xs">
          {totalDiscount > 0 && (
            <div className="flex justify-between text-emerald-400">
              <span>Discount {appliedPromo ? `(${appliedPromo})` : ''}</span>
              <span className="font-mono-tabular">
                -{c}
                {totalDiscount.toFixed(2)}
              </span>
            </div>
          )}
          <div className="flex justify-between text-[var(--text-secondary)]">
            <span>Tax ({state.settings.taxRate}%)</span>
            <span className="font-mono-tabular">
              {c}
              {tax.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-base font-semibold text-[var(--text-primary)] pt-2 border-t border-[var(--border-hairline)]">
            <span>Total Due</span>
            <span className="font-mono-tabular text-[var(--accent)]">
              {c}
              {grandTotal.toFixed(2)}
            </span>
          </div>
          {changeDue > 0 && (
            <div className="flex justify-between text-xs text-emerald-400 pt-1">
              <span>Change Due</span>
              <span className="font-mono-tabular">
                {c}
                {changeDue.toFixed(2)}
              </span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleCheckout}
          disabled={cart.length === 0}
          className="w-full py-3 px-4 text-sm font-semibold rounded-md bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] disabled:opacity-40 transition-colors"
        >
          Complete Sale · {c}
          {grandTotal.toFixed(2)}
        </button>
      </div>

      {/* Size & Colour Variant Selection Modal */}
      <Modal
        open={!!pickingProduct}
        onClose={() => setPickingProduct(null)}
        title={pickingProduct?.name || ''}
        subtitle={pickingProduct ? `${pickingProduct.sku} · ${c}${pickingProduct.price.toFixed(2)}` : ''}
      >
        {pickingProduct && (
          <div className="space-y-5">
            <div>
              <span className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
                Select Size
              </span>
              <div className="grid grid-cols-4 gap-2">
                {pickingProduct.sizes.map((sz) => {
                  const qty = pickingProduct.stockBySize[sz] ?? 0;
                  return (
                    <button
                      key={sz}
                      type="button"
                      disabled={qty <= 0}
                      onClick={() => setPickSize(sz)}
                      className={`py-2 px-3 rounded-md border text-xs font-medium transition-colors disabled:opacity-35 ${
                        pickSize === sz
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text-primary)]'
                          : 'border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
                      }`}
                    >
                      <div>{sz}</div>
                      <div className="font-mono-tabular text-[10px] text-[var(--text-muted)]">
                        {qty} left
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <span className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
                Select Colour
              </span>
              <div className="flex flex-wrap gap-2">
                {pickingProduct.colours.map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setPickColour(col)}
                    className={`py-2 px-3 rounded-md border text-xs font-medium transition-colors ${
                      pickColour === col
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text-primary)]'
                        : 'border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
                    }`}
                  >
                    {col}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPickingProduct(null)}
                className="px-4 py-2 text-xs font-medium rounded-md border border-[var(--border-strong)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => addToCart(pickingProduct, pickSize, pickColour)}
                className="px-4 py-2 text-xs font-semibold rounded-md bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)]"
              >
                Add to Basket
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Advanced Receipt Studio Modal */}
      <AdvancedReceiptModal
        order={lastReceipt}
        onClose={() => setLastReceipt(null)}
        primaryActionLabel="New Sale"
      />
    </div>
  );
};
