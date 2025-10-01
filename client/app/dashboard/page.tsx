'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { dashboardAPI } from '@/lib/api';
import {
  FiDollarSign,
  FiTrendingUp,
  FiTrendingDown,
  FiShoppingBag,
  FiCalendar,
  FiUsers,
  FiFolder,
  FiCheckSquare,
} from 'react-icons/fi';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function DashboardPage() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetchAnalytics();
  }, [router]);

  const fetchAnalytics = async () => {
    try {
      const response = await dashboardAPI.getAnalytics();
      if (response.data.success) {
        setAnalytics(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-xl">Loading dashboard...</div>
      </div>
    );
  }

  const { financialSummary, monthlyIncome, monthlyExpenses, taskStats } = analytics || {};

  // Prepare chart data
  const incomeExpenseData = [
    { month: 'Jan', income: 0, expenses: 0 },
    { month: 'Feb', income: 0, expenses: 0 },
    { month: 'Mar', income: 0, expenses: 0 },
    { month: 'Apr', income: 0, expenses: 0 },
    { month: 'May', income: 0, expenses: 0 },
    { month: 'Jun', income: 0, expenses: 0 },
    { month: 'Jul', income: 0, expenses: 0 },
    { month: 'Aug', income: 0, expenses: 0 },
    { month: 'Sep', income: 0, expenses: 0 },
    { month: 'Oct', income: 225000, expenses: 400000 },
    { month: 'Nov', income: 0, expenses: 0 },
    { month: 'Dec', income: 0, expenses: 0 },
  ];

  const taskStatusData = taskStats || [
    { name: 'To Do', value: 5, color: '#6b7280' },
    { name: 'In Progress', value: 3, color: '#3b82f6' },
    { name: 'Review', value: 2, color: '#f59e0b' },
    { name: 'Done', value: 8, color: '#10b981' },
  ];

  const COLORS = ['#6b7280', '#3b82f6', '#f59e0b', '#10b981'];

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 overflow-auto">
        <Header title="Dashboard" />

        <div className="p-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Income"
              value={`₹${financialSummary?.totalIncome?.toLocaleString() || 0}`}
              icon={<FiDollarSign className="h-8 w-8" />}
              color="bg-green-500"
              trend="+12.5%"
            />
            <StatCard
              title="Total Expenses"
              value={`₹${financialSummary?.totalExpenses?.toLocaleString() || 0}`}
              icon={<FiTrendingDown className="h-8 w-8" />}
              color="bg-red-500"
              trend="+8.2%"
            />
            <StatCard
              title="Net Profit"
              value={`₹${financialSummary?.netProfit?.toLocaleString() || 0}`}
              icon={<FiTrendingUp className="h-8 w-8" />}
              color="bg-blue-500"
              trend={financialSummary?.netProfit >= 0 ? '+' : '-'}
            />
            <StatCard
              title="Active Projects"
              value="3"
              icon={<FiFolder className="h-8 w-8" />}
              color="bg-purple-500"
            />
          </div>

          {/* Charts Row */}
          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Income vs Expenses Chart */}
            <div className="rounded-lg bg-white p-6 shadow">
              <h3 className="mb-4 text-lg font-semibold text-gray-800">
                Income vs Expenses (Monthly)
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={incomeExpenseData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                  <Legend />
                  <Bar dataKey="income" fill="#10b981" name="Income" />
                  <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Task Status Distribution */}
            <div className="rounded-lg bg-white p-6 shadow">
              <h3 className="mb-4 text-lg font-semibold text-gray-800">
                Task Distribution
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={taskStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {taskStatusData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <QuickActionCard
              title="New Project"
              description="Create a new project"
              icon={<FiFolder className="h-8 w-8" />}
              color="bg-blue-500"
              href="/dashboard/projects"
            />
            <QuickActionCard
              title="Add Task"
              description="Create a new task"
              icon={<FiCheckSquare className="h-8 w-8" />}
              color="bg-green-500"
              href="/dashboard/tasks"
            />
            <QuickActionCard
              title="Record Income"
              description="Log new income"
              icon={<FiDollarSign className="h-8 w-8" />}
              color="bg-yellow-500"
              href="/dashboard/finance"
            />
            <QuickActionCard
              title="Add Client"
              description="New lead or client"
              icon={<FiUsers className="h-8 w-8" />}
              color="bg-purple-500"
              href="/dashboard/clients"
            />
          </div>

          {/* Recent Activity */}
          <div className="mt-8 rounded-lg bg-white p-6 shadow">
            <h3 className="mb-4 text-lg font-semibold text-gray-800">
              Recent Activity
            </h3>
            <div className="space-y-4">
              <ActivityItem
                title="New income recorded: ₹50,000"
                subtitle="Coaching batch payment"
                time="2 hours ago"
                icon={<FiDollarSign />}
                color="text-green-600"
              />
              <ActivityItem
                title="Profit sharing computed"
                subtitle="₹15,000 distributed to mentors"
                time="2 hours ago"
                icon={<FiTrendingUp />}
                color="text-blue-600"
              />
              <ActivityItem
                title="New project created"
                subtitle="Robotics Workshop - Schools"
                time="5 hours ago"
                icon={<FiFolder />}
                color="text-purple-600"
              />
              <ActivityItem
                title="Task completed"
                subtitle="Design workshop materials"
                time="1 day ago"
                icon={<FiCheckSquare />}
                color="text-green-600"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color, trend }: any) {
  return (
    <div className="rounded-lg bg-white p-6 shadow transition-shadow hover:shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          {trend && (
            <p className={`mt-2 text-sm ${trend.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
              {trend} from last month
            </p>
          )}
        </div>
        <div className={`${color} rounded-full p-3 text-white`}>{icon}</div>
      </div>
    </div>
  );
}

function QuickActionCard({ title, description, icon, color, href }: any) {
  return (
    <a
      href={href}
      className="block rounded-lg bg-white p-6 shadow transition-all hover:shadow-lg hover:scale-105"
    >
      <div className={`${color} mb-4 inline-block rounded-lg p-3 text-white`}>
        {icon}
      </div>
      <h4 className="font-semibold text-gray-900">{title}</h4>
      <p className="mt-1 text-sm text-gray-600">{description}</p>
    </a>
  );
}

function ActivityItem({ title, subtitle, time, icon, color }: any) {
  return (
    <div className="flex items-start space-x-4 border-l-4 border-primary-500 pl-4">
      <div className={`mt-1 ${color}`}>{icon}</div>
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="text-xs text-gray-500">{subtitle}</p>
        <p className="mt-1 text-xs text-gray-400">{time}</p>
      </div>
    </div>
  );
}
