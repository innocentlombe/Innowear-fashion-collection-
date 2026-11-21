import React, { useMemo, useRef, useState } from 'react';
import {
  FileText,
  FolderLock,
  Plus,
  Search,
  Upload,
  Download,
  Eye,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Paperclip,
  X,
} from 'lucide-react';
import { BusinessDocument, DocumentCategory } from '../types';
import { useInnoWear } from '../store/useInnoWearStore';
import { Modal } from '../components/Modal';
import { DeleteButton } from '../components/DeleteButton';
import { processUploadedImage } from '../utils/imageUpload';

const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  'Business License',
  'Tax & TPIN',
  'Lease & Property',
  'Supplier Contract',
  'Staff Record',
  'Receipt & Invoice',
  'Other',
];

const MAX_DOC_FILE_BYTES = 2 * 1024 * 1024; // 2 MB limit for smooth multi-device sync

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read selected file.'));
    reader.readAsDataURL(file);
  });
}

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getExpiryStatus(expiryDate?: string): 'none' | 'valid' | 'expiring' | 'expired' {
  if (!expiryDate) return 'none';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(`${expiryDate}T00:00:00`);
  if (Number.isNaN(exp.getTime())) return 'none';
  const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'expired';
  if (diffDays <= 30) return 'expiring';
  return 'valid';
}

