"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import FABMenu from "@/components/FABMenu";
import MobileNavbar from "@/components/MobileNavbar";
import Button from "@/components/Button";
import { attendanceAPI, projectAPI, teamMemberFinanceAPI } from "@/lib/api";
import { showToast } from "@/lib/toast";
import usePermissions from "@/hooks/usePermissions";
import {
  FiCalendar,
  FiClock,
  FiDollarSign,
  FiDownload,
  FiCheckCircle,
  FiAlertTriangle,
  FiMapPin,
  FiCheck,
  FiX,
  FiCheckSquare
} from "react-icons/fi";
import "mapbox-gl/dist/mapbox-gl.css";

const Map = dynamic(() => import("react-map-gl").then((mod) => mod.default), {
  ssr: false
});
const Marker = dynamic(
  () => import("react-map-gl").then((mod) => mod.Marker),
  {
    ssr: false
  }
);
const NavigationControl = dynamic(
  () => import("react-map-gl").then((mod) => mod.NavigationControl),
  {
    ssr: false
  }
);

interface AttendanceRecord {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    roleIds?: any[];
  };
  projectId: {
    _id: string;
    title: string;
    location?: {
      coordinates?: {
        lat: number;
        lng: number;
      };
    };
  };
  date: string;
  checkInTime: string;
  checkOutTime?: string;
  location?: {
    lat: number;
    lng: number;
    accuracyMeters?: number;
  };
  status: "PENDING_MANAGER" | "PENDING_ADMIN" | "APPROVED" | "REJECTED";
  remarks?: string;
  managerRemarks?: string;
  adminRemarks?: string;
}

interface PayrollRecord {
  userId: string;
  userName: string;
  userEmail: string;
  projectId: string;
  projectTitle: string;
  month: number;
  year: number;
  workingDays: number;
  expectedDays: number;
  dailyRate: number;
  payoutBeforeMultiplier: number;
  multiplier: number;
  payout: number;
}

const monthLabels = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

const getGeoLocation = () =>
  new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000
    });
  });

