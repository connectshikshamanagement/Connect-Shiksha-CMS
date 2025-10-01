'use client';

import { useEffect, useState } from 'react';
import { payoutAPI } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import Button from '@/components/Button';
import { showToast } from '@/lib/toast';
import { FiDownload, FiCheck, FiDollarSign } from 'react-icons/fi';

export default function PayrollPage() {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchPayouts();
  }, [selectedMonth, selectedYear]);

  const fetchPayouts = async () => {
    setLoading(true);
    try {
      const response = await payoutAPI.getAll({ month: selectedMonth, year: selectedYear });
      if (response.data.success) {
        setPayouts(response.data.data);
      }
    } catch (error: any) {
      showToast.error(error.response?.data?.message || 'Failed to fetch payouts');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async (payoutId: string) => {
    if (!confirm('Mark this payout as paid?')) return;

    const loadingToast = showToast.loading('Updating payout status...');

    try {
      await payoutAPI.updateStatus(payoutId, {
        status: 'paid',
        paymentMethod: 'bank_transfer',
        transactionId: `TXN${Date.now()}`,
      });
      showToast.dismiss(loadingToast);
      showToast.success('Payout marked as paid!');
      fetchPayouts();
    } catch (error: any) {
      showToast.dismiss(loadingToast);
      showToast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleExportExcel = async () => {
    const loadingToast = showToast.loading('Generating Excel report...');

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/payroll/export/excel?month=${selectedMonth}&year=${selectedYear}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `payroll-${selectedMonth}-${selectedYear}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        
        showToast.dismiss(loadingToast);
        showToast.success('Excel report downloaded!');
      } else {
        throw new Error('Export failed');
      }
    } catch (error: any) {
      showToast.dismiss(loadingToast);
      showToast.error('Failed to export Excel');
    }
  };

  const handleExportPDF = async () => {
    const loadingToast = showToast.loading('Generating PDF report...');

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/payroll/export/pdf?month=${selectedMonth}&year=${selectedYear}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `payroll-${selectedMonth}-${selectedYear}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        
        showToast.dismiss(loadingToast);
        showToast.success('PDF report downloaded!');
      } else {
        throw new Error('Export failed');
      }
    } catch (error: any) {
      showToast.dismiss(loadingToast);
      showToast.error('Failed to export PDF');
    }
  };

  const totalBaseSalary = payouts.reduce((sum, p: any) => sum + (p.baseSalary || 0), 0);
  const totalShares = payouts.reduce((sum, p: any) => sum + (p.totalShares || 0), 0);
  const totalPayout = payouts.reduce((sum, p: any) => sum + (p.netAmount || 0), 0);

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 overflow-auto">
          <Header title="Payroll" />
          <div className="flex h-96 items-center justify-center">
            <div className="text-xl">Loading payroll...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 overflow-auto">
        <Header title="Payroll" />

        <div className="p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Payroll Management</h2>
              <p className="mt-1 text-sm text-gray-600">Process monthly payroll and manage payouts</p>
            </div>
            <div className="flex gap-2">
              <Button variant="success" onClick={handleExportExcel}>
                <FiDownload className="mr-2" />
                Export Excel
              </Button>
              <Button variant="danger" onClick={handleExportPDF}>
                <FiDownload className="mr-2" />
                Export PDF
              </Button>
            </div>
          </div>

          {/* Month/Year Selector */}
          <div className="mb-6 flex gap-4 rounded-lg bg-white p-4 shadow">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="rounded-lg border border-gray-300 px-3 py-2"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                  <option key={month} value={month}>
                    {new Date(2025, month - 1).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="rounded-lg border border-gray-300 px-3 py-2"
              >
                {[2024, 2025, 2026].map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-lg bg-white p-6 shadow">
              <p className="text-sm font-medium text-gray-600">Total Base Salary</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                ₹{totalBaseSalary.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg bg-white p-6 shadow">
              <p className="text-sm font-medium text-gray-600">Total Profit Shares</p>
              <p className="mt-2 text-3xl font-bold text-blue-600">
                ₹{totalShares.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg bg-white p-6 shadow">
              <p className="text-sm font-medium text-gray-600">Total Payout</p>
              <p className="mt-2 text-3xl font-bold text-green-600">
                ₹{totalPayout.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Payroll Table */}
          <div className="rounded-lg bg-white shadow">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Base Salary
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Profit Shares
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Bonuses
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Deductions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Net Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {payouts.map((payout: any) => (
                    <tr key={payout._id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="font-medium text-gray-900">{payout.userId?.name}</div>
                        <div className="text-sm text-gray-500">{payout.userId?.email}</div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        ₹{payout.baseSalary.toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <span className="text-blue-600">₹{payout.totalShares.toLocaleString()}</span>
                        {payout.shares?.length > 0 && (
                          <div className="mt-1 text-xs text-gray-500">
                            ({payout.shares.length} sources)
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        ₹{payout.bonuses.toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-red-600">
                        ₹{payout.deductions.toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <span className="font-bold text-green-600">
                          ₹{payout.netAmount.toLocaleString()}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                          payout.status === 'paid' ? 'bg-green-100 text-green-800' :
                          payout.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                          payout.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {payout.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        {payout.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => handleMarkAsPaid(payout._id)}
                          >
                            <FiCheck className="mr-1" />
                            Pay
                          </Button>
                        )}
                        {payout.status === 'paid' && payout.paidOn && (
                          <span className="text-xs text-gray-500">
                            {new Date(payout.paidOn).toLocaleDateString()}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {payouts.length === 0 && (
                <div className="p-12 text-center">
                  <FiDollarSign className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                  <p className="text-lg font-medium text-gray-900">No payroll data for this period</p>
                  <p className="mt-1 text-sm text-gray-500">
                    Payouts are automatically generated when income is recorded with profit-sharing
                  </p>
                </div>
              )}
            </div>
          </div>

          {payouts.length > 0 && (
            <div className="mt-6 rounded-lg bg-blue-50 p-4 text-sm text-blue-900">
              <strong>💡 Payroll Information:</strong>
              <ul className="mt-2 ml-4 list-disc space-y-1">
                <li>Net Amount = Base Salary + Profit Shares + Bonuses - Deductions</li>
                <li>Profit shares are auto-computed from income entries based on profit-sharing rules</li>
                <li>Mark payouts as "Paid" after bank transfer is completed</li>
                <li>Export to Excel or PDF for record-keeping</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