export const DocumentKeeperView: React.FC = () => {
  const { state, addDocument, deleteDocument, notify } = useInnoWear();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | DocumentCategory>('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<BusinessDocument | null>(null);

  // Add Document Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('Business License');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [issuer, setIssuer] = useState('');
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('');
  const [fileSize, setFileSize] = useState<number | undefined>(undefined);
  const [fileDataUrl, setFileDataUrl] = useState('');
  const [processingFile, setProcessingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const stats = useMemo(() => {
    let attached = 0;
    let expiring = 0;
    let expired = 0;
    for (const doc of state.documents) {
      if (doc.fileDataUrl) attached += 1;
      const st = getExpiryStatus(doc.expiryDate);
      if (st === 'expiring') expiring += 1;
      if (st === 'expired') expired += 1;
    }
    return {
      total: state.documents.length,
      attached,
      expiring,
      expired,
    };
  }, [state.documents]);

  const filteredDocs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.documents.filter((doc) => {
      const matchCat = categoryFilter === 'All' || doc.category === categoryFilter;
      const matchSearch =
        !q ||
        doc.title.toLowerCase().includes(q) ||
        doc.referenceNumber.toLowerCase().includes(q) ||
        doc.issuer.toLowerCase().includes(q) ||
        (doc.notes && doc.notes.toLowerCase().includes(q)) ||
        (doc.fileName && doc.fileName.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });
  }, [state.documents, categoryFilter, search]);

  const resetForm = () => {
    setTitle('');
    setCategory('Business License');
    setReferenceNumber('');
    setIssuer('');
    setIssueDate(new Date().toISOString().slice(0, 10));
    setExpiryDate('');
    setNotes('');
    setFileName('');
    setFileType('');
    setFileSize(undefined);
    setFileDataUrl('');
  };

  const handleAttachFile = async (file: File | undefined) => {
    if (!file) return;
    setProcessingFile(true);
    try {
      if (file.type.startsWith('image/')) {
        const compressed = await processUploadedImage(file, { maxDimension: 1200, quality: 0.84 });
        setFileDataUrl(compressed);
        setFileName(file.name);
        setFileType('image/jpeg');
        setFileSize(Math.round((compressed.length * 3) / 4));
      } else {
        if (file.size > MAX_DOC_FILE_BYTES) {
          notify('Document file must be 2 MB or smaller for multi-device sync.');
          return;
        }
        const dataUrl = await readFileAsDataUrl(file);
        setFileDataUrl(dataUrl);
        setFileName(file.name);
        setFileType(file.type || 'application/octet-stream');
        setFileSize(file.size);
      }
      if (!title.trim()) {
        setTitle(file.name.replace(/\.[^.]+$/, ''));
      }
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not attach document file.');
    } finally {
      setProcessingFile(false);
    }
  };

  const handleCreateDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    addDocument({
      title: title.trim(),
      category,
      referenceNumber: referenceNumber.trim() || `DOC-${Date.now().toString().slice(-6)}`,
      issuer: issuer.trim() || state.settings.storeName,
      issueDate: issueDate || new Date().toISOString().slice(0, 10),
      expiryDate: expiryDate || undefined,
      notes: notes.trim() || undefined,
      fileName: fileName || undefined,
      fileType: fileType || undefined,
      fileSize,
      fileDataUrl: fileDataUrl || undefined,
      uploadedBy: state.settings.ownerName || 'Admin',
    });
    resetForm();
    setShowAddModal(false);
  };

  const handleDownloadFile = (doc: BusinessDocument) => {
    if (!doc.fileDataUrl) {
      // Export clean text summary if no binary attachment was uploaded
      const summary = [
        `InnoWear Business Document Record`,
        `Title: ${doc.title}`,
        `Category: ${doc.category}`,
        `Reference #: ${doc.referenceNumber}`,
        `Issuer: ${doc.issuer}`,
        `Issue Date: ${doc.issueDate}`,
        doc.expiryDate ? `Expiry Date: ${doc.expiryDate}` : '',
        doc.notes ? `Notes: ${doc.notes}` : '',
        `Stored By: ${doc.uploadedBy} (${doc.uploadedAt})`,
      ]
        .filter(Boolean)
        .join('\n');
      const blob = new Blob([summary], { type: 'text/plain;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${doc.referenceNumber || 'document'}.txt`;
      link.click();
      URL.revokeObjectURL(url);
      notify('Downloaded document record summary.');
      return;
    }

    const link = document.createElement('a');
    link.href = doc.fileDataUrl;
    link.download = doc.fileName || `${doc.referenceNumber || 'document'}`;
    link.click();
    notify(`Downloaded ${doc.fileName || doc.title}.`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)] inline-flex items-center gap-2">
            <FolderLock className="w-5 h-5 text-[var(--accent)]" />
            Admin Document Keeper
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Secure owner vault for licenses, compliance certificates, leases, supplier contracts, and
            financial records — synced across all your devices
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-md bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          Store Document
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)]">
          <p className="text-xs text-[var(--text-muted)]">Stored Documents</p>
          <p className="font-mono-tabular text-2xl font-semibold text-[var(--text-primary)] mt-1">
            {stats.total}
          </p>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Admin-only vault</p>
        </div>
        <div className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)]">
          <p className="text-xs text-[var(--text-muted)]">Attached Scans / PDFs</p>
          <p className="font-mono-tabular text-2xl font-semibold text-[var(--accent)] mt-1">
            {stats.attached}
          </p>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Ready for download</p>
        </div>
        <div className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)]">
          <p className="text-xs text-[var(--text-muted)]">Expiring Within 30d</p>
          <p className="font-mono-tabular text-2xl font-semibold text-[var(--status-warning)] mt-1">
            {stats.expiring}
          </p>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Renewal check</p>
        </div>
        <div className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)]">
          <p className="text-xs text-[var(--text-muted)]">Expired Documents</p>
          <p className="font-mono-tabular text-2xl font-semibold text-[var(--status-danger)] mt-1">
            {stats.expired}
          </p>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Requires attention</p>
        </div>
      </div>

      {/* Search & Category Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {(['All', ...DOCUMENT_CATEGORIES] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                categoryFilter === cat
                  ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                  : 'bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72 shrink-0">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, reference #, issuer..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-md bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
          />
        </div>
      </div>

      {/* Document Cards List */}
      {filteredDocs.length === 0 ? (
        <div className="p-12 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-center space-y-2">
          <FileText className="w-8 h-8 text-[var(--text-muted)] mx-auto" />
          <p className="text-sm font-medium text-[var(--text-primary)]">
            No matching documents in vault
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            Store business licenses, supplier agreements, leases, or upload scanned files for
            safekeeping.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => {
            const expiryStatus = getExpiryStatus(doc.expiryDate);
            return (
              <div
                key={doc.id}
                className="p-5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] flex flex-col justify-between gap-4 hover:border-[var(--border-strong)] transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--accent)]">
                      {doc.category}
                    </span>

                    {expiryStatus === 'expired' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--status-danger)]">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Expired
                      </span>
                    ) : expiryStatus === 'expiring' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--status-warning)]">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Expiring Soon
                      </span>
                    ) : expiryStatus === 'valid' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--status-positive)]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Valid
                      </span>
                    ) : null}
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] leading-snug">
                      {doc.title}
                    </h3>
                    <p className="text-xs font-mono-tabular text-[var(--text-muted)] mt-1">
                      Ref: {doc.referenceNumber}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">
                      Issuer: {doc.issuer}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[var(--text-muted)]">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Issued: {doc.issueDate}
                    </span>
                    {doc.expiryDate && (
                      <span className="inline-flex items-center gap-1">
                        Expires: {doc.expiryDate}
                      </span>
                    )}
                  </div>

                  {doc.notes && (
                    <p className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                      {doc.notes}
                    </p>
                  )}

                  {doc.fileName && (
                    <div className="px-2.5 py-1.5 rounded bg-[var(--bg-elevated)] border border-[var(--border-hairline)] flex items-center justify-between gap-2 text-[11px]">
                      <span className="inline-flex items-center gap-1.5 text-[var(--text-primary)] truncate">
                        <Paperclip className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                        <span className="truncate">{doc.fileName}</span>
                      </span>
                      {doc.fileSize ? (
                        <span className="font-mono-tabular text-[var(--text-muted)] shrink-0">
                          {formatFileSize(doc.fileSize)}
                        </span>
                      ) : null}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-[var(--border-hairline)] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPreviewDoc(doc)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:border-[var(--accent)] whitespace-nowrap"
                    >
                      <Eye className="w-3.5 h-3.5 text-[var(--accent)]" />
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadFile(doc)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:border-[var(--accent)] whitespace-nowrap"
                    >
                      <Download className="w-3.5 h-3.5 text-[var(--accent)]" />
                      Download
                    </button>
                  </div>

                  <DeleteButton
                    onConfirm={() => deleteDocument(doc.id)}
                    ariaLabel={`Delete document ${doc.title}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Store Document Modal */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Store Business Document"
        subtitle="Add a record or upload a scan/PDF to the Admin-only Document Keeper"
      >
        <form onSubmit={handleCreateDocument} className="space-y-4 text-xs">
          {/* File Dropzone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              void handleAttachFile(e.dataTransfer.files?.[0]);
            }}
            className="p-4 rounded-md border border-dashed border-[var(--border-strong)] bg-[var(--bg-elevated)] text-center space-y-2"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xlsx"
              onChange={(e) => {
                void handleAttachFile(e.target.files?.[0]);
                e.target.value = '';
              }}
              className="hidden"
              aria-label="Attach document file"
            />
            {fileDataUrl ? (
              <div className="flex items-center justify-between gap-2 text-left">
                <div className="flex items-center gap-2 min-w-0">
                  <Paperclip className="w-4 h-4 text-[var(--accent)] shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-[var(--text-primary)] truncate">{fileName}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {formatFileSize(fileSize)} attached
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFileName('');
                    setFileType('');
                    setFileSize(undefined);
                    setFileDataUrl('');
                  }}
                  className="p-1 text-[var(--text-muted)] hover:text-[var(--status-danger)]"
                  aria-label="Remove attached file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="w-5 h-5 text-[var(--accent)] mx-auto" />
                <p className="text-[var(--text-secondary)]">
                  Drag and drop a photo, PDF, or contract, or{' '}
                  <button
                    type="button"
                    disabled={processingFile}
                    onClick={() => fileInputRef.current?.click()}
                    className="font-semibold text-[var(--accent)] hover:underline"
                  >
                    {processingFile ? 'Processing...' : 'browse device'}
                  </button>
                </p>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Optional · Images compressed automatically · Max 2 MB for PDFs/docs
                </p>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[var(--text-secondary)] mb-1">Document Title</label>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Lusaka City Council Trading License"
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div>
              <label className="block text-[var(--text-secondary)] mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as DocumentCategory)}
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
              >
                {DOCUMENT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[var(--text-secondary)] mb-1">
                Reference / Certificate #
              </label>
              <input
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. LIC-2026-0842"
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)] font-mono-tabular"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[var(--text-secondary)] mb-1">
                Issuing Authority / Counterparty
              </label>
              <input
                value={issuer}
                onChange={(e) => setIssuer(e.target.value)}
                placeholder="e.g. Lusaka City Council / Supplier Name"
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
              />
            </div>

            <div>
              <label className="block text-[var(--text-secondary)] mb-1">Issue Date</label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)] font-mono-tabular"
              />
            </div>

            <div>
              <label className="block text-[var(--text-secondary)] mb-1">
                Expiry Date (Optional)
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)] font-mono-tabular"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[var(--text-secondary)] mb-1">Notes</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Storage location, renewal reminders, or contract terms..."
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 rounded-md border border-[var(--border-strong)] text-[var(--text-secondary)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || processingFile}
              className="px-4 py-2 font-semibold rounded-md bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] disabled:opacity-45"
            >
              Save to Document Keeper
            </button>
          </div>
        </form>
      </Modal>

      {/* Preview Document Modal */}
      <Modal
        open={Boolean(previewDoc)}
        onClose={() => setPreviewDoc(null)}
        title={previewDoc?.title || 'Document Details'}
        subtitle={
          previewDoc
            ? `${previewDoc.category} · Ref: ${previewDoc.referenceNumber}`
            : undefined
        }
      >
        {previewDoc && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)]">
              <div>
                <p className="text-[11px] text-[var(--text-muted)]">Issuer</p>
                <p className="font-medium text-[var(--text-primary)] mt-0.5">{previewDoc.issuer}</p>
              </div>
              <div>
                <p className="text-[11px] text-[var(--text-muted)]">Issue / Expiry</p>
                <p className="font-mono-tabular text-[var(--text-primary)] mt-0.5">
                  {previewDoc.issueDate}
                  {previewDoc.expiryDate ? ` → ${previewDoc.expiryDate}` : ''}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-[var(--text-muted)]">Stored By</p>
                <p className="text-[var(--text-primary)] mt-0.5">{previewDoc.uploadedBy}</p>
              </div>
              <div>
                <p className="text-[11px] text-[var(--text-muted)]">Logged Timestamp</p>
                <p className="font-mono-tabular text-[var(--text-primary)] mt-0.5">
                  {previewDoc.uploadedAt}
                </p>
              </div>
            </div>

            {previewDoc.notes && (
              <div className="p-3 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-secondary)] leading-relaxed">
                {previewDoc.notes}
              </div>
            )}

            {previewDoc.fileDataUrl && previewDoc.fileType?.startsWith('image/') && (
              <div className="rounded-md overflow-hidden border border-[var(--border-hairline)] bg-[var(--bg-canvas)] max-h-80 flex items-center justify-center">
                <img
                  src={previewDoc.fileDataUrl}
                  alt={previewDoc.title}
                  className="max-h-80 w-auto object-contain"
                />
              </div>
            )}

            {previewDoc.fileDataUrl && previewDoc.fileType === 'application/pdf' && (
              <iframe
                src={previewDoc.fileDataUrl}
                title={previewDoc.title}
                className="w-full h-80 rounded-md border border-[var(--border-hairline)] bg-white"
              />
            )}

            {previewDoc.fileDataUrl &&
              !previewDoc.fileType?.startsWith('image/') &&
              previewDoc.fileType !== 'application/pdf' && (
                <div className="p-4 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 font-medium text-[var(--text-primary)]">
                    <Paperclip className="w-4 h-4 text-[var(--accent)]" />
                    {previewDoc.fileName}
                  </span>
                  <span className="font-mono-tabular text-[var(--text-muted)]">
                    {formatFileSize(previewDoc.fileSize)}
                  </span>
                </div>
              )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleDownloadFile(previewDoc)}
                className="inline-flex items-center gap-1.5 px-4 py-2 font-semibold rounded-md bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)]"
              >
                <Download className="w-3.5 h-3.5" />
                {previewDoc.fileDataUrl ? 'Download File' : 'Download Record'}
              </button>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-2 rounded-md border border-[var(--border-strong)] text-[var(--text-secondary)]"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
