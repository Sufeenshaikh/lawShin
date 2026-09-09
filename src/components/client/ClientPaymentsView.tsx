import React, { useState, useEffect } from 'react';
import { CreditCard, FileText, CheckCircle2, ShieldCheck, Download, Printer, X } from 'lucide-react';
import { Payment, Invoice } from '../../types.js';
import { api } from '../../services/api.js';

export const ClientPaymentsView: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    loadBilling();
  }, []);

  const loadBilling = async () => {
    try {
      const [payRes, invRes] = await Promise.all([api.getPayments(), api.getInvoices()]);
      setPayments(payRes.payments);
      setInvoices(invRes.invoices);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="client-payments-view" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
          Billing & Invoicing
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold font-serif text-slate-900 mt-2">
          Payments & Tax Invoices
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
          All transactions are processed through Razorpay with transparent statutory 18% GST invoices.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500 text-xs">Loading payment ledger...</div>
      ) : (
        <div className="space-y-6">
          {/* Invoices List */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-bold text-slate-900 text-sm font-serif">GST Tax Invoices</h2>
              <span className="text-xs text-slate-500">{invoices.length} invoices issued</span>
            </div>

            {invoices.length === 0 ? (
              <p className="p-8 text-center text-xs text-slate-500">No invoices issued yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <div key={inv.id} className="p-4 sm:px-6 flex items-center justify-between hover:bg-slate-50 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">{inv.invoiceNumber}</span>
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                          {inv.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        Issued on {new Date(inv.issuedDate).toLocaleDateString('en-IN')} • GSTIN: {inv.gstin}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-slate-500 text-[10px] block">Total Inc. 18% GST</span>
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          ₹{inv.totalAmount.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-800 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-amber-600" />
                        View Tax Invoice
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment Receipts History */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="font-bold text-slate-900 text-sm font-serif">Transaction Receipts (Razorpay)</h2>
            </div>
            <div className="divide-y divide-slate-100 text-xs">
              {payments.map((p) => (
                <div key={p.id} className="p-4 sm:px-6 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{p.serviceCategory}</span>
                      <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-bold">
                        {p.status}
                      </span>
                    </div>
                    <p className="text-slate-500 font-mono text-[11px] mt-0.5">
                      Razorpay Ref: {p.razorpayPaymentId || 'pay_simulated_razorpay_99'} • {p.paymentMethod}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      ₹{p.amount.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-slate-600 block">
                      {new Date(p.createdAt).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Invoice Printable Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-8 relative font-sans text-xs">
            <button
              onClick={() => setSelectedInvoice(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Tax Invoice Printable Layout */}
            <div className="border-b-2 border-slate-900 pb-4 mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-bold font-serif text-slate-900">TAX INVOICE</h1>
                  <p className="text-slate-500 text-xs">Issued under Section 31 of Central Goods and Services Tax Act, 2017</p>
                </div>
                <div className="text-right">
                  <span className="text-base font-bold font-serif text-amber-700">LAWShin Technologies Pvt. Ltd.</span>
                  <p className="text-slate-500 text-[11px]">GSTIN: {selectedInvoice.gstin}</p>
                  <p className="text-slate-500 text-[11px]">Connaught Place, New Delhi - 110001</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-600 block">Billed To (Client):</span>
                <p className="font-bold text-slate-900 text-sm">{selectedInvoice.clientName}</p>
                <p className="text-slate-500">Jurisdiction: New Delhi, India</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase text-slate-600 block">Invoice Details:</span>
                <p className="font-mono font-bold text-slate-900">{selectedInvoice.invoiceNumber}</p>
                <p className="text-slate-500">Date: {new Date(selectedInvoice.issuedDate).toLocaleDateString('en-IN')}</p>
                <p className="text-emerald-700 font-bold">Status: PAID (Razorpay)</p>
              </div>
            </div>

            <table className="w-full text-left mb-6">
              <thead>
                <tr className="border-b border-slate-300 text-slate-700 font-bold uppercase text-[10px]">
                  <th className="py-2">Item / Description</th>
                  <th className="py-2 text-center">HSN/SAC</th>
                  <th className="py-2 text-right">Base Amount</th>
                  <th className="py-2 text-right">CGST (9%)</th>
                  <th className="py-2 text-right">SGST (9%)</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {selectedInvoice.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-2.5 font-semibold text-slate-800">{item.description}</td>
                    <td className="py-2.5 text-center font-mono text-slate-500">{item.hsnCode}</td>
                    <td className="py-2.5 text-right font-mono">₹{item.amount.toLocaleString('en-IN')}</td>
                    <td className="py-2.5 text-right font-mono text-slate-600">₹{selectedInvoice.cgst.toLocaleString('en-IN')}</td>
                    <td className="py-2.5 text-right font-mono text-slate-600">₹{selectedInvoice.sgst.toLocaleString('en-IN')}</td>
                    <td className="py-2.5 text-right font-mono font-bold text-slate-900">₹{selectedInvoice.totalAmount.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border-t-2 border-slate-900 pt-4 flex justify-between items-end">
              <div className="text-[11px] text-slate-500 max-w-sm">
                <p className="font-semibold text-slate-700 mb-0.5">Statutory Declaration:</p>
                <p>This is a computer generated invoice and does not require physical signature. Services rendered through certified advocate panel.</p>
              </div>
              <div className="text-right space-y-1">
                <div className="flex justify-between gap-8 text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-mono">₹{selectedInvoice.subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between gap-8 text-slate-600">
                  <span>GST (18% Total):</span>
                  <span className="font-mono">₹{(selectedInvoice.cgst + selectedInvoice.sgst).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between gap-8 text-base font-bold text-slate-900 border-t border-slate-300 pt-1">
                  <span>Total Paid:</span>
                  <span className="font-mono text-amber-700">₹{selectedInvoice.totalAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Print / Save PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
