// @ts-nocheck
import { useSettings } from '@/lib/useSettings';
import { Mail, Phone, MapPin, Clock, MessageCircle, Instagram, Facebook, Youtube, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import API from '@/lib/api';

export default function ContactPage() {
  const { settings } = useSettings();
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: 'General Inquiry', message: '' });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const whatsappHref = settings?.whatsappNumber
    ? `https://wa.me/${settings.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(settings?.whatsappMessage || 'Hi, I want to know more about NutroPact.')}`
    : '#';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      await API.post('/contact', form);
      setSent(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const contactMethods = [
    {
      icon: <Mail size={22} className="text-orange-500" />,
      label: 'Email Us',
      value: settings?.email || 'support@nutropact.com',
      sub: 'We reply within 24 hours',
      href: `mailto:${settings?.email || 'support@nutropact.com'}`,
    },
    {
      icon: <Phone size={22} className="text-orange-500" />,
      label: 'Call Us',
      value: settings?.phone || '+91 9999999999',
      sub: 'Mon–Sat, 9 AM – 7 PM IST',
      href: `tel:${(settings?.phone || '+919999999999').replace(/\s/g, '')}`,
    },
    {
      icon: <MessageCircle size={22} className="text-green-500" />,
      label: 'WhatsApp',
      value: settings?.whatsappNumber ? `+${settings.whatsappNumber}` : 'Chat with us',
      sub: 'Fastest response',
      href: whatsappHref,
    },
    {
      icon: <MapPin size={22} className="text-blue-500" />,
      label: 'Our Office',
      value: settings?.address || 'India',
      sub: 'Visit by appointment only',
      href: '#',
    },
  ];

  const SUBJECTS = ['General Inquiry', 'Order Issue', 'Return / Refund', 'Product Question', 'Bulk / Wholesale', 'Partnership', 'Other'];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="w-16 h-16 bg-orange-500/20 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-orange-500/30">
            <MessageCircle size={28} className="text-orange-400" />
          </div>
          <h1 className="text-4xl font-black mb-3">Get in Touch</h1>
          <p className="text-gray-400 text-lg max-w-lg mx-auto">Have a question or need help? We're here for you. Our team typically responds within 2–4 hours.</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-14">
        {/* Contact method cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-14">
          {contactMethods.map((m, i) => (
            <a key={i} href={m.href} target={m.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer"
              className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-orange-300 hover:shadow-md transition group flex flex-col items-start gap-3">
              <div className="w-11 h-11 bg-gray-50 group-hover:bg-orange-50 rounded-xl flex items-center justify-center transition">
                {m.icon}
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">{m.label}</p>
                <p className="font-bold text-gray-900 text-sm leading-snug">{m.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{m.sub}</p>
              </div>
            </a>
          ))}
        </div>

        {/* Two column layout */}
        <div className="grid lg:grid-cols-5 gap-10">
          {/* Left: Form */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
              <h2 className="text-2xl font-black text-gray-900 mb-1">Send Us a Message</h2>
              <p className="text-gray-500 text-sm mb-7">Fill in the form and we'll get back to you as soon as possible.</p>

              {sent ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
                    <CheckCircle2 size={40} className="text-green-500" />
                  </div>
                  <h3 className="text-xl font-black text-gray-900 mb-2">Message Sent!</h3>
                  <p className="text-gray-500 mb-6">Thanks for reaching out. We'll get back to you within 24 hours.</p>
                  <button onClick={() => { setSent(false); setForm({ name: '', email: '', phone: '', subject: 'General Inquiry', message: '' }); }}
                    className="px-6 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition text-sm">
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1.5">Your Name *</label>
                      <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                        placeholder="Rahul Sharma" required
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1.5">Phone Number</label>
                      <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                        placeholder="+91 9876543210"
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1.5">Email Address *</label>
                    <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                      placeholder="rahul@email.com" required
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1.5">Subject</label>
                    <select value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition">
                      {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1.5">Message *</label>
                    <textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })}
                      placeholder="Tell us how we can help you..." rows={5} required
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition resize-none" />
                  </div>
                  {error && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                      <AlertCircle size={15} className="shrink-0" /> {error}
                    </div>
                  )}
                  <button type="submit" disabled={sending}
                    className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-xl font-black transition disabled:opacity-60 text-sm">
                    <Send size={16} />
                    {sending ? 'Sending...' : 'Send Message'}
                  </button>
                  <p className="text-xs text-gray-400 text-center">By submitting you agree to our privacy policy. We'll never share your details.</p>
                </form>
              )}
            </div>
          </div>

          {/* Right: Info */}
          <div className="lg:col-span-2 space-y-5">
            {/* Hours */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
                  <Clock size={16} className="text-orange-500" />
                </div>
                <h3 className="font-black text-gray-800">Support Hours</h3>
              </div>
              <div className="space-y-2 text-sm">
                {[
                  { day: 'Monday – Friday', time: '9:00 AM – 7:00 PM' },
                  { day: 'Saturday', time: '10:00 AM – 5:00 PM' },
                  { day: 'Sunday', time: 'Closed' },
                ].map(({ day, time }) => (
                  <div key={day} className="flex justify-between items-center py-1 border-b border-gray-50 last:border-0">
                    <span className="text-gray-600 font-medium">{day}</span>
                    <span className={`font-bold ${time === 'Closed' ? 'text-red-400' : 'text-gray-800'}`}>{time}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3">All timings in IST. WhatsApp responses available 24/7.</p>
            </div>

            {/* WhatsApp CTA */}
            {settings?.whatsappNumber && (
              <a href={whatsappHref}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-4 bg-green-500 hover:bg-green-600 text-white rounded-2xl p-5 transition group">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                  <MessageCircle size={24} />
                </div>
                <div>
                  <p className="font-black text-lg">Chat on WhatsApp</p>
                  <p className="text-green-100 text-sm">Fastest way to get help — reply in minutes</p>
                </div>
              </a>
            )}

            {/* Social media */}
            {(settings?.instagram || settings?.facebook || settings?.youtube) && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h3 className="font-black text-gray-800 mb-4">Follow Us</h3>
                <div className="space-y-3">
                  {settings?.instagram && (
                    <a href={settings.instagram} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-pink-50 transition group">
                      <div className="w-9 h-9 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center">
                        <Instagram size={16} className="text-white" />
                      </div>
                      <span className="text-sm font-bold text-gray-700 group-hover:text-pink-600 transition">Instagram</span>
                    </a>
                  )}
                  {settings?.facebook && (
                    <a href={settings.facebook} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 transition group">
                      <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
                        <Facebook size={16} className="text-white" />
                      </div>
                      <span className="text-sm font-bold text-gray-700 group-hover:text-blue-600 transition">Facebook</span>
                    </a>
                  )}
                  {settings?.youtube && (
                    <a href={settings.youtube} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 transition group">
                      <div className="w-9 h-9 bg-red-600 rounded-xl flex items-center justify-center">
                        <Youtube size={16} className="text-white" />
                      </div>
                      <span className="text-sm font-bold text-gray-700 group-hover:text-red-600 transition">YouTube</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* FAQ link */}
            <div className="bg-orange-50 border border-orange-100 rounded-2xl p-5">
              <p className="font-bold text-gray-800 text-sm mb-1">Looking for quick answers?</p>
              <p className="text-xs text-gray-500 mb-3">Check our FAQ page — most common questions are answered there instantly.</p>
              <a href="/faq" className="inline-block text-xs font-black text-orange-600 hover:underline">Browse FAQ →</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
