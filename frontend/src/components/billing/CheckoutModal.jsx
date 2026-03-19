import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { XMarkIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { billingAPI } from '../../services/api';
import toast from 'react-hot-toast';

const PRICES = {
  premium: { USD: '$12.00', GBP: '£9.99', CAD: 'C$16.00', AUD: 'A$18.00', NGN: '₦8,000' },
  pro:     { USD: '$39.00', GBP: '£31.00', CAD: 'C$52.00', AUD: 'A$59.00', NGN: '₦15,000' },
};

// Stripe form inner component (must be inside Elements provider)
const StripeCheckoutForm = ({ tier, tierLabel, currency, onSuccess, onClose }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    try {
      const cardElement = elements.getElement(CardElement);
      const { paymentMethod, error: pmError } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (pmError) {
        setError(pmError.message);
        setLoading(false);
        return;
      }

      const response = await billingAPI.upgrade({
        tier,
        currency,
        provider: 'stripe',
        payment_method_id: paymentMethod.id,
      });

      toast.success(`Successfully upgraded to ${tierLabel}!`);
      onSuccess(response.data.subscription);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Payment failed. Please try again.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const priceDisplay = PRICES[tier]?.[currency] || '';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
        <p className="text-sm text-gray-500 mb-1">You will be charged</p>
        <p className="text-2xl font-bold text-gray-900">
          {priceDisplay}
          <span className="text-sm font-normal text-gray-500">/month</span>
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Card Details</label>
        <div className="border border-gray-300 rounded-lg px-4 py-3 bg-white focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#374151',
                  '::placeholder': { color: '#9CA3AF' },
                },
                invalid: { color: '#EF4444' },
              },
            }}
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <LockClosedIcon className="h-4 w-4" />
        {loading ? 'Processing...' : `Pay ${priceDisplay}/month`}
      </button>

      <p className="text-xs text-center text-gray-400">
        🔒 Secured by Stripe. Cancel anytime.
      </p>
    </form>
  );
};

// PayPal checkout
const PayPalCheckout = ({ tier, currency, onSuccess, onClose }) => {
  const [loading, setLoading] = useState(false);
  const priceDisplay = PRICES[tier]?.[currency] || '';

  const handlePayPal = async () => {
    setLoading(true);
    try {
      const res = await billingAPI.upgrade({
        tier,
        currency,
        provider: 'paypal',
        return_url: `${window.location.origin}/dashboard/billing?paypal=success`,
        cancel_url: `${window.location.origin}/dashboard/billing?paypal=cancel`,
      });
      if (res.data.approval_url) {
        window.location.href = res.data.approval_url;
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'PayPal error. Please try again.');
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
        onClick={handlePayPal}
        disabled={loading}
        className="w-full py-3 bg-yellow-400 text-yellow-900 rounded-xl font-bold hover:bg-yellow-500 transition-colors disabled:opacity-50 text-lg"
      >
        {loading ? 'Redirecting to PayPal...' : 'Pay with PayPal'}
      </button>
      <p className="text-xs text-center text-gray-400">
        You will be redirected to PayPal to complete payment.
      </p>
    </div>
  );
};

// Paystack checkout
const PaystackCheckout = ({ tier, currency, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const priceDisplay = PRICES[tier]?.[currency] || '';

  const handlePaystack = async () => {
    setLoading(true);
    try {
      const res = await billingAPI.upgrade({
        tier,
        currency,
        provider: 'paystack',
        return_url: `${window.location.origin}/dashboard/billing?paystack=success`,
      });
      if (res.data.authorization_url) {
        // Store upgrade intent for redirect-back handling
        sessionStorage.setItem('paystack_upgrade', JSON.stringify({ tier, currency }));
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
        className="w-full py-3 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 transition-colors disabled:opacity-50 text-lg"
      >
        {loading ? 'Redirecting to Paystack...' : 'Pay with Paystack'}
      </button>
      <p className="text-xs text-center text-gray-400">
        You will be redirected to Paystack to complete payment. Supports cards, bank transfers &amp; USSD.
      </p>
    </div>
  );
};

// Main checkout modal
const CheckoutModal = ({ isOpen, onClose, tier, currency = 'USD', onSuccess }) => {
  const [tab, setTab] = useState('stripe');
  const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

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

        {/* Payment method tabs */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setTab('stripe')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              tab === 'stripe'
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            💳 Credit / Debit Card
          </button>
          <button
            onClick={() => setTab('paypal')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              tab === 'paypal'
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            🅿️ PayPal
          </button>
          <button
            onClick={() => setTab('paystack')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              tab === 'paystack'
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            🏦 Paystack
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {tab === 'stripe' && (
            stripePromise ? (
              <Elements stripe={stripePromise}>
                <StripeCheckoutForm
                  tier={tier}
                  tierLabel={tierLabel}
                  currency={currency}
                  onSuccess={onSuccess}
                  onClose={onClose}
                />
              </Elements>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                Stripe is not configured. Please contact support or use PayPal.
              </p>
            )
          )}
          {tab === 'paypal' && (
            <PayPalCheckout
              tier={tier}
              currency={currency}
              onSuccess={onSuccess}
              onClose={onClose}
            />
          )}
          {tab === 'paystack' && (
            <PaystackCheckout
              tier={tier}
              currency={currency}
              onSuccess={onSuccess}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default CheckoutModal;
