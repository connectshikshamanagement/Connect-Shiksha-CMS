"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  FiCheckCircle,
  FiAlertTriangle,
  FiMapPin,
  FiUsers,
  FiCheck,
  FiX,
  FiCheckSquare
} from "react-icons/fi";
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
  status: "PENDING_MANAGER" | "APPROVED" | "REJECTED";
  remarks?: string;
  managerRemarks?: string;
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
    isProjectManager,
    isFounder
  } = usePermissions();
  const isManager = isProjectManager;

  const now = new Date();
  const getProjectId = (project: any) => {
    if (!project) return '';
    const raw = project._id ?? project.id;
    return raw ? raw.toString() : '';
  };
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [myAttendance, setMyAttendance] = useState<AttendanceRecord[]>([]);
  const [teamAttendance, setTeamAttendance] = useState<AttendanceRecord[]>([]);
  const [remarks, setRemarks] = useState("");

  const [loadingMyAttendance, setLoadingMyAttendance] = useState(false);
  const [loadingTeamAttendance, setLoadingTeamAttendance] = useState(false);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkOutLoading, setCheckOutLoading] = useState(false);
  const [manualAttendanceLoading, setManualAttendanceLoading] = useState<string | null>(null);
  const [projectMembersList, setProjectMembersList] = useState<
    { _id: string; name: string; email?: string }[]
  >([]);
  const [managedProjectIds, setManagedProjectIds] = useState<Set<string>>(new Set<string>());

  const canManage = isManager || isFounder;
  const canManageSelectedProject = canManage && Boolean(selectedProjectId) && managedProjectIds.has(selectedProjectId);

  const fetchProjects = useCallback(async () => {
    try {
      if (isMember && !isManager && !isFounder) {
        const response = await teamMemberFinanceAPI.getMyProjects();
        if (response?.data?.success) {
          const list = response.data.data || [];
          setProjects(list);
          setManagedProjectIds(new Set<string>());
          if (!selectedProjectId && list.length > 0) {
            const firstId = getProjectId(list[0]);
            if (firstId) setSelectedProjectId(firstId);
          }
        }
        return;
      }

      if (isManager && !isFounder) {
        const [ownedRes, memberRes] = await Promise.all([
          projectAPI.getMyOwnedProjects(),
          teamMemberFinanceAPI.getMyProjects()
        ]);

        const ownedList = ownedRes?.data?.data || [];
        const ownedIds = ownedList
          .map((project: any) => getProjectId(project))
          .filter(Boolean);

        const combinedMap = new Map<string, any>();
        (memberRes?.data?.data || []).forEach((project: any) => {
          const id = getProjectId(project);
          if (id) combinedMap.set(id, project);
        });
        ownedList.forEach((project: any) => {
          const id = getProjectId(project);
          if (id) combinedMap.set(id, project);
        });

        const combined = Array.from(combinedMap.values());
        setProjects(combined);
        setManagedProjectIds(new Set<string>(ownedIds));

        if (!selectedProjectId && combined.length > 0) {
          const preferred = combined.find((project: any) => ownedIds.includes(getProjectId(project))) || combined[0];
          const preferredId = getProjectId(preferred);
          if (preferredId) setSelectedProjectId(preferredId);
        }
        return;
      }

      const response = await projectAPI.getAll();
      if (response?.data?.success) {
        const list = response.data.data || [];
        setProjects(list);
        const listIds = list
          .map((project: any) => getProjectId(project))
          .filter(Boolean);
        setManagedProjectIds(new Set<string>(listIds));
        if (!selectedProjectId && listIds.length > 0) {
          setSelectedProjectId(listIds[0]);
        }
      }
    } catch (error: any) {
      console.error("Failed to fetch projects", error);
      showToast.error(
        error.response?.data?.message || "Failed to load projects"
      );
      setProjects([]);
      setManagedProjectIds(new Set<string>());
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
    if (!canManageSelectedProject) {
      setTeamAttendance([]);
      setProjectMembersList([]);
      return;
    }
    setLoadingTeamAttendance(true);
    try {
      const response = await attendanceAPI.getTeam({
        month: selectedMonth,
        year: selectedYear,
        projectId: selectedProjectId || undefined
      });
      if (response.data.success) {
        console.debug("[Attendance] team data response", response.data);
        setTeamAttendance(response.data.data);
        if (response.data.projectMembers && response.data.projectMembers.length) {
          console.debug("[Attendance] setting project members from response", response.data.projectMembers);
          setProjectMembersList(response.data.projectMembers);
        } else {
          console.debug("[Attendance] no project members returned; clearing list");
          setProjectMembersList([]);
        }
      } else {
        console.warn("[Attendance] team fetch returned success=false", response.data);
        setProjectMembersList([]);
      }
    } catch (error: any) {
      console.error("Failed to fetch team attendance", error);
      showToast.error(
        error.response?.data?.message || "Failed to load team attendance"
      );
    } finally {
      setLoadingTeamAttendance(false);
    }
  }, [canManageSelectedProject, selectedMonth, selectedYear, selectedProjectId]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    fetchMyAttendance();
    fetchTeamAttendance();
  }, [
    fetchMyAttendance,
    fetchTeamAttendance,
    selectedMonth,
    selectedYear
  ]);

  useEffect(() => {
    if (!canManageSelectedProject) {
      setProjectMembersList([]);
    }
  }, [canManageSelectedProject, selectedProjectId]);


  const handleAttendanceSubmit = async (type: "checkIn" | "checkOut") => {
    if (!selectedProjectId) {
      showToast.error("Please select a project first.");
      return;
    }

    const selectedProject = projects.find(
      (project: any) =>
        project._id?.toString() === selectedProjectId ||
        project.id?.toString() === selectedProjectId
    );

    if (!selectedProject) {
      showToast.error("Selected project could not be found. Please refresh.");
      return;
    }

    const setLoading =
      type === "checkIn" ? setCheckInLoading : setCheckOutLoading;

    setLoading(true);
    try {
      let locationPayload:
        | { lat: number; lng: number; accuracyMeters?: number }
        | undefined;

      try {
        const position = await getGeoLocation();
        locationPayload = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracyMeters: position.coords.accuracy
        };
      } catch (geoError: any) {
        const fallbackCoords = selectedProject?.location?.coordinates;
        if (fallbackCoords?.lat && fallbackCoords?.lng) {
          showToast.info(
            "GPS unavailable; using the project's saved location as fallback."
          );
          locationPayload = {
            lat: fallbackCoords.lat,
            lng: fallbackCoords.lng,
            accuracyMeters: selectedProject?.location?.radiusMeters
          };
        } else {
          console.warn("GPS unavailable and no project coordinates", geoError);
          showToast.warning(
            "GPS unavailable. Recording attendance without live location."
          );
        }
      }

      const nowIso = new Date().toISOString();
      const payload: any = {
        projectId: selectedProjectId,
        remarks: remarks || undefined
      };

      if (locationPayload) {
        payload.location = locationPayload;
      }

      if (type === "checkIn") {
        payload.checkInTime = nowIso;
      } else {
        payload.checkOutTime = nowIso;
      }

      const response = await attendanceAPI.mark(payload);
      const status = response.data?.data?.status;
      const autoApproved = status === "APPROVED";
      const successMessage =
        type === "checkIn"
          ? autoApproved
            ? "Attendance recorded and auto-approved."
            : "Attendance recorded. Awaiting manager approval."
          : "Check-out recorded successfully.";
      showToast.success(successMessage);
      setRemarks("");
      fetchMyAttendance();
      if (canManageSelectedProject) {
        fetchTeamAttendance();
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

  const handleManualAttendance = async (memberId: string, type: "checkIn" | "checkOut") => {
    if (!selectedProjectId) {
      showToast.error("Select a project before recording attendance.");
      return;
    }

    if (!canManageSelectedProject) {
      showToast.error("You can only record attendance for projects you manage.");
      return;
    }

    const loadingKey = `${memberId}-${type}`;
    setManualAttendanceLoading(loadingKey);

    try {
      const payload: any = {
        memberId,
        projectId: selectedProjectId,
        remarks: `Marked by project manager on ${new Date().toLocaleString()}`
      };

      const nowIso = new Date().toISOString();
      if (type === "checkIn") {
        payload.checkInTime = nowIso;
      } else {
        payload.checkOutTime = nowIso;
      }

      await attendanceAPI.managerMark(payload);
      showToast.success("Attendance recorded for the selected member.");
      fetchMyAttendance();
      fetchTeamAttendance();
    } catch (error: any) {
      console.error("Manual attendance failed", error);
      showToast.error(
        error.response?.data?.message || "Unable to record attendance for this member."
      );
    } finally {
      setManualAttendanceLoading(null);
    }
  };

  const handleManagerDecision = async (
    recordId: string,
    approve: boolean
  ) => {
    if (!canManageSelectedProject) {
      showToast.error("You can only review attendance for projects you manage.");
      return;
    }

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
    } catch (error: any) {
      console.error("Manager decision failed", error);
      showToast.error(
        error.response?.data?.message || "Unable to update attendance."
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

  const renderStatusBadge = (status: AttendanceRecord["status"]) => {
    const variants: Record<
      AttendanceRecord["status"],
      { label: string; className: string }
    > = {
      PENDING_MANAGER: {
        label: "Pending Manager",
        className: "bg-yellow-100 text-yellow-800"
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
        <Header title="Attendance" />
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

            {canManageSelectedProject && (
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
                    {projects.map((project) => {
                      const projectId = getProjectId(project);
                      if (!projectId) return null;
                      const managed = managedProjectIds.has(projectId);
                      return (
                        <option key={projectId} value={projectId}>
                          {project.title}{managed ? ' (Managed)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {canManage && !canManageSelectedProject && (
                  <p className="text-xs text-amber-600 rounded-md bg-amber-50 px-3 py-2 border border-amber-100">
                    You are viewing a project where you are a member. Switch to one of your managed projects to unlock manager controls.
                  </p>
                )}

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

          </section>

          {canManage && (
            <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div className="rounded-xl bg-white border border-gray-100 shadow-sm">
                <div className="border-b border-gray-100 p-5">
                  <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <FiUsers /> Project Members
                  </h2>
                  <p className="text-sm text-gray-500">
                    Quickly mark attendance for members on this project
                  </p>
                </div>
                <div className="p-5 space-y-4 max-h-[520px] overflow-y-auto">
                  {!selectedProjectId ? (
                    <div className="text-sm text-gray-500">
                      Select a project to view its members.
                    </div>
                  ) : !canManageSelectedProject ? (
                    <div className="text-sm text-amber-600 bg-amber-50 border border-amber-100 rounded-lg p-3">
                      Switch to one of your managed projects to view and update member attendance.
                    </div>
                  ) : projectMembersList.length === 0 ? (
                    <div className="text-sm text-gray-500">
                      No members are assigned to this project yet.
                    </div>
                  ) : (
                    projectMembersList.map((member) => {
                      const checkInKey = `${member._id}-checkIn`;
                      const checkOutKey = `${member._id}-checkOut`;
                      return (
                        <div
                          key={member._id}
                          className="rounded-lg border border-gray-100 bg-gray-50 p-4 shadow-sm flex flex-col gap-3"
                        >
                          <div>
                            <p className="text-sm font-semibold text-gray-800">
                              {member.name}
                            </p>
                            {member.email && (
                              <p className="text-xs text-gray-500">
                                {member.email}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={manualAttendanceLoading === checkInKey}
                              onClick={() => handleManualAttendance(member._id, "checkIn")}
                              className="flex-1 min-w-[120px]"
                            >
                              {manualAttendanceLoading === checkInKey
                                ? "Marking..."
                                : "Check In"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={manualAttendanceLoading === checkOutKey}
                              onClick={() => handleManualAttendance(member._id, "checkOut")}
                              className="flex-1 min-w-[120px]"
                            >
                              {manualAttendanceLoading === checkOutKey
                                ? "Marking..."
                                : "Check Out"}
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

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
                        </div>
                      </div>
                    ))
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


