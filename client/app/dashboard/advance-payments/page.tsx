'use client';

import { useEffect, useState } from 'react';
import { advancePaymentAPI } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import FABMenu from '@/components/FABMenu';
import MobileNavbar from '@/components/MobileNavbar';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import { showToast } from '@/lib/toast';
import { usePermissions } from '@/hooks/usePermissions';
import { FiCheck, FiX, FiClock, FiDollarSign, FiUser, FiCalendar, FiFilter, FiRefreshCw } from 'react-icons/fi';

interface AdvancePaymentRequest {
  _id: string;
  userId: { _id: string; name: string; email: string };
  teamId: { _id: string; name: string; category: string };
  projectId?: { _id: string; title: string };
  amount: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  reviewedBy?: { _id: string; name: string; email: string };
  reviewedAt?: string;
  reviewNotes?: string;
  deductedFrom: 'profit_share' | 'future_salary';
}

export default function AdvancePaymentRequestsPage() {
  const [requests, setRequests] = useState<AdvancePaymentRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<AdvancePaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<AdvancePaymentRequest | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewData, setReviewData] = useState({
    status: 'approved' as 'approved' | 'rejected',
    reviewNotes: ''
  });
  const [filters, setFilters] = useState({
    status: '',
    teamId: '',
    userId: ''
  });

  const { isFounder, isProjectManager, loading: permissionsLoading } = usePermissions();
  const isManager = isProjectManager;

  useEffect(() => {
    if (permissionsLoading) return;
    
    if (!isFounder && !isManager) {
      window.location.href = '/dashboard';
      return;
    }
    fetchRequests();
  }, [isFounder, isManager, permissionsLoading]);

  useEffect(() => {
    let filtered = requests;

    if (filters.status) {
      filtered = filtered.filter(req => req.status === filters.status);
    }

    if (filters.teamId) {
      filtered = filtered.filter(req => req.teamId._id === filters.teamId);
    }

    if (filters.userId) {
      filtered = filtered.filter(req => req.userId._id === filters.userId);
    }

    setFilteredRequests(filtered);
  }, [requests, filters]);

  const fetchRequests = async () => {
    try {
      const response = await advancePaymentAPI.getAll();
      if (response.data.success) {
        setRequests(response.data.data);
      }
    } catch (error: any) {
      showToast.error(error.response?.data?.message || 'Failed to fetch requests');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewRequest = (request: AdvancePaymentRequest) => {
    setSelectedRequest(request);
    setReviewData({
      status: 'approved',
      reviewNotes: ''
    });
    setShowReviewModal(true);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedRequest) return;

    const loadingToast = showToast.loading(`${reviewData.status === 'approved' ? 'Approving' : 'Rejecting'} request...`);

    try {
      await advancePaymentAPI.updateStatus(selectedRequest._id, reviewData);
      showToast.success(`Request ${reviewData.status} successfully!`);
      setShowReviewModal(false);
      setSelectedRequest(null);
      fetchRequests();
    } catch (error: any) {
      showToast.error(error.response?.data?.message || 'Failed to update request');
    } finally {
      showToast.dismiss(loadingToast);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <FiClock className="h-4 w-4" />;
      case 'approved': return <FiCheck className="h-4 w-4" />;
      case 'rejected': return <FiX className="h-4 w-4" />;
      default: return <FiClock className="h-4 w-4" />;
    }
  };

  const getStats = () => {
    const total = requests.length;
    const pending = requests.filter(r => r.status === 'pending').length;
    const approved = requests.filter(r => r.status === 'approved').length;
    const rejected = requests.filter(r => r.status === 'rejected').length;
    const totalAmount = requests.reduce((sum, r) => sum + r.amount, 0);
    const pendingAmount = requests.filter(r => r.status === 'pending').reduce((sum, r) => sum + r.amount, 0);

    return { total, pending, approved, rejected, totalAmount, pendingAmount };
  };

  const stats = getStats();

  if (loading || permissionsLoading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 overflow-auto pt-16 md:pt-0">
          <Header title="Advance Payment Requests" />
          <div className="flex h-96 items-center justify-center">
            <div className="text-xl">Loading requests...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 overflow-auto pt-16 md:pt-0">
        <Header title="Advance Payment Requests" />

        <div className="p-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Advance Payment Requests</h2>
                <p className="mt-1 text-sm text-gray-600">Review and manage team member advance payment requests</p>
              </div>
              <Button onClick={fetchRequests}>
                <FiRefreshCw className="mr-2" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Requests</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <FiDollarSign className="h-8 w-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
                <FiClock className="h-8 w-8 text-yellow-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Approved</p>
                  <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
                </div>
                <FiCheck className="h-8 w-8 text-green-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Amount</p>
                  <p className="text-2xl font-bold text-orange-600">₹{stats.pendingAmount.toLocaleString()}</p>
                </div>
                <FiDollarSign className="h-8 w-8 text-orange-500" />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6 bg-white rounded-lg shadow-sm p-4">
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Team</label>
                <select
                  value={filters.teamId}
                  onChange={(e) => setFilters({ ...filters, teamId: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Teams</option>
                  {Array.from(new Set(requests.map(r => r.teamId._id))).map(teamId => {
                    const team = requests.find(r => r.teamId._id === teamId)?.teamId;
                    return (
                      <option key={teamId} value={teamId}>
                        {team?.name}
                      </option>
                    );
                  })}
                </select>
              </div>

              <button
                onClick={() => setFilters({ status: '', teamId: '', userId: '' })}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 self-end"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* Requests List */}
          <div className="bg-white rounded-lg shadow-sm">
            {filteredRequests.length === 0 ? (
              <div className="text-center py-12">
                <FiDollarSign className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No requests found</h3>
                <p className="text-gray-500">No advance payment requests match your current filters.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredRequests.map((request) => (
                  <div key={request._id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            ₹{request.amount.toLocaleString()}
                          </h3>
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium ${getStatusColor(request.status)}`}>
                            {getStatusIcon(request.status)}
                            {request.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                          <div>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Requested by:</span> {request.userId.name}
                            </p>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Team:</span> {request.teamId.name} ({request.teamId.category})
                            </p>
                            {request.projectId && (
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Project:</span> {request.projectId.title}
                              </p>
                            )}
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Requested:</span> {new Date(request.requestedAt).toLocaleDateString()}
                            </p>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Deduct from:</span> {request.deductedFrom === 'profit_share' ? 'Profit Share' : 'Future Salary'}
                            </p>
                            {request.reviewedAt && (
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Reviewed:</span> {new Date(request.reviewedAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="mb-3">
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Reason:</span>
                          </p>
                          <p className="text-sm text-gray-800 bg-gray-50 p-2 rounded mt-1">
                            {request.reason}
                          </p>
                        </div>

                        {request.reviewNotes && (
                          <div className="mb-3">
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Review Notes:</span>
                            </p>
                            <p className="text-sm text-gray-800 bg-blue-50 p-2 rounded mt-1">
                              {request.reviewNotes}
                            </p>
                          </div>
                        )}

                        {request.reviewedBy && (
                          <p className="text-xs text-gray-500">
                            Reviewed by: {request.reviewedBy.name}
                          </p>
                        )}
                      </div>

                      <div className="ml-4">
                        {request.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="success"
                              onClick={() => {
                                setSelectedRequest(request);
                                setReviewData({ status: 'approved', reviewNotes: '' });
                                setShowReviewModal(true);
                              }}
                            >
                              <FiCheck className="mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => {
                                setSelectedRequest(request);
                                setReviewData({ status: 'rejected', reviewNotes: '' });
                                setShowReviewModal(true);
                              }}
                            >
                              <FiX className="mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Review Modal */}
        <Modal
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          title={`${reviewData.status === 'approved' ? 'Approve' : 'Reject'} Advance Payment Request`}
          size="md"
        >
          {selectedRequest && (
            <form onSubmit={handleSubmitReview}>
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Request Details</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><span className="font-medium">Amount:</span> ₹{selectedRequest.amount.toLocaleString()}</p>
                    <p><span className="font-medium">Requested by:</span> {selectedRequest.userId.name}</p>
                    <p><span className="font-medium">Team:</span> {selectedRequest.teamId.name}</p>
                    <p><span className="font-medium">Reason:</span> {selectedRequest.reason}</p>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Review Notes
                  </label>
                  <textarea
                    value={reviewData.reviewNotes}
                    onChange={(e) => setReviewData({ ...reviewData, reviewNotes: e.target.value })}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    placeholder={`Add notes for ${reviewData.status === 'approved' ? 'approval' : 'rejection'}...`}
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowReviewModal(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  variant={reviewData.status === 'approved' ? 'success' : 'danger'}
                >
                  {reviewData.status === 'approved' ? 'Approve Request' : 'Reject Request'}
                </Button>
              </div>
            </form>
          )}
        </Modal>
        
        {/* Mobile Components */}
        <FABMenu />
        <MobileNavbar />
      </div>
    </div>
  );
}
