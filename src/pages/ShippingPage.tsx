// @ts-nocheck
import { useSEO } from '@/lib/useSEO';

const sections = [
  {
    title: 'Processing Time',
    content: `All orders are processed within 1-2 business days (excluding weekends and holidays) after receiving your order confirmation email. You will receive a notification when your order has been shipped.`,
  },
  {
    title: 'Shipping Rates & Delivery Estimates',
    content: `• Free shipping on all orders above ₹999\n• Standard shipping (5-7 business days): ₹99\n• Express shipping (2-3 business days): ₹199\n\nDelivery times are estimates and commence from the date of shipping, not the date of order. Delivery times are to be used as a guide only and are subject to the acceptance and receipt of payment.`,
  },
  {
    title: 'Shipment Confirmation & Order Tracking',
    content: `You will receive a Shipment Confirmation email once your order has shipped, containing your tracking number(s). The tracking number will be active within 24 hours.\n\nYou can track your order at any time by visiting our Track Order page and entering your order number.`,
  },
  {
    title: 'Shipping Destinations',
    content: `We currently ship to all states and union territories within India. We do not ship internationally at this time. International shipping is coming soon — please check back or subscribe to our newsletter for updates.`,
  },
  {
    title: 'Damaged / Lost in Transit',
    content: `NutroPact is not liable for any products damaged or lost during shipping. If you received your order damaged, please contact our support team at support@nutropact.com within 48 hours of delivery with photos of the damage. We will file a claim on your behalf and arrange a replacement or refund.\n\nIf your order is lost in transit, please contact us at support@nutropact.com and we will investigate with the carrier.`,
  },
  {
    title: 'Address Accuracy',
    content: `Please ensure your shipping address is correct at the time of placing the order. NutroPact is not responsible for orders shipped to incorrect addresses provided by the customer. If you notice an error in your shipping address, contact us immediately at support@nutropact.com — we can only make changes before your order is shipped.`,
  },
];

export default function ShippingPage() {
  useSEO({
    title: 'Shipping Policy',
    description: 'NutroPact shipping policy — free delivery above ₹999, processing times, tracking, and more.',
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-black mb-2">SHIPPING POLICY</h1>
      <p className="text-gray-500 mb-10">Last updated: January 2026</p>

      <div className="space-y-8">
        {sections.map((section, i) => (
          <div key={i} className="border-b border-gray-100 pb-8 last:border-0">
            <h2 className="text-xl font-black mb-3">{section.title}</h2>
            <p className="text-gray-600 leading-relaxed whitespace-pre-line">{section.content}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 bg-orange-50 border border-orange-100 rounded-2xl p-6">
        <h3 className="font-black text-lg mb-2">Need Help?</h3>
        <p className="text-gray-600 text-sm">
          If you have any questions about shipping, please contact us at{' '}
          <a href="mailto:support@nutropact.com" className="text-orange-500 font-semibold hover:underline">
            support@nutropact.com
          </a>{' '}
          or call us at{' '}
          <a href="tel:+918955590350" className="text-orange-500 font-semibold hover:underline">
            +91 8955590350
          </a>
          . We're available Monday–Saturday, 11 AM – 6 PM IST.
        </p>
      </div>
    </div>
  );
}
