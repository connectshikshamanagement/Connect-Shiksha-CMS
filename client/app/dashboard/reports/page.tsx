'use client';

import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

export default function ReportsPage() {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 overflow-auto">
        <Header title="Reports" />

        <div className="p-8">
          <h2 className="mb-6 text-2xl font-bold text-gray-800">Reports & Analytics</h2>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg bg-white p-6 shadow">
              <h3 className="font-semibold text-gray-900">Income vs Expenses</h3>
              <p className="mt-2 text-sm text-gray-600">Monthly financial comparison</p>
              <button className="mt-4 w-full rounded bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700">
                Generate Report
              </button>
            </div>

            <div className="rounded-lg bg-white p-6 shadow">
              <h3 className="font-semibold text-gray-900">Profit Trends</h3>
              <p className="mt-2 text-sm text-gray-600">Track profit over time</p>
              <button className="mt-4 w-full rounded bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700">
                Generate Report
              </button>
            </div>

            <div className="rounded-lg bg-white p-6 shadow">
              <h3 className="font-semibold text-gray-900">Sales Performance</h3>
              <p className="mt-2 text-sm text-gray-600">Product and workshop sales</p>
              <button className="mt-4 w-full rounded bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700">
                Generate Report
              </button>
            </div>

            <div className="rounded-lg bg-white p-6 shadow">
              <h3 className="font-semibold text-gray-900">Team Performance</h3>
              <p className="mt-2 text-sm text-gray-600">Task completion and productivity</p>
              <button className="mt-4 w-full rounded bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700">
                Generate Report
              </button>
            </div>

            <div className="rounded-lg bg-white p-6 shadow">
              <h3 className="font-semibold text-gray-900">Payroll Summary</h3>
              <p className="mt-2 text-sm text-gray-600">Salary and profit-sharing</p>
              <button className="mt-4 w-full rounded bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700">
                Generate Report
              </button>
            </div>

            <div className="rounded-lg bg-white p-6 shadow">
              <h3 className="font-semibold text-gray-900">Custom Report</h3>
              <p className="mt-2 text-sm text-gray-600">Build your own report</p>
              <button className="mt-4 w-full rounded bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700">
                Create Custom
              </button>
            </div>
          </div>

          <div className="mt-8 rounded-lg bg-white p-6 shadow">
            <h3 className="mb-4 font-semibold text-gray-900">Export Options</h3>
            <div className="flex gap-4">
              <button className="rounded bg-green-600 px-6 py-2 text-white hover:bg-green-700">
                Export to Excel
              </button>
              <button className="rounded bg-red-600 px-6 py-2 text-white hover:bg-red-700">
                Export to PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

