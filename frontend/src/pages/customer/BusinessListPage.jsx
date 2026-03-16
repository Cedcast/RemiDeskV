import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { businessAPI } from '../../services/api';
import { Card, Loading, Input } from '../../components/common';
import {
  MagnifyingGlassIcon,
  MapPinIcon,
  PhoneIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';

const BusinessListPage = () => {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    size: 12,
    total: 0,
  });

  useEffect(() => {
    fetchBusinesses();
  }, [pagination.page, search, city]);

  const fetchBusinesses = async () => {
    setLoading(true);
    try {
      const response = await businessAPI.list({
        page: pagination.page,
        size: pagination.size,
        search: search || undefined,
        city: city || undefined,
      });
      setBusinesses(response.data.businesses);
      setPagination((prev) => ({
        ...prev,
        total: response.data.total,
      }));
    } catch (error) {
      console.error('Failed to fetch businesses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchBusinesses();
  };

  const totalPages = Math.ceil(pagination.total / pagination.size);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Find Services</h1>
        <p className="mt-2 text-gray-600">
          Browse businesses and book your appointment
        </p>
      </div>

      {/* Search and Filters */}
      <Card className="mb-8">
        <Card.Body>
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search businesses..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <div className="relative">
                <MapPinIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
            <button
              type="submit"
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Search
            </button>
          </form>
        </Card.Body>
      </Card>

      {/* Business Grid */}
      {loading ? (
        <div className="py-12">
          <Loading size="lg" />
        </div>
      ) : businesses.length === 0 ? (
        <Card>
          <Card.Body className="text-center py-12">
            <p className="text-gray-500">No businesses found matching your criteria.</p>
          </Card.Body>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {businesses.map((business) => (
              <Link key={business.id} to={`/businesses/${business.id}`}>
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <Card.Body>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {business.name}
                    </h3>
                    {business.description && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {business.description}
                      </p>
                    )}
                    <div className="space-y-2 text-sm text-gray-500">
                      {(business.city || business.state) && (
                        <div className="flex items-center">
                          <MapPinIcon className="h-4 w-4 mr-2" />
                          {[business.city, business.state].filter(Boolean).join(', ')}
                        </div>
                      )}
                      {business.phone && (
                        <div className="flex items-center">
                          <PhoneIcon className="h-4 w-4 mr-2" />
                          {business.phone}
                        </div>
                      )}
                      {business.website && (
                        <div className="flex items-center">
                          <GlobeAltIcon className="h-4 w-4 mr-2" />
                          <span className="truncate">{business.website}</span>
                        </div>
                      )}
                    </div>
                  </Card.Body>
                  <Card.Footer>
                    <span className="text-indigo-600 font-medium text-sm">
                      View Services →
                    </span>
                  </Card.Footer>
                </Card>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center space-x-2">
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-gray-700">
                Page {pagination.page} of {totalPages}
              </span>
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BusinessListPage;
