import React, { useState } from 'react';
import { Plus, PackageCheck } from 'lucide-react';
import { useInnoWear } from '../store/useInnoWearStore';
import { Modal } from '../components/Modal';
import { DeleteButton } from '../components/DeleteButton';

export const SuppliersView: React.FC = () => {
  const {
    state,
    addSupplier,
    deleteSupplier,
    createPurchaseOrder,
    receivePurchaseOrder,
    deletePurchaseOrder,
  } = useInnoWear();
  const c = state.settings.currencySymbol;

  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showPoModal, setShowPoModal] = useState(false);

  // Add Supplier state
  const [supName, setSupName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('Apparel & Textiles');
  const [leadTimeDays, setLeadTimeDays] = useState('7');

  // Create PO state
  const [poSupplierId, setPoSupplierId] = useState(state.suppliers[0]?.id || '');
  const [poProductId, setPoProductId] = useState(state.products[0]?.id || '');
  const [poSize, setPoSize] = useState(state.products[0]?.sizes[0] || 'M');
  const [poQty, setPoQty] = useState('10');

  const selectedProduct = state.products.find((p) => p.id === poProductId) || state.products[0];

  const handleAddSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim()) return;
    addSupplier({
      name: supName.trim(),
      contactPerson: contactPerson.trim() || 'Account Manager',
      phone: phone.trim() || '+260 97 000 0000',
      email: email.trim() || 'orders@supplier.com',
      category: category.trim(),
      leadTimeDays: parseInt(leadTimeDays, 10) || 7,
    });
    setSupName('');
    setContactPerson('');
    setPhone('');
    setEmail('');
    setShowSupplierModal(false);
  };

  const handleCreatePo = (e: React.FormEvent) => {
    e.preventDefault();
    const supplier = state.suppliers.find((s) => s.id === poSupplierId) || state.suppliers[0];
    if (!supplier || !selectedProduct) return;
    createPurchaseOrder({
      supplierId: supplier.id,
      supplierName: supplier.name,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      size: poSize || selectedProduct.sizes[0],
      quantity: Math.max(1, parseInt(poQty, 10) || 1),
      unitCost: selectedProduct.cost,
    });
    setShowPoModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">
            Supplier & Purchasing Management
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Manage fashion wholesalers, purchasing costs, and stock replenishment orders
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSupplierModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-md border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Supplier
          </button>
          <button
            type="button"
            onClick={() => setShowPoModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            New Stock Order
          </button>
        </div>
      </div>

      {/* Suppliers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {state.suppliers.map((sup) => (
          <div
            key={sup.id}
            className="p-5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-[var(--text-primary)] truncate">
                  {sup.name}
                </h2>
                <p className="text-xs text-[var(--accent)]">{sup.category}</p>
              </div>
              <DeleteButton
                onConfirm={() => deleteSupplier(sup.id)}
                ariaLabel={`Delete supplier ${sup.name}`}
              />
            </div>
            <div className="text-xs text-[var(--text-secondary)] space-y-1 pt-2 border-t border-[var(--border-hairline)]">
              <p>Contact: {sup.contactPerson}</p>
              <p>{sup.phone}</p>
              <p className="text-[var(--text-muted)]">{sup.email}</p>
            </div>
            <div className="flex items-center justify-between text-xs pt-2">
              <span className="text-[var(--text-muted)]">Lead time: {sup.leadTimeDays} days</span>
              <span className="font-mono-tabular text-[var(--text-primary)]">
                Owed {c}
                {sup.balanceOwed.toFixed(0)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Purchase Orders Table */}
      <div className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border-hairline)]">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            Purchase Orders (Receiving automatically restocks Inventory)
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-hairline)] text-xs text-[var(--text-muted)]">
                <th className="py-3 px-4 font-medium">PO # & Date</th>
                <th className="py-3 px-4 font-medium">Supplier</th>
                <th className="py-3 px-4 font-medium">Product & Size</th>
                <th className="py-3 px-4 font-medium text-right">Qty × Cost</th>
                <th className="py-3 px-4 font-medium text-right">Total</th>
                <th className="py-3 px-4 font-medium text-right">Status / Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-hairline)] text-sm">
              {state.purchaseOrders.map((po) => (
                <tr key={po.id} className="hover:bg-[var(--bg-elevated)]/60 transition-colors">
                  <td className="py-3.5 px-4 font-mono-tabular text-xs">
                    <div className="font-semibold text-[var(--text-primary)]">{po.poNumber}</div>
                    <div className="text-[var(--text-muted)]">{po.createdDate}</div>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-[var(--text-secondary)]">
                    {po.supplierName}
                  </td>
                  <td className="py-3.5 px-4 text-xs">
                    <div className="font-medium text-[var(--text-primary)]">{po.productName}</div>
                    <div className="text-[var(--text-muted)]">Size {po.size}</div>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono-tabular text-xs text-[var(--text-secondary)]">
                    {po.quantity} × {c}
                    {po.unitCost}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono-tabular font-semibold text-[var(--text-primary)]">
                    {c}
                    {po.totalCost.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-right text-xs">
                    <div className="inline-flex items-center justify-end gap-2">
                      {po.status !== 'Received' ? (
                        <button
                          type="button"
                          onClick={() => receivePurchaseOrder(po.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[var(--accent)] text-[var(--accent-fg)] font-semibold hover:bg-[var(--accent-hover)] whitespace-nowrap"
                        >
                          <PackageCheck className="w-3.5 h-3.5" />
                          Receive Stock
                        </button>
                      ) : (
                        <span className="text-[var(--status-positive)] font-medium">Received</span>
                      )}
                      <DeleteButton
                        onConfirm={() => deletePurchaseOrder(po.id)}
                        ariaLabel={`Delete purchase order ${po.poNumber}`}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Supplier Modal */}
      <Modal
        open={showSupplierModal}
        onClose={() => setShowSupplierModal(false)}
        title="Add Fashion Supplier"
        subtitle="Record wholesaler details and delivery lead times"
      >
        <form onSubmit={handleAddSupplier} className="space-y-4 text-xs">
          <div>
            <label className="block text-[var(--text-secondary)] mb-1">Supplier Name</label>
            <input
              required
              value={supName}
              onChange={(e) => setSupName(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[var(--text-secondary)] mb-1">Contact Person</label>
              <input
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-[var(--text-secondary)] mb-1">Phone</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[var(--text-secondary)] mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-[var(--text-secondary)] mb-1">Lead Time (Days)</label>
              <input
                type="number"
                min="1"
                value={leadTimeDays}
                onChange={(e) => setLeadTimeDays(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)] font-mono-tabular"
              />
            </div>
          </div>
          <div>
            <label className="block text-[var(--text-secondary)] mb-1">Supply Specialty</label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowSupplierModal(false)}
              className="px-4 py-2 rounded-md border border-[var(--border-strong)] text-[var(--text-secondary)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 font-semibold rounded-md bg-[var(--accent)] text-[var(--accent-fg)]"
            >
              Save Supplier
            </button>
          </div>
        </form>
      </Modal>

      {/* New Purchase Order Modal */}
      <Modal
        open={showPoModal}
        onClose={() => setShowPoModal(false)}
        title="Create Stock Purchase Order"
        subtitle="Order wholesale stock replenishment from a registered supplier"
      >
        <form onSubmit={handleCreatePo} className="space-y-4 text-xs">
          <div>
            <label className="block text-[var(--text-secondary)] mb-1">Supplier</label>
            <select
              value={poSupplierId}
              onChange={(e) => setPoSupplierId(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
            >
              {state.suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.category})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[var(--text-secondary)] mb-1">Product to Restock</label>
            <select
              value={poProductId}
              onChange={(e) => {
                setPoProductId(e.target.value);
                const prod = state.products.find((p) => p.id === e.target.value);
                if (prod) setPoSize(prod.sizes[0]);
              }}
              className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
            >
              {state.products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (Cost {c}
                  {p.cost})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[var(--text-secondary)] mb-1">Size</label>
              <select
                value={poSize}
                onChange={(e) => setPoSize(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
              >
                {(selectedProduct?.sizes || ['M']).map((sz) => (
                  <option key={sz} value={sz}>
                    {sz}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[var(--text-secondary)] mb-1">Order Quantity</label>
              <input
                type="number"
                min="1"
                value={poQty}
                onChange={(e) => setPoQty(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)] font-mono-tabular"
              />
            </div>
          </div>

          <div className="p-3 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] flex justify-between">
            <span className="text-[var(--text-secondary)]">Estimated Wholesale Cost</span>
            <span className="font-mono-tabular font-semibold text-[var(--accent)]">
              {c}
              {((selectedProduct?.cost || 0) * (parseInt(poQty, 10) || 0)).toLocaleString()}
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowPoModal(false)}
              className="px-4 py-2 rounded-md border border-[var(--border-strong)] text-[var(--text-secondary)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 font-semibold rounded-md bg-[var(--accent)] text-[var(--accent-fg)]"
            >
              Issue Purchase Order
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