export default function AttendancePage() {
  const {
    loading: permissionsLoading,
    isMember,
    isManager,
    isFounder
  } = usePermissions();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [myAttendance, setMyAttendance] = useState<AttendanceRecord[]>([]);
  const [teamAttendance, setTeamAttendance] = useState<AttendanceRecord[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [totalPayout, setTotalPayout] = useState<number>(0);
  const [remarks, setRemarks] = useState("");
  const [qrCodeRef, setQrCodeRef] = useState("");

  const [loadingMyAttendance, setLoadingMyAttendance] = useState(false);
  const [loadingTeamAttendance, setLoadingTeamAttendance] = useState(false);
  const [loadingPayroll, setLoadingPayroll] = useState(false);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkOutLoading, setCheckOutLoading] = useState(false);

  const canManage = isManager || isFounder;
  const canAdmin = isFounder;

  const selectedPayrollRecord = useMemo(() => {
    if (!myAttendance.length || !payrollRecords.length) return null;
    const userId = myAttendance[0]?.userId?._id || null;
    if (!userId) return null;
    return payrollRecords.find((record) => record.userId === userId) || null;
  }, [myAttendance, payrollRecords]);

  const fetchProjects = useCallback(async () => {
    try {
      if (isMember && !isManager && !isFounder) {
        const response = await teamMemberFinanceAPI.getMyProjects();
        if (response.data.success) {
          setProjects(response.data.data);
          if (!selectedProjectId && response.data.data.length > 0) {
            setSelectedProjectId(response.data.data[0]._id);
          }
        }
      } else {
        const response = await projectAPI.getAll();
        if (response.data.success) {
          setProjects(response.data.data);
          if (!selectedProjectId && response.data.data.length > 0) {
            setSelectedProjectId(response.data.data[0]._id);
          }
        }
      }
    } catch (error: any) {
      console.error("Failed to fetch projects", error);
      showToast.error(
        error.response?.data?.message || "Failed to load projects"
      );
    }
  }, [isMember, isManager, isFounder, selectedProjectId]);

  const fetchMyAttendance = useCallback(async () => {
    if (permissionsLoading || !selectedProjectId) return;
    setLoadingMyAttendance(true);
    try {
      const response = await attendanceAPI.getMy({
        month: selectedMonth,
        year: selectedYear,
        projectId: selectedProjectId
      });
      if (response.data.success) {
        setMyAttendance(response.data.data);
      }
    } catch (error: any) {
      console.error("Failed to fetch attendance", error);
      showToast.error(
        error.response?.data?.message || "Failed to load attendance records"
      );
    } finally {
      setLoadingMyAttendance(false);
    }
  }, [permissionsLoading, selectedMonth, selectedYear, selectedProjectId]);

  const fetchTeamAttendance = useCallback(async () => {
    if (!canManage) return;
    setLoadingTeamAttendance(true);
    try {
      const response = await attendanceAPI.getTeam({
        month: selectedMonth,
        year: selectedYear
      });
      if (response.data.success) {
        setTeamAttendance(response.data.data);
      }
    } catch (error: any) {
      console.error("Failed to fetch team attendance", error);
      showToast.error(
        error.response?.data?.message || "Failed to load team attendance"
      );
    } finally {
      setLoadingTeamAttendance(false);
    }
  }, [canManage, selectedMonth, selectedYear]);

  const fetchPayroll = useCallback(async () => {
    if (!canManage) return;
    setLoadingPayroll(true);
    try {
      const response = await attendanceAPI.getPayrollSummary({
        month: selectedMonth,
        year: selectedYear
      });
      if (response.data.success) {
        setPayrollRecords(response.data.data.records || []);
        setTotalPayout(response.data.data.totalPayout || 0);
      }
    } catch (error: any) {
      console.error("Failed to fetch payroll summary", error);
      showToast.error(
        error.response?.data?.message || "Failed to load payroll summary"
      );
    } finally {
      setLoadingPayroll(false);
    }
  }, [canManage, selectedMonth, selectedYear]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    fetchMyAttendance();
    if (canManage) {
      fetchTeamAttendance();
      fetchPayroll();
    }
  }, [
    fetchMyAttendance,
    fetchTeamAttendance,
    fetchPayroll,
    canManage,
    selectedMonth,
    selectedYear
  ]);

  const handleAttendanceSubmit = async (type: "checkIn" | "checkOut") => {
    if (!selectedProjectId) {
      showToast.error("Please select a project first.");
      return;
    }

    const setLoading =
      type === "checkIn" ? setCheckInLoading : setCheckOutLoading;

    setLoading(true);
    try {
      const position = await getGeoLocation();
      const nowIso = new Date().toISOString();
      const payload: any = {
        projectId: selectedProjectId,
        location: {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracyMeters: position.coords.accuracy
        },
        qrCodeRef: qrCodeRef || undefined,
        remarks: remarks || undefined
      };

      if (type === "checkIn") {
        payload.checkInTime = nowIso;
      } else {
        payload.checkOutTime = nowIso;
      }

      await attendanceAPI.mark(payload);
      showToast.success(
        type === "checkIn"
          ? "Attendance recorded. Awaiting manager approval."
          : "Check-out recorded successfully."
      );
      setRemarks("");
      setQrCodeRef("");
      fetchMyAttendance();
      if (canManage) {
        fetchTeamAttendance();
        fetchPayroll();
      }
    } catch (error: any) {
      console.error("Attendance action failed", error);
      if (error.code === error.PERMISSION_DENIED) {
        showToast.error("Location permission denied. Please enable GPS.");
      } else {
        showToast.error(
          error.response?.data?.message ||
            "Unable to record attendance. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleManagerDecision = async (
    recordId: string,
    approve: boolean
  ) => {
    const note = window.prompt(
      `Add ${
        approve ? "approval" : "rejection"
      } remarks (optional):`.trim()
    )?.trim();
    try {
      await attendanceAPI.managerDecision(recordId, {
        approve,
        remarks: note || undefined
      });
      showToast.success(`Attendance ${approve ? "approved" : "rejected"}.`);
      fetchTeamAttendance();
      fetchPayroll();
    } catch (error: any) {
      console.error("Manager decision failed", error);
      showToast.error(
        error.response?.data?.message || "Unable to update attendance."
      );
    }
  };

  const handleAdminDecision = async (recordId: string, approve: boolean) => {
    const note = window.prompt(
      `Add ${
        approve ? "approval" : "rejection"
      } remarks (optional):`.trim()
    )?.trim();
    try {
      await attendanceAPI.adminDecision(recordId, {
        approve,
        remarks: note || undefined
      });
      showToast.success(`Attendance ${approve ? "approved" : "rejected"}.`);
      fetchTeamAttendance();
      fetchPayroll();
    } catch (error: any) {
      console.error("Admin decision failed", error);
      showToast.error(
        error.response?.data?.message || "Unable to update attendance."
      );
    }
  };

  const downloadPayrollCsv = async () => {
    try {
      const response = await attendanceAPI.downloadPayrollCsv({
        month: selectedMonth,
        year: selectedYear
      });
      const blob = new Blob([response.data], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `attendance-payroll-${selectedYear}-${selectedMonth
          .toString()
          .padStart(2, "0")}.csv`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error("CSV download failed", error);
      showToast.error(
        error.response?.data?.message || "Failed to download payroll CSV"
      );
    }
  };

  const myPendingRecords = myAttendance.filter(
    (record) => record.status !== "APPROVED"
  );

  const approvedDays = myAttendance.filter(
    (record) => record.status === "APPROVED"
  ).length;

  const teamPendingManager = teamAttendance.filter(
    (record) => record.status === "PENDING_MANAGER"
  );
  const teamPendingAdmin = teamAttendance.filter(
    (record) => record.status === "PENDING_ADMIN"
  );

  const mapInitialView = useMemo(() => {
    const firstWithLocation =
      teamAttendance.find((record) => record.location) || myAttendance.find((record) => record.location);
    if (firstWithLocation?.location) {
      return {
        longitude: firstWithLocation.location.lng,
        latitude: firstWithLocation.location.lat,
        zoom: 9
      };
    }
    return {
      longitude: 78.9629,
      latitude: 20.5937,
      zoom: 4
    };
  }, [teamAttendance, myAttendance]);

  const renderStatusBadge = (status: AttendanceRecord["status"]) => {
    const variants: Record<
      AttendanceRecord["status"],
      { label: string; className: string }
    > = {
      PENDING_MANAGER: {
        label: "Pending Manager",
        className: "bg-yellow-100 text-yellow-800"
      },
      PENDING_ADMIN: {
        label: "Pending Admin",
        className: "bg-blue-100 text-blue-800"
      },
      APPROVED: {
        label: "Approved",
        className: "bg-green-100 text-green-800"
      },
      REJECTED: {
        label: "Rejected",
        className: "bg-red-100 text-red-800"
      }
    };
    const variant = variants[status];
    return (
      <span
        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${variant.className}`}
      >
        {variant.label}
      </span>
    );
  };

  const monthOptions = useMemo(
    () =>
      monthLabels.map((label, index) => ({
        label,
        value: index + 1
      })),
    []
  );

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, idx) => currentYear - 2 + idx);
  }, []);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 overflow-auto pt-16 md:pt-0">
        <Header title="Attendance & Payroll" />
        <MobileNavbar />
        <div className="p-4 md:p-8 pb-20 md:pb-8 space-y-6">
          <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 flex items-center gap-2">
                    <FiClock /> Approved Days
                  </h3>
                  <p className="mt-2 text-3xl font-bold text-primary-600">
                    {approvedDays}
                  </p>
                </div>
                <span className="text-4xl text-primary-200">⏱️</span>
              </div>
            </div>

            <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 flex items-center gap-2">
                    <FiAlertTriangle /> Pending Actions
                  </h3>
                  <p className="mt-2 text-3xl font-bold text-yellow-600">
                    {myPendingRecords.length}
                  </p>
                </div>
                <span className="text-4xl text-yellow-200">⏳</span>
              </div>
            </div>

            {canManage && (
              <>
                <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 flex items-center gap-2">
                        <FiCheckCircle /> Pending Manager
                      </h3>
                      <p className="mt-2 text-3xl font-bold text-blue-600">
                        {teamPendingManager.length}
                      </p>
                    </div>
                    <span className="text-4xl text-blue-200">📝</span>
                  </div>
                </div>
                <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 flex items-center gap-2">
                        <FiCheckCircle /> Pending Admin
                      </h3>
                      <p className="mt-2 text-3xl font-bold text-purple-600">
                        {teamPendingAdmin.length}
                      </p>
                    </div>
                    <span className="text-4xl text-purple-200">📬</span>
                  </div>
                </div>
              </>
            )}
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl bg-white border border-gray-100 shadow-sm">
              <div className="border-b border-gray-100 p-5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <FiCalendar /> My Attendance
                  </h2>
                  <p className="text-sm text-gray-500">
                    Mark your presence with one tap check-in/out
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    {monthOptions.map((month) => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    {yearOptions.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-5 space-y-5">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700">
                    Project
                  </label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    {projects.map((project) => (
                      <option key={project._id} value={project._id}>
                        {project.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <Button
                    onClick={() => handleAttendanceSubmit("checkIn")}
                    variant="primary"
                    disabled={checkInLoading}
                  >
                    {checkInLoading ? "Marking..." : "Check In"}
                  </Button>
                  <Button
                    onClick={() => handleAttendanceSubmit("checkOut")}
                    variant="outline"
                    disabled={checkOutLoading}
                  >
                    {checkOutLoading ? "Marking..." : "Check Out"}
                  </Button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      QR/Location Code (optional)
                    </label>
                    <input
                      type="text"
                      value={qrCodeRef}
                      onChange={(e) => setQrCodeRef(e.target.value)}
                      placeholder="Scan or enter project QR code"
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Remarks (optional)
                    </label>
                    <textarea
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      rows={3}
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      placeholder="Any notes for your manager"
                    />
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <h3 className="text-sm font-semibold text-gray-700">
                    Recent Activity
                  </h3>
                  <div className="mt-3 space-y-3 max-h-72 overflow-y-auto">
                    {loadingMyAttendance ? (
                      <div className="text-sm text-gray-500">Loading...</div>
                    ) : myAttendance.length === 0 ? (
                      <div className="text-sm text-gray-500">
                        No attendance records yet.
                      </div>
                    ) : (
                      myAttendance.map((record) => (
                        <div
                          key={record._id}
                          className="rounded-lg border border-gray-100 bg-gray-50 p-3"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold text-gray-800">
                                {new Date(record.date).toLocaleDateString()}
                              </p>
                              <p className="text-xs text-gray-500">
                                {record.projectId?.title}
                              </p>
                            </div>
                            {renderStatusBadge(record.status)}
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-500">
                            <span>
                              Check-in:{" "}
                              {record.checkInTime
                                ? new Date(record.checkInTime).toLocaleTimeString()
                                : "--"}
                            </span>
                            <span>
                              Check-out:{" "}
                              {record.checkOutTime
                                ? new Date(record.checkOutTime).toLocaleTimeString()
                                : "--"}
                            </span>
                          </div>
                          {record.remarks && (
                            <p className="mt-2 text-xs text-gray-600">
                              {record.remarks}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-white border border-gray-100 shadow-sm">
              <div className="border-b border-gray-100 p-5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <FiDollarSign /> Payroll Summary
                  </h2>
                  <p className="text-sm text-gray-500">
                    Auto-calculated payouts based on approved attendance
                  </p>
                </div>
                {canManage && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadPayrollCsv}
                    disabled={loadingPayroll}
                    className="flex items-center gap-2"
                  >
                    <FiDownload /> CSV
                  </Button>
                )}
              </div>

              <div className="p-5 space-y-4">
                {canManage ? (
                  <div className="rounded-lg border border-gray-100 bg-primary-50 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-primary-700">
                          Total Payout
                        </p>
                        <p className="text-2xl font-bold text-primary-900">
                          ₹{totalPayout.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </p>
                      </div>
                      <FiDollarSign className="text-4xl text-primary-200" />
                    </div>
                  </div>
                ) : selectedPayrollRecord ? (
                  <div className="rounded-lg border border-gray-100 bg-green-50 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-700">
                          Estimated Payout
                        </p>
                        <p className="text-2xl font-bold text-green-900">
                          ₹
                          {selectedPayrollRecord.payout.toLocaleString(undefined, {
                            maximumFractionDigits: 0
                          })}
                        </p>
                      </div>
                      <FiDollarSign className="text-4xl text-green-200" />
                    </div>
                    <p className="mt-2 text-xs text-green-700">
                      Based on {selectedPayrollRecord.workingDays} approved days
                      with multiplier x{selectedPayrollRecord.multiplier}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm text-gray-500">
                    Payout will appear after admin approvals.
                  </div>
                )}

                {canManage && (
                  <div className="max-h-72 overflow-y-auto">
                    {loadingPayroll ? (
                      <div className="text-sm text-gray-500">Loading summary...</div>
                    ) : payrollRecords.length === 0 ? (
                      <div className="text-sm text-gray-500">
                        No payroll records yet for this period.
                      </div>
                    ) : (
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left font-medium text-gray-600">
                              Member
                            </th>
                            <th className="px-4 py-2 text-left font-medium text-gray-600">
                              Project
                            </th>
                            <th className="px-4 py-2 text-left font-medium text-gray-600">
                              Days
                            </th>
                            <th className="px-4 py-2 text-left font-medium text-gray-600">
                              Payout
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {payrollRecords.map((record) => (
                            <tr key={`${record.userId}-${record.projectId}`}>
                              <td className="px-4 py-2">
                                <p className="font-medium text-gray-800">
                                  {record.userName}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {record.userEmail}
                                </p>
                              </td>
                              <td className="px-4 py-2 text-gray-700">
                                {record.projectTitle}
                              </td>
                              <td className="px-4 py-2 text-gray-700">
                                {record.workingDays}/{record.expectedDays}
                              </td>
                              <td className="px-4 py-2 text-primary-600 font-semibold">
                                ₹{record.payout.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>

          {canManage && (
            <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div className="rounded-xl bg-white border border-gray-100 shadow-sm">
                <div className="border-b border-gray-100 p-5 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                      <FiCheckSquare /> Team Verification
                    </h2>
                    <p className="text-sm text-gray-500">
                      Approve or reject attendance submissions
                    </p>
                  </div>
                </div>
                <div className="p-5 space-y-4 max-h-[520px] overflow-y-auto">
                  {loadingTeamAttendance ? (
                    <div className="text-sm text-gray-500">Loading...</div>
                  ) : teamAttendance.length === 0 ? (
                    <div className="text-sm text-gray-500">
                      No attendance records found for this period.
                    </div>
                  ) : (
                    teamAttendance.map((record) => (
                      <div
                        key={record._id}
                        className="rounded-lg border border-gray-100 bg-gray-50 p-4 shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-gray-800">
                              {record.userId?.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {record.userId?.email}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Project: {record.projectId?.title}
                            </p>
                          </div>
                          {renderStatusBadge(record.status)}
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600">
                          <span>
                            Date:{" "}
                            {new Date(record.date).toLocaleDateString()}
                          </span>
                          <span>
                            Check-in:{" "}
                            {record.checkInTime
                              ? new Date(record.checkInTime).toLocaleTimeString()
                              : "--"}
                          </span>
                          <span>
                            Check-out:{" "}
                            {record.checkOutTime
                              ? new Date(record.checkOutTime).toLocaleTimeString()
                              : "--"}
                          </span>
                          {record.location && (
                            <span className="flex items-center gap-1">
                              <FiMapPin className="text-gray-400" />
                              {record.location.lat.toFixed(4)},{" "}
                              {record.location.lng.toFixed(4)}
                            </span>
                          )}
                        </div>
                        {record.remarks && (
                          <p className="mt-2 text-xs text-gray-600">
                            Member remarks: {record.remarks}
                          </p>
                        )}
                        {record.managerRemarks && (
                          <p className="mt-1 text-xs text-gray-600">
                            Manager remarks: {record.managerRemarks}
                          </p>
                        )}
                        {record.adminRemarks && (
                          <p className="mt-1 text-xs text-gray-600">
                            Admin remarks: {record.adminRemarks}
                          </p>
                        )}

                        <div className="mt-3 flex flex-wrap gap-2">
                          {record.status === "PENDING_MANAGER" && (
                            <>
                              <Button
                                size="sm"
                                variant="success"
                                onClick={() =>
                                  handleManagerDecision(record._id, true)
                                }
                                className="flex items-center gap-2"
                              >
                                <FiCheck /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() =>
                                  handleManagerDecision(record._id, false)
                                }
                                className="flex items-center gap-2"
                              >
                                <FiX /> Reject
                              </Button>
                            </>
                          )}
                          {record.status === "PENDING_ADMIN" && canAdmin && (
                            <>
                              <Button
                                size="sm"
                                variant="success"
                                onClick={() =>
                                  handleAdminDecision(record._id, true)
                                }
                                className="flex items-center gap-2"
                              >
                                <FiCheck /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() =>
                                  handleAdminDecision(record._id, false)
                                }
                                className="flex items-center gap-2"
                              >
                                <FiX /> Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-xl bg-white border border-gray-100 shadow-sm">
                <div className="border-b border-gray-100 p-5 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                      <FiMapPin /> GPS Verification
                    </h2>
                    <p className="text-sm text-gray-500">
                      Visualize attendance check-ins on the map
                    </p>
                  </div>
                  {!mapboxToken && (
                    <span className="text-xs text-red-500">
                      Set NEXT_PUBLIC_MAPBOX_TOKEN
                    </span>
                  )}
                </div>
                <div className="relative h-[420px]">
                  {mapboxToken ? (
                    <Map
                      mapboxAccessToken={mapboxToken}
                      initialViewState={mapInitialView}
                      style={{ width: "100%", height: "100%" }}
                      mapStyle="mapbox://styles/mapbox/streets-v11"
                    >
                      <NavigationControl position="top-right" />
                      {teamAttendance
                        .filter((record) => record.location)
                        .map((record) => (
                          <Marker
                            key={record._id}
                            longitude={record.location!.lng}
                            latitude={record.location!.lat}
                            anchor="bottom"
                          >
                            <div
                              className={`rounded-full border-4 ${
                                record.status === "APPROVED"
                                  ? "border-green-500 bg-green-100"
                                  : record.status === "PENDING_ADMIN"
                                  ? "border-blue-500 bg-blue-100"
                                  : record.status === "PENDING_MANAGER"
                                  ? "border-yellow-500 bg-yellow-100"
                                  : "border-red-500 bg-red-100"
                              } p-2 shadow-md`}
                            >
                              <FiMapPin className="text-gray-600" />
                            </div>
                          </Marker>
                        ))}
                    </Map>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-gray-500">
                      Map unavailable. Configure NEXT_PUBLIC_MAPBOX_TOKEN.
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
      <FABMenu />
    </div>
  );
}


