// @ts-nocheck
import { Award, FlaskConical, RefreshCw, ShieldCheck, Truck, Zap } from 'lucide-react';

interface Badge {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}

const DEFAULT_BADGES: Badge[] = [
  { icon: <ShieldCheck size={22} className="text-green-600" />, title: 'SSL Secure', subtitle: '100% safe payments' },
  { icon: <Award size={22} className="text-orange-500" />, title: '100% Authentic', subtitle: 'Genuine products only' },
  { icon: <FlaskConical size={22} className="text-blue-600" />, title: 'Lab Tested', subtitle: 'Quality guaranteed' },
  { icon: <Truck size={22} className="text-purple-600" />, title: 'Free Delivery', subtitle: 'On orders above ₹999' },
  { icon: <RefreshCw size={22} className="text-teal-600" />, title: 'Easy Returns', subtitle: '7-day return policy' },
  { icon: <Zap size={22} className="text-yellow-500" />, title: 'Fast Dispatch', subtitle: 'Ships in 24 hours' },
];

interface TrustBadgesProps {
  compact?: boolean;
  badges?: Badge[];
  className?: string;
}

export default function TrustBadges({ compact = false, badges = DEFAULT_BADGES, className = '' }: TrustBadgesProps) {
  if (compact) {
    return (
      <div className={`flex flex-wrap gap-3 ${className}`}>
        {badges.slice(0, 4).map((badge, i) => (
          <div key={i} className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            {badge.icon}
            <span className="text-xs font-semibold text-gray-700">{badge.title}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 gap-3 ${className}`}>
      {badges.map((badge, i) => (
        <div key={i} className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl p-3">
          <div className="w-9 h-9 bg-white rounded-lg shadow-sm flex items-center justify-center flex-shrink-0">
            {badge.icon}
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800">{badge.title}</p>
            <p className="text-xs text-gray-500">{badge.subtitle}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CheckoutTrustBar() {
  return (
    <div className="flex flex-wrap justify-center gap-4 py-3 bg-gray-50 border-y border-gray-200">
      {[
        { icon: <ShieldCheck size={16} className="text-green-600" />, text: 'Secure Checkout' },
        { icon: <Award size={16} className="text-orange-500" />, text: '100% Authentic' },
        { icon: <Truck size={16} className="text-blue-600" />, text: 'Fast Shipping' },
        { icon: <RefreshCw size={16} className="text-teal-600" />, text: 'Easy Returns' },
      ].map((item, i) => (
        <div key={i} className="flex items-center gap-1.5 text-sm text-gray-600 font-medium">
          {item.icon}
          {item.text}
        </div>
      ))}
    </div>
  );
}
