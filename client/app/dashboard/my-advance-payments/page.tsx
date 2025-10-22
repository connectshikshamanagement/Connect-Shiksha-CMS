'use client';

import { useEffect, useState } from 'react';
import { advancePaymentAPI } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import Button from '@/components/Button';
import { showToast } from '@/lib/toast';
import { usePermissions } from '@/hooks/usePermissions';
import { FiCheck, FiX, FiClock, FiDollarSign, FiCalendar, FiRefreshCw, FiPlus } from 'react-icons/fi';

interface AdvancePaymentRequest {
  _id: string;
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

export default function MyAdvancePaymentRequestsPage() {
  const [requests, setRequests] = useState<AdvancePaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const { isMember, loading: permissionsLoading, userRole } = usePermissions();

  useEffect(() => {
    // Wait for permissions to load before checking access
    if (permissionsLoading) return;
    
    // Only team members should access this page
    if (!isMember) {
      window.location.href = '/dashboard';
      return;
    }
    
    fetchMyRequests();
  }, [isMember, permissionsLoading]);

  const fetchMyRequests = async () => {
    try {
      const response = await advancePaymentAPI.getMyRequests();
      if (response.data.success) {
        setRequests(response.data.data);
      }
    } catch (error: any) {
      showToast.error(error.response?.data?.message || 'Failed to fetch your requests');
    } finally {
      setLoading(false);
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
    const approvedAmount = requests.filter(r => r.status === 'approved').reduce((sum, r) => sum + r.amount, 0);

    return { total, pending, approved, rejected, totalAmount, approvedAmount };
  };

  const filteredRequests = filter 
    ? requests.filter(req => req.status === filter)
    : requests;

  const stats = getStats();

  if (loading || permissionsLoading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 overflow-auto">
          <Header title="My Advance Payment Requests" />
          <div className="flex h-96 items-center justify-center">
            <div className="text-xl">Loading your requests...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 overflow-auto">
        <Header title="My Advance Payment Requests" />

        <div className="p-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">My Advance Payment Requests</h2>
                <p className="mt-1 text-sm text-gray-600">Track your advance payment requests and their status</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => window.location.href = '/dashboard/payroll'}>
                  <FiPlus className="mr-2" />
                  New Request
                </Button>
                <Button onClick={fetchMyRequests}>
                  <FiRefreshCw className="mr-2" />
                  Refresh
                </Button>
              </div>
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
                  <p className="text-sm font-medium text-gray-600">Total Approved</p>
                  <p className="text-2xl font-bold text-green-600">₹{stats.approvedAmount.toLocaleString()}</p>
                </div>
                <FiDollarSign className="h-8 w-8 text-green-500" />
              </div>
            </div>
          </div>

          {/* Filter */}
          <div className="mb-6 bg-white rounded-lg shadow-sm p-4">
            <div className="flex gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Filter by Status</label>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Requests</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
          </div>

          {/* Requests List */}
          <div className="bg-white rounded-lg shadow-sm">
            {filteredRequests.length === 0 ? (
              <div className="text-center py-12">
                <FiDollarSign className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {requests.length === 0 ? 'No requests yet' : 'No requests match your filter'}
                </h3>
                <p className="text-gray-500 mb-4">
                  {requests.length === 0 
                    ? 'You haven\'t made any advance payment requests yet.' 
                    : 'Try changing your filter to see more requests.'
                  }
                </p>
                {requests.length === 0 && (
                  <Button onClick={() => window.location.href = '/dashboard/payroll'}>
                    <FiPlus className="mr-2" />
                    Make Your First Request
                  </Button>
                )}
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
                              <span className="font-medium">Team:</span> {request.teamId.name} ({request.teamId.category})
                            </p>
                            {request.projectId && (
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Project:</span> {request.projectId.title}
                              </p>
                            )}
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Deduct from:</span> {request.deductedFrom === 'profit_share' ? 'Profit Share' : 'Future Salary'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Requested:</span> {new Date(request.requestedAt).toLocaleDateString()}
                            </p>
                            {request.reviewedAt && (
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Reviewed:</span> {new Date(request.reviewedAt).toLocaleDateString()}
                              </p>
                            )}
                            {request.reviewedBy && (
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Reviewed by:</span> {request.reviewedBy.name}
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
                            <p className={`text-sm text-gray-800 p-2 rounded mt-1 ${
                              request.status === 'approved' ? 'bg-green-50' : 
                              request.status === 'rejected' ? 'bg-red-50' : 'bg-blue-50'
                            }`}>
                              {request.reviewNotes}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="ml-4">
                        {request.status === 'pending' && (
                          <div className="text-right">
                            <div className="text-sm text-yellow-600 font-medium mb-1">
                              Under Review
                            </div>
                            <div className="text-xs text-gray-500">
                              Awaiting approval
                            </div>
                          </div>
                        )}
                        {request.status === 'approved' && (
                          <div className="text-right">
                            <div className="text-sm text-green-600 font-medium mb-1">
                              Approved
                            </div>
                            <div className="text-xs text-gray-500">
                              Amount will be deducted
                            </div>
                          </div>
                        )}
                        {request.status === 'rejected' && (
                          <div className="text-right">
                            <div className="text-sm text-red-600 font-medium mb-1">
                              Rejected
                            </div>
                            <div className="text-xs text-gray-500">
                              Request not approved
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Information Panel */}
          {requests.length > 0 && (
            <div className="mt-6 rounded-lg bg-blue-50 p-4 text-sm text-blue-900">
              <strong>💡 Advance Payment Information:</strong>
              <ul className="mt-2 ml-4 list-disc space-y-1">
                <li>Approved advance payments are deducted from your profit share or future salary</li>
                <li>Pending requests are under review by founders/managers</li>
                <li>You can track the status of all your requests here</li>
                <li>Review notes provide feedback on approved/rejected requests</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
