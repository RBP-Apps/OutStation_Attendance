"use client";
import { useState, useEffect, useContext, useRef } from "react";
import {
  MapPin,
  Loader2,
  Download,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { AuthContext } from "../App";

// Attendance Summary Card Component with Enhanced Mispunch Logic
const AttendanceSummaryCard = ({
  attendanceData,
  isLoading,
  userRole,
  salesPersonName,
}) => {
  const [summaryData, setSummaryData] = useState({
    totalPresent: 0,
    totalLeave: 0,
    totalIn: 0,
    totalOut: 0,
    totalMispunch: 0,
    mispunchDetails: [],
  });




  // Helper function to check if a day is complete (next day has started or past cutoff)
  const isDayComplete = (dateStr) => {
    if (!dateStr) return false;

    const [day, month, year] = dateStr.split("/");
    const targetDate = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day)
    );
    const currentDate = new Date();

    // Set cutoff time to 11:59 PM of the target date
    const cutoffTime = new Date(targetDate);
    cutoffTime.setHours(23, 59, 59, 999);

    // Day is complete if current time is past the cutoff time
    return currentDate > cutoffTime;
  };

  // Helper function to determine mispunch status
  const determineMispunchStatus = (inCount, outCount, dateStr, hasLeave) => {
    // If it's a leave day, no mispunch consideration
    if (hasLeave) {
      return { isMispunch: false, type: "leave" };
    }

    // If no punches at all, not a mispunch
    if (inCount === 0 && outCount === 0) {
      return { isMispunch: false, type: "absent" };
    }

    const isDayOver = isDayComplete(dateStr);

    // Perfect match - no mispunch
    if (inCount === outCount) {
      return { isMispunch: false, type: "complete" };
    }

    // More INs than OUTs
    if (inCount > outCount) {
      if (isDayOver) {
        return {
          isMispunch: true,
          type: "missing_out",
          details: `${inCount} IN vs ${outCount} OUT - Missing ${
            inCount - outCount
          } OUT punch(es)`,
        };
      } else {
        return {
          isMispunch: false,
          type: "in_progress",
          details: `${inCount} IN vs ${outCount} OUT - Day in progress`,
        };
      }
    }

    // More OUTs than INs (invalid case)
    if (outCount > inCount) {
      return {
        isMispunch: true,
        type: "invalid",
        details: `${inCount} IN vs ${outCount} OUT - Invalid: More OUT than IN punches`,
      };
    }

    return { isMispunch: false, type: "unknown" };
  };

  useEffect(() => {
    if (!attendanceData || attendanceData.length === 0) {
      setSummaryData({
        totalPresent: 0,
        totalLeave: 0,
        totalIn: 0,
        totalOut: 0,
        totalMispunch: 0,
        mispunchDetails: [],
      });
      return;
    }

    // Filter data for current user (admin sees all, users see only their data)
    const userSpecificData =
      userRole?.toLowerCase() === "admin"
        ? attendanceData
        : attendanceData.filter(
            (entry) => entry.salesPersonName === salesPersonName
          );

    // Calculate statistics
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    // Group by employee and date to calculate daily statistics
    const employeeDailyRecords = {};

    userSpecificData.forEach((entry) => {
      if (!entry.dateTime) return;

      const dateStr = entry.dateTime.split(" ")[0];
      if (!dateStr) return;

      const [day, month, year] = dateStr.split("/");
      const entryDate = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day)
      );

      // Only count current month records
      if (
        entryDate.getMonth() === currentMonth &&
        entryDate.getFullYear() === currentYear
      ) {
        const employeeName = entry.salesPersonName || "Unknown";
        const dateKey = `${employeeName}_${dateStr}`;

        if (!employeeDailyRecords[dateKey]) {
          employeeDailyRecords[dateKey] = {
            employee: employeeName,
            date: dateStr,
            inCount: 0,
            outCount: 0,
            leaveCount: 0,
            hasLeave: false,
            punches: [],
          };
        }

        if (entry.status === "IN") {
          employeeDailyRecords[dateKey].inCount++;
          employeeDailyRecords[dateKey].punches.push({
            type: "IN",
            time: entry.dateTime,
            status: entry.status,
          });
        } else if (entry.status === "OUT") {
          employeeDailyRecords[dateKey].outCount++;
          employeeDailyRecords[dateKey].punches.push({
            type: "OUT",
            time: entry.dateTime,
            status: entry.status,
          });
        } else if (entry.status === "Leave") {
          employeeDailyRecords[dateKey].leaveCount++;
          employeeDailyRecords[dateKey].hasLeave = true;
          employeeDailyRecords[dateKey].punches.push({
            type: "LEAVE",
            time: entry.dateTime,
            status: entry.status,
          });
        }
      }
    });

    // Calculate totals and mispunch details
    let totalPresent = 0;
    let totalLeave = 0;
    let totalIn = 0;
    let totalOut = 0;
    let totalMispunch = 0;
    const mispunchDetails = [];

    Object.values(employeeDailyRecords).forEach((dayRecord) => {
      totalIn += dayRecord.inCount;
      totalOut += dayRecord.outCount;
      totalLeave += dayRecord.leaveCount;

      // Determine if this is a leave day, present day, or absent day
      if (dayRecord.hasLeave) {
        // Don't count leave days as present or absent
      } else if (dayRecord.inCount > 0 || dayRecord.outCount > 0) {
        totalPresent++;
      }

      // Check for mispunch using the new logic
      const mispunchStatus = determineMispunchStatus(
        dayRecord.inCount,
        dayRecord.outCount,
        dayRecord.date,
        dayRecord.hasLeave
      );

      if (mispunchStatus.isMispunch) {
        totalMispunch++;
        mispunchDetails.push({
          employee: dayRecord.employee,
          date: dayRecord.date,
          inCount: dayRecord.inCount,
          outCount: dayRecord.outCount,
          type: mispunchStatus.type,
          details: mispunchStatus.details,
          isDayComplete: isDayComplete(dayRecord.date),
          punches: dayRecord.punches,
        });
      }
    });

    setSummaryData({
      totalPresent,
      totalLeave: Math.max(
        totalLeave,
        Object.values(employeeDailyRecords).filter((day) => day.hasLeave).length
      ),
      totalIn,
      totalOut,
      totalMispunch,
      mispunchDetails,
    });
  }, [attendanceData, salesPersonName, userRole]);

  if (isLoading) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden mb-8">
        <div className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 px-8 py-6">
          <h2 className="text-2xl font-bold text-white">Attendance Summary</h2>
          <p className="text-blue-50">Loading your attendance statistics...</p>
        </div>
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading attendance summary...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden mb-8">
      <div className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 px-8 py-6">
        <div className="flex items-center gap-3 mb-2">
          <Calendar className="h-6 w-6 text-white" />
          <h2 className="text-2xl font-bold text-white">
            {userRole?.toLowerCase() === "admin"
              ? "Overall Attendance Summary"
              : "Your Attendance Summary"}
          </h2>
        </div>
        <p className="text-blue-50">
          {userRole?.toLowerCase() === "admin"
            ? "Complete attendance overview for current month"
            : `Monthly attendance overview for ${salesPersonName}`}
        </p>
      </div>

      <div className="p-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {/* Total Present Days */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 text-center hover:shadow-lg transition-shadow">
            <div className="flex justify-center mb-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-green-700 mb-1">
              {summaryData.totalPresent}
            </div>
            <div className="text-sm font-medium text-green-600">
              Present Days
            </div>
          </div>

          {/* Total Leave Days */}
          <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-6 text-center hover:shadow-lg transition-shadow">
            <div className="flex justify-center mb-3">
              <XCircle className="h-8 w-8 text-amber-600" />
            </div>
            <div className="text-3xl font-bold text-amber-700 mb-1">
              {summaryData.totalLeave}
            </div>
            <div className="text-sm font-medium text-amber-600">Leave Days</div>
          </div>

          {/* Total IN */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 text-center hover:shadow-lg transition-shadow">
            <div className="flex justify-center mb-3">
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-blue-700 mb-1">
              {summaryData.totalIn}
            </div>
            <div className="text-sm font-medium text-blue-600">Total IN</div>
          </div>

          {/* Total OUT */}
          <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 rounded-xl p-6 text-center hover:shadow-lg transition-shadow">
            <div className="flex justify-center mb-3">
              <Clock className="h-8 w-8 text-purple-600" />
            </div>
            <div className="text-3xl font-bold text-purple-700 mb-1">
              {summaryData.totalOut}
            </div>
            <div className="text-sm font-medium text-purple-600">Total OUT</div>
          </div>

          {/* Total Mispunch */}
          <div className="bg-gradient-to-br from-red-50 to-rose-50 border border-red-200 rounded-xl p-6 text-center hover:shadow-lg transition-shadow">
            <div className="flex justify-center mb-3">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <div className="text-3xl font-bold text-red-700 mb-1">
              {summaryData.totalMispunch}
            </div>
            <div className="text-sm font-medium text-red-600">Mispunch</div>
          </div>
        </div>

        {/* Mispunch Details Section */}
        {summaryData.mispunchDetails.length > 0 && (
          <div className="mt-8 bg-red-50/50 rounded-xl p-6 border border-red-200">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <h3 className="text-lg font-semibold text-red-800">
                Mispunch Details
              </h3>
            </div>
            <div className="space-y-3">
              {summaryData.mispunchDetails.map((detail, index) => (
                <div
                  key={index}
                  className="bg-white/60 rounded-lg p-4 border border-red-200"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex-1">
                      <div className="font-medium text-red-800">
                        {userRole?.toLowerCase() === "admin"
                          ? `${detail.employee} - `
                          : ""}
                        {detail.date}
                      </div>
                      <div className="text-sm text-red-600 mt-1">
                        {detail.details}
                      </div>
                      <div className="text-xs text-red-500 mt-1">
                        {detail.type === "missing_out" &&
                          "Day completed - Missing OUT punch(es)"}
                        {detail.type === "invalid" && "Invalid punch sequence"}
                        {detail.isDayComplete
                          ? " (Day Complete)"
                          : " (Day In Progress)"}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded font-medium">
                        IN: {detail.inCount}
                      </span>
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded font-medium">
                        OUT: {detail.outCount}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Additional Info */}
        <div className="mt-6 bg-slate-50/50 rounded-lg p-4">
          <div className="text-sm text-slate-600 text-center">
            <span className="font-medium">Current Month:</span>{" "}
            {new Date().toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
            {userRole?.toLowerCase() !== "admin" && (
              <>
                <span className="mx-2">•</span>
                <span className="font-medium">User:</span> {salesPersonName}
              </>
            )}
            <span className="mx-2">•</span>
            <span className="font-medium">Mispunch Cutoff:</span> 11:59 PM daily
          </div>
        </div>
      </div>
    </div>
  );
};

// AttendanceHistory Component with filters in header and Excel download functionality
const AttendanceHistory = ({ attendanceData, isLoading, userRole }) => {
  const [filters, setFilters] = useState({
    name: "",
    status: "",
    month: "",
  });
  const [filteredData, setFilteredData] = useState([]);

  // Month names for dropdown
  const monthNames = [
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
    "December",
  ];

  const getUniqueNames = (data) => {
    const names = data.map((entry) => entry.salesPersonName).filter(Boolean);
    return [...new Set(names)].sort();
  };

  const getAvailableMonths = (data) => {
    const months = new Set();
    data.forEach((entry) => {
      if (entry.dateTime) {
        const dateStr = entry.dateTime.split(" ")[0];
        if (dateStr) {
          const [day, month, year] = dateStr.split("/");
          const monthNum = parseInt(month, 10) - 1;
          const monthName = monthNames[monthNum];
          if (monthName) {
            months.add(`${monthName} ${year}`);
          }
        }
      }
    });
    return Array.from(months).sort((a, b) => {
      const [aMonth, aYear] = a.split(" ");
      const [bMonth, bYear] = b.split(" ");
      const aDate = new Date(parseInt(aYear), monthNames.indexOf(aMonth));
      const bDate = new Date(parseInt(bYear), monthNames.indexOf(bMonth));
      return bDate - aDate;
    });
  };

  const applyFilters = (data) => {
    if (!filters.name && !filters.status && !filters.month) {
      return data;
    }

    return data.filter((entry) => {
      if (
        filters.name &&
        !entry.salesPersonName
          ?.toLowerCase()
          .includes(filters.name.toLowerCase())
      ) {
        return false;
      }

      if (filters.status && entry.status !== filters.status) {
        return false;
      }

      if (filters.month) {
        const entryDate = entry.dateTime?.split(" ")[0];
        if (entryDate) {
          const [day, month, year] = entryDate.split("/");
          const monthNum = parseInt(month, 10) - 1;
          const monthName = monthNames[monthNum];
          const entryMonthYear = `${monthName} ${year}`;
          if (entryMonthYear !== filters.month) {
            return false;
          }
        }
      }

      return true;
    });
  };

  // Enhanced Excel download function
  const downloadExcel = () => {
    if (!filteredData || filteredData.length === 0) {
      alert("No data available to download");
      return;
    }

    // Create proper Excel content with XML format
    const currentDate = new Date().toLocaleDateString();
    const fileName = `Attendance_History_${
      new Date().toISOString().split("T")[0]
    }`;

    // Create Excel XML structure
    let excelContent = `<?xml version="1.0"?>
      <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
                xmlns:o="urn:schemas-microsoft-com:office:office"
                xmlns:x="urn:schemas-microsoft-com:office:excel"
                xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
                xmlns:html="http://www.w3.org/TR/REC-html40">
        <Worksheet ss:Name="Attendance History">
          <Table>
            <Row>
              <Cell><Data ss:Type="String">Name</Data></Cell>
              <Cell><Data ss:Type="String">Date &amp; Time</Data></Cell>
              <Cell><Data ss:Type="String">Status</Data></Cell>
              <Cell><Data ss:Type="String">Map Link</Data></Cell>
              <Cell><Data ss:Type="String">Address</Data></Cell>
            </Row>`;

    // Add data rows
    filteredData.forEach((row) => {
      excelContent += `
        <Row>
          <Cell><Data ss:Type="String">${
            row.salesPersonName || "N/A"
          }</Data></Cell>
          <Cell><Data ss:Type="String">${row.dateTime || "N/A"}</Data></Cell>
          <Cell><Data ss:Type="String">${row.status || "N/A"}</Data></Cell>
          <Cell><Data ss:Type="String">${row.mapLink || "N/A"}</Data></Cell>
          <Cell><Data ss:Type="String">${(row.address || "N/A").replace(
            /[<>&"']/g,
            function (match) {
              switch (match) {
                case "<":
                  return "&lt;";
                case ">":
                  return "&gt;";
                case "&":
                  return "&amp;";
                case '"':
                  return "&quot;";
                case "'":
                  return "&apos;";
                default:
                  return match;
              }
            }
          )}</Data></Cell>
        </Row>`;
    });

    excelContent += `
          </Table>
        </Worksheet>
      </Workbook>`;

    // Create and download the file
    const blob = new Blob([excelContent], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });

    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${fileName}.xls`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const filtered = applyFilters(attendanceData || []);
    setFilteredData(filtered);
  }, [filters, attendanceData]);

  const handleFilterChange = (filterType, value) => {
    setFilters((prev) => ({
      ...prev,
      [filterType]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      name: "",
      status: "",
      month: "",
    });
  };

  const hasActiveFilters = filters.name || filters.status || filters.month;

  if (isLoading) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden mt-8">
        <div className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 px-8 py-6">
          <h2 className="text-2xl font-bold text-white">Attendance History</h2>
          <p className="text-blue-50">Loading your attendance records...</p>
        </div>
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading attendance history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden mt-8">
      {/* Header with Filters and Download */}
      <div className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 px-8 py-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white">
              Attendance History
            </h2>
            <p className="text-blue-50">Your records are displayed below.</p>
          </div>

          {/* Excel Download Button Only */}
          {userRole?.toLowerCase() === "admin" && filteredData.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={downloadExcel}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg border border-green-500 transition-colors shadow-md"
                title="Download as Excel"
              >
                <Download className="h-4 w-4" />
                Download
              </button>
            </div>
          )}
        </div>

        {/* Filters Row - Only show for admin */}
        {userRole?.toLowerCase() === "admin" && (
          <div className="grid gap-3 md:grid-cols-4 items-end">
            {/* Name Filter */}
            <div>
              <label className="block text-sm font-medium text-blue-100 mb-1">
                Filter by Name
              </label>
              <select
                value={filters.name}
                onChange={(e) => handleFilterChange("name", e.target.value)}
                className="w-full px-3 py-2 bg-white/90 border border-white/30 rounded-lg text-slate-700 text-sm focus:ring-2 focus:ring-white/50 focus:border-white/50"
              >
                <option value="">All Names</option>
                {getUniqueNames(attendanceData || []).map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-blue-100 mb-1">
                Filter by Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange("status", e.target.value)}
                className="w-full px-3 py-2 bg-white/90 border border-white/30 rounded-lg text-slate-700 text-sm focus:ring-2 focus:ring-white/50 focus:border-white/50"
              >
                <option value="">All Status</option>
                <option value="IN">IN</option>
                <option value="OUT">OUT</option>
                <option value="Leave">Leave</option>
              </select>
            </div>

            {/* Month Filter */}
            <div>
              <label className="block text-sm font-medium text-blue-100 mb-1">
                Filter by Month
              </label>
              <select
                value={filters.month}
                onChange={(e) => handleFilterChange("month", e.target.value)}
                className="w-full px-3 py-2 bg-white/90 border border-white/30 rounded-lg text-slate-700 text-sm focus:ring-2 focus:ring-white/50 focus:border-white/50"
              >
                <option value="">All Months</option>
                {getAvailableMonths(attendanceData || []).map((monthYear) => (
                  <option key={monthYear} value={monthYear}>
                    {monthYear}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear Filters Button */}
            <div>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="w-full px-3 py-2 bg-white/20 hover:bg-white/30 text-white text-sm rounded-lg border border-white/30 transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        )}

        {/* Filter Results Info */}
        {hasActiveFilters && (
          <div className="mt-3 bg-white/10 border border-white/20 rounded-lg p-3">
            <p className="text-sm text-blue-100">
              Showing {filteredData.length} of {attendanceData?.length || 0}{" "}
              records
              {filters.name && ` • Name: ${filters.name}`}
              {filters.status && ` • Status: ${filters.status}`}
              {filters.month && ` • Month: ${filters.month}`}
            </p>
          </div>
        )}
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        {!attendanceData || attendanceData.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-slate-400 text-lg mb-2">📊</div>
            <h3 className="text-lg font-semibold text-slate-600 mb-2">
              No Records Found
            </h3>
            <p className="text-slate-500">
              {userRole?.toLowerCase() === "admin"
                ? "No attendance records available."
                : "You haven't marked any attendance yet."}
            </p>
          </div>
        ) : filteredData.length === 0 && hasActiveFilters ? (
          <div className="p-8 text-center">
            <div className="text-slate-400 text-lg mb-2">🔍</div>
            <h3 className="text-lg font-semibold text-slate-600 mb-2">
              No Matching Records
            </h3>
            <p className="text-slate-500">
              No records match your current filter criteria.
            </p>
          </div>
        ) : (
          <div className="min-w-full">
            <table className="w-full border-collapse">
              <thead className="bg-slate-50/50 border-b border-slate-200/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider border-r border-slate-200/50 w-32">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider border-r border-slate-200/50 w-40">
                    Date & Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider border-r border-slate-200/50 w-24">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider border-r border-slate-200/50 w-32">
                    Map Link
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Address
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/50">
                {filteredData.map((record, index) => (
                  <tr
                    key={index}
                    className="hover:bg-slate-50/30 transition-colors border-b border-slate-200/30"
                  >
                    <td className="px-4 py-3 border-r border-slate-200/50 w-32">
                      <div className="text-sm font-medium text-slate-900 break-words">
                        {record.salesPersonName || "N/A"}
                      </div>
                    </td>
                    <td className="px-4 py-3 border-r border-slate-200/50 w-40">
                      <div className="text-sm text-slate-900 break-words">
                        {record.dateTime || "N/A"}
                      </div>
                    </td>
                    <td className="px-4 py-3 border-r border-slate-200/50 w-24">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          record.status === "IN"
                            ? "bg-green-100 text-green-800"
                            : record.status === "OUT"
                            ? "bg-red-100 text-red-800"
                            : record.status === "Leave"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {record.status || "N/A"}
                      </span>
                    </td>
                    <td className="px-4 py-3 border-r border-slate-200/50 w-32">
                      {record.mapLink ? (
                        <a
                          href={record.mapLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm break-all"
                        >
                          <MapPin className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">View Map</span>
                        </a>
                      ) : (
                        <span className="text-slate-400 text-sm">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div
                        className="text-sm text-slate-600 break-words max-w-md"
                        title={record.address}
                      >
                        {record.address || "N/A"}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// Main Attendance Component (rest of the code remains the same)
const Attendance = () => {
  // Office location (ye client se lekar set karna hoga)
  const OFFICE_LOCATION = {
    lat: 21.240739,
    lng: 81.623879,
  };
  const ALLOWED_RADIUS_METERS = 10;

  // Helper function to calculate distance between two coordinates
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  const [attendance, setAttendance] = useState([]);
  const [historyAttendance, setHistoryAttendance] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const [errors, setErrors] = useState({});
  const [locationData, setLocationData] = useState(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [hasOutActiveSession, setHasOutActiveSession] = useState([]);
  const [inData, setInData] = useState({});
  const [outData, setOutData] = useState({});

  const { currentUser, isAuthenticated } = useContext(AuthContext);




const [cameraPhoto, setCameraPhoto] = useState(null);
const [showCamera, setShowCamera] = useState(false);
const [stream, setStream] = useState(null);
const videoRef = useRef(null);
const canvasRef = useRef(null);

  const salesPersonName = currentUser?.salesPersonName || "Unknown User";
  const userRole = currentUser?.role || "User";

  const SPREADSHEET_ID = "10coGuAVkdMNVUoX_L2HedehSb7d5lpgGQHTNjAZiGaQ";
  const APPS_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbylk0DYGG9b3iru8zGT8e6yPmEEFShWppHX3YsAM9M_OUbogsHNtcdg3CZaL5Y35EHnkg/exec";

  const formatDateInput = (date) => {
    return date.toISOString().split("T")[0];
  };

  const formatDateMMDDYYYY = (date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const formatDateDDMMYYYY = (date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatDateTime = (date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  };

  const formatDateDisplay = (date) => {
    return date.toLocaleDateString("en-GB", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const [formData, setFormData] = useState({
    status: "",
    startDate: formatDateInput(new Date()),
    endDate: "",
    reason: "",
  });

  const showToast = (message, type = "success") => {
    const toast = document.createElement("div");
    const bgColor = type === "error" ? "bg-red-500" : "bg-green-500";

    toast.className = `fixed top-4 right-4 p-4 rounded-md text-white z-50 ${bgColor} max-w-sm shadow-lg`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) {
        document.body.removeChild(toast);
      }
    }, 3000);
  };

  const getFormattedAddress = async (latitude, longitude) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
      );
      const data = await response.json();

      if (data && data.display_name) {
        return data.display_name;
      } else {
        return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      }
    } catch (error) {
      console.error("Error getting formatted address:", error);
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    }
  };

  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by this browser."));
        return;
      }

      const options = {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      };

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;
          const mapLink = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

          const formattedAddress = await getFormattedAddress(
            latitude,
            longitude
          );

          const locationInfo = {
            latitude,
            longitude,
            mapLink,
            formattedAddress,
            timestamp: new Date().toISOString(),
            accuracy: position.coords.accuracy,
          };

          resolve(locationInfo);
        },
        (error) => {
          const errorMessages = {
            1: "Location permission denied. Please enable location services.",
            2: "Location information unavailable.",
            3: "Location request timed out.",
          };
          reject(
            new Error(errorMessages[error.code] || "An unknown error occurred.")
          );
        },
        options
      );
    });
  };

  const checkActiveSession = (attendanceData) => {
    if (!attendanceData || attendanceData.length === 0) {
      setHasActiveSession(false);
      setHasCheckedInToday(false);
      return;
    }

    const userRecords = attendanceData.filter(
      (record) =>
        record.salesPersonName === salesPersonName &&
        record.dateTime?.split(" ")[0].toString() ===
          formatDateDDMMYYYY(new Date())
    );

    if (userRecords.length === 0) {
      setHasActiveSession(false);
      setHasCheckedInToday(false);
      return;
    }

    const mostRecentRecord = userRecords[0];
    const hasActive = mostRecentRecord.status === "IN";
    setHasActiveSession(hasActive);
    if (hasActive) {
      setInData(mostRecentRecord);
    }

    const hasOutActive = mostRecentRecord.status === "OUT";
    if (hasOutActive) {
      setOutData(mostRecentRecord);
    }

    const hasCheckedIn = userRecords.some((record) => record.status === "IN");
    setHasCheckedInToday(hasCheckedIn);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.status) newErrors.status = "Status is required";

    if (formData.status === "Leave") {
      if (!formData.startDate) newErrors.startDate = "Start date is required";
      if (
        formData.startDate &&
        formData.endDate &&
        new Date(formData.endDate + "T00:00:00") <
          new Date(formData.startDate + "T00:00:00")
      ) {
        newErrors.endDate = "End date cannot be before start date";
      }
      if (!formData.reason) newErrors.reason = "Reason is required for leave";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const fetchAttendanceHistory = async () => {
    if (!isAuthenticated || !currentUser) {
      console.log(
        "Not authenticated or currentUser not available. Skipping history fetch."
      );
      setIsLoadingHistory(false);
      return;
    }

    setIsLoadingHistory(true);
    try {
      const attendanceSheetUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=Attendance`;
      const response = await fetch(attendanceSheetUrl);
      const text = await response.text();

      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}") + 1;
      const jsonData = text.substring(jsonStart, jsonEnd);
      const data = JSON.parse(jsonData);

      if (!data?.table?.rows) {
        console.warn("No rows found in Attendance sheet.");
        setAttendance([]);
        setIsLoadingHistory(false);
        return;
      }

      const rows = data.table.rows;
      const formattedHistory = rows
        .map((row) => {
          const salesPerson = row.c?.[9]?.v;
          let dateTime = row.c?.[1]?.v;
          let originalTimestamp = row.c?.[0]?.v;

          if (
            typeof originalTimestamp === "string" &&
            originalTimestamp.startsWith("Date(") &&
            originalTimestamp.endsWith(")")
          ) {
            try {
              const dateParts = originalTimestamp
                .substring(5, originalTimestamp.length - 1)
                .split(",");
              const year = parseInt(dateParts[0], 10);
              const month = parseInt(dateParts[1], 10);
              const day = parseInt(dateParts[2], 10);
              const hour = dateParts[3] ? parseInt(dateParts[3], 10) : 0;
              const minute = dateParts[4] ? parseInt(dateParts[4], 10) : 0;
              const second = dateParts[5] ? parseInt(dateParts[5], 10) : 0;

              const dateObj = new Date(year, month, day, hour, minute, second);
              dateTime = formatDateTime(dateObj);
            } catch (e) {
              console.error(
                "Error parsing original timestamp date string:",
                originalTimestamp,
                e
              );
              dateTime = originalTimestamp;
            }
          }

          const status = row.c?.[3]?.v;
          const mapLink = row.c?.[7]?.v;
          const address = row.c?.[8]?.v;

          return {
            salesPersonName: salesPerson,
            dateTime: dateTime,
            status: status,
            mapLink: mapLink,
            address: address,
            _originalTimestamp: originalTimestamp,
          };
        })
        .filter(Boolean);

      const filteredHistory = formattedHistory.filter(
        (entry) =>
          entry.salesPersonName === salesPersonName &&
          entry.dateTime?.split(" ")[0].toString() ===
            formatDateDDMMYYYY(new Date())
      );

      const filteredHistoryData =
        userRole.toLowerCase() === "admin"
          ? formattedHistory
          : formattedHistory.filter(
              (entry) => entry.salesPersonName === salesPersonName
            );

      filteredHistory.sort((a, b) => {
        const parseGvizDate = (dateString) => {
          if (
            typeof dateString === "string" &&
            dateString.startsWith("Date(") &&
            dateString.endsWith(")")
          ) {
            const dateParts = dateString
              .substring(5, dateString.length - 1)
              .split(",");
            const year = parseInt(dateParts[0], 10);
            const month = parseInt(dateParts[1], 10);
            const day = parseInt(dateParts[2], 10);
            const hour = dateParts[3] ? parseInt(dateParts[3], 10) : 0;
            const minute = dateParts[4] ? parseInt(dateParts[4], 10) : 0;
            const second = dateParts[5] ? parseInt(dateParts[5], 10) : 0;
            return new Date(year, month, day, hour, minute, second);
          }
          return new Date(dateString);
        };
        const dateA = parseGvizDate(a._originalTimestamp);
        const dateB = parseGvizDate(b._originalTimestamp);
        return dateB.getTime() - dateA.getTime();
      });

      filteredHistoryData.sort((a, b) => {
        const parseGvizDate = (dateString) => {
          if (
            typeof dateString === "string" &&
            dateString.startsWith("Date(") &&
            dateString.endsWith(")")
          ) {
            const dateParts = dateString
              .substring(5, dateString.length - 1)
              .split(",");
            const year = parseInt(dateParts[0], 10);
            const month = parseInt(dateParts[1], 10);
            const day = parseInt(dateParts[2], 10);
            const hour = dateParts[3] ? parseInt(dateParts[3], 10) : 0;
            const minute = dateParts[4] ? parseInt(dateParts[4], 10) : 0;
            const second = dateParts[5] ? parseInt(dateParts[5], 10) : 0;
            return new Date(year, month, day, hour, minute, second);
          }
          return new Date(dateString);
        };
        const dateA = parseGvizDate(a._originalTimestamp);
        const dateB = parseGvizDate(b._originalTimestamp);
        return dateB.getTime() - dateA.getTime();
      });

      setAttendance(filteredHistory);
      setHistoryAttendance(filteredHistoryData);

      checkActiveSession(filteredHistory);
    } catch (error) {
      console.error("Error fetching attendance history:", error);
      showToast("Failed to load attendance history.", "error");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchAttendanceHistory();
  }, [currentUser, isAuthenticated]);



  const startCamera = async () => {
  try {
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" } // "user" for front camera, "environment" for back camera
    });
    setStream(mediaStream);
    setShowCamera(true);
    if (videoRef.current) {
      videoRef.current.srcObject = mediaStream;
    }
  } catch (error) {
    showToast("Failed to access camera", "error");
  }
};

