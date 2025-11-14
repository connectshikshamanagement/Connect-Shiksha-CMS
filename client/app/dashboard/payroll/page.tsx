"use client";

import { useEffect, useState } from "react";
import {
  payoutAPI,
  incomeAPI,
  expenseAPI,
  projectAPI,
  teamMemberFinanceAPI,
} from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import FABMenu from "@/components/FABMenu";
import MobileNavbar from "@/components/MobileNavbar";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import FormInput from "@/components/FormInput";
import FormSelect from "@/components/FormSelect";
import { showToast } from "@/lib/toast";
import { usePermissions } from "@/hooks/usePermissions";
import {
  FiDownload,
  FiCheck,
  FiDollarSign,
  FiUsers,
  FiTrendingUp,
  FiTrendingDown,
  FiFilter,
  FiRefreshCw,
  FiPlus,
  FiMinus,
  FiCreditCard,
  FiInfo,
  FiX,
  FiFileText,
} from "react-icons/fi";

export default function PayrollPage() {
  // Helper function to get current date in local timezone (YYYY-MM-DD format)
  const getCurrentDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Helper: format date as DD/MM/YY
  const formatDDMMYY = (value?: string | Date | null) => {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'N/A';
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yy = String(date.getFullYear()).slice(-2);
    return `${dd}/${mm}/${yy}`;
  };

  const [payouts, setPayouts] = useState([]);
  const [projects, setProjects] = useState([]);
  // Removed: const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedProject, setSelectedProject] = useState("");
  // Removed: const [selectedTeam, setSelectedTeam] = useState('');
  const [analytics, setAnalytics] = useState<any>(null);
  const [financialSummary, setFinancialSummary] = useState<any>(null);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [userProjects, setUserProjects] = useState([]);
  const [projectMembers, setProjectMembers] = useState<any[]>([]);
  const [incomeHistory, setIncomeHistory] = useState<any[]>([]);
  const [expenseHistory, setExpenseHistory] = useState<any[]>([]);
  const [showHistorySection, setShowHistorySection] = useState(false);
  const {
    userRole,
    isFounder,
    isProjectManager,
    isMember,
    loading: permissionsLoading,
  } = usePermissions();
  const isManager = isProjectManager;

  // Form data states
  const [incomeFormData, setIncomeFormData] = useState({
    amount: "",
    source: "",
    sourceType: "Product Sales",
    description: "",
    projectId: "",
    date: getCurrentDate(),
  });

  const [expenseFormData, setExpenseFormData] = useState({
    amount: "",
    category: "Other",
    description: "",
    projectId: "",
    date: getCurrentDate(),
  });

  // State for calculation details modal
  const [selectedPayoutForDetails, setSelectedPayoutForDetails] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const getProjectProfit = (record: any) => {
    if (!record) return 0;
    if (typeof record.netProfit === "number" && !Number.isNaN(record.netProfit)) {
      return record.netProfit;
    }
    const income = record.projectIncome || 0;
    const expenses = record.projectExpenses || 0;
    return income - expenses;
  };

  const getProjectIncome = (record: any) => {
    if (!record) return 0;
    const income = record.projectIncome || 0;
    if (income > 0) {
      return income;
    }
    const profit = getProjectProfit(record);
    if (profit > 0) {
      return profit + (record.projectExpenses || 0);
    }
    return 0;
  };

  const getProjectExpenses = (record: any) => {
    if (!record) return 0;
    const expenses = record.projectExpenses || 0;
    if (expenses > 0) {
      return expenses;
    }
    const income = getProjectIncome(record);
    const profit = getProjectProfit(record);
    if (income > 0 && profit >= 0) {
      return Math.max(0, income - profit);
    }
    return 0;
  };

  const getProjectBudget = (record: any) => {
    if (!record) return 0;
    if (record.projectBudget && record.projectBudget > 0) {
      return record.projectBudget;
    }
    return record.projectId?.allocatedBudget || 0;
  };

  const normalizeDate = (date: Date | null | undefined) => {
    if (!date) return null;
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    if (Number.isNaN(normalized.getTime())) {
      return null;
    }
    return normalized;
  };

  const getEffectiveMemberEndDate = (payout: any) => {
    if (!payout) return null;
    const joined = normalizeDate(payout.memberJoinedDate ? new Date(payout.memberJoinedDate) : null);
    let end = normalizeDate(payout.memberLeftDate ? new Date(payout.memberLeftDate) : null);
    const projectEnd = normalizeDate(
      payout.projectId?.endDate ? new Date(payout.projectId.endDate) : null
    );
    const today = normalizeDate(new Date());
    const isActive = payout.memberIsActive !== false && payout.status !== "cancelled";

    if (isActive) {
      end = today;
      if (projectEnd && end && projectEnd.getTime() < end.getTime()) {
        end = projectEnd;
      }
      if (end && joined && end.getTime() < joined.getTime()) {
        end = new Date(joined);
      }
    }

    if (!end && joined) {
      end = new Date(joined);
    }

    return end;
  };

  const getDisplayWorkingDays = (payout: any) => {
    if (!payout) return 0;
    if (payout.memberIsActive === false && typeof payout.workDurationDays === "number") {
      return payout.workDurationDays;
    }

    const joined = normalizeDate(payout.memberJoinedDate ? new Date(payout.memberJoinedDate) : null);
    const effectiveEnd = getEffectiveMemberEndDate(payout);

    if (!joined || !effectiveEnd) {
      return payout.workDurationDays || 0;
    }

    const diff = effectiveEnd.getTime() - joined.getTime();
    if (diff < 0) {
      return 0;
    }

    return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
  };

  useEffect(() => {
    // Wait for permissions to load before making API calls
    if (permissionsLoading) {
      return;
    }

    // Debug current user
    const user = localStorage.getItem("user");
    console.log("Current user:", user ? JSON.parse(user) : "No user found");
    console.log(
      "User role:",
      userRole,
      "isFounder:",
      isFounder,
      "isManager:",
      isManager,
      "isMember:",
      isMember
    );

    fetchProjects();
    fetchPayouts();
    if (isFounder || isManager) {
      fetchAnalytics();
      fetchFinancialSummary();
    }
    if (isMember || isManager) {
      fetchUserProjects();
      fetchIncomeHistory();
      fetchExpenseHistory();
    }

    // Fetch project members when a project is selected
    if (selectedProject) {
      fetchProjectMembers(selectedProject);
    } else {
      setProjectMembers([]);
    }
  }, [
    selectedMonth,
    selectedYear,
    selectedProject,
    userRole,
    permissionsLoading,
  ]);

  // Refetch history when project filter changes (debounced to avoid excessive calls)
  useEffect(() => {
    if ((isMember || isManager) && !permissionsLoading) {
      // Add a small delay to debounce rapid filter changes
      const timeoutId = setTimeout(() => {
        fetchIncomeHistory();
        fetchExpenseHistory();
      }, 300);
      
      return () => clearTimeout(timeoutId);
    }
  }, [selectedProject, isMember, isManager, permissionsLoading]);

  // Removed fetchTeams - team filter removed

  // Debug payouts state changes
  useEffect(() => {
    console.log("Payouts state changed:", payouts);
  }, [payouts]);

  const fetchPayouts = async () => {
    setLoading(true);
    try {
      let endpoint = "/payroll"; // Use payroll endpoint for founders/managers
      const params = new URLSearchParams({
        month: selectedMonth.toString(),
        year: selectedYear.toString(),
      });

      // Role-based data fetching
      if (isMember) {
        endpoint = "/project-profit/my-shares";
      } else if (selectedProject) {
        // When a project is selected, still use the payroll endpoint with projectId filter
        endpoint = "/payroll";
        // Note: The backend should filter by projectId when it's in the payroll records
      } else if (isFounder || isManager) {
        // For founders and managers, use the payroll endpoint
        endpoint = "/payroll";
      }

      console.log(
        "Fetching payroll from:",
        endpoint,
        "with params:",
        params.toString()
      );

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}${endpoint}?${params}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      const data = await response.json();

      console.log("Payroll response:", data);
      console.log("Setting payouts to:", data.data.records || data.data);

      if (data.success) {
        let payoutsData = data.data.records || data.data;

        // Filter by selected project on client side if a project is selected
        if (selectedProject && Array.isArray(payoutsData)) {
          // Get the project details to check current members
          const project = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/projects/${selectedProject}`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            }
          ).then((res) => res.json());

          const currentProjectMembers = project.success
            ? project.data?.projectMembers || []
            : [];

          payoutsData = payoutsData.filter((payout: any) => {
            const payoutProjectId = payout.projectId?._id || payout.projectId;
            const matchesProject =
              payoutProjectId?.toString() === selectedProject;

            if (!matchesProject) return false;

            // Check if this user is still a member of the project
            // Note: Backend now handles removing old members, but this is extra protection
            const userId = payout.userId?._id || payout.userId;

            // Check if user is still a member of the project
            const isStillMember = currentProjectMembers.some(
              (memberId: any) =>
                memberId?.toString() === userId?.toString() ||
                memberId?._id?.toString() === userId?.toString()
            );

            // Show payroll record only if user is still a member (backend should handle this)
            return isStillMember;
          });
        } else if (!selectedProject && Array.isArray(payoutsData)) {
          // For "All Projects" view, filter out payroll records for users no longer in their projects
          // Fetch all projects once to avoid multiple API calls
          try {
            const projectsResponse = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/projects`,
              {
                headers: {
                  Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
              }
            );
            const projectsData = await projectsResponse.json();

            const projectMembersMap = new Map();
            if (projectsData.success && projectsData.data) {
              projectsData.data.forEach((project: any) => {
                projectMembersMap.set(
                  project._id.toString(),
                  project.projectMembers || []
                );
              });
            }

            payoutsData = payoutsData.filter((payout: any) => {
              const payoutProjectId = payout.projectId?._id || payout.projectId;

              // Include payouts without a project
              if (!payoutProjectId) return true;

              // Check if user is still in the project
              // Note: Backend now handles removing old members, but this is extra protection
              const userId = payout.userId?._id || payout.userId;

              // Get current project members (founder is always included via pre-save hook)
              const currentProjectMembers =
                projectMembersMap.get(payoutProjectId.toString()) || [];

              // Check if user is still a member
              const isStillMember = currentProjectMembers.some(
                (memberId: any) =>
                  memberId?.toString() === userId?.toString() ||
                  memberId?._id?.toString() === userId?.toString()
              );

              return isStillMember;
            });
          } catch (error) {
            console.error("Error filtering project members:", error);
            // If error, don't filter (show all records to be safe)
          }
        }

        setPayouts(payoutsData);
        console.log("Payouts state updated");
      }
    } catch (error: any) {
      showToast.error(
        error.response?.data?.message || "Failed to fetch payouts"
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/project-profit/analytics?month=${selectedMonth}&year=${selectedYear}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      const data = await response.json();
      if (data.success) {
        setAnalytics(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    }
  };

  const fetchFinancialSummary = async () => {
    try {
      const params = new URLSearchParams({
        month: selectedMonth.toString(),
        year: selectedYear.toString(),
      });

      if (selectedProject) {
        params.append("projectId", selectedProject);
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/finance/summary?${params}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      const data = await response.json();

      if (data.success) {
        setFinancialSummary(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch financial summary:", error);
    }
  };

  const handleComputeProfitSharing = async (projectId?: string) => {
    const loadingToast = showToast.loading("Computing profit sharing...");

    try {
      let endpoint = "/project-profit/compute-all";
      if (projectId) {
        endpoint = `/project-profit/compute/${projectId}`;
      }

      // Prepare request body with selected month and year
      const requestBody: any = {};
      if (selectedMonth && selectedYear) {
        requestBody.month = selectedMonth;
        requestBody.year = selectedYear;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}${endpoint}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      const data = await response.json();

      if (data.success) {
        showToast.dismiss(loadingToast);
        showToast.success(data.message);
        fetchPayouts();
        if (isFounder || isManager) {
          fetchAnalytics();
        }
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      showToast.dismiss(loadingToast);
      showToast.error(error.message || "Failed to compute profit sharing");
    }
  };

  const handleMarkAsPaid = async (payoutId: string) => {
    if (!confirm("Mark this payout as paid?")) return;

    const loadingToast = showToast.loading("Updating payout status...");

    try {
      console.log("Marking payout as paid:", payoutId);
      console.log(
        "Available payouts:",
        payouts.map((p: any) => ({ id: p._id, type: "payroll" }))
      );

      // Check if this is a payout record or a payroll record
      const payoutRecord = payouts.find((p: any) => p._id === payoutId);

      if (!payoutRecord) {
        throw new Error("Payout record not found");
      }

      console.log("Payout record found:", payoutRecord);

      // Since we're using /payroll endpoint, all records are payroll records
      // Always use the payroll endpoint
      const endpoint = `${process.env.NEXT_PUBLIC_API_URL}/payroll/${payoutId}/pay`;

      const body = {
        paymentMethod: "bank_transfer",
        transactionId: `TXN${Date.now()}`,
      };

      console.log("Using endpoint:", endpoint, "with body:", body);

      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      console.log("Response:", data);

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to update payout status");
      }

      showToast.dismiss(loadingToast);
      showToast.success("Payout marked as paid!");
      fetchPayouts();
    } catch (error: any) {
      console.error("Error marking as paid:", error);
      showToast.dismiss(loadingToast);
      showToast.error(error.message || "Operation failed");
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/projects`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      const data = await response.json();
      if (data.success) {
        setProjects(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    }
  };

  const fetchUserProjects = async () => {
    try {
      // Use team member finance API for team members and managers, regular API for founders
      if (isMember || isManager) {
        const response = await teamMemberFinanceAPI.getMyProjects();
        if (response.data.success) {
          setUserProjects(response.data.data);
        }
      } else {
        const response = await projectAPI.getAll();
        if (response.data.success) {
          setUserProjects(response.data.data);
        }
      }
    } catch (error) {
      console.error("Error fetching user projects:", error);
    }
  };

  const fetchIncomeHistory = async () => {
    try {
      const params: any = {};
      if (selectedProject) {
        params.projectId = selectedProject;
      }
      const response = await teamMemberFinanceAPI.getMyIncomeHistory(params);
      if (response.data.success) {
        setIncomeHistory(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching income history:", error);
    }
  };

  const fetchExpenseHistory = async () => {
    try {
      const params: any = {};
      if (selectedProject) {
        params.projectId = selectedProject;
      }
      const response = await teamMemberFinanceAPI.getMyExpenseHistory(params);
      if (response.data.success) {
        setExpenseHistory(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching expense history:", error);
    }
  };

  const fetchProjectMembers = async (projectId: string) => {
    if (!projectId) {
      setProjectMembers([]);
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      const data = await response.json();
      if (data.success && data.data) {
        // Get the project members (exclude founder)
        const members = data.data.projectMembers || [];
        // Store member data with populated info
        const membersWithDetails = await Promise.all(
          members.map(async (memberId: any) => {
            try {
              const memberResponse = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/users/${memberId}`,
                {
                  headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                  },
                }
              );
              const memberData = await memberResponse.json();
              return memberData.success ? memberData.data : memberId;
            } catch {
              return memberId;
            }
          })
        );
        setProjectMembers(membersWithDetails);
      }
    } catch (error) {
      console.error("Error fetching project members:", error);
      setProjectMembers([]);
    }
  };

  // Form submission handlers

  const handleIncomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !incomeFormData.amount ||
      !incomeFormData.source ||
      !incomeFormData.sourceType ||
      !incomeFormData.projectId
    ) {
      showToast.error("Please fill in all required fields");
      return;
    }

    const loadingToast = showToast.loading("Adding income entry...");

    try {
      // Use team member finance API for team members and managers, regular API for founders
      if (isMember || isManager) {
        await teamMemberFinanceAPI.addProjectIncome(incomeFormData);
      } else {
        await incomeAPI.create(incomeFormData);
      }

      showToast.success("Income entry added successfully!");
      setShowIncomeModal(false);
      setIncomeFormData({
        amount: "",
        source: "",
        sourceType: "Product Sales",
        description: "",
        projectId: "",
        date: getCurrentDate(),
      });

      // Add small delay to ensure backend processing is complete
      setTimeout(() => {
        fetchPayouts(); // Refresh data
        if (isMember || isManager) {
          fetchIncomeHistory();
          fetchExpenseHistory();
        }
        if (isFounder || isManager) {
          fetchAnalytics();
          fetchFinancialSummary();
        }
      }, 1000);
    } catch (error: any) {
      showToast.error(
        error.response?.data?.message || "Failed to add income entry"
      );
    } finally {
      showToast.dismiss(loadingToast);
    }
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !expenseFormData.amount ||
      !expenseFormData.category ||
      !expenseFormData.projectId
    ) {
      showToast.error("Please fill in all required fields");
      return;
    }

    const loadingToast = showToast.loading("Adding expense entry...");

    try {
      // Use team member finance API for team members and managers, regular API for founders
      if (isMember || isManager) {
        await teamMemberFinanceAPI.addProjectExpense(expenseFormData);
      } else {
        await expenseAPI.create(expenseFormData);
      }

      showToast.success("Expense entry added successfully!");
      setShowExpenseModal(false);
      setExpenseFormData({
        amount: "",
        category: "Other",
        description: "",
        projectId: "",
        date: getCurrentDate(),
      });

      // Add small delay to ensure backend processing is complete
      setTimeout(() => {
        fetchPayouts(); // Refresh data
        if (isMember || isManager) {
          fetchIncomeHistory();
          fetchExpenseHistory();
        }
        if (isFounder || isManager) {
          fetchAnalytics();
          fetchFinancialSummary();
        }
      }, 1000);
    } catch (error: any) {
      showToast.error(
        error.response?.data?.message || "Failed to add expense entry"
      );
    } finally {
      showToast.dismiss(loadingToast);
    }
  };

  const totalBaseSalary = payouts.reduce(
    (sum, p: any) => sum + (p.baseSalary || p.salaryAmount || 0),
    0
  );
  const totalShares = payouts.reduce(
    (sum, p: any) => sum + (p.totalShares || p.profitShare || 0),
    0
  );
  const totalPayout = payouts.reduce(
    (sum, p: any) => sum + (p.netAmount || 0),
    0
  );
  const totalBonuses = payouts.reduce(
    (sum, p: any) => sum + (p.bonuses || 0),
    0
  );
  const totalDeductions = payouts.reduce(
    (sum, p: any) => sum + (p.deductions || 0),
    0
  );

  // Role-based access control
  const canComputeProfitSharing = isFounder || isManager;
  const canMarkAsPaid = isFounder || isManager;

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

      <div className="flex-1 overflow-auto pt-16 md:pt-0">
        <Header title="Payroll" />

        <div className="p-4 md:p-8 pb-20 md:pb-8">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
                {isMember ? "My Payouts" : "Payroll Management"}
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                {isMember
                  ? "View your profit shares and payout status"
                  : "Process monthly payroll and manage payouts"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {canComputeProfitSharing && (
                <Button
                  variant="primary"
                  onClick={() => handleComputeProfitSharing(selectedProject || undefined)}
                  className="flex-1 sm:flex-none"
                >
                  <FiRefreshCw className="mr-2" />
                  Compute Profit Sharing
                </Button>
              )}
              {(isMember || isManager) && (
                <>
                  <Button
                    variant="success"
                    onClick={() => setShowIncomeModal(true)}
                    className="flex-1 sm:flex-none"
                  >
                    <FiPlus className="mr-2" />
                    Add Income
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => setShowExpenseModal(true)}
                    className="flex-1 sm:flex-none"
                  >
                    <FiMinus className="mr-2" />
                    Add Expense
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowHistorySection(!showHistorySection)}
                    className="flex-1 sm:flex-none"
                  >
                    <FiFileText className="mr-2" />
                    {showHistorySection ? "Hide" : "My"} Income History
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6 flex flex-wrap gap-4 rounded-lg bg-white p-4 shadow">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Month
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="rounded-lg border border-gray-300 px-3 py-2"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                  <option key={month} value={month}>
                    {new Date(2025, month - 1).toLocaleString("default", {
                      month: "long",
                    })}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Year
              </label>
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
            {!isMember && (
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Project
                </label>
                <select
                  value={selectedProject}
                  onChange={(e) => {
                    setSelectedProject(e.target.value);
                    if (isMember || isManager) {
                      fetchIncomeHistory();
                      fetchExpenseHistory();
                    }
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                >
                  <option value="">All Projects</option>
                  {projects.map((project: any) => (
                    <option key={project._id} value={project._id}>
                      {project.title} ({project.category || "N/A"})
                    </option>
                  ))}
                </select>
              </div>
            )}
            {(isMember || isManager) && (
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Filter by Project
                </label>
                <select
                  value={selectedProject}
                  onChange={(e) => {
                    setSelectedProject(e.target.value);
                    fetchIncomeHistory();
                    fetchExpenseHistory();
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                >
                  <option value="">All Projects</option>
                  {userProjects.map((project: any) => (
                    <option key={project._id} value={project._id}>
                      {project.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* My Income History Section */}
          {showHistorySection && (isMember || isManager) && (
            <div className="mb-6 rounded-lg bg-white p-6 shadow">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                  <FiFileText className="mr-2" />
                  My Income & Expense History
                </h3>
                <div className="flex gap-2">
                  <span className="text-sm text-gray-600">
                    Total Income: <span className="font-bold text-green-600">₹{incomeHistory.reduce((sum: number, item: any) => sum + (item.amount || 0), 0).toLocaleString()}</span>
                  </span>
                  <span className="text-sm text-gray-600">
                    Total Expenses: <span className="font-bold text-red-600">₹{expenseHistory.reduce((sum: number, item: any) => sum + (item.amount || 0), 0).toLocaleString()}</span>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Income History */}
                <div>
                  <h4 className="mb-3 text-md font-semibold text-green-700 flex items-center">
                    <FiTrendingUp className="mr-2" />
                    Income History ({incomeHistory.length})
                  </h4>
                  <div className="max-h-96 space-y-2 overflow-y-auto">
                    {incomeHistory.length > 0 ? (
                      incomeHistory.map((income: any) => (
                        <div
                          key={income._id}
                          className="rounded-lg border border-green-200 bg-green-50 p-3"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">
                                {income.source || income.sourceType || "Income"}
                              </p>
                              <p className="text-sm text-gray-600">
                                {income.sourceRefId?.title || "No Project"}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatDDMMYY(income.date)}
                              </p>
                              {income.description && (
                                <p className="mt-1 text-xs text-gray-600">
                                  {income.description}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-green-600">
                                ₹{income.amount.toLocaleString()}
                              </p>
                              <p className="text-xs text-gray-500">
                                {income.sourceType}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <FiDollarSign className="mx-auto mb-2 h-8 w-8" />
                        <p>No income records found</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Expense History */}
                <div>
                  <h4 className="mb-3 text-md font-semibold text-red-700 flex items-center">
                    <FiTrendingDown className="mr-2" />
                    Expense History ({expenseHistory.length})
                  </h4>
                  <div className="max-h-96 space-y-2 overflow-y-auto">
                    {expenseHistory.length > 0 ? (
                      expenseHistory.map((expense: any) => (
                        <div
                          key={expense._id}
                          className="rounded-lg border border-red-200 bg-red-50 p-3"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">
                                {expense.category}
                              </p>
                              <p className="text-sm text-gray-600">
                                {expense.projectId?.title || "No Project"}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatDDMMYY(expense.date)}
                              </p>
                              {expense.description && (
                                <p className="mt-1 text-xs text-gray-600">
                                  {expense.description}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-red-600">
                                ₹{expense.amount.toLocaleString()}
                              </p>
                              <p className="text-xs text-gray-500">
                                {expense.status || "approved"}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <FiCreditCard className="mx-auto mb-2 h-8 w-8" />
                        <p>No expense records found</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Financial Summary Brief */}
          {financialSummary && (isFounder || isManager) && (
            <div className="mb-6 rounded-lg bg-gradient-to-r from-green-500 to-blue-500 text-white p-6 shadow-lg">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <FiTrendingUp className="mr-2" />
                Financial Overview -{" "}
                {new Date(selectedYear, selectedMonth - 1).toLocaleString(
                  "default",
                  { month: "long", year: "numeric" }
                )}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white bg-opacity-20 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm font-medium">
                        Total Income
                      </p>
                      <p className="text-2xl font-bold text-white">
                        ₹{financialSummary.totalIncome?.toLocaleString() || "0"}
                      </p>
                    </div>
                    <FiDollarSign className="h-8 w-8 text-green-200" />
                  </div>
                  {financialSummary.projectBreakdown &&
                    Object.keys(financialSummary.projectBreakdown).length >
                      0 && (
                      <div className="mt-2 text-xs text-green-100">
                        {Object.entries(financialSummary.projectBreakdown).map(
                          ([project, income]: [string, any]) => (
                            <div key={project} className="flex justify-between">
                              <span>{project}:</span>
                              <span>₹{income.toLocaleString()}</span>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  {financialSummary.projectBreakdown &&
                    Object.keys(financialSummary.projectBreakdown).length ===
                      0 && (
                      <div className="mt-2 text-xs text-green-100">
                        No project-linked income
                      </div>
                    )}
                </div>

                <div className="bg-white bg-opacity-20 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-red-100 text-sm font-medium">
                        Total Expenses
                      </p>
                      <p className="text-2xl font-bold text-white">
                        ₹
                        {financialSummary.totalExpenses?.toLocaleString() ||
                          "0"}
                      </p>
                    </div>
                    <FiDollarSign className="h-8 w-8 text-red-200" />
                  </div>
                  {financialSummary.expenseBreakdown &&
                    Object.keys(financialSummary.expenseBreakdown).length >
                      0 && (
                      <div className="mt-2 text-xs text-red-100">
                        {Object.entries(financialSummary.expenseBreakdown).map(
                          ([category, amount]: [string, any]) => (
                            <div
                              key={category}
                              className="flex justify-between"
                            >
                              <span>{category}:</span>
                              <span>₹{amount.toLocaleString()}</span>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  {financialSummary.expenseBreakdown &&
                    Object.keys(financialSummary.expenseBreakdown).length ===
                      0 && (
                      <div className="mt-2 text-xs text-red-100">
                        No expenses
                      </div>
                    )}
                </div>

                <div className="bg-white bg-opacity-20 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm font-medium">
                        Net Profit
                      </p>
                      <p
                        className={`text-2xl font-bold ${
                          (financialSummary.netProfit || 0) >= 0
                            ? "text-green-200"
                            : "text-red-200"
                        }`}
                      >
                        ₹{financialSummary.netProfit?.toLocaleString() || "0"}
                      </p>
                    </div>
                    <FiTrendingUp className="h-8 w-8 text-blue-200" />
                  </div>
                  <div className="mt-2 text-xs text-blue-100">
                    <div className="flex justify-between">
                      <span>Profit Margin:</span>
                      <span>
                        {financialSummary.profitMargin
                          ? `${financialSummary.profitMargin.toFixed(1)}%`
                          : "0%"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {financialSummary.topProjects &&
                financialSummary.topProjects.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-white border-opacity-20">
                    <p className="text-sm text-white font-medium mb-2">
                      Top Performing Projects:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {financialSummary.topProjects
                        .slice(0, 3)
                        .map((project: any, index: number) => (
                          <span
                            key={project._id}
                            className="bg-white bg-opacity-20 px-3 py-1 rounded-full text-xs"
                          >
                            {index + 1}. {project.title} - ₹
                            {project.profit?.toLocaleString() || "0"}
                          </span>
                        ))}
                    </div>
                  </div>
                )}
            </div>
          )}

          {/* Summary Cards */}
          <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-4">
            <div className="rounded-lg bg-white p-6 shadow">
              <p className="text-sm font-medium text-gray-600">Income</p>
              <p className="mt-2 text-2xl font-bold text-green-600">
                ₹
                {isMember
                  ? payouts
                      .filter(
                        (p: any) =>
                          p.userId?.email !== "founder@connectshiksha.com"
                      )
                      .reduce(
                        (sum: number, p: any) => sum + getProjectIncome(p),
                        0
                      )
                      .toLocaleString()
                  : financialSummary?.totalIncome?.toLocaleString() || "0"}
              </p>
            </div>
            <div className="rounded-lg bg-white p-6 shadow">
              <p className="text-sm font-medium text-gray-600">Budget</p>
              <p className="mt-2 text-2xl font-bold text-blue-600">
                ₹
                {isMember
                  ? payouts
                      .filter(
                        (p: any) =>
                          p.userId?.email !== "founder@connectshiksha.com"
                      )
                      .reduce(
                        (sum: number, p: any) => sum + getProjectBudget(p),
                        0
                      )
                      .toLocaleString()
                  : financialSummary?.totalBudget?.toLocaleString() || "0"}
              </p>
            </div>
            <div className="rounded-lg bg-white p-6 shadow">
              <p className="text-sm font-medium text-gray-600">Expenses</p>
              <p className="mt-2 text-2xl font-bold text-red-600">
                ₹
                {isMember
                  ? payouts
                      .filter(
                        (p: any) =>
                          p.userId?.email !== "founder@connectshiksha.com"
                      )
                      .reduce(
                        (sum: number, p: any) => sum + getProjectExpenses(p),
                        0
                      )
                      .toLocaleString()
                  : financialSummary?.totalExpenses?.toLocaleString() || "0"}
              </p>
            </div>
            <div className="rounded-lg bg-white p-6 shadow">
              <p className="text-sm font-medium text-gray-600">Net Profit</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                ₹
                {isMember
                  ? payouts
                      .filter(
                        (p: any) =>
                          p.userId?.email !== "founder@connectshiksha.com"
                      )
                      .reduce(
                        (sum: number, p: any) => sum + getProjectProfit(p),
                        0
                      )
                      .toLocaleString()
                  : financialSummary?.netProfit?.toLocaleString() || "0"}
              </p>
            </div>
          </div>

          {/* Analytics for Founders */}
          {isFounder && (
            <div className="mb-6 rounded-lg bg-white p-6 shadow">
              <h3 className="mb-4 text-lg font-semibold text-gray-800 flex items-center">
                <FiTrendingUp className="mr-2" />
                Profit Sharing Analytics
              </h3>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-6">
                {(() => {
                  // Use financial summary if available (more accurate), otherwise calculate from payouts
                  let totalProfit = 0;

                  if (financialSummary?.netProfit !== undefined) {
                    totalProfit = financialSummary.netProfit;
                  } else {
                    // Fallback: Calculate total profit by summing unique projects
                    const projectsMap = new Map();
                    payouts.forEach((p: any) => {
                      if (p.projectId?._id || p.projectId) {
                        const projectId = p.projectId._id || p.projectId;
                        const profit =
                          (p.projectIncome || 0) - (p.projectExpenses || 0);
                        if (!projectsMap.has(projectId)) {
                          projectsMap.set(projectId, profit);
                        }
                      }
                    });
                    totalProfit = Array.from(projectsMap.values()).reduce(
                      (sum, profit) => sum + profit,
                      0
                    );
                  }

                  // Founder share is 70% of total profit
                  const founderShare = Math.round(totalProfit * 0.7);

                  // Team share is 30% of total profit
                  const teamShare = Math.round(totalProfit * 0.3);

                  return (
                    <>
                      {!isMember && (
                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                          <p className="text-sm text-purple-600 font-medium">
                            Connect Shiksha Shares
                          </p>
                          <p className="text-2xl font-bold text-purple-700">
                            ₹{founderShare.toLocaleString()}
                          </p>
                          <p className="text-xs text-purple-500">
                            70% of total profits
                          </p>
                        </div>
                      )}

                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-600 font-medium">
                          {isMember ? "My Shares" : "Team Shares"}
                        </p>
                        <p className="text-2xl font-bold text-blue-700">
                          ₹{teamShare.toLocaleString()}
                        </p>
                        <p className="text-xs text-blue-500">
                          30% of total profits
                        </p>
                      </div>

                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <p className="text-sm text-green-600 font-medium">
                          Total Profit
                        </p>
                        <p className="text-2xl font-bold text-green-700">
                          ₹{totalProfit.toLocaleString()}
                        </p>
                        <p className="text-xs text-green-500">
                          {(() => {
                            // Count actual payroll records (not filtered by profit)
                            const allPayrollRecords = payouts.filter(
                              (p: any) => p.userId
                            ).length;
                            if (allPayrollRecords > 0) {
                              return `${allPayrollRecords} payroll record${
                                allPayrollRecords > 1 ? "s" : ""
                              }`;
                            } else if (totalProfit > 0) {
                              return "Profit calculated, create records";
                            } else {
                              return "No profit to distribute";
                            }
                          })()}
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>

              {payouts.length > 0 && (
                <div>
                  <h4 className="mb-2 text-sm font-medium text-gray-700">
                    Project-wise Distribution
                  </h4>
                  <div className="space-y-2">
                    {Array.from(
                      new Set(
                        payouts
                          .map((p: any) => p.projectId?.title)
                          .filter(Boolean)
                      )
                    ).map((projectTitle: string) => {
                      const projectPayouts = payouts.filter(
                        (p: any) => p.projectId?.title === projectTitle
                      );
                      // Use the first payout record's project financial data (should be the same for all records of same project)
                      const firstPayout: any = projectPayouts[0];
                      if (!firstPayout) return null;
                      // Calculate actual project profit (income - expenses) from stored data
                      const projectIncome = firstPayout.projectIncome || 0;
                      const projectExpenses = firstPayout.projectExpenses || 0;
                      const totalProjectProfit = Math.round(
                        projectIncome - projectExpenses
                      );
                      // Calculate founder share (70% of profit)
                      const founderProfit = Math.round(
                        totalProjectProfit * 0.7
                      );
                      const teamProfit = Math.round(totalProjectProfit * 0.3);

                      return (
                        <div
                          key={projectTitle}
                          className="p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-900">
                              {projectTitle}
                            </span>
                            <span className="text-sm font-bold text-gray-900">
                              ₹{totalProjectProfit.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs text-gray-600">
                            <span>
                              Founder: ₹{founderProfit.toLocaleString()}
                            </span>
                            <span>Team: ₹{teamProfit.toLocaleString()}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Payroll Summary */}
          {!isMember && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Connect Shiksha</h3>
                    <p className="text-purple-100 text-sm">
                      70% of all project profits
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold">
                      {(() => {
                        // Use financial summary if available, otherwise calculate from payouts
                        const totalProfit =
                          financialSummary?.netProfit !== undefined
                            ? financialSummary.netProfit
                            : (() => {
                                const projectsMap = new Map();
                                payouts.forEach((p: any) => {
                                  if (p.projectId?._id || p.projectId) {
                                    const projectId =
                                      p.projectId._id || p.projectId;
                                    const profit = getProjectProfit(p);
                                    if (!projectsMap.has(projectId)) {
                                      projectsMap.set(projectId, profit);
                                    }
                                  }
                                });
                                return Array.from(projectsMap.values()).reduce(
                                  (sum, profit) => sum + profit,
                                  0
                                );
                              })();
                        const founderShare = Math.round(totalProfit * 0.7);
                        return `₹${founderShare.toLocaleString()}`;
                      })()}
                    </div>
                    <div className="text-purple-100 text-sm">
                      Total Connect Shiksha Shares
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {isMember ? "My Shares" : "Team Members"}
                    </h3>
                    <p className="text-blue-100 text-sm">30% team pool (custom % × working days)</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold">
                      {(() => {
                        // Use financial summary if available, otherwise calculate from payouts
                        const totalProfit =
                          financialSummary?.netProfit !== undefined
                            ? financialSummary.netProfit
                            : (() => {
                                const projectsMap = new Map();
                                payouts.forEach((p: any) => {
                                  if (p.projectId?._id || p.projectId) {
                                    const projectId =
                                      p.projectId._id || p.projectId;
                                    const profit = getProjectProfit(p);
                                    if (!projectsMap.has(projectId)) {
                                      projectsMap.set(projectId, profit);
                                    }
                                  }
                                });
                                return Array.from(projectsMap.values()).reduce(
                                  (sum, profit) => sum + profit,
                                  0
                                );
                              })();
                        const teamShare = Math.round(totalProfit * 0.3);
                        return `₹${teamShare.toLocaleString()}`;
                      })()}
                    </div>
                    <div className="text-blue-100 text-sm">
                      {isMember ? "Total My Shares" : "Total Team Shares"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Payroll Records - Split Layout */}
          <div
            className={`grid grid-cols-1 ${
              isMember ? "" : "lg:grid-cols-2"
            } gap-6`}
          >
            {/* Founder's Shares - Hidden for team members */}
            {!isMember && (
              <div className="rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 shadow-lg border border-purple-200">
                <div className="bg-purple-600 text-white p-4 rounded-t-lg">
                  <h3 className="text-lg font-semibold flex items-center">
                    <FiUsers className="mr-2" />
                    Connect Shiksha Shares
                  </h3>
                  <p className="text-purple-100 text-sm mt-1">
                    70% of all project profits
                  </p>
                </div>

                <div className="p-4">
                  {payouts
                    .filter((payout: any) => {
                      const isFounder =
                        payout.userId?.email === "founder@connectshiksha.com";
                      const hasProfit = getProjectProfit(payout) > 0;
                      return isFounder && hasProfit;
                    })
                    .map((payout: any) => (
                      <div
                        key={payout._id}
                        className="bg-white rounded-lg p-4 mb-4 shadow-sm border border-purple-200"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              {payout.projectId?.title || "N/A"}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {payout.teamId?.name || ""}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-purple-600">
                              ₹
                              {Math.round(
                                payout.profitShare || 0
                              ).toLocaleString()}
                            </div>
                            <div className="text-sm text-gray-500">
                              70% Founder Share
                            </div>
                          </div>
                        </div>

                        <div className="mb-2 text-xs text-gray-600 space-y-1">
                          {payout.projectStartDate && (
                            <div>
                              <span className="font-medium">Project Started:</span>{" "}
                              {formatDDMMYY(payout.projectStartDate)}
                            </div>
                          )}
                          {payout.workDurationDays > 0 && (
                            <div>
                              <span className="font-medium">Duration:</span>{" "}
                              <span className="text-purple-600 font-semibold">
                                {payout.workDurationDays} days
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex justify-between items-center text-sm">
                          <div className="flex flex-wrap gap-2">
                            <span className="text-green-600 text-xs">
                              Income: ₹
                              {getProjectIncome(payout).toLocaleString()}
                            </span>
                            <span className="text-blue-600 text-xs">
                              Budget: ₹
                              {getProjectBudget(payout).toLocaleString()}
                            </span>
                            <span className="text-red-600 text-xs">
                              Expenses: ₹
                              {getProjectExpenses(payout).toLocaleString()}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-semibold text-green-600">
                              ₹{(payout.netAmount || 0).toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-500">
                              Net Amount
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 flex justify-between items-center">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              payout.status === "paid"
                                ? "bg-green-100 text-green-800"
                                : payout.status === "processing"
                                ? "bg-yellow-100 text-yellow-800"
                                : payout.status === "cancelled"
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {payout.status}
                          </span>

                          {canMarkAsPaid && payout.status === "pending" && (
                            <Button
                              size="sm"
                              variant="success"
                              onClick={() => handleMarkAsPaid(payout._id)}
                            >
                              <FiCheck className="mr-1" />
                              Mark as Paid
                            </Button>
                          )}
                        </div>

                        {payout.description && (
                          <div className="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded">
                            {payout.description}
                          </div>
                        )}
                      </div>
                    ))}

                  {(() => {
                    const founderPayouts = payouts.filter((payout: any) => {
                      const isFounder =
                        payout.userId?.email === "founder@connectshiksha.com";
                    const projectProfit = getProjectProfit(payout);
                    const hasProfit = projectProfit > 0;
                      return isFounder && hasProfit;
                    });

                    return (
                      founderPayouts.length === 0 && (
                        <div className="text-center py-8">
                          {financialSummary?.netProfit &&
                          financialSummary.netProfit > 0 ? (
                            <>
                              <div className="bg-white rounded-lg p-6 shadow-sm border border-purple-200">
                                <div className="flex justify-between items-center mb-4">
                                  <div>
                                    <h4 className="font-semibold text-gray-900">
                                      Calculated Share
                                    </h4>
                                    <p className="text-sm text-gray-600">
                                      Based on current financial data
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-2xl font-bold text-purple-600">
                                      ₹
                                      {Math.round(
                                        (financialSummary.netProfit || 0) * 0.7
                                      ).toLocaleString()}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      70% Founder Share
                                    </div>
                                  </div>
                                </div>
                                <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
                                  <p>
                                    <strong>Note:</strong> Click "Compute Profit
                                    Sharing" to create payroll records and mark
                                    as paid.
                                  </p>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="text-center py-8 text-gray-500">
                              <FiUsers className="mx-auto mb-2 h-8 w-8" />
                              <p>No Connect Shiksha Shares found</p>
                              <p className="text-xs mt-2">
                                Compute profit sharing to generate records
                              </p>
                            </div>
                          )}
                        </div>
                      )
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Team Members' Shares */}
            <div className="rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg border border-blue-200">
              <div className="bg-blue-600 text-white p-4 rounded-t-lg">
                <h3 className="text-lg font-semibold flex items-center">
                  <FiUsers className="mr-2" />
                  {isMember ? "My Shares" : "Team Members Shares"}
                </h3>
              </div>

              <div className="p-4 max-h-[1000px] overflow-y-auto">
                {(() => {
                  // Filter out payouts for projects with zero or negative profit
                  const teamPayouts = payouts.filter((payout: any) => {
                    const isNotFounder =
                      payout.userId?.email !== "founder@connectshiksha.com";
                    const projectProfit = getProjectProfit(payout);
                    const hasProfit =
                      projectProfit > 0 ||
                      (payout.profitShare || payout.netAmount || 0) > 0;
                    return isNotFounder && hasProfit;
                  });

                  // Group team payouts by project
                  const projectGroups = new Map();

                  teamPayouts.forEach((payout: any) => {
                    const projectId = payout.projectId?._id || payout.projectId;
                    const projectTitle =
                      payout.projectId?.title || "Unassigned";

                    if (!projectGroups.has(projectId)) {
                      projectGroups.set(projectId, {
                        projectTitle,
                        projectId,
                        payouts: [],
                      });
                    }

                    projectGroups.get(projectId).payouts.push(payout);
                  });

                  // Convert to array
                  const projectGroupsArray = Array.from(projectGroups.values());

                  return projectGroupsArray.map((group) => (
                    <div key={group.projectId} className="mb-6">
                      <div className="mb-3 border-b border-blue-200 pb-2">
                        <h4 className="font-semibold text-blue-700">
                          {group.projectTitle}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {group.payouts.length} team member
                          {group.payouts.length !== 1 ? "s" : ""}
                        </p>
                      </div>

                      {group.payouts.map((payout: any) => {
                        const projectProfit = getProjectProfit(payout);
                        const memberPercentage =
                          projectProfit > 0
                            ? (((payout.profitShare || 0) / projectProfit) * 100).toFixed(2)
                            : 0;
                        const displayProfit = Math.round(projectProfit);
                        const incomeValue = getProjectIncome(payout);
                        const expenseValue = getProjectExpenses(payout);
                        const effectiveEndDate = getEffectiveMemberEndDate(payout);
                        const displayWorkingDays = getDisplayWorkingDays(payout);

                        return (
                        <div
                          key={payout._id}
                          className={`bg-white rounded-lg p-4 mb-3 shadow-sm border ${!payout.memberIsActive ? 'border-gray-300 opacity-60' : 'border-blue-2 00'}`}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">
                                {payout.userId?.name}
                              </h4>
                              <p className="text-sm text-gray-600">
                                {payout.userId?.email}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="text-xl font-bold text-blue-600">
                                ₹
                                {Math.round(
                                  payout.profitShare || 0
                                ).toLocaleString()}
                              </div>
                              <div className="text-xs text-gray-500">
                                {memberPercentage}% of profit
                              </div>
                            </div>
                          </div>

                          {/* Member Timeline & Stats */}
                          <div className={`mb-3 p-2 rounded-lg ${!payout.memberIsActive ? 'bg-gray-100' : 'bg-blue-50'}`}>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              {payout.memberJoinedDate && (
                                <div>
                                  <span className="text-gray-600">Joined:</span>{" "}
                                  <span className="font-semibold text-gray-900">
                                    {formatDDMMYY(payout.memberJoinedDate)}
                                  </span>
                                </div>
                              )}
                              {payout.projectStartDate && (
                                <div>
                                  <span className="text-gray-600">Project Start:</span>{" "}
                                  <span className="font-semibold text-gray-900">
                                    {formatDDMMYY(payout.projectStartDate)}
                                  </span>
                                </div>
                              )}
                              {displayWorkingDays > 0 && (
                                <div>
                                  <span className="text-gray-600">Working Days:</span>{" "}
                                  <span className="font-semibold text-blue-600">
                                    {displayWorkingDays} days
                                  </span>
                                </div>
                              )}
                              <div>
                                <span className="text-gray-600">Share %:</span>{" "}
                                <span className="font-semibold text-purple-600">
                                  {memberPercentage}%
                                </span>
                              </div>
                            </div>
                            {payout.isProjectOwner && (
                              <div className="mt-2 text-xs text-purple-600 font-medium bg-purple-100 px-2 py-1 rounded">
                                👑 Project Manager (+3% bonus = ₹{Math.round(payout.ownerBonus || 0).toLocaleString()})
                              </div>
                            )}
                            {!payout.memberIsActive && (
                              <div className="mt-2 text-xs text-gray-600 font-medium bg-gray-200 px-2 py-1 rounded">
                                Inactive member
                              </div>
                            )}
                          </div>

                          {/* Financial Summary (Member's Period) */}
                          <div className="mb-3 p-2 bg-gray-50 rounded-lg">
                            <div className="text-xs font-medium text-gray-700 mb-2">
                              📊 Member's Period Financial Summary:
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div>
                                <div className="text-gray-600">Income</div>
                                <div className="font-semibold text-green-600">
                                  ₹{incomeValue.toLocaleString()}
                                </div>
                              </div>
                              <div>
                                <div className="text-gray-600">Expenses</div>
                                <div className="font-semibold text-red-600">
                                  ₹{expenseValue.toLocaleString()}
                                </div>
                              </div>
                              <div>
                                <div className="text-gray-600">Profit</div>
                                <div className="font-semibold text-blue-600">
                                  ₹{displayProfit.toLocaleString()}
                                </div>
                              </div>
                            </div>
                            <div className="mt-1 text-xs text-gray-500 italic">
                              * Calculated from {formatDDMMYY(payout.memberJoinedDate)} to {effectiveEndDate ? formatDDMMYY(effectiveEndDate) : "present"}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-wrap gap-2 mb-3">
                            <button
                              onClick={() => {
                                setSelectedPayoutForDetails(payout);
                                setShowDetailsModal(true);
                              }}
                              className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-3 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition"
                            >
                              <FiInfo className="text-sm" />
                              View Details
                            </button>
                            <button
                              onClick={() => {
                                const projectProfit = getProjectProfit(payout);
                                const incomeValue = getProjectIncome(payout);
                                const expenseValue = getProjectExpenses(payout);
                                const effectiveEnd = getEffectiveMemberEndDate(payout);
                                const displayEndDate = effectiveEnd ? formatDDMMYY(effectiveEnd) : 'present';
                                const displayWorkingDays = getDisplayWorkingDays(payout);
                                const memberPercentage =
                                  projectProfit > 0
                                    ? ((payout.profitShare || 0) / projectProfit * 100).toFixed(2)
                                    : 0;
                                const roundedProfit = Math.round(projectProfit);
                                
                                // Generate PDF
                                const printWindow = window.open('', '', 'height=600,width=800');
                                if (printWindow) {
                                  printWindow.document.write(`
                                    <html>
                                      <head>
                                        <title>Profit Share Report - ${payout.userId?.name}</title>
                                        <style>
                                          body { font-family: Arial, sans-serif; padding: 20px; }
                                          h1 { color: #333; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
                                          h2 { color: #555; margin-top: 20px; }
                                          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
                                          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
                                          th { background-color: #f3f4f6; font-weight: bold; }
                                          .highlight { background-color: #dbeafe; font-weight: bold; }
                                          .total { font-size: 18px; font-weight: bold; color: #3b82f6; }
                                          .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
                                        </style>
                                      </head>
                                      <body>
                                        <h1>Profit Share Report</h1>
                                        <h2>Member Information</h2>
                                        <table>
                                          <tr><th>Name</th><td>${payout.userId?.name || 'N/A'}</td></tr>
                                          <tr><th>Email</th><td>${payout.userId?.email || 'N/A'}</td></tr>
                                          <tr><th>Project</th><td>${payout.projectId?.title || 'N/A'}</td></tr>
                                          <tr><th>Month</th><td>${payout.month || 'N/A'}</td></tr>
                                          ${payout.isProjectOwner ? '<tr><th>Role</th><td>👑 Project Manager</td></tr>' : ''}
                                        </table>
                                        
                                        <h2>Timeline & Contribution</h2>
                                        <table>
                                          <tr><th>Project Started</th><td>${formatDDMMYY(payout.projectStartDate)}</td></tr>
                                          <tr><th>Member Joined</th><td>${formatDDMMYY(payout.memberJoinedDate)}</td></tr>
                                          <tr><th>Member Left</th><td>${displayEndDate}</td></tr>
                                          <tr><th>Working Days</th><td class="highlight">${displayWorkingDays} days</td></tr>
                                          <tr><th>Profit Share %</th><td class="highlight">${memberPercentage}%</td></tr>
                                        </table>
                                        
                                        <h2>Financial Summary (Member's Period)</h2>
                                        <table>
                                          <tr><th>Income (from join date)</th><td>₹${incomeValue.toLocaleString()}</td></tr>
                                          <tr><th>Expenses (from join date)</th><td>₹${expenseValue.toLocaleString()}</td></tr>
                                          <tr class="highlight"><th>Net Profit</th><td>₹${roundedProfit.toLocaleString()}</td></tr>
                                        </table>
                                        
                                        <h2>Profit Share Calculation</h2>
                                        <table>
                                          <tr><th>Base Share (${memberPercentage}% of ₹${roundedProfit.toLocaleString()})</th><td>₹${Math.round(payout.profitShare - (payout.ownerBonus || 0)).toLocaleString()}</td></tr>
                                          ${payout.isProjectOwner ? `<tr><th>Project Manager Bonus (3%)</th><td>₹${Math.round(payout.ownerBonus || 0).toLocaleString()}</td></tr>` : ''}
                                          <tr class="highlight total"><th>Total Profit Share</th><td>₹${Math.round(payout.profitShare || 0).toLocaleString()}</td></tr>
                                        </table>
                                        
                                        <div class="footer">
                                          <p><strong>Note:</strong> Income and expenses are calculated for the member's contribution window (${formatDDMMYY(payout.memberJoinedDate)} → ${displayEndDate}).</p>
                                          <p>Generated on: ${new Date().toLocaleString()}</p>
                                          <p>Status: ${payout.status || 'pending'}</p>
                                        </div>
                                      </body>
                                    </html>
                                  `);
                                  printWindow.document.close();
                                  setTimeout(() => {
                                    printWindow.print();
                                  }, 250);
                                }
                              }}
                              className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-3 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition"
                            >
                              <FiFileText className="text-sm" />
                              Download PDF
                            </button>
                          </div>

                          <div className="flex justify-between items-center text-sm">
                              <div className="text-lg font-semibold text-green-600">
                                ₹{(payout.netAmount || 0).toLocaleString()}
                              </div>
                              <div className="text-xs text-gray-500">
                                Net Amount
                              </div>
                            </div>

                          <div className="mt-3 flex justify-between items-center">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                payout.status === "paid"
                                  ? "bg-green-100 text-green-800"
                                  : payout.status === "processing"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : payout.status === "cancelled"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {payout.status}
                            </span>

                            {canMarkAsPaid && payout.status === "pending" && (
                              <Button
                                size="sm"
                                variant="success"
                                onClick={() => handleMarkAsPaid(payout._id)}
                              >
                                <FiCheck className="mr-1" />
                                Pay
                              </Button>
                            )}
                          </div>

                          {payout.description && (
                            <div className="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded">
                              {payout.description}
                            </div>
                          )}
                        </div>
                        );
                      })}
                    </div>
                  ));
                })()}

                {(() => {
                  const teamPayoutsFiltered = payouts.filter((payout: any) => {
                    const isNotFounder =
                      payout.userId?.email !== "founder@connectshiksha.com";
                    const projectProfit = getProjectProfit(payout);
                    const hasProfit =
                      projectProfit > 0 ||
                      (payout.profitShare || payout.netAmount || 0) > 0;
                    return isNotFounder && hasProfit;
                  });

                  return (
                    teamPayoutsFiltered.length === 0 && (
                      <div className="text-center py-8">
                        {financialSummary?.netProfit &&
                        financialSummary.netProfit > 0 ? (
                          <>
                            <div className="bg-white rounded-lg p-6 shadow-sm border border-blue-200">
                              <div className="flex justify-between items-center mb-4">
                                <div>
                                  <h4 className="font-semibold text-gray-900">
                                    Calculated Team Share (Total)
                                  </h4>
                                  <p className="text-sm text-gray-600">
                                    Based on current financial data
                                  </p>
                                </div>
                                <div className="text-right">
                                  <div className="text-2xl font-bold text-blue-600">
                                    ₹
                                    {Math.round(
                                      (financialSummary.netProfit || 0) * 0.3
                                    ).toLocaleString()}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    30% Team Share
                                  </div>
                                </div>
                              </div>

                              {/* Show eligible team members if project is selected */}
                              {selectedProject &&
                                projectMembers &&
                                projectMembers.length > 0 && (
                                  <div className="mt-4 mb-4">
                                    <p className="text-sm font-medium text-gray-700 mb-2">
                                      Eligible Team Members (
                                      {projectMembers.length}):
                                    </p>
                                    <div className="space-y-2">
                                      {projectMembers.map(
                                        (member: any, index: number) => {
                                          const individualShare =
                                            ((financialSummary?.netProfit ||
                                              0) *
                                              0.3) /
                                            projectMembers.length;
                                          return (
                                            <div
                                              key={index}
                                              className="flex justify-between items-center bg-blue-50 p-2 rounded border border-blue-100"
                                            >
                                              <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                                                  {member.name?.charAt(0) ||
                                                    "U"}
                                                </div>
                                                <div>
                                                  <p className="text-sm font-medium text-gray-900">
                                                    {member.name || "N/A"}
                                                  </p>
                                                  <p className="text-xs text-gray-500">
                                                    {member.email || ""}
                                                  </p>
                                                </div>
                                              </div>
                                              <div className="text-right">
                                                <p className="text-sm font-bold text-blue-600">
                                                  ₹
                                                  {Math.round(
                                                    individualShare
                                                  ).toLocaleString()}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                  Share per member
                                                </p>
                                              </div>
                                            </div>
                                          );
                                        }
                                      )}
                                    </div>
                                  </div>
                                )}

                              <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
                                <p>
                                  <strong>Note:</strong> Click "Compute Profit
                                  Sharing" to create payroll records for team
                                  members and mark as paid.
                                </p>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <FiUsers className="mx-auto mb-2 h-8 w-8" />
                            <p>No team member shares found</p>
                            <p className="text-xs mt-2">
                              {financialSummary?.netProfit === 0
                                ? "This project has no profit to distribute"
                                : "Compute profit sharing to generate records"}
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  );
                })()}
              </div>
            </div>
          </div>

          {payouts.length === 0 && !financialSummary?.netProfit && (
            <div className="p-12 text-center">
              <FiDollarSign className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <p className="text-lg font-medium text-gray-900">
                {isMember
                  ? "No payout data for this period"
                  : "No payroll data for this period"}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {isMember
                  ? "Your profit shares will appear here when projects generate income"
                  : "Payouts are automatically generated when income is recorded with profit-sharing"}
              </p>
              {canComputeProfitSharing && (
                <div className="mt-4">
                  <Button
                    variant="primary"
                    onClick={() => handleComputeProfitSharing(selectedProject || undefined)}
                  >
                    <FiRefreshCw className="mr-2" />
                    Compute Profit Sharing
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {payouts.length > 0 && (
          <div className="mt-6 rounded-lg bg-blue-50 p-4 text-sm text-blue-900">
            <strong>
              💡 {isMember ? "Payout Information:" : "Payroll Information:"}
            </strong>
            <ul className="mt-2 ml-4 list-disc space-y-1">
              <li>
                Net Amount = Base Salary + Profit Shares + Bonuses - Deductions
              </li>
              {isFounder ? (
                <>
                  <li>CS receives 70% of project profits</li>
                  <li>
                    Project Managers and Members share the remaining 30% equally
                  </li>
                </>
              ) : isManager ? (
                <>
                  <li>
                    You receive an equal share of 30% project profits (among
                    eligible team members)
                  </li>
                  <li>
                    Only team members assigned to projects are eligible for
                    profit sharing
                  </li>
                </>
              ) : (
                <>
                  <li>
                    You receive profit shares only if assigned to the project
                  </li>
                  <li>
                    Profit sharing is calculated automatically when project
                    income is recorded
                  </li>
                </>
              )}
              {!isMember && (
                <>
                  <li>
                    Mark payouts as "Paid" after bank transfer is completed
                  </li>
                  <li>Export to Excel or PDF for record-keeping</li>
                </>
              )}
            </ul>
          </div>
        )}

        {/* Add Income Modal */}
        <Modal
          isOpen={showIncomeModal}
          onClose={() => setShowIncomeModal(false)}
          title="Add Income Entry"
          size="md"
        >
          <form onSubmit={handleIncomeSubmit}>
            <div className="space-y-4">
              <FormInput
                label="Amount (₹)"
                type="number"
                required
                value={incomeFormData.amount}
                onChange={(e) =>
                  setIncomeFormData({
                    ...incomeFormData,
                    amount: e.target.value,
                  })
                }
                placeholder="Enter amount"
              />

              <FormInput
                label="Source"
                required
                value={incomeFormData.source}
                onChange={(e) =>
                  setIncomeFormData({
                    ...incomeFormData,
                    source: e.target.value,
                  })
                }
                placeholder="e.g., Client Payment, Product Sale"
              />

              <FormSelect
                label="Source Type"
                required
                value={incomeFormData.sourceType}
                onChange={(e) =>
                  setIncomeFormData({
                    ...incomeFormData,
                    sourceType: e.target.value,
                  })
                }
                options={[
                  { value: "Coaching", label: "Coaching" },
                  { value: "Paid Workshops", label: "Paid Workshops" },
                  { value: "Guest Lectures", label: "Guest Lectures" },
                  { value: "Product Sales", label: "Product Sales" },
                  { value: "Online Courses", label: "Online Courses" },
                  { value: "Other", label: "Other" },
                ]}
              />

              <FormSelect
                label="Project"
                required
                value={incomeFormData.projectId}
                onChange={(e) =>
                  setIncomeFormData({
                    ...incomeFormData,
                    projectId: e.target.value,
                  })
                }
                options={userProjects.map((project: any) => ({
                  value: project._id,
                  label: project.title,
                }))}
              />

              <FormInput
                label="Date"
                type="date"
                required
                value={incomeFormData.date}
                onChange={(e) =>
                  setIncomeFormData({ ...incomeFormData, date: e.target.value })
                }
              />

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  value={incomeFormData.description}
                  onChange={(e) =>
                    setIncomeFormData({
                      ...incomeFormData,
                      description: e.target.value,
                    })
                  }
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="Additional details about this income..."
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowIncomeModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Add Income</Button>
            </div>
          </form>
        </Modal>

        {/* Add Expense Modal */}
        <Modal
          isOpen={showExpenseModal}
          onClose={() => setShowExpenseModal(false)}
          title="Add Expense Entry"
          size="md"
        >
          <form onSubmit={handleExpenseSubmit}>
            <div className="space-y-4">
              <FormInput
                label="Amount (₹)"
                type="number"
                required
                value={expenseFormData.amount}
                onChange={(e) =>
                  setExpenseFormData({
                    ...expenseFormData,
                    amount: e.target.value,
                  })
                }
                placeholder="Enter amount"
              />

              <FormSelect
                label="Category"
                required
                value={expenseFormData.category}
                onChange={(e) =>
                  setExpenseFormData({
                    ...expenseFormData,
                    category: e.target.value,
                  })
                }
                options={[
                  { value: "Rent", label: "Rent" },
                  { value: "Utilities", label: "Utilities" },
                  { value: "Logistics", label: "Logistics" },
                  { value: "Salaries", label: "Salaries" },
                  { value: "Marketing", label: "Marketing" },
                  { value: "Manufacturing", label: "Manufacturing" },
                  { value: "Production", label: "Production" },
                  { value: "Travel", label: "Travel" },
                  { value: "Office Supplies", label: "Office Supplies" },
                  { value: "Other", label: "Other" },
                ]}
              />

              <FormSelect
                label="Project"
                required
                value={expenseFormData.projectId}
                onChange={(e) =>
                  setExpenseFormData({
                    ...expenseFormData,
                    projectId: e.target.value,
                  })
                }
                options={userProjects.map((project: any) => ({
                  value: project._id,
                  label: project.title,
                }))}
              />

              <FormInput
                label="Date"
                type="date"
                required
                value={expenseFormData.date}
                onChange={(e) =>
                  setExpenseFormData({
                    ...expenseFormData,
                    date: e.target.value,
                  })
                }
              />

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  value={expenseFormData.description}
                  onChange={(e) =>
                    setExpenseFormData({
                      ...expenseFormData,
                      description: e.target.value,
                    })
                  }
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="Additional details about this expense..."
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowExpenseModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Add Expense</Button>
            </div>
          </form>
        </Modal>

        {/* Detailed Calculation Modal */}
        {selectedPayoutForDetails && (
          <Modal
            isOpen={showDetailsModal}
            onClose={() => {
              setShowDetailsModal(false);
              setSelectedPayoutForDetails(null);
            }}
            title="Profit Share Calculation Details"
            size="lg"
          >
            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
              {(() => {
                const payout = selectedPayoutForDetails;
                const projectProfit = getProjectProfit(payout);
                const memberPercentage =
                  projectProfit > 0
                    ? ((payout.profitShare || 0) / projectProfit * 100).toFixed(2)
                    : 0;
                const incomeValue = getProjectIncome(payout);
                const expenseValue = getProjectExpenses(payout);
                const roundedProfit = Math.round(projectProfit);
                const effectiveEnd = getEffectiveMemberEndDate(payout);
                const displayWorkingDays = getDisplayWorkingDays(payout);

                return (
                  <>
                    {/* Member Info */}
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-lg text-blue-900 mb-2">
                        {payout.userId?.name}
                      </h3>
                      <p className="text-sm text-gray-600">{payout.userId?.email}</p>
                      <p className="text-sm text-gray-600">
                        Project: <span className="font-medium">{payout.projectId?.title}</span>
                      </p>
                      <p className="text-sm text-gray-600">
                        Period: <span className="font-medium">{payout.month}</span>
                      </p>
                      {payout.isProjectOwner && (
                        <div className="mt-2 inline-block bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-medium">
                          👑 Project Manager
                        </div>
                      )}
                    </div>

                    {/* Timeline */}
                    <div className="border rounded-lg p-4">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <span>📅</span> Timeline & Contribution
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Project Started:</span>
                          <span className="font-medium">
                            {formatDDMMYY(payout.projectStartDate)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Member Joined:</span>
                          <span className="font-medium text-blue-600">
                            {formatDDMMYY(payout.memberJoinedDate)}
                          </span>
                        </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">Member Left:</span>
                            <span className="font-medium text-red-600">
                              {effectiveEnd ? formatDDMMYY(effectiveEnd) : "present"}
                            </span>
                          </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Working Days:</span>
                          <span className="font-bold text-blue-600">
                            {displayWorkingDays} days
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Profit Share %:</span>
                          <span className="font-bold text-purple-600">
                            {memberPercentage}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Financial Summary */}
                    <div className="border rounded-lg p-4">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <span>💰</span> Financial Summary (Member&apos;s Period)
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-gray-600">Income (from join date):</span>
                          <span className="font-semibold text-green-600">
                            ₹{incomeValue.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-gray-600">Expenses (from join date):</span>
                          <span className="font-semibold text-red-600">
                            ₹{expenseValue.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 bg-blue-50 rounded px-2">
                          <span className="font-medium text-gray-800">Net Profit:</span>
                          <span className="font-bold text-blue-600 text-lg">
                            ₹{roundedProfit.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-gray-500 italic">
                        * Calculated from {formatDDMMYY(payout.memberJoinedDate)} to {effectiveEnd ? formatDDMMYY(effectiveEnd) : "present"}
                      </p>
                    </div>

                    {/* Calculation Breakdown */}
                    <div className="border rounded-lg p-4 bg-gradient-to-br from-purple-50 to-blue-50">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <span>🧮</span> Profit Share Calculation
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="bg-white rounded p-3 space-y-2">
                          <div className="font-medium text-gray-700">Step 1: Total Profit Distribution</div>
                          <div className="pl-4 space-y-1 text-xs">
                            <div>• Founder receives: <span className="font-semibold">70%</span> of profit</div>
                            <div>• Remaining pool: <span className="font-semibold">30%</span> of profit</div>
                            {payout.isProjectOwner && (
                              <div>• Project manager bonus: <span className="font-semibold">3%</span> of profit</div>
                            )}
                          </div>
                        </div>

                        <div className="bg-white rounded p-3 space-y-2">
                          <div className="font-medium text-gray-700">Step 2: Member&apos;s Share Calculation</div>
                          <div className="pl-4 space-y-1 text-xs">
                            <div>Member&apos;s profit: <span className="font-semibold">₹{roundedProfit.toLocaleString()}</span></div>
                            <div>Remaining pool (30%): <span className="font-semibold">₹{Math.round(projectProfit * 0.30).toLocaleString()}</span></div>
                            {payout.isProjectOwner ? (
                              <>
                                <div>Pool after manager bonus (27%): <span className="font-semibold">₹{Math.round(projectProfit * 0.27).toLocaleString()}</span></div>
                                <div>Base share ({memberPercentage}%): <span className="font-semibold">₹{Math.round(payout.profitShare - (payout.ownerBonus || 0)).toLocaleString()}</span></div>
                                <div>Project manager bonus (3%): <span className="font-semibold text-purple-600">₹{Math.round(payout.ownerBonus || 0).toLocaleString()}</span></div>
                              </>
                            ) : (
                              <div>Member&apos;s share ({memberPercentage}%): <span className="font-semibold">₹{Math.round(payout.profitShare || 0).toLocaleString()}</span></div>
                            )}
                          </div>
                        </div>

                        <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded p-4">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-lg">Total Profit Share:</span>
                            <span className="font-bold text-2xl">
                              ₹{Math.round(payout.profitShare || 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="text-xs mt-1 opacity-90">
                            {memberPercentage}% of ₹{roundedProfit.toLocaleString()} profit from member&apos;s period
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="border rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Payment Status:</span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          payout.status === 'paid' ? 'bg-green-100 text-green-700' :
                          payout.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {payout.status || 'pending'}
                        </span>
                      </div>
                    </div>

                    {/* Footer Note */}
                    <div className="bg-gray-50 p-3 rounded-lg text-xs text-gray-600">
                      <p className="font-medium mb-1">📝 Important Notes:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Income and expenses are calculated only from the member&apos;s join date onwards</li>
                        <li>This ensures fair profit distribution based on actual contribution period</li>
                        <li>Founder always receives 70% from total project profit</li>
                        {payout.isProjectOwner && <li>Project manager receives an additional 3% bonus for managing the project</li>}
                      </ul>
                    </div>
                  </>
                );
              })()}
            </div>
          </Modal>
        )}

        {/* Mobile Components */}
        <FABMenu />
        <MobileNavbar />
      </div>
    </div>
  );
}
