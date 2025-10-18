'use client';

import { useEffect, useState } from 'react';
import { userHistoryAPI } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import Button from '@/components/Button';
import FormInput from '@/components/FormSelect';
import { showToast } from '@/lib/toast';
import { 
  FiUsers, FiTarget, FiDollarSign, FiCreditCard, FiCalendar,
  FiTrendingUp, FiTrendingDown, FiCheckCircle, FiClock,
  FiFilter, FiDownload, FiEye, FiEyeOff
} from 'react-icons/fi';

export default function UserHistoryPage() {
  const [history, setHistory] = useState<any>(null);
  const [performance, setPerformance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [filters, setFilters] = useState({
    type: '',
    startDate: '',
    endDate: '',
    month: '',
    year: ''
  });
  const [showDetails, setShowDetails] = useState({
    teams: true,
    tasks: true,
    expenses: true,
    payroll: true
  });

  // Get current user ID from localStorage
  const currentUserId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;

  useEffect(() => {
    if (currentUserId) {
      fetchHistory();
      fetchPerformance();
    }
  }, [currentUserId, filters]);

  const fetchHistory = async () => {
    try {
      const response = await userHistoryAPI.getUserHistory(currentUserId, {
        type: filters.type || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined
      });
      
      if (response.data.success) {
        setHistory(response.data.data);
      }
    } catch (error: any) {
      showToast.error(error.response?.data?.message || 'Failed to fetch history');
    } finally {
      setLoading(false);
    }
  };

  const fetchPerformance = async () => {
    try {
      const response = await userHistoryAPI.getUserPerformance(currentUserId, {
        month: filters.month || undefined,
        year: filters.year || undefined
      });
      
      if (response.data.success) {
        setPerformance(response.data.data);
      }
    } catch (error: any) {
      console.error('Failed to fetch performance:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done':
      case 'approved':
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString()}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 overflow-auto">
          <Header title="My History" />
          <div className="flex h-96 items-center justify-center">
            <div className="text-xl">Loading history...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 overflow-auto">
        <Header title="My History" />

        <div className="p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">My History</h2>
              <p className="mt-1 text-sm text-gray-600">Complete activity and financial record</p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                // Export functionality would go here
                showToast.success('Export feature coming soon!');
              }}
            >
              <FiDownload className="mr-2" />
              Export History
            </Button>
          </div>

          {/* User Info */}
          {history && (
            <div className="mb-6 rounded-lg bg-white p-6 shadow">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{history.user.name}</h3>
                  <p className="text-sm text-gray-600">{history.user.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Member since</p>
                  <p className="font-medium text-gray-900">{formatDate(history.user.joiningDate || new Date())}</p>
                </div>
              </div>
            </div>
          )}

          {/* Performance Summary */}
          {performance && (
            <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
              <div className="rounded-lg bg-white p-6 shadow">
                <div className="flex items-center">
                  <div className="rounded-full bg-blue-100 p-3">
                    <FiTarget className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Tasks Completed</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {performance.performance.tasks.completed} / {performance.performance.tasks.total}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-white p-6 shadow">
                <div className="flex items-center">
                  <div className="rounded-full bg-green-100 p-3">
                    <FiCheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {performance.performance.tasks.completionRate.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-white p-6 shadow">
                <div className="flex items-center">
                  <div className="rounded-full bg-purple-100 p-3">
                    <FiDollarSign className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(performance.performance.expenses.totalAmount)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-white p-6 shadow">
                <div className="flex items-center">
                  <div className="rounded-full bg-orange-100 p-3">
                    <FiCreditCard className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Payroll</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(performance.performance.payroll.totalAmount)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="mb-6 rounded-lg bg-white p-4 shadow">
            <div className="flex flex-wrap gap-4">
              <FormInput
                type="date"
                label="Start Date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />

              <FormInput
                type="date"
                label="End Date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />

              <FormInput
                type="month"
                label="Month/Year"
                value={`${filters.year}-${filters.month.padStart(2, '0')}`}
                onChange={(e) => {
                  const [year, month] = e.target.value.split('-');
                  setFilters({ ...filters, year, month });
                }}
              />

              <Button
                variant="outline"
                onClick={fetchHistory}
                className="flex items-center gap-2"
              >
                <FiFilter className="h-4 w-4" />
                Apply Filters
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-6 flex gap-4">
            {['all', 'teams', 'tasks', 'expenses', 'payroll'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-lg px-6 py-3 font-medium transition-colors capitalize ${
                  activeTab === tab 
                    ? 'bg-primary-600 text-white shadow-md' 
                    : 'bg-white text-gray-700 shadow hover:bg-gray-50'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Content */}
          {history && (
            <div className="space-y-6">
              {/* Teams History */}
              {(activeTab === 'all' || activeTab === 'teams') && history.teamHistory && (
                <div className="rounded-lg bg-white shadow">
                  <div className="border-b p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">Team History</h3>
                      <button
                        onClick={() => setShowDetails({ ...showDetails, teams: !showDetails.teams })}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        {showDetails.teams ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>
                  </div>
                  {showDetails.teams && (
                    <div className="divide-y">
                      {history.teamHistory.map((team: any, index: number) => (
                        <div key={index} className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-gray-900">{team.teamId?.name || 'Unknown Team'}</h4>
                              <p className="text-sm text-gray-600">{team.teamId?.category || 'N/A'}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-600">Joined: {formatDate(team.joinedOn)}</p>
                              {team.leftOn && (
                                <p className="text-sm text-gray-600">Left: {formatDate(team.leftOn)}</p>
                              )}
                              <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                                team.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {team.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tasks History */}
              {(activeTab === 'all' || activeTab === 'tasks') && history.taskHistory && (
                <div className="rounded-lg bg-white shadow">
                  <div className="border-b p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">Task History</h3>
                      <button
                        onClick={() => setShowDetails({ ...showDetails, tasks: !showDetails.tasks })}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        {showDetails.tasks ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>
                  </div>
                  {showDetails.tasks && (
                    <div className="divide-y">
                      {history.taskHistory.map((task: any, index: number) => (
                        <div key={index} className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{task.title}</h4>
                              <p className="text-sm text-gray-600">Team: {task.teamId?.name || 'N/A'}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(task.status)}`}>
                                {task.status}
                              </span>
                              {task.completedOn && (
                                <p className="text-sm text-gray-600">Completed: {formatDate(task.completedOn)}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Expenses History */}
              {(activeTab === 'all' || activeTab === 'expenses') && history.expenseHistory && (
                <div className="rounded-lg bg-white shadow">
                  <div className="border-b p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">Expense History</h3>
                      <button
                        onClick={() => setShowDetails({ ...showDetails, expenses: !showDetails.expenses })}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        {showDetails.expenses ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>
                  </div>
                  {showDetails.expenses && (
                    <div className="divide-y">
                      {history.expenseHistory.map((expense: any, index: number) => (
                        <div key={index} className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{expense.category}</h4>
                              <p className="text-sm text-gray-600">Team: {expense.teamId?.name || 'N/A'}</p>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(expense.status)}`}>
                                {expense.status}
                              </span>
                              <p className="text-lg font-bold text-gray-900">{formatCurrency(expense.amount)}</p>
                              <p className="text-sm text-gray-600">{formatDate(expense.date)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Payroll History */}
              {(activeTab === 'all' || activeTab === 'payroll') && history.payrollHistory && (
                <div className="rounded-lg bg-white shadow">
                  <div className="border-b p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">Payroll History</h3>
                      <button
                        onClick={() => setShowDetails({ ...showDetails, payroll: !showDetails.payroll })}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        {showDetails.payroll ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>
                  </div>
                  {showDetails.payroll && (
                    <div className="divide-y">
                      {history.payrollHistory.map((payroll: any, index: number) => (
                        <div key={index} className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">Payroll - {payroll.month}</h4>
                              <p className="text-sm text-gray-600">Team: {payroll.teamId?.name || 'N/A'}</p>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(payroll.status)}`}>
                                {payroll.status}
                              </span>
                              <p className="text-lg font-bold text-gray-900">{formatCurrency(payroll.salaryAmount)}</p>
                              {payroll.paymentDate && (
                                <p className="text-sm text-gray-600">Paid: {formatDate(payroll.paymentDate)}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Summary */}
          {history && history.summary && (
            <div className="mt-8 rounded-lg bg-white p-6 shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Total Tasks</p>
                  <p className="text-2xl font-bold text-gray-900">{history.summary.totalTasks}</p>
                  <p className="text-sm text-gray-500">{history.summary.completedTasks} completed</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Total Expenses</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(history.summary.totalExpenses)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Total Payroll</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(history.summary.totalPayroll)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
