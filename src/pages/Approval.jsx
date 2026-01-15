import React, { useState, useEffect } from "react";

const Approval = () => {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [approvedRequests, setApprovedRequests] = useState(new Set());

  // Replace with your actual Google Apps Script URL
  const SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbylk0DYGG9b3iru8zGT8e6yPmEEFShWppHX3YsAM9M_OUbogsHNtcdg3CZaL5Y35EHnkg/exec";
  const SPREADSHEET_ID = "10coGuAVkdMNVUoX_L2HedehSb7d5lpgGQHTNjAZiGaQ";

  useEffect(() => {
    fetchLeaveRequests();
  }, []);

  //   const fetchLeaveRequests = async () => {
  //     try {
  //       setLoading(true);
  //       setError(null);

  //       // ✅ Use Google Sheets gviz API instead of Apps Script endpoint
  //       const attendanceSheetUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=Attendance`;

  //       const response = await fetch(attendanceSheetUrl);

  //       if (!response.ok) {
  //         throw new Error(`HTTP error! status: ${response.status}`);
  //       }

  //       const text = await response.text();

  //       // Parse the Google Visualization API response
  //       const jsonStart = text.indexOf("{");
  //       const jsonEnd = text.lastIndexOf("}") + 1;
  //       const jsonData = text.substring(jsonStart, jsonEnd);
  //       const data = JSON.parse(jsonData);

  //       if (!data?.table?.rows) {
  //         setLeaveRequests([]);
  //         return;
  //       }

  //       const rows = data.table.rows;
  //       const dataRows = rows.slice(1); // Skip header row

  //       const formattedRequests = dataRows
  //         .map((row, index) => ({
  //           rowNumber: index + 2, // Actual sheet row (skip header)
  //           dateTime: row.c?.[1]?.v || "", // Column B
  //           endDate: row.c?.[4]?.v || "", // Column E
  //           status: row.c?.[3]?.v || "", // Column D
  //           reason: row.c?.[4]?.v || "", // Column E
  //           address: row.c?.[8]?.v || "", // Column I
  //           personName: row.c?.[9]?.v || "", // Column J
  //           date: row.c?.[10]?.v || "", // Column K
  //           approvedStatus: row.c?.[14]?.v || "", // Column O
  //         }))
  //         .filter((item) => {
  //           const status = item.status?.toString().toLowerCase() || "";
  //           // Show all rows where Status contains "leave" (both pending and approved)
  //           return status.includes("leave");
  //         });

  //       setLeaveRequests(formattedRequests);
  //     } catch (err) {
  //       setError("Error loading data: " + err.message);
  //       console.error("Fetch error:", err);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };


  const fetchLeaveRequests = async () => {
    try {
      setLoading(true);
      setError(null);

      // ✅ Use Google Sheets gviz API instead of Apps Script endpoint
      const attendanceSheetUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=Attendance`;

      const response = await fetch(attendanceSheetUrl);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const text = await response.text();

      // Parse the Google Visualization API response
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}") + 1;
      const jsonData = text.substring(jsonStart, jsonEnd);
      const data = JSON.parse(jsonData);

      if (!data?.table?.rows) {
        setLeaveRequests([]);
        return;
      }

      const rows = data.table.rows;
      const dataRows = rows.slice(1); // Skip header row

      const formattedRequests = dataRows
        .map((row, index) => ({
          rowNumber: index + 2, // Actual sheet row (skip header)
          dateTime: row.c?.[1]?.v || "", // Column B
          endDate: row.c?.[4]?.v || "", // Column E
          status: row.c?.[3]?.v || "", // Column D
          reason: row.c?.[4]?.v || "", // Column E
          address: row.c?.[8]?.v || "", // Column I
          personName: row.c?.[9]?.v || "", // Column J
          date: row.c?.[10]?.v || "", // Column K
          approvedStatus: row.c?.[14]?.v || "", // Column O
        }))
        .filter((item) => {
          const status = item.status?.toString().toLowerCase() || "";
          // Show all rows where Status contains "leave" (both pending and approved)
          return status.includes("leave");
        })
        .sort((a, b) => {
          // Sort: unapproved first, then approved
          const aApproved = a.approvedStatus === "Approved" ? 1 : 0;
          const bApproved = b.approvedStatus === "Approved" ? 1 : 0;
          return aApproved - bApproved;
        });

      setLeaveRequests(formattedRequests);
    } catch (err) {
      setError("Error loading data: " + err.message);
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };


  const handleApprove = async (request) => {
    if (!window.confirm(`Approve leave request for ${request.personName}?`)) {
      return;
    }

    try {
      setProcessingId(request.rowNumber);

      const formData = new URLSearchParams();
      formData.append("action", "updateLeaveStatus");
      formData.append("rowNumber", request.rowNumber + 1);
      formData.append("status", "Approved");

      const response = await fetch(SCRIPT_URL, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const text = await response.text(); // Get as text first
      const result = JSON.parse(text); // Then parse

      if (result.success) {
        alert("Leave request approved successfully!");
        setApprovedRequests((prev) => new Set([...prev, request.rowNumber])); // ✅ Add this line
        fetchLeaveRequests(); // Refresh the list
      } else {
        alert("Error: " + (result.message || result.error));
      }
    } catch (err) {
      alert("Error approving request: " + err.message);
      console.error("Approval error:", err);
    } finally {
      setProcessingId(null);
    }
  };

  const formatDateTime = (dateValue) => {
    if (!dateValue) return "N/A";

    try {
      let date;

      // Handle Google Sheets Date() format
      if (
        typeof dateValue === "string" &&
        dateValue.startsWith("Date(") &&
        dateValue.endsWith(")")
      ) {
        const dateContent = dateValue.substring(5, dateValue.length - 1);
        const parts = dateContent
          .split(",")
          .map((part) => parseInt(part.trim()));
        if (parts.length >= 3) {
          const [year, month, day, hour = 0, minute = 0, second = 0] = parts;
          date = new Date(year, month, day, hour, minute, second);
        }
      } else {
        date = new Date(dateValue);
      }

      if (date && !isNaN(date.getTime())) {
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        const seconds = String(date.getSeconds()).padStart(2, "0");
        return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
      }

      return dateValue.toString();
    } catch (error) {
      return dateValue.toString();
    }
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return "N/A";

    try {
      // Handle Google Sheets Date() format
      if (
        typeof dateValue === "string" &&
        dateValue.startsWith("Date(") &&
        dateValue.endsWith(")")
      ) {
        const dateContent = dateValue.substring(5, dateValue.length - 1);
        const parts = dateContent
          .split(",")
          .map((part) => parseInt(part.trim()));
        if (parts.length === 3) {
          const [year, month, day] = parts;
          const date = new Date(year, month, day);
          if (!isNaN(date.getTime())) {
            const formattedDay = String(date.getDate()).padStart(2, "0");
            const formattedMonth = String(date.getMonth() + 1).padStart(2, "0");
            const formattedYear = date.getFullYear();
            return `${formattedDay}/${formattedMonth}/${formattedYear}`;
          }
        }
      }

      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      }

      return dateValue.toString();
    } catch (error) {
      return dateValue.toString();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading leave requests...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-red-800 font-semibold text-lg mb-2">Error</h2>
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchLeaveRequests}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
            <h1 className="text-2xl font-bold text-white">
              Leave Approval Requests
            </h1>
            <p className="text-blue-100 mt-1">
              {leaveRequests.length} pending{" "}
              {leaveRequests.length === 1 ? "request" : "requests"}
            </p>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {leaveRequests.length === 0 ? (
              <div className="text-center py-12">
                <svg
                  className="w-16 h-16 text-gray-300 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-gray-500 text-lg">
                  No pending leave requests
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      End Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Reason
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Person Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leaveRequests.map((request, index) => (
                    <tr
                      key={index}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDateTime(request.dateTime) || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(request.endDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          {request.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                        {request.reason || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                        {request.address || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {request.personName || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(request.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => handleApprove(request)}
                          disabled={
                            request.approvedStatus === "Approved" ||
                            processingId === request.rowNumber
                          } // ✅ Add the second condition
                          className={` ${request.approvedStatus === "Approved"
                            ? "bg-green-600 hover:bg-green-700 focus:ring-green-500"
                            : "bg-red-600 hover:bg-red-700 focus:ring-red-500"
                            } inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white  focus:outline-none focus:ring-2 focus:ring-offset-2  disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors`}
                        >
                          {processingId === request.rowNumber ? (
                            <>
                              <svg
                                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                ></circle>
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                              </svg>
                              Processing...
                            </>
                          ) : (
                            <>
                              <svg
                                className="w-4 h-4 mr-2"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                              {request.approvedStatus === "Approved"
                                ? "Approved"
                                : "Approve"}
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Refresh Button */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <button
              onClick={fetchLeaveRequests}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Approval;
