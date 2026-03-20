import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import {
  ArrowLeftIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  GlobeAltIcon,
  PhoneIcon,
  EnvelopeIcon,
  UserCircleIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const AdminBusinessDetailPage = () => {
  const { id } = useParams();
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchBusiness = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getBusiness(id);
      setBusiness(res.data);
    } catch {
      toast.error('Failed to load business details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusiness();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!business) {
    return <p className="text-gray-500">Business not found</p>;
  }

  const fullAddress = [
    business.address,
    [business.city, business.state].filter(Boolean).join(', '),
    business.zip_code,
    business.country,
  ]
    .filter(Boolean)
    .join(' • ');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/admin/businesses" className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center">
            <BuildingOfficeIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{business.name}</h2>
            <p className="text-sm text-gray-500">Business ID #{business.id}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Business info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Cog6ToothIcon className="h-5 w-5 text-gray-500" />
            Business Info
          </h3>
          <dl className="space-y-2 text-sm">
            {[
              ['Status',
                business.suspended_at
                  ? 'Suspended'
                  : business.is_active
                  ? 'Active'
                  : 'Inactive',
              ],
              ['Created', new Date(business.created_at).toLocaleString()],
              ['Timezone', business.timezone || '—'],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between">
                <dt className="text-gray-500">{label}</dt>
                <dd className="font-medium text-gray-900 text-right ml-4">{val}</dd>
              </div>
            ))}
          </dl>

          <div className="pt-3 border-t border-gray-100 space-y-2 text-sm">
            {fullAddress && (
              <div className="flex items-start gap-2">
                <MapPinIcon className="h-4 w-4 text-gray-400 mt-0.5" />
                <p className="text-gray-700">{fullAddress}</p>
              </div>
            )}
            {business.website && (
              <div className="flex items-center gap-2">
                <GlobeAltIcon className="h-4 w-4 text-gray-400" />
                <a
                  href={business.website}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-600 hover:text-indigo-800 text-sm break-all"
                >
                  {business.website}
                </a>
              </div>
            )}
            {(business.phone || business.email) && (
              <div className="space-y-1">
                {business.phone && (
                  <div className="flex items-center gap-2">
                    <PhoneIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-700">{business.phone}</span>
                  </div>
                )}
                {business.email && (
                  <div className="flex items-center gap-2">
                    <EnvelopeIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-700">{business.email}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Owner */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <UserCircleIcon className="h-5 w-5 text-gray-500" />
            Owner
          </h3>
          {business.owner_id ? (
            <div className="space-y-2 text-sm">
              <p className="font-medium text-gray-900">{business.owner_name}</p>
              <p className="text-gray-500">{business.owner_email}</p>
              <Link
                to={`/admin/users/${business.owner_id}`}
                className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 mt-1"
              >
                View owner profile
              </Link>
            </div>
          ) : (
            <p className="text-sm text-gray-400">No owner linked</p>
          )}

          {business.suspended_at && (
            <div className="mt-4 rounded-lg bg-orange-50 border border-orange-100 p-3 text-xs text-orange-800">
              <p className="font-semibold mb-1">Suspended</p>
              <p>
                Since {new Date(business.suspended_at).toLocaleString()}
                {business.suspension_reason ? ` — ${business.suspension_reason}` : ''}
              </p>
            </div>
          )}
        </div>

        {/* Activity summary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <CalendarDaysIcon className="h-5 w-5 text-gray-500" />
            Activity
          </h3>
          <dl className="space-y-2 text-sm">
            {[
              ['Appointments', business.appointment_count],
              ['Clients', business.client_count],
              ['Services', business.service_count],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between">
                <dt className="text-gray-500">{label}</dt>
                <dd className="font-medium text-gray-900">{val}</dd>
              </div>
            ))}
          </dl>

          <div className="pt-3 border-t border-gray-100 text-xs text-gray-500">
            <p>
              This summary is based on all historical data for this business.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminBusinessDetailPage;
