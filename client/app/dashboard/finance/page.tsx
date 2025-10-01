'use client';

import { useEffect, useState } from 'react';
import { incomeAPI, expenseAPI, clientAPI } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import FormInput from '@/components/FormInput';
import FormSelect from '@/components/FormSelect';
import { showToast } from '@/lib/toast';
import { FiPlus, FiTrendingUp, FiTrendingDown, FiDollarSign, FiEdit, FiTrash2, FiCheck, FiX } from 'react-icons/fi';

export default function FinancePage() {
  const [income, setIncome] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('income');
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const [incomeFormData, setIncomeFormData] = useState({
    sourceType: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    description: '',
    paymentMethod: 'bank_transfer',
    transactionId: '',
    invoiceNumber: '',
    clientId: '',
  });

  const [expenseFormData, setExpenseFormData] = useState({
    category: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    description: '',
    paymentMethod: 'bank_transfer',
    vendorName: '',
    billNumber: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [incomeRes, expenseRes, clientsRes] = await Promise.all([
        incomeAPI.getAll(),
        expenseAPI.getAll(),
        clientAPI.getAll()
      ]);
      
      if (incomeRes.data.success) setIncome(incomeRes.data.data);
      if (expenseRes.data.success) setExpenses(expenseRes.data.data);
      if (clientsRes.data.success) setClients(clientsRes.data.data);
    } catch (error: any) {
      showToast.error(error.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleIncomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!incomeFormData.sourceType || incomeFormData.amount <= 0) {
      showToast.error('Please fill in all required fields');
      return;
    }

    const loadingToast = showToast.loading(editingItem ? 'Updating income...' : 'Creating income...');

    try {
      if (editingItem) {
        await incomeAPI.update(editingItem._id, incomeFormData);
        showToast.success('Income updated successfully!');
      } else {
        await incomeAPI.create(incomeFormData);
        showToast.success('Income created successfully! Profit-sharing computed automatically.');
      }
      
      showToast.dismiss(loadingToast);
      setShowIncomeModal(false);
      resetIncomeForm();
      fetchData();
    } catch (error: any) {
      showToast.dismiss(loadingToast);
      showToast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!expenseFormData.category || expenseFormData.amount <= 0 || !expenseFormData.description) {
      showToast.error('Please fill in all required fields');
      return;
    }

    const loadingToast = showToast.loading(editingItem ? 'Updating expense...' : 'Creating expense...');

    try {
      if (editingItem) {
        await expenseAPI.update(editingItem._id, expenseFormData);
        showToast.success('Expense updated successfully!');
      } else {
        await expenseAPI.create(expenseFormData);
        showToast.success('Expense created successfully! Awaiting approval.');
      }
      
      showToast.dismiss(loadingToast);
      setShowExpenseModal(false);
      resetExpenseForm();
      fetchData();
    } catch (error: any) {
      showToast.dismiss(loadingToast);
      showToast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleApproveExpense = async (expenseId: string, status: string) => {
    const loadingToast = showToast.loading(`${status === 'approved' ? 'Approving' : 'Rejecting'} expense...`);

    try {
      await expenseAPI.approve(expenseId, status);
      showToast.dismiss(loadingToast);
      showToast.success(`Expense ${status} successfully!`);
      fetchData();
    } catch (error: any) {
      showToast.dismiss(loadingToast);
      showToast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleDeleteIncome = async (incomeId: string) => {
    if (!confirm('Are you sure you want to delete this income record?')) return;

    const loadingToast = showToast.loading('Deleting income...');

    try {
      await incomeAPI.delete(incomeId);
      showToast.dismiss(loadingToast);
      showToast.success('Income deleted successfully!');
      fetchData();
    } catch (error: any) {
      showToast.dismiss(loadingToast);
      showToast.error(error.response?.data?.message || 'Delete failed');
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm('Are you sure you want to delete this expense record?')) return;

    const loadingToast = showToast.loading('Deleting expense...');

    try {
      await expenseAPI.delete(expenseId);
      showToast.dismiss(loadingToast);
      showToast.success('Expense deleted successfully!');
      fetchData();
    } catch (error: any) {
      showToast.dismiss(loadingToast);
      showToast.error(error.response?.data?.message || 'Delete failed');
    }
  };

  const resetIncomeForm = () => {
    setIncomeFormData({
      sourceType: '',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      description: '',
      paymentMethod: 'bank_transfer',
      transactionId: '',
      invoiceNumber: '',
      clientId: '',
    });
    setEditingItem(null);
  };

  const resetExpenseForm = () => {
    setExpenseFormData({
      category: '',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      description: '',
      paymentMethod: 'bank_transfer',
      vendorName: '',
      billNumber: '',
    });
    setEditingItem(null);
  };

  const totalIncome = income.reduce((sum: number, i: any) => sum + i.amount, 0);
  const totalExpenses = expenses.filter((e: any) => e.status === 'approved').reduce((sum: number, e: any) => sum + e.amount, 0);
  const netProfit = totalIncome - totalExpenses;

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 overflow-auto">
          <Header title="Finance" />
          <div className="flex h-96 items-center justify-center">
            <div className="text-xl">Loading finance data...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 overflow-auto">
        <Header title="Finance" />

        <div className="p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Financial Management</h2>
            <p className="mt-1 text-sm text-gray-600">Track income, expenses, and profitability</p>
          </div>

          {/* Summary Cards */}
          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-lg bg-gradient-to-br from-green-500 to-green-600 p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium opacity-90">Total Income</p>
                  <p className="mt-2 text-3xl font-bold">
                    ₹{totalIncome.toLocaleString()}
                  </p>
                </div>
                <FiTrendingUp className="h-12 w-12 opacity-80" />
              </div>
            </div>

            <div className="rounded-lg bg-gradient-to-br from-red-500 to-red-600 p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium opacity-90">Total Expenses</p>
                  <p className="mt-2 text-3xl font-bold">
                    ₹{totalExpenses.toLocaleString()}
                  </p>
                </div>
                <FiTrendingDown className="h-12 w-12 opacity-80" />
              </div>
            </div>

            <div className={`rounded-lg bg-gradient-to-br ${netProfit >= 0 ? 'from-blue-500 to-blue-600' : 'from-orange-500 to-orange-600'} p-6 text-white shadow-lg`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium opacity-90">Net Profit</p>
                  <p className="mt-2 text-3xl font-bold">
                    ₹{netProfit.toLocaleString()}
                  </p>
                </div>
                <FiDollarSign className="h-12 w-12 opacity-80" />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-4 flex gap-4">
            <button
              onClick={() => setActiveTab('income')}
              className={`rounded-lg px-6 py-3 font-medium transition-colors ${
                activeTab === 'income' 
                  ? 'bg-primary-600 text-white shadow-md' 
                  : 'bg-white text-gray-700 shadow hover:bg-gray-50'
              }`}
            >
              Income ({income.length})
            </button>
            <button
              onClick={() => setActiveTab('expenses')}
              className={`rounded-lg px-6 py-3 font-medium transition-colors ${
                activeTab === 'expenses' 
                  ? 'bg-primary-600 text-white shadow-md' 
                  : 'bg-white text-gray-700 shadow hover:bg-gray-50'
              }`}
            >
              Expenses ({expenses.length})
            </button>
          </div>

          {/* Content */}
          {activeTab === 'income' && (
            <div className="rounded-lg bg-white shadow">
              <div className="border-b p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Income Records</h3>
                  <Button onClick={() => { resetIncomeForm(); setShowIncomeModal(true); }}>
                    <FiPlus className="mr-2" />
                    Add Income
                  </Button>
                </div>
              </div>
              <div className="divide-y">
                {income.map((item: any) => (
                  <div key={item._id} className="p-4 transition-colors hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                            {item.sourceType}
                          </span>
                          {item.profitShared && (
                            <span className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                              Profit Shared
                            </span>
                          )}
                        </div>
                        <p className="mt-1 font-medium text-gray-900">{item.description || 'No description'}</p>
                        <div className="mt-2 flex gap-4 text-xs text-gray-500">
                          <span>{new Date(item.date).toLocaleDateString()}</span>
                          <span>● {item.paymentMethod}</span>
                          {item.transactionId && <span>● {item.transactionId}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-2xl font-bold text-green-600">+₹{item.amount.toLocaleString()}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteIncome(item._id)}
                          >
                            <FiTrash2 />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {income.length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    <FiTrendingUp className="mx-auto mb-2 h-10 w-10 text-gray-300" />
                    <p>No income records found</p>
                    <Button className="mt-4" size="sm" onClick={() => { resetIncomeForm(); setShowIncomeModal(true); }}>
                      Add Your First Income
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'expenses' && (
            <div className="rounded-lg bg-white shadow">
              <div className="border-b p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Expense Records</h3>
                  <Button variant="danger" onClick={() => { resetExpenseForm(); setShowExpenseModal(true); }}>
                    <FiPlus className="mr-2" />
                    Add Expense
                  </Button>
                </div>
              </div>
              <div className="divide-y">
                {expenses.map((item: any) => (
                  <div key={item._id} className="p-4 transition-colors hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
                            {item.category}
                          </span>
                          {item.status === 'pending' && (
                            <span className="rounded bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
                              Pending Approval
                            </span>
                          )}
                          {item.status === 'approved' && (
                            <span className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                              Approved
                            </span>
                          )}
                          {item.status === 'rejected' && (
                            <span className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
                              Rejected
                            </span>
                          )}
                        </div>
                        <p className="mt-1 font-medium text-gray-900">{item.description}</p>
                        <div className="mt-2 flex gap-4 text-xs text-gray-500">
                          <span>{new Date(item.date).toLocaleDateString()}</span>
                          <span>● {item.paymentMethod}</span>
                          {item.vendorName && <span>● {item.vendorName}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-2xl font-bold text-red-600">-₹{item.amount.toLocaleString()}</p>
                        </div>
                        <div className="flex gap-1">
                          {item.status === 'pending' && (
                            <>
                              <Button
                                variant="success"
                                size="sm"
                                onClick={() => handleApproveExpense(item._id, 'approved')}
                                title="Approve"
                              >
                                <FiCheck />
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleApproveExpense(item._id, 'rejected')}
                                title="Reject"
                              >
                                <FiX />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteExpense(item._id)}
                          >
                            <FiTrash2 />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {expenses.length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    <FiTrendingDown className="mx-auto mb-2 h-10 w-10 text-gray-300" />
                    <p>No expense records found</p>
                    <Button className="mt-4" variant="danger" size="sm" onClick={() => { resetExpenseForm(); setShowExpenseModal(true); }}>
                      Add Your First Expense
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Income Modal */}
      <Modal
        isOpen={showIncomeModal}
        onClose={() => {
          setShowIncomeModal(false);
          resetIncomeForm();
        }}
        title={editingItem ? 'Edit Income' : 'Add New Income'}
        size="lg"
      >
        <form onSubmit={handleIncomeSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <FormSelect
              label="Income Source"
              required
              value={incomeFormData.sourceType}
              onChange={(e) => setIncomeFormData({ ...incomeFormData, sourceType: e.target.value })}
              options={[
                { value: 'Coaching', label: 'Coaching (₹50k/batch)' },
                { value: 'Paid Workshops', label: 'Paid Workshops (₹1.5L/2 months)' },
                { value: 'Guest Lectures', label: 'Guest Lectures (₹50k/month)' },
                { value: 'Product Sales', label: 'Product Sales (₹2.5k/product)' },
                { value: 'Online Courses', label: 'Online Courses (₹40k/2 months)' },
                { value: 'Other', label: 'Other' },
              ]}
            />

            <FormInput
              label="Amount (₹)"
              type="number"
              required
              min="0"
              value={incomeFormData.amount}
              onChange={(e) => setIncomeFormData({ ...incomeFormData, amount: Number(e.target.value) })}
              placeholder="0"
            />

            <FormInput
              label="Date"
              type="date"
              required
              value={incomeFormData.date}
              onChange={(e) => setIncomeFormData({ ...incomeFormData, date: e.target.value })}
            />

            <FormSelect
              label="Payment Method"
              required
              value={incomeFormData.paymentMethod}
              onChange={(e) => setIncomeFormData({ ...incomeFormData, paymentMethod: e.target.value })}
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
              label="Transaction ID"
              value={incomeFormData.transactionId}
              onChange={(e) => setIncomeFormData({ ...incomeFormData, transactionId: e.target.value })}
              placeholder="Optional"
            />

            <FormInput
              label="Invoice Number"
              value={incomeFormData.invoiceNumber}
              onChange={(e) => setIncomeFormData({ ...incomeFormData, invoiceNumber: e.target.value })}
              placeholder="Optional"
            />

            <FormSelect
              label="Client"
              value={incomeFormData.clientId}
              onChange={(e) => setIncomeFormData({ ...incomeFormData, clientId: e.target.value })}
              options={clients.map((client: any) => ({
                value: client._id,
                label: client.name,
              }))}
            />

            <div className="col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                value={incomeFormData.description}
                onChange={(e) => setIncomeFormData({ ...incomeFormData, description: e.target.value })}
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="Brief description of this income..."
              />
            </div>

            <div className="col-span-2 rounded bg-blue-50 p-3 text-sm text-blue-800">
              <strong>Note:</strong> Profit-sharing will be automatically computed based on the income source type after creation.
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowIncomeModal(false);
                resetIncomeForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="success">
              {editingItem ? 'Update Income' : 'Create Income'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Expense Modal */}
      <Modal
        isOpen={showExpenseModal}
        onClose={() => {
          setShowExpenseModal(false);
          resetExpenseForm();
        }}
        title={editingItem ? 'Edit Expense' : 'Add New Expense'}
        size="lg"
      >
        <form onSubmit={handleExpenseSubmit}>
          <div className="grid grid-cols-2 gap-4">
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
              <strong>Note:</strong> Expense will be in "Pending" status until approved by an authorized user.
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowExpenseModal(false);
                resetExpenseForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="danger">
              {editingItem ? 'Update Expense' : 'Submit Expense'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