const capturePhoto = () => {
  const canvas = canvasRef.current;
  const video = videoRef.current;
  
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
  
  const photoData = canvas.toDataURL('image/jpeg');
  setCameraPhoto(photoData);
  stopCamera();
};

const stopCamera = () => {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
  setShowCamera(false);
  setStream(null);
};

const retakePhoto = () => {
  setCameraPhoto(null);
  startCamera();
};


  const handleSubmit = async (e) => {
    e.preventDefault();

    const InFiled = localStorage.getItem("InFiled") || "no";

    if (!validateForm()) {
      showToast("Please fill in all required fields correctly.", "error");
      return;
    }

    if (!isAuthenticated || !currentUser || !salesPersonName) {
      showToast("User data not loaded. Please try logging in again.", "error");
      return;
    }


//     if ((formData.status === "IN" || formData.status === "OUT") && !cameraPhoto) {
//   showToast("Please capture a photo before submitting", "error");
//   setIsSubmitting(false);
//   return;
// }

    if (formData?.status === "IN") {
      const indata = attendance.filter((item) => item.status === "IN");
      if (indata.length > 0) {
        showToast("Today Already in", "error");
        return;
      }
    }

    if (formData?.status === "OUT") {
      const indata = attendance.filter((item) => item.status === "IN");
      const outdata = attendance.filter((item) => item.status === "OUT");
      if (indata.length === 0) {
        showToast("First In", "error");
        return;
      }

      if (outdata.length > 0) {
        showToast("Today Already out", "error");
        return;
      }
    }

    setIsSubmitting(true);
    setIsGettingLocation(true);

    try {
      let currentLocation = null;
      try {
        currentLocation = await getCurrentLocation();

        if ((formData.status === "IN" || formData.status === "OUT") && InFiled === "yes") {
          const distance = calculateDistance(
            currentLocation.latitude,
            currentLocation.longitude,
            OFFICE_LOCATION.lat,
            OFFICE_LOCATION.lng
          );

          // Agar distance 10 meters se zyada hai
          if (distance > ALLOWED_RADIUS_METERS) {
            showToast(
              `You are ${distance.toFixed(1)} meters away from office. 
            Attendance only allowed within ${ALLOWED_RADIUS_METERS} meters radius.`,
              "error"
            );
            setIsSubmitting(false);
            setIsGettingLocation(false);
            return;
          }

          // Optional: Success message agar within radius hai
          showToast(
            `You are within ${ALLOWED_RADIUS_METERS}m radius (${distance.toFixed(
              1
            )}m)`,
            "success"
          );
        }
      } catch (locationError) {
        console.error("Location error:", locationError);
        showToast(locationError.message, "error");
        setIsSubmitting(false);
        setIsGettingLocation(false);
        return;
      }

      setIsGettingLocation(false);

      const currentDate = new Date();
      const timestamp = formatDateTime(currentDate);

      const dateForAttendance =
        formData.status === "IN" || formData.status === "OUT"
          ? formatDateTime(currentDate)
          : formData.startDate
          ? formatDateTime(new Date(formData.startDate + "T00:00:00"))
          : "";

      const endDateForLeave = formData.endDate
        ? formatDateTime(new Date(formData.endDate + "T00:00:00"))
        : "";

      let rowData = Array(16).fill("");
      rowData[0] = timestamp;
      rowData[1] = dateForAttendance;
      rowData[2] = endDateForLeave;
      rowData[3] = formData.status;
      rowData[4] = formData.reason;
      rowData[5] = currentLocation.latitude;
      rowData[6] = currentLocation.longitude;
      rowData[7] = currentLocation.mapLink;
      rowData[8] = currentLocation.formattedAddress;
      rowData[9] = salesPersonName;
      rowData[15] = cameraPhoto || "";

      const payload = {
        sheetName: "Attendance",
        action: "insert",
        rowData: JSON.stringify(rowData),
      };

      const urlEncodedData = new URLSearchParams(payload);

      try {
        const response = await fetch(APPS_SCRIPT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: urlEncodedData,
        });

        const successMessage =
          formData.status === "IN"
            ? "Check-in successful!"
            : formData.status === "OUT"
            ? "Check-out successful!"
            : "Leave application submitted successfully!";
        showToast(successMessage, "success");

        setFormData({
          status: "",
          startDate: formatDateInput(new Date()),
          endDate: "",
          reason: "",
        });

        setCameraPhoto(null);

        if (response.ok) {
          try {
            const responseText = await response.text();

            if (responseText.trim()) {
              const result = JSON.parse(responseText);
              if (result.success === false && result.activeSession) {
                await fetchAttendanceHistory();
                return;
              }
            }
          } catch (parseError) {
            console.log(
              "Response parsing issue, but success message already shown"
            );
          }
        }

        await fetchAttendanceHistory();
      } catch (fetchError) {
        console.error("Fetch error:", fetchError);

        const successMessage =
          formData.status === "IN"
            ? "Check-in successful!"
            : formData.status === "OUT"
            ? "Check-out successful!"
            : "Leave application submitted successfully!";
        showToast(successMessage, "success");

        setFormData({
          status: "",
          startDate: formatDateInput(new Date()),
          endDate: "",
          reason: "",
        });

        setTimeout(async () => {
          await fetchAttendanceHistory();
        }, 2000);
      }
    } catch (error) {
      console.error("Submission error:", error);
      showToast("Error recording attendance. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
      setIsGettingLocation(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === "status" && value === "Leave") {
      if (hasCheckedInToday) {
        setFormData((prev) => ({
          ...prev,
          [name]: value,
          startDate: "",
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          [name]: value,
          startDate: formatDateInput(new Date()),
        }));
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const showLeaveFields = formData.status === "Leave";

  if (!isAuthenticated || !currentUser || !currentUser.salesPersonName) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">
            {!isAuthenticated
              ? "Please log in to view this page."
              : "Loading user data..."}
          </p>
        </div>
      </div>
    );
  }



  const handlePhotoCapture = (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onloadend = () => {
      setCameraPhoto(reader.result); // Base64 string
    };
    reader.readAsDataURL(file);
  }
};

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-0 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Attendance Summary Card */}
        <AttendanceSummaryCard
          attendanceData={historyAttendance}
          isLoading={isLoadingHistory}
          userRole={userRole}
          salesPersonName={salesPersonName}
        />

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 px-8 py-6">
            <h3 className="text-2xl font-bold text-white mb-2">
              Mark Attendance
            </h3>
            <p className="text-emerald-50 text-lg">
              Record your daily attendance or apply for leave
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8 p-8">
            <div className="grid gap-6 lg:grid-cols-1">

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 bg-white border rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 text-slate-700 font-medium ${
                    errors.status ? "border-red-300" : "border-slate-200"
                  }`}
                >
                  <option value="">Select status</option>
                  <option value="IN">IN</option>
                  <option value="OUT">OUT</option>
                  <option value="Leave">Leave</option>
                </select>
                {errors.status && (
                  <p className="text-red-500 text-sm mt-2 font-medium">
                    {errors.status}
                  </p>
                )}
              </div>
            </div>

           {(formData.status === "IN" || formData.status === "OUT") && (
  <div className="space-y-2">
    <label className="block text-sm font-semibold text-slate-700 mb-3">
      Capture Photo (Required) *
    </label>
    
    {!showCamera && !cameraPhoto && (
      <button
        type="button"
        onClick={startCamera}
        className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium"
      >
        📷 Open Camera
      </button>
    )}
    
    {showCamera && (
      <div className="space-y-3">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full rounded-lg border-2 border-blue-500"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={capturePhoto}
            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
          >
            📸 Capture
          </button>
          <button
            type="button"
            onClick={stopCamera}
            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
          >
            ✕ Cancel
          </button>
        </div>
      </div>
    )}
    
    {cameraPhoto && (
      <div className="space-y-3">
        <img 
          src={cameraPhoto} 
          alt="Captured" 
          className="w-full max-w-sm rounded-lg border-2 border-green-500" 
        />
        <button
          type="button"
          onClick={retakePhoto}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
        >
          🔄 Retake Photo
        </button>
      </div>
    )}
    
    <canvas ref={canvasRef} style={{ display: 'none' }} />
  </div>
)}

            {!showLeaveFields && (
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-100">
                <div className="text-sm font-semibold text-emerald-700 mb-2">
                  Current Date & Time
                </div>
                <div className="text-sm sm:text-2xl font-bold text-emerald-800">
                  {formatDateDisplay(new Date())}
                </div>
                {(formData.status === "IN" || formData.status === "OUT") && (
                  <div className="mt-3 text-sm text-emerald-600">
                    📍 Location will be automatically captured when you submit
                  </div>
                )}
              </div>
            )}

            {showLeaveFields && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-0 sm:p-6 border border-amber-100 mb-6">
                <div className="text-sm font-semibold text-amber-700 mb-2">
                  Leave Application
                </div>
                <div className="text-lg font-bold text-amber-800">
                  {formatDateDisplay(new Date())}
                </div>
                <div className="mt-3 text-sm text-amber-600">
                  📍 Current location will be captured for leave application
                </div>
              </div>
            )}

            {showLeaveFields && (
              <div className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-3">
                      Start Date
                    </label>
                    <input
                      type="date"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 text-slate-700 font-medium"
                    />
                    {errors.startDate && (
                      <p className="text-red-500 text-sm mt-2 font-medium">
                        {errors.startDate}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-3">
                      End Date
                    </label>
                    <input
                      type="date"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleInputChange}
                      min={formData.startDate}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 text-slate-700 font-medium"
                    />
                    {errors.endDate && (
                      <p className="text-red-500 text-sm mt-2 font-medium">
                        {errors.endDate}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-3">
                    Reason
                  </label>
                  <textarea
                    name="reason"
                    value={formData.reason}
                    onChange={handleInputChange}
                    placeholder="Enter reason for leave"
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 text-slate-700 font-medium min-h-32 resize-none"
                  />
                  {errors.reason && (
                    <p className="text-red-500 text-sm mt-2 font-medium">
                      {errors.reason}
                    </p>
                  )}
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full lg:w-auto bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:via-teal-700 hover:to-cyan-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              disabled={
                isSubmitting ||
                isGettingLocation ||
                !currentUser?.salesPersonName
              }
            >
              {isGettingLocation ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Getting Location...
                </span>
              ) : isSubmitting ? (
                showLeaveFields ? (
                  "Submitting Leave..."
                ) : (
                  "Marking Attendance..."
                )
              ) : showLeaveFields ? (
                "Submit Leave Request"
              ) : (
                "Mark Attendance"
              )}
            </button>
          </form>
        </div>
      </div>

      <AttendanceHistory
        attendanceData={historyAttendance}
        isLoading={isLoadingHistory}
        userRole={userRole}
      />
    </div>
  );
};

export default Attendance;
