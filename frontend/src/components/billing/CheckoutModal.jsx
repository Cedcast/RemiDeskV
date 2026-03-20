import { useState } from 'react';
import { XMarkIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { billingAPI } from '../../services/api';
import toast from 'react-hot-toast';

const PRICES = {
  premium: '$15.00',
  pro: '$38.99',
};

// Paystack checkout — single payment flow
const PaystackCheckout = ({ tier, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const priceDisplay = PRICES[tier] || '';

  const handlePaystack = async () => {
    setLoading(true);
    try {
      const res = await billingAPI.upgrade({
        tier,
        return_url: `${window.location.origin}/dashboard/billing?paystack=success`,
      });
      if (res.data.authorization_url) {
        // Store upgrade intent for redirect-back handling
        sessionStorage.setItem('paystack_upgrade', JSON.stringify({ tier }));
        window.location.href = res.data.authorization_url;
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Paystack error. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
        <p className="text-sm text-gray-500 mb-1">You will be charged</p>
        <p className="text-2xl font-bold text-gray-900">
          {priceDisplay}
          <span className="text-sm font-normal text-gray-500">/month</span>
        </p>
      </div>
      <button
        onClick={handlePaystack}
        disabled={loading}
        className="w-full py-3 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 transition-colors disabled:opacity-50 text-lg flex items-center justify-center gap-2"
      >
        <LockClosedIcon className="h-5 w-5" />
        {loading ? 'Redirecting to Paystack...' : `Pay ${priceDisplay} with Paystack`}
      </button>
      <p className="text-xs text-center text-gray-400">
        🔒 Secured by Paystack. Supports cards, bank transfers &amp; USSD. Cancel anytime.
      </p>
    </div>
  );
};

// Main checkout modal
const CheckoutModal = ({ isOpen, onClose, tier, onSuccess }) => {
  if (!isOpen) return null;

  const tierLabel = tier === 'premium' ? 'RemiDesk Premium' : 'RemiDesk Pro';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Upgrade to {tierLabel}</h2>
            <p className="text-sm text-gray-500">Billed monthly · Cancel anytime</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <PaystackCheckout tier={tier} onSuccess={onSuccess} />
        </div>
      </div>
    </div>
  );
};

export default CheckoutModal;
