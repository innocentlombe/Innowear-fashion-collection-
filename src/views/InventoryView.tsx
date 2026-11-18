import React, { useMemo, useState } from 'react';
import { Plus, Search, Minus } from 'lucide-react';
import { ProductCategory } from '../types';
import { useInnoWear, getProductTotalStock } from '../store/useInnoWearStore';
import { ProductImage } from '../components/ProductImage';
import { Modal } from '../components/Modal';
import { IMAGES } from '../data/seedData';

export const InventoryView: React.FC = () => {
  const { state, addProduct, adjustStock } = useInnoWear();
  const c = state.settings.currencySymbol;

  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'low' | 'new'>('all');
  const [showAdd, setShowAdd] = useState(false);

  // Add product form state
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState<ProductCategory>('Tailoring');
  const [price, setPrice] = useState('220');
  const [cost, setCost] = useState('95');
  const [sizesInput, setSizesInput] = useState('S, M, L, XL');
  const [coloursInput, setColoursInput] = useState('Obsidian Black, Midnight Navy');
  const [initialQty, setInitialQty] = useState('6');
  const [isNewArrival, setIsNewArrival] = useState(true);
  const [imageChoice, setImageChoice] = useState(IMAGES.blazer);
  const [description, setDescription] = useState('');

  const filtered = useMemo(() => {
    return state.products.filter((p) => {
      const total = getProductTotalStock(p);
      if (filterMode === 'low' && total > p.reorderLevel * 2) return false;
      if (filterMode === 'new' && !p.isNewArrival) return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.colours.some((col) => col.toLowerCase().includes(q))
      );
    });
  }, [state.products, filterMode, search]);

  const totalRetailValue = state.products.reduce(
    (sum, p) => sum + getProductTotalStock(p) * p.price,
    0
  );
  const totalCostValue = state.products.reduce(
    (sum, p) => sum + getProductTotalStock(p) * p.cost,
    0
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !sku.trim()) return;
    const sizes = sizesInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const colours = coloursInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const qtyPerSize = Math.max(0, parseInt(initialQty, 10) || 0);
    const stockBySize: Record<string, number> = {};
    for (const sz of sizes.length ? sizes : ['One Size']) {
      stockBySize[sz] = qtyPerSize;
    }

    addProduct({
      sku: sku.trim().toUpperCase(),
      name: name.trim(),
      category,
      price: parseFloat(price) || 0,
      cost: parseFloat(cost) || 0,
      sizes: sizes.length ? sizes : ['One Size'],
      colours: colours.length ? colours : ['Obsidian Black'],
      stockBySize,
      reorderLevel: 4,
      isNewArrival,
      image: imageChoice,
      description:
        description.trim() ||
        'Signature InnoWear Fashion Collection garment crafted for contemporary luxury.',
      supplierId: state.suppliers[0]?.id || 'sup-1',
    });

    setName('');
    setSku('');
    setDescription('');
    setShowAdd(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">
            Inventory Management
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Track clothes, shoes, sizes, colours, stock levels, valuation, and new arrivals
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      {/* Valuation Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)]">
          <p className="text-xs text-[var(--text-muted)]">Total Units On Hand</p>
          <p className="font-mono-tabular text-xl font-semibold text-[var(--text-primary)] mt-1">
            {state.products.reduce((s, p) => s + getProductTotalStock(p), 0)}
          </p>
        </div>
        <div className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)]">
          <p className="text-xs text-[var(--text-muted)]">Retail Inventory Value</p>
          <p className="font-mono-tabular text-xl font-semibold text-[var(--accent)] mt-1">
            {c}
            {totalRetailValue.toLocaleString()}
          </p>
        </div>
        <div className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)]">
          <p className="text-xs text-[var(--text-muted)]">Wholesale Cost Basis</p>
          <p className="font-mono-tabular text-xl font-semibold text-[var(--text-primary)] mt-1">
            {c}
            {totalCostValue.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          {(
            [
              { id: 'all', label: `All Styles (${state.products.length})` },
              {
                id: 'low',
                label: `Low Stock (${
                  state.products.filter((p) => getProductTotalStock(p) <= p.reorderLevel * 2)
                    .length
                })`,
              },
              {
                id: 'new',
                label: `New Arrivals (${state.products.filter((p) => p.isNewArrival).length})`,
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterMode(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                filterMode === tab.id
                  ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                  : 'bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter SKU, name, colour..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
          />
        </div>
      </div>

      {/* Inventory Table */}
      <div className="overflow-x-auto rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[var(--border-hairline)] text-xs text-[var(--text-muted)]">
              <th className="py-3 px-4 font-medium">Product & SKU</th>
              <th className="py-3 px-4 font-medium">Colours</th>
              <th className="py-3 px-4 font-medium">Size Breakdown (Adjust +/-)</th>
              <th className="py-3 px-4 font-medium text-right">Cost / Retail</th>
              <th className="py-3 px-4 font-medium text-right">Total Stock</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-hairline)] text-sm">
            {filtered.map((prod) => {
              const total = getProductTotalStock(prod);
              const isLow = total <= prod.reorderLevel * 2;
              return (
                <tr key={prod.id} className="hover:bg-[var(--bg-elevated)]/60 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-md overflow-hidden bg-[var(--bg-elevated)] shrink-0">
                        <ProductImage
                          src={prod.image}
                          alt={prod.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-[var(--text-primary)] truncate max-w-[240px]">
                          {prod.name}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] font-mono-tabular mt-0.5">
                          {prod.sku} · {prod.category}
                          {prod.isNewArrival ? ' · New Arrival' : ''}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-[var(--text-secondary)]">
                    {prod.colours.join(' / ')}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap gap-2">
                      {prod.sizes.map((sz) => {
                        const qty = prod.stockBySize[sz] ?? 0;
                        return (
                          <div
                            key={sz}
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-xs"
                          >
                            <span className="text-[var(--text-muted)] font-medium">{sz}</span>
                            <button
                              type="button"
                              onClick={() => adjustStock(prod.id, sz, -1)}
                              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                              aria-label={`Decrease stock for ${prod.name} size ${sz}`}
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span
                              className={`font-mono-tabular font-semibold min-w-[16px] text-center ${
                                qty <= 2 ? 'text-amber-400' : 'text-[var(--text-primary)]'
                              }`}
                            >
                              {qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => adjustStock(prod.id, sz, 1)}
                              className="text-[var(--text-secondary)] hover:text-[var(--accent)]"
                              aria-label={`Increase stock for ${prod.name} size ${sz}`}
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono-tabular text-xs">
                    <div className="text-[var(--text-primary)] font-semibold">
                      {c}
                      {prod.price.toFixed(2)}
                    </div>
                    <div className="text-[var(--text-muted)]">
                      Cost {c}
                      {prod.cost.toFixed(2)}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono-tabular">
                    <div
                      className={`text-sm font-semibold ${
                        isLow ? 'text-amber-400' : 'text-[var(--text-primary)]'
                      }`}
                    >
                      {total}
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)]">
                      {isLow ? 'Reorder soon' : 'Healthy'}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Product Modal */}
      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add New Fashion Item"
        subtitle="Automatically published to POS Terminal and Online Storefront"
      >
        <form onSubmit={handleCreate} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[var(--text-secondary)] mb-1">Product Name</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Merino Ribbed Turtleneck"
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-[var(--text-secondary)] mb-1">SKU Code</label>
              <input
                required
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="INW-KNT-007"
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)] uppercase font-mono-tabular"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[var(--text-secondary)] mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ProductCategory)}
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
              >
                <option value="Tailoring">Tailoring</option>
                <option value="Outerwear">Outerwear</option>
                <option value="Dresses">Dresses</option>
                <option value="Footwear">Footwear</option>
                <option value="Accessories">Accessories</option>
              </select>
            </div>
            <div>
              <label className="block text-[var(--text-secondary)] mb-1">
                Retail Price ({c})
              </label>
              <input
                type="number"
                required
                min="1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)] font-mono-tabular"
              />
            </div>
            <div>
              <label className="block text-[var(--text-secondary)] mb-1">
                Unit Cost ({c})
              </label>
              <input
                type="number"
                required
                min="1"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)] font-mono-tabular"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[var(--text-secondary)] mb-1">
                Sizes (comma-separated)
              </label>
              <input
                value={sizesInput}
                onChange={(e) => setSizesInput(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-[var(--text-secondary)] mb-1">
                Colours (comma-separated)
              </label>
              <input
                value={coloursInput}
                onChange={(e) => setColoursInput(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-[var(--text-secondary)] mb-1">
                Opening Qty / Size
              </label>
              <input
                type="number"
                min="0"
                value={initialQty}
                onChange={(e) => setInitialQty(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)] font-mono-tabular"
              />
            </div>
          </div>

          <div>
            <label className="block text-[var(--text-secondary)] mb-1">Studio Photography</label>
            <select
              value={imageChoice}
              onChange={(e) => setImageChoice(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
            >
              <option value={IMAGES.blazer}>Tailored Wool Blazer Studio Shot</option>
              <option value={IMAGES.sneakers}>Matte Calfskin Sneaker Studio Shot</option>
              <option value={IMAGES.dress}>Midnight Silk Dress Studio Shot</option>
              <option value={IMAGES.tote}>Structured Leather Tote Studio Shot</option>
              <option value={IMAGES.hero}>Obsidian Editorial Campaign Shot</option>
            </select>
          </div>

          <div>
            <label className="block text-[var(--text-secondary)] mb-1">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Fabric composition, fit notes, styling highlights..."
              className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
            />
          </div>

          <label className="flex items-center gap-2 text-[var(--text-secondary)] cursor-pointer">
            <input
              type="checkbox"
              checked={isNewArrival}
              onChange={(e) => setIsNewArrival(e.target.checked)}
              className="accent-[var(--accent)]"
            />
            <span>Highlight as New Arrival in Online Storefront</span>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 rounded-md border border-[var(--border-strong)] text-[var(--text-secondary)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 font-semibold rounded-md bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)]"
            >
              Save Product
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
