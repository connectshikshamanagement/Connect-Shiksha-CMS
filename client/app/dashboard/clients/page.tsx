'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clientAPI, userAPI } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import FormInput from '@/components/FormInput';
import FormSelect from '@/components/FormSelect';
import { showToast } from '@/lib/toast';
import { usePermissions } from '@/hooks/usePermissions';
import { FiEdit, FiTrash2, FiPlus, FiBriefcase, FiPhone, FiMail, FiMapPin, FiUsers } from 'react-icons/fi';

export default function ClientsPage() {
  const router = useRouter();
  const { isFounder, isManager, isMember, loading: permissionsLoading } = usePermissions();
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    status: 'lead',
    contact: {
      primaryName: '',
      designation: '',
      email: '',
      phone: '',
      alternatePhone: '',
      address: {
        street: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India',
      },
    },
    ownerId: '',
    expectedRevenue: 0,
    notes: '',
  });

  const [followUpData, setFollowUpData] = useState({
    date: '',
    notes: '',
    nextFollowUp: '',
  });

  useEffect(() => {
    // Check if user has access to clients page (only founder allowed)
    if (!permissionsLoading) {
      if (isManager || isMember) {
        showToast.error('Access denied. This page is only accessible to founders.');
        router.push('/dashboard');
        return;
      }
      if (!isFounder) {
        router.push('/dashboard');
        return;
      }
    }
  }, [permissionsLoading, isFounder, isManager, isMember, router]);

  useEffect(() => {
    // Only fetch data if user is founder
    if (!permissionsLoading && isFounder) {
      fetchData();
    }
  }, [permissionsLoading, isFounder]);

  const fetchData = async () => {
    try {
      const [clientsRes, usersRes] = await Promise.all([
        clientAPI.getAll(),
        userAPI.getAll()
      ]);
      
      if (clientsRes.data.success) setClients(clientsRes.data.data);
      if (usersRes.data.success) setUsers(usersRes.data.data);
    } catch (error: any) {
      showToast.error(error.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.type || !formData.contact.primaryName || !formData.contact.phone || !formData.ownerId) {
      showToast.error('Please fill in all required fields');
      return;
    }

    const loadingToast = showToast.loading(editingClient ? 'Updating client...' : 'Creating client...');

    try {
      if (editingClient) {
        await clientAPI.update(editingClient._id, formData);
        showToast.success('Client updated successfully!');
      } else {
        await clientAPI.create(formData);
        showToast.success('Client created successfully!');
      }
      
      showToast.dismiss(loadingToast);
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      showToast.dismiss(loadingToast);
      showToast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleAddFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!followUpData.date || !followUpData.notes) {
      showToast.error('Please fill in required fields');
      return;
    }

    const loadingToast = showToast.loading('Adding follow-up...');

    try {
      await clientAPI.addFollowUp(selectedClient._id, followUpData);
      showToast.dismiss(loadingToast);
      showToast.success('Follow-up added successfully!');
      setShowFollowUpModal(false);
      setFollowUpData({ date: '', notes: '', nextFollowUp: '' });
      fetchData();
    } catch (error: any) {
      showToast.dismiss(loadingToast);
      showToast.error(error.response?.data?.message || 'Failed to add follow-up');
    }
  };

  const handleEdit = (client: any) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      type: client.type,
      status: client.status,
      contact: {
        primaryName: client.contact?.primaryName || '',
        designation: client.contact?.designation || '',
        email: client.contact?.email || '',
        phone: client.contact?.phone || '',
        alternatePhone: client.contact?.alternatePhone || '',
        address: {
          street: client.contact?.address?.street || '',
          city: client.contact?.address?.city || '',
          state: client.contact?.address?.state || '',
          pincode: client.contact?.address?.pincode || '',
          country: client.contact?.address?.country || 'India',
        },
      },
      ownerId: client.ownerId?._id || client.ownerId,
      expectedRevenue: client.expectedRevenue || 0,
      notes: client.notes || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (clientId: string) => {
    if (!confirm('Are you sure you want to delete this client?')) return;

    const loadingToast = showToast.loading('Deleting client...');

    try {
      await clientAPI.delete(clientId);
      showToast.dismiss(loadingToast);
      showToast.success('Client deleted successfully!');
      fetchData();
    } catch (error: any) {
      showToast.dismiss(loadingToast);
      showToast.error(error.response?.data?.message || 'Delete failed');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: '',
      status: 'lead',
      contact: {
        primaryName: '',
        designation: '',
        email: '',
        phone: '',
        alternatePhone: '',
        address: {
          street: '',
          city: '',
          state: '',
          pincode: '',
          country: 'India',
        },
      },
      ownerId: '',
      expectedRevenue: 0,
      notes: '',
    });
    setEditingClient(null);
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      lead: 'bg-purple-100 text-purple-800',
      contacted: 'bg-blue-100 text-blue-800',
      proposal_sent: 'bg-yellow-100 text-yellow-800',
      negotiation: 'bg-orange-100 text-orange-800',
      won: 'bg-green-100 text-green-800',
      lost: 'bg-red-100 text-red-800',
      inactive: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Show loading or access denied message while checking permissions
  if (permissionsLoading || loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 overflow-auto">
          <Header title="Clients" />
          <div className="flex h-96 items-center justify-center">
            <div className="text-xl">Loading clients...</div>
          </div>
        </div>
      </div>
    );
  }

  // If user is not founder, don't render the page (redirect handled in useEffect)
  if (!isFounder) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 overflow-auto">
        <Header title="Clients" />

        <div className="p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Client & Lead Management</h2>
              <p className="mt-1 text-sm text-gray-600">Manage your sales pipeline and client relationships</p>
            </div>
            <Button onClick={() => { resetForm(); setShowModal(true); }}>
              <FiPlus className="mr-2" />
              Add Client
            </Button>
          </div>

          {/* Status Filter */}
          <div className="mb-6 flex flex-wrap gap-2">
            {['all', 'lead', 'contacted', 'proposal_sent', 'negotiation', 'won', 'lost'].map((status) => (
              <button
                key={status}
                className="rounded-full border border-gray-300 px-4 py-1 text-sm hover:bg-primary-50 hover:border-primary-500"
              >
                {status === 'all' ? 'All' : status.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {clients.map((client: any) => (
              <div key={client._id} className="rounded-lg bg-white p-6 shadow transition-shadow hover:shadow-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <FiBriefcase className="h-5 w-5 text-primary-600" />
                      <h3 className="text-lg font-semibold text-gray-900">{client.name}</h3>
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(client.status)}`}>
                        {client.status.replace('_', ' ')}
                      </span>
                    </div>
                    
                    <p className="mt-1 text-sm text-gray-500">{client.type}</p>

                    {client.contact && (
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center text-sm text-gray-700">
                          <FiUsers className="mr-2 text-gray-400" />
                          <span className="font-medium">{client.contact.primaryName}</span>
                          {client.contact.designation && (
                            <span className="ml-1 text-gray-500">({client.contact.designation})</span>
                          )}
                        </div>
                        {client.contact.phone && (
                          <div className="flex items-center text-sm text-gray-700">
                            <FiPhone className="mr-2 text-gray-400" />
                            {client.contact.phone}
                          </div>
                        )}
                        {client.contact.email && (
                          <div className="flex items-center text-sm text-gray-700">
                            <FiMail className="mr-2 text-gray-400" />
                            {client.contact.email}
                          </div>
                        )}
                        {client.contact.address?.city && (
                          <div className="flex items-center text-sm text-gray-700">
                            <FiMapPin className="mr-2 text-gray-400" />
                            {client.contact.address.city}, {client.contact.address.state}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="mt-4 flex gap-4 text-sm border-t pt-4">
                      {client.totalRevenue > 0 && (
                        <div>
                          <span className="text-gray-600">Revenue:</span>{' '}
                          <span className="font-medium text-green-600">
                            ₹{client.totalRevenue.toLocaleString()}
                          </span>
                        </div>
                      )}
                      {client.expectedRevenue > 0 && (
                        <div>
                          <span className="text-gray-600">Expected:</span>{' '}
                          <span className="font-medium text-blue-600">
                            ₹{client.expectedRevenue.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSelectedClient(client);
                      setFollowUpData({
                        date: new Date().toISOString().split('T')[0],
                        notes: '',
                        nextFollowUp: '',
                      });
                      setShowFollowUpModal(true);
                    }}
                  >
                    Add Follow-up
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(client)}
                  >
                    <FiEdit className="mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(client._id)}
                  >
                    <FiTrash2 />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {clients.length === 0 && (
            <div className="rounded-lg bg-white p-12 text-center shadow">
              <FiBriefcase className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <p className="text-lg font-medium text-gray-900">No clients found</p>
              <p className="mt-1 text-sm text-gray-500">Add your first client or lead to start tracking</p>
              <Button className="mt-4" onClick={() => { resetForm(); setShowModal(true); }}>
                <FiPlus className="mr-2" />
                Add Client
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Client Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editingClient ? 'Edit Client' : 'Add New Client'}
        size="xl"
      >
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <FormInput
                label="Client/Organization Name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., ABC School"
              />
            </div>

            <FormSelect
              label="Type"
              required
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              options={[
                { value: 'School', label: 'School' },
                { value: 'College', label: 'College' },
                { value: 'CSR Partner', label: 'CSR Partner' },
                { value: 'Individual', label: 'Individual' },
                { value: 'Corporate', label: 'Corporate' },
                { value: 'Government', label: 'Government' },
                { value: 'Other', label: 'Other' },
              ]}
            />

            <FormSelect
              label="Status"
              required
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              options={[
                { value: 'lead', label: 'Lead' },
                { value: 'contacted', label: 'Contacted' },
                { value: 'proposal_sent', label: 'Proposal Sent' },
                { value: 'negotiation', label: 'Negotiation' },
                { value: 'won', label: 'Won' },
                { value: 'lost', label: 'Lost' },
                { value: 'inactive', label: 'Inactive' },
              ]}
            />

            <div className="col-span-2 border-t pt-4">
              <h4 className="mb-3 font-medium text-gray-900">Contact Information</h4>
            </div>

            <FormInput
              label="Contact Person Name"
              required
              value={formData.contact.primaryName}
              onChange={(e) => setFormData({ 
                ...formData, 
                contact: { ...formData.contact, primaryName: e.target.value }
              })}
              placeholder="e.g., Principal Kumar"
            />

            <FormInput
              label="Designation"
              value={formData.contact.designation}
              onChange={(e) => setFormData({ 
                ...formData, 
                contact: { ...formData.contact, designation: e.target.value }
              })}
              placeholder="e.g., Principal"
            />

            <FormInput
              label="Email"
              type="email"
              value={formData.contact.email}
              onChange={(e) => setFormData({ 
                ...formData, 
                contact: { ...formData.contact, email: e.target.value }
              })}
              placeholder="contact@example.com"
            />

            <FormInput
              label="Phone"
              required
              value={formData.contact.phone}
              onChange={(e) => setFormData({ 
                ...formData, 
                contact: { ...formData.contact, phone: e.target.value }
              })}
              placeholder="9876543210"
            />

            <FormInput
              label="City"
              value={formData.contact.address.city}
              onChange={(e) => setFormData({ 
                ...formData, 
                contact: { 
                  ...formData.contact, 
                  address: { ...formData.contact.address, city: e.target.value }
                }
              })}
              placeholder="Mumbai"
            />

            <FormInput
              label="State"
              value={formData.contact.address.state}
              onChange={(e) => setFormData({ 
                ...formData, 
                contact: { 
                  ...formData.contact, 
                  address: { ...formData.contact.address, state: e.target.value }
                }
              })}
              placeholder="Maharashtra"
            />

            <div className="col-span-2 border-t pt-4">
              <h4 className="mb-3 font-medium text-gray-900">Additional Details</h4>
            </div>

            <FormSelect
              label="Account Owner"
              required
              value={formData.ownerId}
              onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
              options={users.map((user: any) => ({
                value: user._id,
                label: `${user.name}`,
              }))}
            />

            <FormInput
              label="Expected Revenue (₹)"
              type="number"
              min="0"
              value={formData.expectedRevenue}
              onChange={(e) => setFormData({ ...formData, expectedRevenue: Number(e.target.value) })}
              placeholder="0"
            />

            <div className="col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="Additional notes about this client..."
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit">
              {editingClient ? 'Update Client' : 'Create Client'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Follow-up Modal */}
      <Modal
        isOpen={showFollowUpModal}
        onClose={() => setShowFollowUpModal(false)}
        title={`Add Follow-up for ${selectedClient?.name}`}
        size="md"
      >
        <form onSubmit={handleAddFollowUp}>
          <FormInput
            label="Follow-up Date"
            type="date"
            required
            value={followUpData.date}
            onChange={(e) => setFollowUpData({ ...followUpData, date: e.target.value })}
          />

          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Notes <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              value={followUpData.notes}
              onChange={(e) => setFollowUpData({ ...followUpData, notes: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="What was discussed?"
            />
          </div>

          <FormInput
            label="Next Follow-up Date"
            type="date"
            value={followUpData.nextFollowUp}
            onChange={(e) => setFollowUpData({ ...followUpData, nextFollowUp: e.target.value })}
          />

          <div className="mt-6 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowFollowUpModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              Add Follow-up
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
