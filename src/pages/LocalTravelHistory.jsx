"use client";

import { useState, useEffect, useContext } from "react";
import { MapPin, Eye, Loader2, ChevronDown, ChevronUp, Calendar, Search, X, Car } from "lucide-react";
import { AuthContext } from "../context/AuthContext";

const LocalTravelHistory = () => {
  const [localTravels, setLocalTravels] = useState([]);
  const [filteredLocalTravels, setFilteredLocalTravels] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [expandedRows, setExpandedRows] = useState({});
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [isFiltering, setIsFiltering] = useState(false);

  const { currentUser, isAuthenticated } = useContext(AuthContext);

  const salesPersonName = currentUser?.salesPersonName || "Unknown User";
  const userRole = currentUser?.role || "User";

  const SPREADSHEET_ID = "10coGuAVkdMNVUoX_L2HedehSb7d5lpgGQHTNjAZiGaQ";

  const showToast = (message, type = "success") => {
    const toast = document.createElement("div");
    toast.className = `fixed top-4 right-4 p-4 rounded-md text-white z-50 ${
      type === "success" ? "bg-green-500" : "bg-red-500"
    }`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) {
        document.body.removeChild(toast);
      }
    }, 3000);
  };

  const formatDate = (dateString) => {
    if (!dateString || dateString.toString().trim() === "") return "-";
    
    try {
      const dateStr = dateString.toString();
      
      // Handle Google Sheets Date(YYYY,M,D) format
      if (dateStr.startsWith('Date(') && dateStr.endsWith(')')) {
        const dateContent = dateStr.substring(5, dateStr.length - 1);
        const parts = dateContent.split(',').map(part => parseInt(part.trim()));
        if (parts.length === 3) {
          const [year, month, day] = parts;
          const date = new Date(year, month, day);
          if (!isNaN(date.getTime())) {
            const formattedDay = String(date.getDate()).padStart(2, '0');
            const formattedMonth = String(date.getMonth() + 1).padStart(2, '0');
            const formattedYear = String(date.getFullYear()).slice(-2);
            return `${formattedDay}/${formattedMonth}/${formattedYear}`;
          }
        }
      }

      // Try parsing as Excel serial date first
      if (!isNaN(dateString)) {
        const excelSerialDate = parseInt(dateString);
        if (excelSerialDate > 0) {
          const date = new Date((excelSerialDate - 25569) * 86400 * 1000);
          if (!isNaN(date.getTime())) {
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = String(date.getFullYear()).slice(-2);
            return `${day}/${month}/${year}`;
          }
        }
      }

      // Handle MM/DD/YYYY format from Google Apps Script
      const parts = dateString.toString().split('/');
      if (parts.length === 3) {
        const month = parseInt(parts[0]);
        const day = parseInt(parts[1]);
        const year = parseInt(parts[2]);
        
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          const date = new Date(year > 99 ? year : 2000 + year, month, day);
          if (!isNaN(date.getTime())) {
            const formattedDay = String(date.getDate()).padStart(2, '0');
            const formattedMonth = String(date.getMonth() + 1).padStart(2, '0');
            const formattedYear = String(date.getFullYear()).slice(-2);
            return `${formattedDay}/${formattedMonth}/${formattedYear}`;
          }
        } else if (day >= 1 && day <= 12 && month >= 1 && month <= 31) {
          const date = new Date(year > 99 ? year : 2000 + year, day, month);
          if (!isNaN(date.getTime())) {
            const formattedDay = String(date.getDate()).padStart(2, '0');
            const formattedMonth = String(date.getMonth() + 1).padStart(2, '0');
            const formattedYear = String(date.getFullYear()).slice(-2);
            return `${formattedDay}/${formattedMonth}/${formattedYear}`;
          }
        }
      }

      // Try parsing as ISO date string
      let date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = String(date.getFullYear()).slice(-2);
        return `${day}/${month}/${year}`;
      }

      return dateString.toString();
    } catch (e) {
      console.warn("Date formatting error:", e);
      return dateString.toString();
    }
  };

  // Convert DD/MM/YY to Date object for comparison
  const parseLocalTravelDate = (dateStr) => {
    if (!dateStr || dateStr === "-") return null;
    
    try {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1; // Months are 0-indexed
        const year = parseInt(parts[2]) + 2000; // Assuming YY format, convert to YYYY
        
        return new Date(year, month, day);
      }
      return null;
    } catch (e) {
      console.warn("Error parsing local travel date:", e);
      return null;
    }
  };

  const normalizeDate = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  };

  const applyDateFilter = () => {
    if (!filterStartDate && !filterEndDate) {
      setFilteredLocalTravels(localTravels);
      setIsFiltering(false);
      return;
    }

    const startDate = filterStartDate ? normalizeDate(new Date(filterStartDate)) : null;
    const endDate = filterEndDate ? normalizeDate(new Date(filterEndDate)) : null;

    const filtered = localTravels.filter(localTravel => {
      const localTravelDate = parseLocalTravelDate(localTravel.travelDate);
      if (!localTravelDate) return false;

      const normalizedLocalTravelDate = normalizeDate(localTravelDate);

      if (startDate && endDate) {
        return normalizedLocalTravelDate >= startDate && normalizedLocalTravelDate <= endDate;
      } else if (endDate) {
        return normalizedLocalTravelDate.getTime() === endDate.getTime();
      } else {
        return true;
      }
    });

    setFilteredLocalTravels(filtered);
    setIsFiltering(true);
  };

  const clearFilters = () => {
    setFilterStartDate("");
    setFilterEndDate("");
    setFilteredLocalTravels(localTravels);
    setIsFiltering(false);
  };

  // Apply filter automatically when dates change
  useEffect(() => {
    applyDateFilter();
  }, [filterEndDate]);

  const fetchLocalTravelHistory = async () => {
    if (!isAuthenticated || !currentUser) {
      console.log("Not authenticated or currentUser not available. Skipping local travel history fetch.");
      setIsLoadingHistory(false);
      return;
    }

    setIsLoadingHistory(true);
    try {
      const fmsSheetUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=FMS`;
      const response = await fetch(fmsSheetUrl);
      const text = await response.text();

      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}") + 1;
      const jsonData = text.substring(jsonStart, jsonEnd);
      const data = JSON.parse(jsonData);

      if (!data?.table?.rows) {
        console.warn("No rows found in FMS sheet.");
        setLocalTravels([]);
        setFilteredLocalTravels([]);
        setIsLoadingHistory(false);
        return;
      }

      // Skip the header row (first row)
      const rows = data.table.rows.slice(1);
      const formattedHistory = rows.map((row, index) => {
        // FMS Sheet Column Mapping:
        // A - Timestamp
        // B - Empty (skipped in your current structure)
        // C - Person Name  
        // D - From Location
        // E - To Location
        // F - Vehicle Type
        // G - In Meter Number (previously Vehicle Meter Number)
        // H - Out Meter Number
        // I - Vehicle Images (combined IN/OUT images)
        // J - Travel Date
        // K - Remarks
        // L - Total Meter Number
        // M, N - Empty (skipped as per your requirement)
        // O - Additional field if needed
        // P - Out Image (separate OUT images)

        const timestamp = row.c?.[0]?.v;
        const personName = row.c?.[2]?.v; // Column C
        const fromLocation = row.c?.[3]?.v; // Column D
        const toLocation = row.c?.[4]?.v; // Column E
        const vehicleType = row.c?.[5]?.v; // Column F
        const inMeterNumber = row.c?.[6]?.v; // Column G - In Meter Number
        const outMeterNumber = row.c?.[17]?.v; // Column H - Out Meter Number
        const vehicleImages = row.c?.[8]?.v; // Column I
        const travelDate = row.c?.[9]?.v; // Column J
        const remarks = row.c?.[10]?.v; // Column K
        const totalMeterNumber = row.c?.[7]?.v; // Column L - Total Meter Number
        const outImage = row.c?.[15]?.v; // Column P (Out Image)

        return {
          timestamp,
          personName,
          travelDate: formatDate(travelDate),
          fromLocation,
          toLocation,
          vehicleType,
          inMeterNumber,
          outMeterNumber,
          totalMeterNumber,
          vehicleImages,
          outImage,
          remarks,
          originalIndex: index
        };
      }).filter(entry => entry.personName); // Filter out entries without person name

      const filteredHistory =
        userRole === "admin"
          ? formattedHistory
          : formattedHistory.filter(
              (entry) => entry.personName === salesPersonName
            );

      filteredHistory.sort((a, b) => {
        return b.originalIndex - a.originalIndex;
      });

      setLocalTravels(filteredHistory);
      setFilteredLocalTravels(filteredHistory);
    } catch (error) {
      console.error("Error fetching local travel history:", error);
      showToast("Failed to load local travel history.", "error");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchLocalTravelHistory();
  }, [currentUser, isAuthenticated]);

  const viewImageLink = (link) => {
    if (link && typeof link === 'string') {
      // Handle multiple image links separated by " | "
      const links = link.split(' | ');
      // Open the first link, or you can modify to show all
      window.open(links[0], '_blank');
    } else {
      showToast("Image link not available.", "error");
    }
  };

  const toggleRowExpansion = (index) => {
    setExpandedRows(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const renderImageButton = (images, label) => {
    if (images && images.trim() !== "") {
      const imageLinks = images.split(' | ').filter(link => link.trim() !== "");
      if (imageLinks.length > 0) {
        return (
          <div className="flex flex-wrap gap-2">
            {imageLinks.map((link, index) => (
              <button
                key={index}
                onClick={() => viewImageLink(link)}
                className="inline-flex items-center px-2 py-1 border border-transparent text-xs leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
              >
                <Eye className="h-3 w-3 mr-1" />
                View {imageLinks.length > 1 ? `${index + 1}` : ''}
              </button>
            ))}
          </div>
        );
      }
    }
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600">
        Not uploaded
      </span>
    );
  };

  if (!isAuthenticated || !currentUser || !currentUser.salesPersonName) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-red-600 mx-auto mb-4" />
          <p className="text-slate-600 font-medium">
            {!isAuthenticated
              ? "Please log in to view this page."
              : "Loading user data..."}
          </p>
        </div>
      </div>
    );
  }

  const displayLocalTravels = isFiltering ? filteredLocalTravels : localTravels;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
         <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center">
                  <Car className="h-7 w-7 mr-2" />
                  Local Travel History
                </h1>
                <p className="text-green-100 mt-1">View all your local travel records and vehicle information</p>
              </div>
            </div>
          </div>

          {/* Filter Section */}
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Filter by Date:</span>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 flex-1">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600 whitespace-nowrap">From:</label>
                  <input
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600 whitespace-nowrap">To:</label>
                  <input
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                {(filterStartDate || filterEndDate) && (
                  <button
                    onClick={clearFilters}
                    className="inline-flex items-center px-4 py-2 bg-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Filter Results Info */}
            {isFiltering && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800">
                  Showing {filteredLocalTravels.length} of {localTravels.length} records
                  {filterStartDate && ` from ${new Date(filterStartDate).toLocaleDateString()}`}
                  {filterEndDate && ` to ${new Date(filterEndDate).toLocaleDateString()}`}
                </p>
              </div>
            )}
          </div>

          <div className="p-6">
            {isLoadingHistory ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="animate-spin h-8 w-8 text-green-600 mr-3" />
                <span className="text-slate-600">Loading local travel history...</span>
              </div>
            ) : displayLocalTravels.length === 0 ? (
              <div className="text-center py-12">
                <Car className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 text-lg font-medium">
                  {isFiltering ? "No matching local travel records found" : "No local travel records found"}
                </p>
                <p className="text-slate-400 mt-2">
                  {isFiltering ? "Try adjusting your filter criteria" : "Your local travel submissions will appear here"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
               {displayLocalTravels.slice(0, -1).map((localTravel, index) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                    {/* Main Row - Always Visible with Updated Header */}
                    <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                      <div className="flex justify-between items-center">
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 flex-grow">
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Travel Date</p>
                            <p className="text-sm font-medium text-gray-900">
                              {localTravel.travelDate === "Invalid Date" ? "-" : localTravel.travelDate}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Route</p>
                            <p className="text-sm text-gray-900">{localTravel.fromLocation} → {localTravel.toLocation}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Vehicle</p>
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              {localTravel.vehicleType}
                            </span>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">In Meter Number</p>
                            <p className="text-sm text-gray-900">{localTravel.inMeterNumber || "-"}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Out Meter Number</p>
                            <p className="text-sm text-gray-900">{localTravel.outMeterNumber || "-"}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Total Meter Number</p>
                            <p className="text-sm font-medium text-blue-600">{localTravel.totalMeterNumber || "-"}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => toggleRowExpansion(index)}
                          className="ml-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {expandedRows[index] ? 
                            <ChevronUp className="h-5 w-5" /> : 
                            <ChevronDown className="h-5 w-5" />
                          }
                        </button>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedRows[index] && (
                      <div className="px-6 py-4 space-y-6">
                        {/* Basic Information */}
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 mb-3">Travel Details</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <p className="text-sm font-medium text-gray-500">Vehicle Type</p>
                              <p className="text-sm text-gray-900">{localTravel.vehicleType || '-'}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-500">In Meter Number</p>
                              <p className="text-sm text-gray-900">{localTravel.inMeterNumber || '-'}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-500">Out Meter Number</p>
                              <p className="text-sm text-gray-900">{localTravel.outMeterNumber || '-'}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-500">Total Meter Number</p>
                              <p className="text-sm font-semibold text-blue-600">{localTravel.totalMeterNumber || '-'}</p>
                            </div>
                          </div>
                        </div>

                        {/* Remarks */}
                        {localTravel.remarks && (
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900 mb-3">Remarks</h4>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <p className="text-sm text-gray-900">{localTravel.remarks}</p>
                            </div>
                          </div>
                        )}

                        {/* Vehicle Images */}
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 mb-3">Vehicle Images</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                              <div className="flex justify-between items-center">
                                <div>
                                  <h5 className="text-sm font-semibold text-orange-900">IN Travel Images</h5>
                                  <p className="text-xs text-orange-700 mt-1">Vehicle meter/ticket images</p>
                                </div>
                                {renderImageButton(localTravel.vehicleImages, "IN Images")}
                              </div>
                            </div>
                            
                            {localTravel.outImage && (
                              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <div className="flex justify-between items-center">
                                  <div>
                                    <h5 className="text-sm font-semibold text-green-900">OUT Travel Images</h5>
                                    <p className="text-xs text-green-700 mt-1">OUT vehicle images</p>
                                  </div>
                                  {renderImageButton(localTravel.outImage, "OUT Images")}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Admin Information */}
                        {userRole === "admin" && (
                          <div className="pt-4 border-t border-gray-200">
                            <p className="text-sm font-medium text-gray-500">Submitted by: 
                              <span className="text-gray-900 ml-1">{localTravel.personName}</span>
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocalTravelHistory;
