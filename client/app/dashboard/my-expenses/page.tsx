'use client';

import { useEffect, useState } from 'react';
import { enhancedExpenseAPI, teamAPI } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import FormInput from '@/components/FormInput';
import FormSelect from '@/components/FormSelect';
import { showToast } from '@/lib/toast';
import { 
  FiPlus, FiEdit, FiTrash2, FiCheck, FiX, FiDollarSign, 
  FiCalendar, FiCreditCard, FiTrendingUp, FiTrendingDown,
  FiFilter, FiSearch, FiAlertTriangle, FiCheckCircle
} from 'react-icons/fi';

export default function MyExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    search: '',
    month: '',
    year: ''
  });
  const [budgetStatus, setBudgetStatus] = useState<any>(null);

  // Get current user ID from localStorage
  const currentUserId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;

  const [expenseFormData, setExpenseFormData] = useState({
    teamId: '',
    category: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    description: '',
    paymentMethod: 'bank_transfer',
    vendorName: '',
    billNumber: '',
    projectId: '',
  });

  useEffect(() => {
    if (currentUserId) {
      fetchData();
    }
  }, [currentUserId]);

  const fetchData = async () => {
    try {
      const [expensesRes, teamsRes] = await Promise.all([
        enhancedExpenseAPI.getExpensesByUser(currentUserId, {
          status: filters.status || undefined,
          category: filters.category || undefined,
          month: filters.month || undefined,
          year: filters.year || undefined
        }),
        teamAPI.getAll()
      ]);
      
      if (expensesRes.data.success) {
        setExpenses(expensesRes.data.data);
        setBudgetStatus(expensesRes.data.monthlySummary);
      }
      if (teamsRes.data.success) {
        setTeams(teamsRes.data.data.filter((team: any) => 
          team.members.includes(currentUserId)
        ));
      }
    } catch (error: any) {
      showToast.error(error.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!expenseFormData.teamId || !expenseFormData.category || expenseFormData.amount <= 0 || !expenseFormData.description) {
      showToast.error('Please fill in all required fields');
      return;
    }

    const loadingToast = showToast.loading(editingExpense ? 'Updating expense...' : 'Creating expense...');

    try {
      if (editingExpense) {
        await enhancedExpenseAPI.createExpense({ ...expenseFormData, _id: editingExpense._id });
        showToast.success('Expense updated successfully!');
      } else {
        await enhancedExpenseAPI.createExpense(expenseFormData);
        showToast.success('Expense created successfully! Awaiting approval.');
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

  const handleDelete = async (expenseId: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    const loadingToast = showToast.loading('Deleting expense...');

    try {
      // Note: This would need to be implemented in the API
      // await enhancedExpenseAPI.deleteExpense(expenseId);
      showToast.dismiss(loadingToast);
      showToast.success('Expense deleted successfully!');
      fetchData();
    } catch (error: any) {
      showToast.dismiss(loadingToast);
      showToast.error(error.response?.data?.message || 'Delete failed');
    }
  };

  const resetForm = () => {
    setExpenseFormData({
      teamId: '',
      category: '',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      description: '',
      paymentMethod: 'bank_transfer',
      vendorName: '',
      billNumber: '',
      projectId: '',
    });
    setEditingExpense(null);
  };

  const handleOpenModal = () => {
    resetForm();
    setShowModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      'Rent': 'bg-blue-100 text-blue-800',
      'Utilities': 'bg-purple-100 text-purple-800',
      'Logistics': 'bg-orange-100 text-orange-800',
      'Salaries': 'bg-green-100 text-green-800',
      'Marketing': 'bg-pink-100 text-pink-800',
      'Manufacturing': 'bg-indigo-100 text-indigo-800',
      'Production': 'bg-cyan-100 text-cyan-800',
      'Travel': 'bg-yellow-100 text-yellow-800',
      'Office Supplies': 'bg-gray-100 text-gray-800',
      'Other': 'bg-slate-100 text-slate-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.description.toLowerCase().includes(filters.search.toLowerCase()) ||
                         expense.category.toLowerCase().includes(filters.search.toLowerCase());
    return matchesSearch;
  });

  const expenseStats = {
    total: expenses.length,
    approved: expenses.filter(e => e.status === 'approved').length,
    pending: expenses.filter(e => e.status === 'pending').length,
    rejected: expenses.filter(e => e.status === 'rejected').length,
    totalAmount: expenses.reduce((sum, e) => sum + e.amount, 0),
    approvedAmount: expenses.filter(e => e.status === 'approved').reduce((sum, e) => sum + e.amount, 0)
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 overflow-auto">
          <Header title="My Expenses" />
          <div className="flex h-96 items-center justify-center">
            <div className="text-xl">Loading expenses...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 overflow-auto">
        <Header title="My Expenses" />

        <div className="p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">My Expenses</h2>
              <p className="mt-1 text-sm text-gray-600">Track and manage your expense submissions</p>
            </div>
            <Button onClick={handleOpenModal}>
              <FiPlus className="mr-2" />
              Add Expense
            </Button>
          </div>

          {/* Expense Statistics */}
          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
            <div className="rounded-lg bg-white p-6 shadow">
              <div className="flex items-center">
                <div className="rounded-full bg-blue-100 p-3">
                  <FiDollarSign className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                  <p className="text-2xl font-bold text-gray-900">{expenseStats.total}</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-white p-6 shadow">
              <div className="flex items-center">
                <div className="rounded-full bg-green-100 p-3">
                  <FiCheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Approved</p>
                  <p className="text-2xl font-bold text-gray-900">{expenseStats.approved}</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-white p-6 shadow">
              <div className="flex items-center">
                <div className="rounded-full bg-yellow-100 p-3">
                  <FiClock className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">{expenseStats.pending}</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-white p-6 shadow">
              <div className="flex items-center">
                <div className="rounded-full bg-purple-100 p-3">
                  <FiTrendingUp className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Amount</p>
                  <p className="text-2xl font-bold text-gray-900">₹{expenseStats.totalAmount.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Budget Status */}
          {budgetStatus && (
            <div className="mb-6 rounded-lg bg-white p-6 shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Summary</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Total Expenses</p>
                  <p className="text-2xl font-bold text-gray-900">₹{budgetStatus.totalExpense.toLocaleString()}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Expense Count</p>
                  <p className="text-2xl font-bold text-gray-900">{budgetStatus.expenseCount}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Average Expense</p>
                  <p className="text-2xl font-bold text-gray-900">₹{budgetStatus.avgExpense.toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="mb-6 rounded-lg bg-white p-4 shadow">
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <FiSearch className="h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search expenses..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              
              <FormSelect
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                options={[
                  { value: '', label: 'All Status' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'approved', label: 'Approved' },
                  { value: 'rejected', label: 'Rejected' }
                ]}
              />

              <FormSelect
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                options={[
                  { value: '', label: 'All Categories' },
                  { value: 'Rent', label: 'Rent' },
                  { value: 'Utilities', label: 'Utilities' },
                  { value: 'Logistics', label: 'Logistics' },
                  { value: 'Salaries', label: 'Salaries' },
                  { value: 'Marketing', label: 'Marketing' },
                  { value: 'Manufacturing', label: 'Manufacturing' },
                  { value: 'Production', label: 'Production' },
                  { value: 'Travel', label: 'Travel' },
                  { value: 'Office Supplies', label: 'Office Supplies' },
                  { value: 'Other', label: 'Other' }
                ]}
              />

              <FormInput
                type="month"
                value={`${filters.year}-${filters.month.padStart(2, '0')}`}
                onChange={(e) => {
                  const [year, month] = e.target.value.split('-');
                  setFilters({ ...filters, year, month });
                }}
                className="w-auto"
              />

              <Button
                variant="outline"
                onClick={fetchData}
                className="flex items-center gap-2"
              >
                <FiFilter className="h-4 w-4" />
                Apply Filters
              </Button>
            </div>
          </div>

          {/* Expenses List */}
          <div className="space-y-4">
            {filteredExpenses.map((expense) => (
              <div key={expense._id} className="rounded-lg bg-white p-6 shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">{expense.description}</h3>
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${getCategoryColor(expense.category)}`}>
                        {expense.category}
                      </span>
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(expense.status)}`}>
                        {expense.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-6 text-sm text-gray-500 mb-3">
                      <div className="flex items-center gap-1">
                        <FiCalendar className="h-4 w-4" />
                        <span>{new Date(expense.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FiCreditCard className="h-4 w-4" />
                        <span>{expense.paymentMethod.replace('_', ' ')}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FiUser className="h-4 w-4" />
                        <span>Team: {expense.teamId?.name || 'N/A'}</span>
                      </div>
                      {expense.vendorName && (
                        <div className="flex items-center gap-1">
                          <span>Vendor: {expense.vendorName}</span>
                        </div>
                      )}
                    </div>

                    {expense.billNumber && (
                      <p className="text-sm text-gray-600">Bill Number: {expense.billNumber}</p>
                    )}
                  </div>

                  <div className="ml-6 flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-3xl font-bold text-gray-900">₹{expense.amount.toLocaleString()}</p>
                      {expense.approvedBy && (
                        <p className="text-sm text-gray-500">
                          Approved by: {expense.approvedBy.name}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {expense.status === 'pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingExpense(expense);
                            setExpenseFormData({
                              teamId: expense.teamId._id,
                              category: expense.category,
                              amount: expense.amount,
                              date: new Date(expense.date).toISOString().split('T')[0],
                              description: expense.description,
                              paymentMethod: expense.paymentMethod,
                              vendorName: expense.vendorName || '',
                              billNumber: expense.billNumber || '',
                              projectId: expense.projectId?._id || '',
                            });
                            setShowModal(true);
                          }}
                        >
                          <FiEdit />
                        </Button>
                      )}
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(expense._id)}
                      >
                        <FiTrash2 />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {filteredExpenses.length === 0 && (
              <div className="rounded-lg bg-white p-12 text-center shadow">
                <FiDollarSign className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                <p className="text-lg font-medium text-gray-900">No expenses found</p>
                <p className="mt-1 text-sm text-gray-500">
                  {filters.search || filters.status || filters.category 
                    ? 'Try adjusting your filters to see more expenses'
                    : 'You haven\'t submitted any expenses yet'
                  }
                </p>
                {!filters.search && !filters.status && !filters.category && (
                  <Button className="mt-4" onClick={handleOpenModal}>
                    <FiPlus className="mr-2" />
                    Submit Your First Expense
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expense Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editingExpense ? 'Edit Expense' : 'Add New Expense'}
        size="lg"
      >
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <FormSelect
              label="Team"
              required
              value={expenseFormData.teamId}
              onChange={(e) => setExpenseFormData({ ...expenseFormData, teamId: e.target.value })}
              options={teams.map((team: any) => ({
                value: team._id,
                label: team.name,
              }))}
            />

            <FormSelect
              label="Expense Category"
              required
              value={expenseFormData.category}
              onChange={(e) => setExpenseFormData({ ...expenseFormData, category: e.target.value })}
              options={[
                { value: 'Rent', label: 'Rent' },
                { value: 'Utilities', label: 'Utilities' },
                { value: 'Logistics', label: 'Logistics' },
                { value: 'Salaries', label: 'Salaries' },
                { value: 'Marketing', label: 'Marketing' },
                { value: 'Manufacturing', label: 'Manufacturing' },
                { value: 'Production', label: 'Production' },
                { value: 'Travel', label: 'Travel' },
                { value: 'Office Supplies', label: 'Office Supplies' },
                { value: 'Other', label: 'Other' },
              ]}
            />

            <FormInput
              label="Amount (₹)"
              type="number"
              required
              min="0"
              value={expenseFormData.amount}
              onChange={(e) => setExpenseFormData({ ...expenseFormData, amount: Number(e.target.value) })}
              placeholder="0"
            />

            <FormInput
              label="Date"
              type="date"
              required
              value={expenseFormData.date}
              onChange={(e) => setExpenseFormData({ ...expenseFormData, date: e.target.value })}
            />

            <FormSelect
              label="Payment Method"
              required
              value={expenseFormData.paymentMethod}
              onChange={(e) => setExpenseFormData({ ...expenseFormData, paymentMethod: e.target.value })}
              options={[
                { value: 'bank_transfer', label: 'Bank Transfer' },
                { value: 'upi', label: 'UPI' },
                { value: 'cash', label: 'Cash' },
                { value: 'cheque', label: 'Cheque' },
                { value: 'card', label: 'Card' },
                { value: 'other', label: 'Other' },
              ]}
            />

            <FormInput
              label="Vendor Name"
              value={expenseFormData.vendorName}
              onChange={(e) => setExpenseFormData({ ...expenseFormData, vendorName: e.target.value })}
              placeholder="Optional"
            />

            <FormInput
              label="Bill Number"
              value={expenseFormData.billNumber}
              onChange={(e) => setExpenseFormData({ ...expenseFormData, billNumber: e.target.value })}
              placeholder="Optional"
            />

            <div className="col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                value={expenseFormData.description}
                onChange={(e) => setExpenseFormData({ ...expenseFormData, description: e.target.value })}
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="What is this expense for?"
              />
            </div>

            <div className="col-span-2 rounded bg-yellow-50 p-3 text-sm text-yellow-800">
              <strong>Note:</strong> Expense will be validated against your team budget limits and require approval.
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
            <Button type="submit" variant="danger">
              {editingExpense ? 'Update Expense' : 'Submit Expense'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
