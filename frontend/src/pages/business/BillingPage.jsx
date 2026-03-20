import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  CreditCardIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ArrowUpCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { billingAPI } from '../../services/api';
import CheckoutModal from '../../components/billing/CheckoutModal';
import toast from 'react-hot-toast';

const TIER_LABELS = {
  free_trial: { label: 'Free Trial', color: 'bg-blue-100 text-blue-700' },
  premium: { label: 'Premium', color: 'bg-purple-100 text-purple-700' },
  pro: { label: 'Pro', color: 'bg-indigo-100 text-indigo-700' },
  trial_expired: { label: 'Trial Expired', color: 'bg-red-100 text-red-700' },
};

const STATUS_LABELS = {
  active: { label: 'Active', color: 'text-green-600', icon: CheckCircleIcon },
  trialing: { label: 'In Trial', color: 'text-blue-600', icon: ClockIcon },
  cancelled: { label: 'Cancelled', color: 'text-orange-600', icon: XCircleIcon },
  past_due: { label: 'Past Due', color: 'text-red-600', icon: ExclamationTriangleIcon },
  expired: { label: 'Expired', color: 'text-red-600', icon: XCircleIcon },
};

const CURRENCY = { code: 'USD', symbol: '$', flag: '🇺🇸' };

const BillingPage = () => {
  const location = useLocation();
  const [subscription, setSubscription] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutTier, setCheckoutTier] = useState('pro');
  const [cancelling, setCancelling] = useState(false);

  // Handle Paystack redirect back
  useEffect(() => {
    const params = new URLSearchParams(location.search);

    // Handle Paystack redirect back
    const paystackStatus = params.get('paystack');
    const paystackRef = params.get('reference') || params.get('trxref');

    if (paystackStatus === 'success' && paystackRef) {
      capturePaystackPayment(paystackRef);
    }
  }, [location.search]);

  const capturePaystackPayment = async (reference) => {
    try {
      const upgradeState = sessionStorage.getItem('paystack_upgrade');
      if (!upgradeState) return;
      const { tier } = JSON.parse(upgradeState);
      await billingAPI.upgrade({
        tier,
        paystack_reference: reference,
      });
      toast.success('Paystack payment successful!');
      sessionStorage.removeItem('paystack_upgrade');
      loadSubscription();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Paystack payment failed.');
    }
  };

  const loadSubscription = async () => {
    try {
      const [subRes, payRes] = await Promise.all([
        billingAPI.getCurrent(),
        billingAPI.getPayments(),
      ]);
      setSubscription(subRes.data);
      if (subRes.data.currency) setCurrency(subRes.data.currency);
      setPayments(payRes.data);
    } catch {
      toast.error('Could not load billing information.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscription();
    // Handle upgrade intent from pricing page
    if (location.state?.upgradeToTier) {
      setCheckoutTier(location.state.upgradeToTier);
      setCheckoutOpen(true);
    }
  }, [location.state]);

  const handleStartTrial = async () => {
    try {
      await billingAPI.startTrial({});
      toast.success('Free trial started! Enjoy 3 days of Pro features.');
      loadSubscription();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not start trial.');
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel your subscription?')) return;
    setCancelling(true);
    try {
      await billingAPI.cancel({ reason: 'User requested cancellation' });
      toast.success('Subscription cancelled. Access continues until end of period.');
      loadSubscription();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not cancel subscription.');
    } finally {
      setCancelling(false);
    }
  };

  const openUpgrade = (tier) => {
    setCheckoutTier(tier);
    setCheckoutOpen(true);
    // Store upgrade intent for Paystack redirect
    sessionStorage.setItem('paystack_upgrade', JSON.stringify({ tier }));
  };

  const onCheckoutSuccess = (newSub) => {
    setSubscription(newSub);
    setCheckoutOpen(false);
    loadSubscription();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tierInfo = TIER_LABELS[subscription?.tier] || TIER_LABELS.trial_expired;
  const statusInfo = STATUS_LABELS[subscription?.status] || STATUS_LABELS.expired;
  const StatusIcon = statusInfo.icon;
  const isTrialing = subscription?.status === 'trialing';
  const isActive = subscription?.status === 'active';
  const isCancelled = subscription?.status === 'cancelled';
  const isExpired = subscription?.status === 'expired';
  const daysLeft = subscription?.trial_days_remaining;
  const expiringSoon = subscription?.is_trial_expiring_soon;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing & Subscription</h1>
        <p className="text-gray-500 mt-1">Manage your RemiDesk subscription and payment history.</p>
      </div>

      {/* Trial expiry warning */}
      {expiringSoon && isTrialing && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-800 font-semibold">
              Your trial ends in {daysLeft} day{daysLeft !== 1 ? 's' : ''}!
            </p>
            <p className="text-amber-600 text-sm mt-0.5">
              Upgrade now to keep your data and continue using RemiDesk.
            </p>
          </div>
        </div>
      )}

      {/* Trial expired warning */}
      {isExpired && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <XCircleIcon className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-800 font-semibold">Your trial has expired.</p>
            <p className="text-red-600 text-sm mt-0.5">
              Choose a plan below to continue using RemiDesk.
            </p>
          </div>
        </div>
      )}

      {/* Current Plan */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CreditCardIcon className="h-5 w-5 text-indigo-600" />
          Current Plan
        </h2>

        {subscription ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${tierInfo.color}`}>
                {tierInfo.label}
              </span>
              <span className={`flex items-center gap-1 text-sm font-medium ${statusInfo.color}`}>
                <StatusIcon className="h-4 w-4" />
                {statusInfo.label}
              </span>
              <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {CURRENCY.flag} {CURRENCY.code}
              </span>
            </div>

            {isTrialing && daysLeft !== null && (
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-blue-700 text-sm font-medium">
                  🎉 Free Trial — {daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining
                </p>
                {subscription.trial_ends_at && (
                  <p className="text-blue-500 text-xs mt-0.5">
                    Ends: {new Date(subscription.trial_ends_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}

            {(isActive || isCancelled) && subscription.current_period_end && (
              <p className="text-sm text-gray-500">
                {isCancelled ? 'Access until: ' : 'Next billing date: '}
                <span className="font-medium text-gray-700">
                  {new Date(subscription.current_period_end).toLocaleDateString()}
                </span>
              </p>
            )}

            {/* Plan limits */}
            {subscription.limits && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-gray-900">
                    {subscription.limits.appointments_per_month ?? 'Unlimited'}
                  </p>
                  <p className="text-xs text-gray-500">Appts/month</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-gray-900">
                    {subscription.limits.data_retention_days}d
                  </p>
                  <p className="text-xs text-gray-500">Data retention</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-gray-900">
                    {subscription.limits.analytics_days}d
                  </p>
                  <p className="text-xs text-gray-500">Analytics view</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-indigo-600">
                    {subscription.limits.whatsapp ? '✓' : '—'}
                  </p>
                  <p className="text-xs text-gray-500">WhatsApp</p>
                </div>
              </div>
            )}

            {/* AI reminders teaser */}
            <div className="mt-4 rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-3 flex items-start gap-3">
              <div className="mt-0.5 h-7 w-7 rounded-full bg-white flex items-center justify-center border border-indigo-100">
                <span className="text-xs font-semibold text-indigo-600">AI</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  AI-powered reminders
                </p>
                <p className="text-xs text-gray-600 mt-0.5">
                  Reduce no-shows with smart SMS, email, and WhatsApp reminders that adapt to your clients.
                </p>
                {subscription.tier === 'pro' || subscription.tier === 'free_trial' ? (
                  <p className="text-xs text-green-700 mt-1 font-medium">
                    Included on your current plan.
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => openUpgrade('pro')}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-indigo-700 hover:text-indigo-800"
                  >
                    Upgrade to Pro to unlock →
                  </button>
                )}
              </div>
            </div>
            {/* Actions */}
            <div className="flex flex-wrap gap-3 pt-2">
              {subscription.tier === 'trial_expired' && (
                <button
                  onClick={() => openUpgrade('premium')}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors"
                >
                  <ArrowUpCircleIcon className="h-4 w-4" />
                  Get Premium
                </button>
              )}
              {['free_trial', 'trial_expired', 'premium'].includes(subscription.tier) && (
                <button
                  onClick={() => openUpgrade('pro')}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                  <ArrowUpCircleIcon className="h-4 w-4" />
                  {subscription.tier === 'premium' ? 'Upgrade to Pro' : 'Get Pro'}
                </button>
              )}
              {(isActive || isTrialing) && !isCancelled && (
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="px-4 py-2 border border-red-300 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  {cancelling ? 'Cancelling...' : 'Cancel Subscription'}
                </button>
              )}
              <Link
                to="/pricing"
                className="px-4 py-2 border border-gray-300 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                View All Plans
              </Link>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">No active subscription found.</p>
            <button
              onClick={handleStartTrial}
              className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
            >
              Start 7-Day Free Trial
            </button>
          </div>
        )}
      </div>

      {/* Payment History */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment History</h2>
        {payments.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">No payments yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Description</th>
                  <th className="pb-3 font-medium">Provider</th>
                  <th className="pb-3 font-medium text-right">Amount</th>
                  <th className="pb-3 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="py-3 text-gray-600">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-gray-700">{p.description || '—'}</td>
                    <td className="py-3">
                      <span className="capitalize text-gray-600">{p.provider}</span>
                    </td>
                    <td className="py-3 text-right font-medium text-gray-900">
                      {p.currency} {(p.amount / 100).toFixed(2)}
                    </td>
                    <td className="py-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          p.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : p.status === 'failed'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        tier={checkoutTier}
        onSuccess={onCheckoutSuccess}
      />
    </div>
  );
};

export default BillingPage;
