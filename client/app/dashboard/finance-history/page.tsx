'use client';

import { useEffect, useState } from 'react';
import { teamMemberFinanceAPI } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import Button from '@/components/Button';
import FormSelect from '@/components/FormSelect';
import { showToast } from '@/lib/toast';
import { usePermissions } from '@/hooks/usePermissions';
import { FiDollarSign, FiMinus, FiCalendar, FiFilter, FiRefreshCw, FiTrendingUp, FiTrendingDown, FiFolder, FiUsers } from 'react-icons/fi';

interface IncomeRecord {
  _id: string;
  amount: number;
  source: string;
  sourceType: string;
  description: string;
  date: string;
  receivedByUserId: { _id: string; name: string; email: string };
  teamId: { _id: string; name: string; category: string };
  sourceRefId: { _id: string; title: string };
}

interface ExpenseRecord {
  _id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  submittedBy: { _id: string; name: string; email: string };
  projectId: { _id: string; title: string };
  teamId: { _id: string; name: string; category: string };
  status: string;
}

export default function FinanceHistoryPage() {
  const [incomeHistory, setIncomeHistory] = useState<IncomeRecord[]>([]);
  const [expenseHistory, setExpenseHistory] = useState<ExpenseRecord[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'income' | 'expense'>('income');
  const [filters, setFilters] = useState({
    projectId: '',
    startDate: '',
    endDate: ''
  });

  const { isMember, loading: permissionsLoading } = usePermissions();

  useEffect(() => {
    if (permissionsLoading) return;
    
    if (!isMember) {
      window.location.href = '/dashboard';
      return;
    }
    
    fetchData();
  }, [isMember, permissionsLoading]);

  useEffect(() => {
    if (projects.length > 0) {
      fetchHistory();
    }
  }, [filters, projects]);

  const fetchData = async () => {
    try {
      const [projectsResponse] = await Promise.all([
        teamMemberFinanceAPI.getMyProjects()
      ]);

      if (projectsResponse.data.success) {
        setProjects(projectsResponse.data.data);
      }
    } catch (error) {
      showToast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const params = {
        projectId: filters.projectId || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined
      };

      const [incomeResponse, expenseResponse] = await Promise.all([
        teamMemberFinanceAPI.getMyIncomeHistory(params),
        teamMemberFinanceAPI.getMyExpenseHistory(params)
      ]);

      if (incomeResponse.data.success) {
        setIncomeHistory(incomeResponse.data.data);
      }

      if (expenseResponse.data.success) {
        setExpenseHistory(expenseResponse.data.data);
      }
    } catch (error) {
      showToast.error('Failed to fetch history');
    }
  };

  const getTotalAmount = (records: any[]) => {
    return records.reduce((sum, record) => sum + record.amount, 0);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    const colors = {
      approved: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (loading || permissionsLoading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 overflow-auto">
          <Header title="Finance History" />
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
        <Header title="Finance History" />

        <div className="p-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">My Finance History</h2>
                <p className="mt-1 text-sm text-gray-600">Track your personal income and expense entries</p>
              </div>
              <Button onClick={fetchHistory}>
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
                  <p className="text-sm font-medium text-gray-600">Total Income</p>
                  <p className="text-2xl font-bold text-green-600">₹{getTotalAmount(incomeHistory).toLocaleString()}</p>
                </div>
                <FiTrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                  <p className="text-2xl font-bold text-red-600">₹{getTotalAmount(expenseHistory).toLocaleString()}</p>
                </div>
                <FiTrendingDown className="h-8 w-8 text-red-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Income Entries</p>
                  <p className="text-2xl font-bold text-blue-600">{incomeHistory.length}</p>
                </div>
                <FiDollarSign className="h-8 w-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Expense Entries</p>
                  <p className="text-2xl font-bold text-orange-600">{expenseHistory.length}</p>
                </div>
                <FiMinus className="h-8 w-8 text-orange-500" />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6 bg-white rounded-lg shadow-sm p-4">
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Project</label>
                <FormSelect
                  value={filters.projectId}
                  onChange={(e) => setFilters({ ...filters, projectId: e.target.value })}
                  options={[
                    { value: '', label: 'All Projects' },
                    ...projects.map((project: any) => ({
                      value: project._id,
                      label: project.title,
                    }))
                  ]}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Start Date</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">End Date</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={() => setFilters({ projectId: '', startDate: '', endDate: '' })}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 self-end"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('income')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'income'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <FiTrendingUp className="inline mr-2" />
                  Income History ({incomeHistory.length})
                </button>
                <button
                  onClick={() => setActiveTab('expense')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'expense'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <FiTrendingDown className="inline mr-2" />
                  Expense History ({expenseHistory.length})
                </button>
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white rounded-lg shadow-sm">
            {activeTab === 'income' ? (
              <div>
                {incomeHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <FiDollarSign className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No income records found</h3>
                    <p className="text-gray-500">No income entries match your current filters.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {incomeHistory.map((income) => (
                      <div key={income._id} className="p-6 hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">
                                ₹{income.amount.toLocaleString()}
                              </h3>
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                                {income.sourceType}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                              <div>
                                <p className="text-sm text-gray-600">
                                  <span className="font-medium">Source:</span> {income.source}
                                </p>
                                <p className="text-sm text-gray-600">
                                  <span className="font-medium">Team:</span> {income.teamId.name} ({income.teamId.category})
                                </p>
                                {income.sourceRefId && (
                                  <p className="text-sm text-gray-600">
                                    <span className="font-medium">Project:</span> {income.sourceRefId.title}
                                  </p>
                                )}
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">
                                  <span className="font-medium">Date:</span> {formatDate(income.date)}
                                </p>
                                <p className="text-sm text-gray-600">
                                  <span className="font-medium">Received by:</span> {income.receivedByUserId.name}
                                </p>
                              </div>
                            </div>

                            {income.description && (
                              <div className="mb-3">
                                <p className="text-sm text-gray-600">
                                  <span className="font-medium">Description:</span>
                                </p>
                                <p className="text-sm text-gray-800 bg-gray-50 p-2 rounded mt-1">
                                  {income.description}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div>
                {expenseHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <FiMinus className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No expense records found</h3>
                    <p className="text-gray-500">No expense entries match your current filters.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {expenseHistory.map((expense) => (
                      <div key={expense._id} className="p-6 hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">
                                ₹{expense.amount.toLocaleString()}
                              </h3>
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                                {expense.category}
                              </span>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${getStatusColor(expense.status)}`}>
                                {expense.status}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                              <div>
                                <p className="text-sm text-gray-600">
                                  <span className="font-medium">Team:</span> {expense.teamId.name} ({expense.teamId.category})
                                </p>
                                {expense.projectId && (
                                  <p className="text-sm text-gray-600">
                                    <span className="font-medium">Project:</span> {expense.projectId.title}
                                  </p>
                                )}
                                <p className="text-sm text-gray-600">
                                  <span className="font-medium">Submitted by:</span> {expense.submittedBy.name}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">
                                  <span className="font-medium">Date:</span> {formatDate(expense.date)}
                                </p>
                              </div>
                            </div>

                            {expense.description && (
                              <div className="mb-3">
                                <p className="text-sm text-gray-600">
                                  <span className="font-medium">Description:</span>
                                </p>
                                <p className="text-sm text-gray-800 bg-gray-50 p-2 rounded mt-1">
                                  {expense.description}
                                </p>
                              </div>
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
        </div>
      </div>
    </div>
  );
}
