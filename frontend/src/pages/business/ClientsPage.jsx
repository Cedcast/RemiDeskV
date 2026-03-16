import { useState, useEffect, useCallback } from 'react';
import { clientAPI, businessAPI } from '../../services/api';
import { Button, Input, Card } from '../../components/common';
import {
  PlusIcon,
  UserGroupIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const defaultForm = { name: '', email: '', phone: '', notes: '' };

const ClientsPage = () => {
  const [clients, setClients] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [formLoading, setFormLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const PAGE_SIZE = 20;

  const loadBusinesses = async () => {
    try {
      const res = await businessAPI.getMyBusinesses();
      setBusinesses(res.data);
      if (res.data.length > 0) setSelectedBusiness(res.data[0].id);
    } catch {
      toast.error('Failed to load businesses');
    }
  };

  const loadClients = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, size: PAGE_SIZE };
      if (selectedBusiness) params.business_id = selectedBusiness;
      if (search) params.search = search;
      const res = await clientAPI.list(params);
      setClients(res.data.clients);
      setTotal(res.data.total);
    } catch {
      toast.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  }, [page, selectedBusiness, search]);

  useEffect(() => { loadBusinesses(); }, []);
  useEffect(() => { loadClients(); }, [loadClients]);

  const handleFormChange = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const openCreate = () => {
    setEditingClient(null);
    setForm(defaultForm);
    setShowForm(true);
  };

  const openEdit = (client) => {
    setEditingClient(client);
    setForm({ name: client.name, email: client.email || '', phone: client.phone || '', notes: client.notes || '' });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Client name is required'); return; }
    if (!selectedBusiness) { toast.error('Select a business first'); return; }

    setFormLoading(true);
    try {
      if (editingClient) {
        await clientAPI.update(editingClient.id, form);
        toast.success('Client updated');
      } else {
        await clientAPI.create({ ...form, business_id: parseInt(selectedBusiness) });
        toast.success('Client added');
      }
      setShowForm(false);
      setForm(defaultForm);
      setEditingClient(null);
      loadClients();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save client');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (client) => {
    if (!confirm(`Delete client "${client.name}"?`)) return;
    try {
      await clientAPI.delete(client.id);
      toast.success('Client deleted');
      loadClients();
    } catch {
      toast.error('Failed to delete client');
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-sm text-gray-500">{total} contacts</p>
        </div>
        <Button onClick={openCreate} className="flex items-center gap-2">
          <PlusIcon className="h-4 w-4" />
          Add Client
        </Button>
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <Card className="mb-6">
          <Card.Header>
            <h2 className="font-semibold text-gray-800">
              {editingClient ? 'Edit Client' : 'Add New Client'}
            </h2>
          </Card.Header>
          <Card.Body>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Full Name *"
                  value={form.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  placeholder="Jane Doe"
                />
                <Input
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={(e) => handleFormChange('email', e.target.value)}
                  placeholder="jane@example.com"
                />
                <Input
                  label="Phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => handleFormChange('phone', e.target.value)}
                  placeholder="+44 7700 900000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => handleFormChange('notes', e.target.value)}
                  rows={2}
                  placeholder="Optional notes…"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex gap-3">
                <Button type="submit" loading={formLoading}>
                  {editingClient ? 'Save Changes' : 'Add Client'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => { setShowForm(false); setEditingClient(null); }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card.Body>
        </Card>
      )}

      {/* Search & Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="search"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by name, email or phone…"
          className="flex-1 min-w-48 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500"
        />
        {businesses.length > 1 && (
          <select
            value={selectedBusiness}
            onChange={(e) => { setSelectedBusiness(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All businesses</option>
            {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
      </div>

      {/* Clients List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : clients.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <UserGroupIcon className="h-12 w-12 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No clients yet. Add your first client!</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                {['Name', 'Email', 'Phone', 'Notes', ''].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {clients.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{c.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{c.email || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{c.phone || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-400 max-w-xs truncate">{c.notes || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEdit(c)}
                        className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                        title="Edit"
                      >
                        <PencilSquareIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(c)}
                        className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                        title="Delete"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="px-4 py-3 flex items-center justify-between border-t border-gray-100">
              <p className="text-xs text-gray-400">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1 text-sm border rounded disabled:opacity-40 hover:bg-gray-50"
                >Prev</button>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1 text-sm border rounded disabled:opacity-40 hover:bg-gray-50"
                >Next</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ClientsPage;
