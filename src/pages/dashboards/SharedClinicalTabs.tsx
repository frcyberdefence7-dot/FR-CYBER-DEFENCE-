import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Download,
  FlaskConical,
  Pill,
  Plus,
  Receipt,
} from 'lucide-react';
import { apiFetch } from '../../utils/api.ts';
import { downloadInvoicePdf, downloadLabReportPdf, exportToCsv } from '../../utils/pdfExport.ts';
import type { Bill, LabReport, LabTest, Medicine, Patient, PaymentRecord, PharmacyBatch } from '../../types/hms.ts';

// ---------------- SANDBOX PAYMENT MODAL ----------------

export const SandboxPaymentModal: React.FC<{
  bill: Bill;
  onClose: () => void;
  onPaid: () => void;
}> = ({ bill, onClose, onPaid }) => {
  const remaining = Math.max(0, bill.totalAmount - bill.paidAmount);
  const [amount, setAmount] = useState(String(remaining));
  const [method, setMethod] = useState<'upi_sandbox' | 'card_sandbox' | 'netbanking_sandbox' | 'cash'>(
    'upi_sandbox'
  );
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch(`/api/clinical/billing/bills/${bill.id}/pay`, {
        method: 'POST',
        body: JSON.stringify({
          amount: Number(amount),
          paymentMethod: method,
          notes,
        }),
      });
      onPaid();
    } catch (err: any) {
      setError(err.message || 'Payment failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-xl border border-slate-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-slate-900">
            Settle Invoice {bill.invoiceNumber}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-slate-500 hover:text-slate-900 cursor-pointer"
          >
            Close
          </button>
        </div>

        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
          Sandbox Payment Environment: Card numbers, CVVs, and UPI PINs are never collected or stored.
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
            {error}
          </div>
        )}

        <form onSubmit={handlePay} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Payment Amount (Due: ₹{remaining.toLocaleString()})
            </label>
            <input
              type="number"
              required
              min={1}
              max={remaining}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as any)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            >
              <option value="upi_sandbox">UPI Payment (Sandbox Test)</option>
              <option value="card_sandbox">Debit / Credit Card (Sandbox Gateway)</option>
              <option value="netbanking_sandbox">NetBanking (Sandbox Gateway)</option>
              <option value="cash">Cash Counter Settlement</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Reference Note</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional receipt memo"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 cursor-pointer"
          >
            <CreditCard className="w-4 h-4" />
            {submitting ? 'Processing...' : `Pay ₹${Number(amount || 0).toLocaleString()}`}
          </button>
        </form>
      </div>
    </div>
  );
};

// ---------------- LABORATORY MANAGER PANEL ----------------

