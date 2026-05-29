// @ts-nocheck
import { useEffect, useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { formatPrice } from '@/lib/utils';
import API from '@/lib/api';
import { useSettings } from '@/lib/useSettings';
import { Printer, Download, ArrowLeft } from 'lucide-react';
import { Link } from '@tanstack/react-router';

export default function InvoicePage() {
  const { orderNumber } = useParams({ from: '/invoice/$orderNumber' });
  const { settings } = useSettings();
  const [invoice, setInvoice] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    API.get(`/orders/${orderNumber}/invoice`)
      .then(r => setInvoice(r.data))
      .catch((e) => setError(e.response?.data?.message || 'Invoice not available yet.'));
  }, [orderNumber]);

  if (error) return (
    <div className="max-w-2xl mx-auto p-10 text-center">
      <p className="text-gray-500 mb-4">{error}</p>
      <Link to="/account" className="text-orange-500 font-bold">← Back to Account</Link>
    </div>
  );
  if (!invoice) return <div className="p-10 text-center text-gray-400">Loading…</div>;

  const s = invoice.snapshot || {};
  const gst = s.gst || { sameState: false, cgst: 0, sgst: 0, igst: 0, totalTax: 0, taxableValue: 0, placeOfSupply: '' };
  const seller = s.seller || {};
  const company = {
    name: seller.legalName || settings?.siteName || 'NutroPact',
    address: seller.address || settings?.address || settings?.companyAddress || '',
    email: seller.email || settings?.email || '',
    phone: seller.phone || settings?.phone || '',
    gstin: seller.gstin || settings?.gstin || '',
    stateCode: seller.stateCode || '',
    logo: settings?.logo || '',
  };

  const showCgstSgst = gst.sameState;
  const lineHasGstFields = (s.items?.[0] && typeof s.items[0].taxableValue !== 'undefined');

  return (
    <div className="min-h-screen bg-gray-50 py-8 print:bg-white print:p-0">
      <div className="max-w-4xl mx-auto px-4 print:px-0 print:max-w-none">
        <div className="flex items-center justify-between mb-4 print:hidden">
          <Link to="/account" className="flex items-center gap-1 text-sm font-bold text-gray-600 hover:text-gray-900"><ArrowLeft size={16} /> Back</Link>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-gray-800">
              <Printer size={16} /> Print
            </button>
            <button onClick={() => window.print()} className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-orange-600">
              <Download size={16} /> Save as PDF
            </button>
          </div>
        </div>

        <div className="bg-white p-8 md:p-10 rounded-2xl shadow-sm border border-gray-100 print:rounded-none print:border-0 print:shadow-none">
          {/* Header */}
          <div className="flex items-start justify-between border-b pb-6 mb-6 flex-wrap gap-4">
            <div>
              {company.logo
                ? <img src={company.logo} alt={company.name} className="h-10 mb-2" />
                : <h1 className="text-2xl font-black text-orange-500">{company.name}</h1>}
              <p className="font-bold text-sm">{company.name}</p>
              <p className="text-xs text-gray-500 whitespace-pre-line max-w-xs">{company.address}</p>
              {company.gstin && <p className="text-xs text-gray-700 font-semibold mt-1">GSTIN: {company.gstin}</p>}
              {company.stateCode && <p className="text-xs text-gray-500">State Code: {company.stateCode}</p>}
              {(company.email || company.phone) && <p className="text-xs text-gray-500">{company.email} {company.phone && `· ${company.phone}`}</p>}
            </div>
            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Tax Invoice</p>
              <p className="text-xl font-black text-gray-900">{invoice.invoiceNumber}</p>
              <p className="text-xs text-gray-500 mt-1">Order: <span className="font-mono font-bold">{invoice.orderNumber}</span></p>
              <p className="text-xs text-gray-500">Issued: {new Date(invoice.issuedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
              {gst.placeOfSupply && <p className="text-xs text-gray-500 mt-1">Place of Supply: <span className="font-semibold">{gst.placeOfSupply}</span></p>}
            </div>
          </div>

          {/* Bill to */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Billed To</p>
              <p className="font-bold">{s.customerName}</p>
              {s.address && (
                <p className="text-sm text-gray-600 whitespace-pre-line">
                  {[s.address.street, s.address.city, s.address.state, s.address.pincode].filter(Boolean).join(', ')}
                </p>
              )}
              {s.customerPhone && <p className="text-sm text-gray-600">📞 {s.customerPhone}</p>}
              {s.customerEmail && <p className="text-sm text-gray-600">✉️ {s.customerEmail}</p>}
            </div>
            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Payment</p>
              <p className="font-bold capitalize">{s.paymentMethod || 'COD'}</p>
              <p className="text-xs text-gray-500">Order date: {s.orderDate && new Date(s.orderDate).toLocaleDateString('en-IN')}</p>
            </div>
          </div>

          {/* Items */}
          <table className="w-full text-xs mb-6">
            <thead>
              <tr className="bg-gray-50 uppercase font-bold text-gray-500">
                <th className="text-left px-2 py-2 rounded-l-lg">Item</th>
                <th className="text-center px-2 py-2">HSN</th>
                <th className="text-center px-2 py-2">Qty</th>
                <th className="text-right px-2 py-2">Rate</th>
                {lineHasGstFields && <th className="text-right px-2 py-2">Taxable</th>}
                {lineHasGstFields && <th className="text-center px-2 py-2">GST%</th>}
                {lineHasGstFields && showCgstSgst && <th className="text-right px-2 py-2">CGST</th>}
                {lineHasGstFields && showCgstSgst && <th className="text-right px-2 py-2">SGST</th>}
                {lineHasGstFields && !showCgstSgst && <th className="text-right px-2 py-2">IGST</th>}
                <th className="text-right px-2 py-2 rounded-r-lg">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(s.items || []).map((it: any, i: number) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="px-2 py-2.5">
                    <p className="font-semibold">{it.name}</p>
                    {(it.flavor || it.size) && <p className="text-[10px] text-gray-500">{[it.flavor, it.size].filter(Boolean).join(' · ')}</p>}
                  </td>
                  <td className="px-2 py-2.5 text-center text-gray-600">{it.hsn || '-'}</td>
                  <td className="px-2 py-2.5 text-center">{it.qty ?? it.quantity}</td>
                  <td className="px-2 py-2.5 text-right">{formatPrice(it.unitPrice ?? it.price)}</td>
                  {lineHasGstFields && <td className="px-2 py-2.5 text-right">{formatPrice(it.taxableValue)}</td>}
                  {lineHasGstFields && <td className="px-2 py-2.5 text-center">{it.gstRate}%</td>}
                  {lineHasGstFields && showCgstSgst && <td className="px-2 py-2.5 text-right">{formatPrice(it.cgst)}</td>}
                  {lineHasGstFields && showCgstSgst && <td className="px-2 py-2.5 text-right">{formatPrice(it.sgst)}</td>}
                  {lineHasGstFields && !showCgstSgst && <td className="px-2 py-2.5 text-right">{formatPrice(it.igst)}</td>}
                  <td className="px-2 py-2.5 text-right font-semibold">{formatPrice(it.grossLine ?? ((it.unitPrice ?? it.price) * (it.qty ?? it.quantity)))}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals + tax summary */}
          <div className="grid md:grid-cols-2 gap-6">
            {lineHasGstFields && (
              <div className="bg-gray-50 rounded-xl p-4 text-xs">
                <p className="font-bold text-gray-700 mb-2 uppercase tracking-wide">Tax Summary</p>
                <div className="flex justify-between py-1"><span>Taxable Value</span><span className="font-semibold">{formatPrice(gst.taxableValue)}</span></div>
                {showCgstSgst ? (
                  <>
                    <div className="flex justify-between py-1"><span>CGST</span><span>{formatPrice(gst.cgst)}</span></div>
                    <div className="flex justify-between py-1"><span>SGST</span><span>{formatPrice(gst.sgst)}</span></div>
                  </>
                ) : (
                  <div className="flex justify-between py-1"><span>IGST</span><span>{formatPrice(gst.igst)}</span></div>
                )}
                <div className="flex justify-between pt-1 border-t mt-1 font-bold"><span>Total Tax</span><span>{formatPrice(gst.totalTax)}</span></div>
              </div>
            )}
            <div className="flex justify-end">
              <div className="w-full max-w-xs space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatPrice(s.subtotal || 0)}</span></div>
                {Number(s.shipping) > 0 && <div className="flex justify-between"><span className="text-gray-500">Shipping</span><span>{formatPrice(s.shipping)}</span></div>}
                {Number(s.discount) > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>- {formatPrice(s.discount)}</span></div>}
                <div className="flex justify-between border-t pt-2 font-black text-lg"><span>Total</span><span>{formatPrice(s.total || 0)}</span></div>
              </div>
            </div>
          </div>

          <div className="border-t mt-8 pt-4 text-center text-[10px] text-gray-400">
            This is a computer-generated invoice. Thank you for shopping with {company.name}!
          </div>
        </div>
      </div>
      <style>{`@media print { body { background: white !important; } .print\\:hidden { display: none !important; } }`}</style>
    </div>
  );
}