export const LaboratoryManagerPanel: React.FC<{ patients: Patient[] }> = ({ patients }) => {
  const [reports, setReports] = useState<LabReport[]>([]);
  const [tests, setTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderForm, setOrderForm] = useState({ patientId: '', testId: '', notes: '' });
  const [editingReport, setEditingReport] = useState<LabReport | null>(null);
  const [editResult, setEditResult] = useState({
    sampleStatus: 'collected',
    processingStatus: 'verified',
    resultSummary: '',
  });
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadLab = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ reports: LabReport[]; testsCatalog: LabTest[] }>(
        '/api/clinical/lab/reports'
      );
      setReports(res.reports);
      setTests(res.testsCatalog);
      if (!orderForm.patientId && patients[0]) {
        setOrderForm((f) => ({ ...f, patientId: String(patients[0].id) }));
      }
      if (!orderForm.testId && res.testsCatalog[0]) {
        setOrderForm((f) => ({ ...f, testId: String(res.testsCatalog[0].id) }));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLab();
  }, []);

  const createOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    await apiFetch('/api/clinical/lab/orders', {
      method: 'POST',
      body: JSON.stringify({
        patientId: Number(orderForm.patientId),
        testId: Number(orderForm.testId),
        notes: orderForm.notes,
      }),
    });
    setFeedback('Lab test order & invoice created.');
    setOrderForm((f) => ({ ...f, notes: '' }));
    loadLab();
  };

  const saveReportUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReport) return;
    await apiFetch(`/api/clinical/lab/reports/${editingReport.id}`, {
      method: 'PATCH',
      body: JSON.stringify(editResult),
    });
    setEditingReport(null);
    setFeedback('Laboratory report status & verification saved.');
    loadLab();
  };

  return (
    <div className="space-y-6">
      {feedback && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Book Lab Test */}
      <form
        onSubmit={createOrder}
        className="bg-white border border-slate-200 rounded-xl p-5 grid grid-cols-1 md:grid-cols-12 gap-4 items-end"
      >
        <div className="md:col-span-4">
          <label className="block text-xs font-semibold text-slate-700 mb-1">Patient</label>
          <select
            required
            value={orderForm.patientId}
            onChange={(e) => setOrderForm({ ...orderForm, patientId: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
          >
            <option value="">Select Patient</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.fullName} ({p.patientCode})
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-4">
          <label className="block text-xs font-semibold text-slate-700 mb-1">Diagnostic Test</label>
          <select
            required
            value={orderForm.testId}
            onChange={(e) => setOrderForm({ ...orderForm, testId: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
          >
            <option value="">Select Test</option>
            {tests.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} (₹{t.price})
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
          <input
            type="text"
            value={orderForm.notes}
            onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
            placeholder="Fasting / Urgent"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
          />
        </div>
        <div className="md:col-span-2">
          <button
            type="submit"
            className="w-full py-2 px-3 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Book Test
          </button>
        </div>
      </form>

      {editingReport && (
        <form
          onSubmit={saveReportUpdate}
          className="bg-slate-50 border border-slate-300 rounded-xl p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h4 className="font-display text-sm font-bold text-slate-900">
              Update & Verify Lab Report: {editingReport.reportCode} ({editingReport.testName})
            </h4>
            <button
              type="button"
              onClick={() => setEditingReport(null)}
              className="text-xs text-slate-500 cursor-pointer"
            >
              Cancel
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Sample Status</label>
              <select
                value={editResult.sampleStatus}
                onChange={(e) => setEditResult({ ...editResult, sampleStatus: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
              >
                <option value="pending">Pending Collection</option>
                <option value="collected">Sample Collected</option>
                <option value="received">Received at Lab</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Processing Status
              </label>
              <select
                value={editResult.processingStatus}
                onChange={(e) => setEditResult({ ...editResult, processingStatus: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
              >
                <option value="queued">Queued</option>
                <option value="processing">Processing</option>
                <option value="verified">Verified & Ready</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Observed Findings / Result Summary
            </label>
            <textarea
              rows={2}
              required
              value={editResult.resultSummary}
              onChange={(e) => setEditResult({ ...editResult, resultSummary: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-teal-700 text-white text-xs font-semibold rounded-lg cursor-pointer"
          >
            Save & Verify Report
          </button>
        </form>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-display text-sm font-bold text-slate-900 flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-teal-700" />
            Laboratory Orders & Verification Queue
          </h3>
          <span className="text-xs font-mono text-slate-500">{reports.length} orders</span>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-slate-500">Loading lab orders...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="px-4 py-3">Report ID</th>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Test</th>
                  <th className="px-4 py-3">Sample</th>
                  <th className="px-4 py-3">Processing</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {reports.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-semibold text-slate-900">{r.reportCode}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{r.patientName}</div>
                      <div className="font-mono text-slate-500">{r.patientCode}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-800">{r.testName}</td>
                    <td className="px-4 py-3 capitalize text-slate-600">{r.sampleStatus}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`font-semibold capitalize ${
                          r.processingStatus === 'verified'
                            ? 'text-emerald-700'
                            : r.processingStatus === 'processing'
                              ? 'text-amber-700'
                              : 'text-slate-600'
                        }`}
                      >
                        {r.processingStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingReport(r);
                          setEditResult({
                            sampleStatus: r.sampleStatus,
                            processingStatus: r.processingStatus,
                            resultSummary: r.resultSummary || '',
                          });
                        }}
                        className="text-teal-800 font-semibold hover:underline cursor-pointer"
                      >
                        Update / Verify
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadLabReportPdf(r)}
                        className="text-slate-700 hover:text-slate-900 font-semibold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" /> PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// ---------------- PHARMACY MANAGER PANEL ----------------

export const PharmacyManagerPanel: React.FC<{ patients: Patient[] }> = ({ patients }) => {
  const [batches, setBatches] = useState<PharmacyBatch[]>([]);
  const [lowStock, setLowStock] = useState<PharmacyBatch[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [sales, setSales] = useState<Array<{ id: number; saleCode: string; patientName: string; totalAmount: number; soldAt: string }>>([]);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [newStock, setNewStock] = useState({
    medicineId: '',
    name: '',
    genericName: '',
    category: 'Cardiovascular',
    unitPrice: '100',
    batchNumber: '',
    expiryDate: '2028-06-30',
    quantityAvailable: '60',
    reorderLevel: '25',
    supplierName: 'MedSupply Distributors',
  });

  const [saleForm, setSaleForm] = useState({
    patientId: '',
    stockId: '',
    qty: '1',
    discount: '0',
  });

  const loadPharmacy = async () => {
    const res = await apiFetch<{
      medicines: Medicine[];
      batches: PharmacyBatch[];
      lowStockAlerts: PharmacyBatch[];
      sales: any[];
    }>('/api/clinical/pharmacy/inventory');
    setMedicines(res.medicines);
    setBatches(res.batches);
    setLowStock(res.lowStockAlerts);
    setSales(res.sales);
    if (!saleForm.stockId && res.batches[0]) {
      setSaleForm((s) => ({ ...s, stockId: String(res.batches[0].id) }));
    }
  };

  useEffect(() => {
    loadPharmacy();
  }, []);

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    await apiFetch('/api/clinical/pharmacy/medicines', {
      method: 'POST',
      body: JSON.stringify({
        medicineId: newStock.medicineId ? Number(newStock.medicineId) : null,
        name: newStock.name,
        genericName: newStock.genericName,
        category: newStock.category,
        unitPrice: Number(newStock.unitPrice),
        batchNumber: newStock.batchNumber,
        expiryDate: newStock.expiryDate,
        quantityAvailable: Number(newStock.quantityAvailable),
        reorderLevel: Number(newStock.reorderLevel),
        supplierName: newStock.supplierName,
      }),
    });
    setFeedback('Pharmacy batch added to inventory.');
    setNewStock((s) => ({ ...s, name: '', genericName: '', batchNumber: '' }));
    loadPharmacy();
  };

  const handleDispense = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    await apiFetch('/api/clinical/pharmacy/sales', {
      method: 'POST',
      body: JSON.stringify({
        patientId: saleForm.patientId ? Number(saleForm.patientId) : null,
        items: [{ stockId: Number(saleForm.stockId), qty: Number(saleForm.qty) }],
        discount: Number(saleForm.discount || 0),
      }),
    });
    setFeedback('Medicine sale billed & stock deducted.');
    loadPharmacy();
  };

  return (
    <div className="space-y-6">
      {feedback && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
          {feedback}
        </div>
      )}

      {lowStock.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-amber-900 font-semibold text-xs mb-2">
            <AlertTriangle className="w-4 h-4" />
            Low Stock Alerts ({lowStock.length} batches below reorder threshold)
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-amber-800">
            {lowStock.map((b) => (
              <span key={b.id}>
                <strong>{b.medicineName}</strong> ({b.batchNumber}):{' '}
                <span className="font-mono font-bold">{b.quantityAvailable} left</span> (min {b.reorderLevel})
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pharmacy POS Sale */}
        <form onSubmit={handleDispense} className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <h3 className="font-display text-sm font-bold text-slate-900 flex items-center gap-2">
            <Pill className="w-4 h-4 text-teal-700" />
            Dispense & Bill Medicine Sale
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Patient (Optional)</label>
              <select
                value={saleForm.patientId}
                onChange={(e) => setSaleForm({ ...saleForm, patientId: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              >
                <option value="">Walk-in Customer</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} ({p.patientCode})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Stock Batch</label>
              <select
                required
                value={saleForm.stockId}
                onChange={(e) => setSaleForm({ ...saleForm, stockId: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              >
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.medicineName} ({b.batchNumber} · {b.quantityAvailable} avail · ₹{b.unitPrice})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity</label>
              <input
                type="number"
                min={1}
                required
                value={saleForm.qty}
                onChange={(e) => setSaleForm({ ...saleForm, qty: e.target.value })}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Discount (₹)</label>
              <input
                type="number"
                min={0}
                value={saleForm.discount}
                onChange={(e) => setSaleForm({ ...saleForm, discount: e.target.value })}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
              />
            </div>
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
          >
            Complete Sale & Deduct Stock
          </button>
        </form>

        {/* Purchase / Restock Batch */}
        <form onSubmit={handleAddStock} className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <h3 className="font-display text-sm font-bold text-slate-900">
            Purchase & Restock Medicine Batch
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Existing Medicine (or leave blank for new)
              </label>
              <select
                value={newStock.medicineId}
                onChange={(e) => setNewStock({ ...newStock, medicineId: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              >
                <option value="">+ Add New Medicine</option>
                {medicines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.medicineCode})
                  </option>
                ))}
              </select>
            </div>
            {!newStock.medicineId && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Brand Name *</label>
                  <input
                    required
                    type="text"
                    value={newStock.name}
                    onChange={(e) => setNewStock({ ...newStock, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Generic Name *</label>
                  <input
                    required
                    type="text"
                    value={newStock.genericName}
                    onChange={(e) => setNewStock({ ...newStock, genericName: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Unit MRP (₹) *</label>
                  <input
                    required
                    type="number"
                    value={newStock.unitPrice}
                    onChange={(e) => setNewStock({ ...newStock, unitPrice: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Batch Number</label>
              <input
                type="text"
                value={newStock.batchNumber}
                onChange={(e) => setNewStock({ ...newStock, batchNumber: e.target.value })}
                placeholder="Auto if empty"
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Expiry Date</label>
              <input
                type="date"
                value={newStock.expiryDate}
                onChange={(e) => setNewStock({ ...newStock, expiryDate: e.target.value })}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity Received</label>
              <input
                type="number"
                min={1}
                value={newStock.quantityAvailable}
                onChange={(e) => setNewStock({ ...newStock, quantityAvailable: e.target.value })}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
              />
            </div>
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
          >
            Save Batch to Stock
          </button>
        </form>
      </div>

      {/* Stock Batches Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-display text-sm font-bold text-slate-900">
            Batch Stock & Expiry Register
          </h3>
          <button
            type="button"
            onClick={() =>
              exportToCsv(
                'pharmacy_stock_report',
                batches.map((b) => ({
                  Medicine: b.medicineName,
                  Batch: b.batchNumber,
                  Expiry: b.expiryDate,
                  Quantity: b.quantityAvailable,
                  ReorderLevel: b.reorderLevel,
                  Supplier: b.supplierName,
                }))
              )
            }
            className="text-xs font-semibold text-teal-800 hover:underline cursor-pointer"
          >
            Export Stock CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="px-4 py-3">Medicine</th>
                <th className="px-4 py-3">Batch #</th>
                <th className="px-4 py-3">Expiry</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3 text-right">Stock Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {batches.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{b.medicineName}</td>
                  <td className="px-4 py-3 font-mono text-slate-600">{b.batchNumber}</td>
                  <td className="px-4 py-3 font-mono text-slate-600">{b.expiryDate}</td>
                  <td className="px-4 py-3 text-slate-600">{b.supplierName}</td>
                  <td
                    className={`px-4 py-3 text-right font-mono font-bold tabular-nums ${
                      b.isLowStock ? 'text-rose-700' : 'text-slate-900'
                    }`}
                  >
                    {b.quantityAvailable} {b.isLowStock ? '(Low)' : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {sales.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h4 className="font-display text-sm font-bold text-slate-900 mb-3">Recent Pharmacy Sales</h4>
          <div className="divide-y divide-slate-100 text-xs">
            {sales.slice(0, 6).map((s) => (
              <div key={s.id} className="py-2 flex items-center justify-between">
                <span>
                  <strong className="font-mono">{s.saleCode}</strong> · {s.patientName}
                </span>
                <span className="font-mono font-semibold text-slate-900">₹{s.totalAmount}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------- BILLING & PAYMENTS PANEL ----------------

export const BillingManagerPanel: React.FC<{ patients: Patient[] }> = ({ patients }) => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [payBill, setPayBill] = useState<Bill | null>(null);
  const [form, setForm] = useState({
    patientId: '',
    consultationFee: '800',
    labCharges: '0',
    medicineCharges: '0',
    serviceCharges: '0',
    discountAmount: '0',
  });
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadBills = async () => {
    const res = await apiFetch<{ bills: Bill[]; payments: PaymentRecord[] }>(
      '/api/clinical/billing/bills'
    );
    setBills(res.bills);
    setPayments(res.payments);
    if (!form.patientId && patients[0]) {
      setForm((f) => ({ ...f, patientId: String(patients[0].id) }));
    }
  };

  useEffect(() => {
    loadBills();
  }, []);

  const createBill = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    await apiFetch('/api/clinical/billing/bills', {
      method: 'POST',
      body: JSON.stringify({
        patientId: Number(form.patientId),
        consultationFee: Number(form.consultationFee),
        labCharges: Number(form.labCharges),
        medicineCharges: Number(form.medicineCharges),
        serviceCharges: Number(form.serviceCharges),
        discountAmount: Number(form.discountAmount),
      }),
    });
    setFeedback('Patient tax invoice generated.');
    loadBills();
  };

  return (
    <div className="space-y-6">
      {feedback && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
          {feedback}
        </div>
      )}

      <form
        onSubmit={createBill}
        className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
      >
        <h3 className="font-display text-sm font-bold text-slate-900 flex items-center gap-2">
          <Receipt className="w-4 h-4 text-teal-700" />
          Generate Hospital Invoice (Auto GST Calculation)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Patient</label>
            <select
              required
              value={form.patientId}
              onChange={(e) => setForm({ ...form, patientId: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
            >
              <option value="">Select Patient</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName} ({p.patientCode})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Consultation (₹)</label>
            <input
              type="number"
              min={0}
              value={form.consultationFee}
              onChange={(e) => setForm({ ...form, consultationFee: e.target.value })}
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Lab Charges (₹)</label>
            <input
              type="number"
              min={0}
              value={form.labCharges}
              onChange={(e) => setForm({ ...form, labCharges: e.target.value })}
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Service / Meds (₹)</label>
            <input
              type="number"
              min={0}
              value={form.serviceCharges}
              onChange={(e) => setForm({ ...form, serviceCharges: e.target.value })}
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Discount (₹)</label>
            <input
              type="number"
              min={0}
              value={form.discountAmount}
              onChange={(e) => setForm({ ...form, discountAmount: e.target.value })}
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
            />
          </div>
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
        >
          Generate Invoice
        </button>
      </form>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-display text-sm font-bold text-slate-900">Invoices & Receipts</h3>
          <button
            type="button"
            onClick={() =>
              exportToCsv(
                'hospital_billing_ledger',
                bills.map((b) => ({
                  Invoice: b.invoiceNumber,
                  Patient: b.patientName,
                  Subtotal: b.subtotal,
                  Discount: b.discountAmount,
                  Tax: b.taxAmount,
                  Total: b.totalAmount,
                  Paid: b.paidAmount,
                  Status: b.status,
                }))
              )
            }
            className="text-xs font-semibold text-teal-800 hover:underline cursor-pointer"
          >
            Export Ledger CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Paid</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {bills.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono font-semibold text-slate-900">
                    {b.invoiceNumber}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{b.patientName}</div>
                    <div className="font-mono text-slate-500">{b.patientCode}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">
                    ₹{b.totalAmount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">
                    ₹{b.paidAmount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 capitalize font-semibold">
                    <span
                      className={
                        b.status === 'paid'
                          ? 'text-emerald-700'
                          : b.status === 'partial'
                            ? 'text-amber-700'
                            : 'text-rose-700'
                      }
                    >
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
                    {b.status !== 'paid' && (
                      <button
                        type="button"
                        onClick={() => setPayBill(b)}
                        className="text-teal-800 font-semibold hover:underline cursor-pointer"
                      >
                        Collect Payment
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => downloadInvoicePdf(b)}
                      className="text-slate-700 hover:text-slate-900 font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {payments.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h4 className="font-display text-sm font-bold text-slate-900 mb-3">
            Payment Receipts ({payments.length})
          </h4>
          <div className="divide-y divide-slate-100 text-xs">
            {payments.slice(0, 8).map((p) => (
              <div key={p.id} className="py-2 flex items-center justify-between">
                <span>
                  <strong className="font-mono">{p.receiptNumber}</strong> · {p.paymentMethod} ·{' '}
                  <span className="font-mono text-slate-500">{p.transactionRef}</span>
                </span>
                <span className="font-mono font-semibold text-emerald-700">₹{p.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {payBill && (
        <SandboxPaymentModal
          bill={payBill}
          onClose={() => setPayBill(null)}
          onPaid={() => {
            setPayBill(null);
            setFeedback('Payment recorded and receipt generated.');
            loadBills();
          }}
        />
      )}
    </div>
  );
};
