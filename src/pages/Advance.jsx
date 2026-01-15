"use client";

import { useState, useEffect, useContext } from "react";
import { MapPin, Loader2, ArrowLeft, Calendar, DollarSign, Building, FileText, History, CheckCircle } from "lucide-react";
import { AuthContext } from "../context/AuthContext";

const Advance = () => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({});
    const [showHistory, setShowHistory] = useState(false);
    const [showAdminHistory, setShowAdminHistory] = useState(false);
    const [advanceHistory, setAdvanceHistory] = useState([]);
    const [adminHistory, setAdminHistory] = useState([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    const { currentUser, isAuthenticated } = useContext(AuthContext);
    const salesPersonName = currentUser?.salesPersonName || "Unknown User";
    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'Admin';

    const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbylk0DYGG9b3iru8zGT8e6yPmEEFShWppHX3YsAM9M_OUbogsHNtcdg3CZaL5Y35EHnkg/exec";
    const SPREADSHEET_ID = "10coGuAVkdMNVUoX_L2HedehSb7d5lpgGQHTNjAZiGaQ";

    const formatDateInput = (date) => {
        return date.toISOString().split("T")[0];
    };

    const [formData, setFormData] = useState({
        salesPersonName: salesPersonName,
        fromLocation: "",
        toLocation: "",
        startDate: formatDateInput(new Date()),
        endDate: formatDateInput(new Date()),
        travelType: "",
        advanceAmount: "",
        companyName: "",
        remarks: ""
    });

    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            salesPersonName: salesPersonName
        }));

        // ✅ FIXED: Auto-show for admin, but allow users to see form
        if (isAdmin) {
            setShowHistory(true);
            fetchAdvanceHistory();
        }
    }, [salesPersonName, isAdmin]);

    const showToast = (message, type = "success") => {
        const toast = document.createElement("div");
        toast.className = `fixed top-4 right-4 p-4 rounded-md text-white z-50 ${type === "success" ? "bg-green-500" :
            type === "info" ? "bg-blue-500" :
                "bg-red-500"
            }`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            if (toast.parentNode) {
                document.body.removeChild(toast);
            }
        }, 3000);
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.fromLocation.trim()) {
            newErrors.fromLocation = "From location is required";
        }
        if (!formData.toLocation.trim()) {
            newErrors.toLocation = "To location is required";
        }
        if (!formData.startDate) {
            newErrors.startDate = "Start date is required";
        }
        if (!formData.endDate) {
            newErrors.endDate = "End date is required";
        }
        if (!formData.travelType) {
            newErrors.travelType = "Travel type is required";
        }
        if (!formData.advanceAmount || parseFloat(formData.advanceAmount) <= 0) {
            newErrors.advanceAmount = "Valid advance amount is required";
        }
        if (!formData.companyName.trim()) {
            newErrors.companyName = "Company name is required";
        }

        if (formData.startDate && formData.endDate) {
            if (new Date(formData.endDate) < new Date(formData.startDate)) {
                newErrors.endDate = "End date cannot be earlier than start date";
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ""
            }));
        }

        if (name === "startDate") {
            const endDateField = document.getElementById("endDate");
            if (endDateField) {
                endDateField.min = value;
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            showToast("Please fix the form errors", "error");
            return;
        }

        setIsSubmitting(true);

        try {
            const rowData = [
                "",
                formData.salesPersonName,
                formData.fromLocation,
                formData.toLocation,
                formData.startDate,
                formData.endDate,
                formData.travelType,
                formData.advanceAmount,
                formData.companyName,
                formData.remarks || ""
            ];

            const formPayload = new URLSearchParams({
                action: "submitAdvance",
                rowData: JSON.stringify(rowData)
            });

            const response = await fetch(APPS_SCRIPT_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: formPayload
            });

            let result;
            try {
                result = await response.json();
            } catch (jsonError) {
                result = { success: true, message: "Request submitted successfully" };
            }

            if (result.success !== false) {
                showToast("Advance request submitted successfully!", "success");

                setFormData({
                    salesPersonName: salesPersonName,
                    fromLocation: "",
                    toLocation: "",
                    startDate: formatDateInput(new Date()),
                    endDate: formatDateInput(new Date()),
                    travelType: "",
                    advanceAmount: "",
                    companyName: "",
                    remarks: ""
                });
                setErrors({});
            } else {
                showToast(result.message || "Submission failed", "error");
            }

        } catch (error) {
            console.error("Submit error:", error);
            showToast("Request submitted. Please check the sheet to confirm.", "info");

            setFormData({
                salesPersonName: salesPersonName,
                fromLocation: "",
                toLocation: "",
                startDate: formatDateInput(new Date()),
                endDate: formatDateInput(new Date()),
                travelType: "",
                advanceAmount: "",
                companyName: "",
                remarks: ""
            });
            setErrors({});
        } finally {
            setIsSubmitting(false);
        }
    };

    // ✅ FIXED: Fetch Admin History (Completed Requests)
    const fetchAdminHistory = async () => {
        try {
            setIsLoadingHistory(true);
            setAdminHistory([]);

            console.log("🔍 Fetching admin completed history");

            const advanceSheetUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=Advance`;

            const response = await fetch(advanceSheetUrl);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const text = await response.text();

            const jsonStart = text.indexOf("{");
            const jsonEnd = text.lastIndexOf("}") + 1;
            const jsonData = text.substring(jsonStart, jsonEnd);
            const data = JSON.parse(jsonData);

            if (!data?.table?.rows) {
                console.warn("No rows found in Advance sheet.");
                setAdminHistory([]);
                showToast("No completed requests found", "info");
                return;
            }

            const rows = data.table.rows;
            const dataRows = rows.slice(1);

            const formattedHistory = dataRows
                .map((row, arrayIndex) => {
                    const actualSheetRow = arrayIndex + 2;

                    const timestamp = row.c?.[0]?.v || '';
                    const serialNumber = row.c?.[1]?.v || '';
                    const personName = row.c?.[2]?.v || '';
                    const fromLocation = row.c?.[3]?.v || '';
                    const toLocation = row.c?.[4]?.v || '';
                    const startDate = row.c?.[5]?.v || '';
                    const endDate = row.c?.[6]?.v || '';
                    const travelType = row.c?.[7]?.v || '';
                    const advanceAmount = row.c?.[8]?.v || '';
                    const companyName = row.c?.[9]?.v || '';
                    const remarks = row.c?.[10]?.v || '';
                    const planned = row.c?.[11]?.v || ''; // Column L
                    const actual = row.c?.[12]?.v || ''; // Column M
                    const status = row.c?.[14]?.v || 'Pending'; // Column O
                    const adminRemarks = row.c?.[15]?.v || ''; // Column P
                    const approvedBy = row.c?.[16]?.v || ''; // Column Q

                    return {
                        timestamp: formatTimestamp(timestamp),
                        serialNumber,
                        salesPersonName: personName,
                        fromLocation,
                        toLocation,
                        startDate: formatDate(startDate),
                        endDate: formatDate(endDate),
                        travelType,
                        advanceAmount,
                        companyName,
                        remarks,
                        planned,
                        actual,
                        status,
                        adminRemarks,
                        approvedBy,
                        originalIndex: actualSheetRow,
                        rowIndex: arrayIndex
                    };
                })
                .filter(item => {
                    // Skip incomplete rows
                    if (!item.serialNumber || !item.salesPersonName || !item.fromLocation || !item.toLocation) {
                        return false;
                    }

                    // ✅ FIXED: Show completed requests (both planned and actual not null)
                    const hasPlanned = item.planned && item.planned !== '' && item.planned !== null;
                    const hasActual = item.actual && item.actual !== '' && item.actual !== null;
                    const isCompleted = hasPlanned && hasActual;

                    console.log(`Admin History - Serial ${item.serialNumber}: planned="${item.planned}", actual="${item.actual}", isCompleted=${isCompleted}`);
                    return isCompleted;
                })
                .sort((a, b) => {
                    const serialA = a.serialNumber || '';
                    const serialB = b.serialNumber || '';

                    const numA = parseInt(serialA.split('-')[1] || '0');
                    const numB = parseInt(serialB.split('-')[1] || '0');

                    return numB - numA; // Newest first (DESC)
                });

            console.log("📋 Admin History Results:", formattedHistory.length, "completed requests");
            setAdminHistory(formattedHistory);
            showToast(`Found ${formattedHistory.length} completed requests`, "info");

        } catch (error) {
            console.error("💥 Error fetching admin history:", error);
            showToast("Failed to load admin history. Please try again.", "error");
            setAdminHistory([]);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    // ✅ FIXED: Fetch Pending Requests for Admin Action or User History
    const fetchAdvanceHistory = async () => {
        try {
            setIsLoadingHistory(true);
            setAdvanceHistory([]);

            if (!salesPersonName || salesPersonName === "Unknown User") {
                showToast("Please ensure you are properly logged in", "error");
                return;
            }

            console.log("🔍 Fetching advance history for:", salesPersonName, "isAdmin:", isAdmin);

            const advanceSheetUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=Advance`;

            const response = await fetch(advanceSheetUrl);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const text = await response.text();

            const jsonStart = text.indexOf("{");
            const jsonEnd = text.lastIndexOf("}") + 1;
            const jsonData = text.substring(jsonStart, jsonEnd);
            const data = JSON.parse(jsonData);

            if (!data?.table?.rows) {
                console.warn("No rows found in Advance sheet.");
                setAdvanceHistory([]);
                showToast("No advance requests found", "info");
                return;
            }

            const rows = data.table.rows;
            const dataRows = rows.slice(1);

            const formattedHistory = dataRows
                .map((row, arrayIndex) => {
                    const actualSheetRow = arrayIndex + 2;

                    const timestamp = row.c?.[0]?.v || '';
                    const serialNumber = row.c?.[1]?.v || '';
                    const personName = row.c?.[2]?.v || '';
                    const fromLocation = row.c?.[3]?.v || '';
                    const toLocation = row.c?.[4]?.v || '';
                    const startDate = row.c?.[5]?.v || '';
                    const endDate = row.c?.[6]?.v || '';
                    const travelType = row.c?.[7]?.v || '';
                    const advanceAmount = row.c?.[8]?.v || '';
                    const companyName = row.c?.[9]?.v || '';
                    const remarks = row.c?.[10]?.v || '';
                    const planned = row.c?.[11]?.v || ''; // Column L
                    const actual = row.c?.[12]?.v || ''; // Column M
                    const status = row.c?.[14]?.v || 'Pending'; // Column O
                    const adminRemarks = row.c?.[15]?.v || ''; // Column P
                    const approvedBy = row.c?.[16]?.v || ''; // Column Q

                    return {
                        timestamp: formatTimestamp(timestamp),
                        serialNumber,
                        salesPersonName: personName,
                        fromLocation,
                        toLocation,
                        startDate: formatDate(startDate),
                        endDate: formatDate(endDate),
                        travelType,
                        advanceAmount,
                        companyName,
                        remarks,
                        planned,
                        actual,
                        status,
                        adminRemarks,
                        approvedBy,
                        originalIndex: actualSheetRow,
                        rowIndex: arrayIndex
                    };
                })
                .filter(item => {
                    if (!item.serialNumber || !item.salesPersonName || !item.fromLocation || !item.toLocation) {
                        return false;
                    }

                    if (isAdmin) {
                        // ✅ FIXED: Admin sees pending requests (planned NOT null, actual IS null)
                        const hasPlanned = item.planned && item.planned !== '' && item.planned !== null;
                        const hasActual = item.actual && item.actual !== '' && item.actual !== null;
                        const isPendingForAction = hasPlanned && !hasActual;

                        console.log(`Admin Action - Serial ${item.serialNumber}: planned="${item.planned}", actual="${item.actual}", isPendingForAction=${isPendingForAction}`);
                        return isPendingForAction;
                    } else {
                        // User sees their own requests (all)
                        const isOwnRequest = item.salesPersonName === salesPersonName;
                        console.log(`User History - Serial ${item.serialNumber}: isOwn=${isOwnRequest}`);
                        return isOwnRequest;
                    }
                })
                .sort((a, b) => {
                    const serialA = a.serialNumber || '';
                    const serialB = b.serialNumber || '';

                    const numA = parseInt(serialA.split('-')[1] || '0');
                    const numB = parseInt(serialB.split('-')[1] || '0');

                    return numA - numB; // Ascending order
                });

            console.log("📋 History Results:", formattedHistory.length, isAdmin ? "pending requests" : "user requests");
            setAdvanceHistory(formattedHistory);
            showToast(`Found ${formattedHistory.length} ${isAdmin ? "pending" : ""} requests`, "info");

        } catch (error) {
            console.error("💥 Error fetching advance history:", error);
            showToast("Failed to load advance history. Please try again.", "error");
            setAdvanceHistory([]);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    // Helper functions for date formatting
    const formatTimestamp = (timestampValue) => {
        if (!timestampValue) return '';

        try {
            let date;

            if (typeof timestampValue === 'string' && timestampValue.startsWith('Date(') && timestampValue.endsWith(')')) {
                const dateContent = timestampValue.substring(5, timestampValue.length - 1);
                const parts = dateContent.split(',').map(part => parseInt(part.trim()));
                if (parts.length >= 3) {
                    const [year, month, day, hour = 0, minute = 0, second = 0] = parts;
                    date = new Date(year, month, day, hour, minute, second);
                }
            } else {
                date = new Date(timestampValue);
            }

            if (date && !isNaN(date.getTime())) {
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                return `${day}/${month}/${year} ${hours}:${minutes}`;
            }

            return timestampValue.toString();
        } catch (error) {
            return timestampValue.toString();
        }
    };

    const formatDate = (dateValue) => {
        if (!dateValue) return '';

        try {
            if (typeof dateValue === 'string' && dateValue.startsWith('Date(') && dateValue.endsWith(')')) {
                const dateContent = dateValue.substring(5, dateValue.length - 1);
                const parts = dateContent.split(',').map(part => parseInt(part.trim()));
                if (parts.length === 3) {
                    const [year, month, day] = parts;
                    const date = new Date(year, month, day);
                    if (!isNaN(date.getTime())) {
                        const formattedDay = String(date.getDate()).padStart(2, '0');
                        const formattedMonth = String(date.getMonth() + 1).padStart(2, '0');
                        const formattedYear = date.getFullYear();
                        return `${formattedDay}/${formattedMonth}/${formattedYear}`;
                    }
                }
            }

            const date = new Date(dateValue);
            if (!isNaN(date.getTime())) {
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                return `${day}/${month}/${year}`;
            }

            return dateValue.toString();
        } catch (error) {
            return dateValue.toString();
        }
    };

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

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-0 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {showAdminHistory ? (
                    // Admin History Page
                    <AdminHistoryPage
                        onBack={() => {
                            setShowAdminHistory(false);
                            setShowHistory(true); // ✅ FIXED: Go back to admin action page
                        }}
                        isLoading={isLoadingHistory}
                        history={adminHistory}
                        onRefreshHistory={fetchAdminHistory}
                        showToast={showToast}
                        salesPersonName={salesPersonName}
                        formatTimestamp={formatTimestamp} // ✅ FIXED: Pass formatter
                    />
                ) : showHistory ? (
                    // Admin Action Page or User History Page
                    <AdvanceHistory
                        salesPersonName={salesPersonName}
                        onBack={() => setShowHistory(false)} // ✅ FIXED: Users can go back to form
                        isLoading={isLoadingHistory}
                        history={advanceHistory}
                        onRefreshHistory={fetchAdvanceHistory}
                        showToast={showToast}
                        APPS_SCRIPT_URL={APPS_SCRIPT_URL}
                        isAdmin={isAdmin}
                        onShowAdminHistory={() => {
                            setShowAdminHistory(true);
                            fetchAdminHistory();
                        }}
                    />
                ) : (
                    // ✅ FIXED: User Form (show for non-admin users or when history is not shown)
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden h-full flex flex-col">
                        <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-8 py-6">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="text-2xl font-bold text-white mb-2">
                                        Advance Request
                                    </h3>
                                    <p className="text-emerald-50 text-lg">
                                        Submit your travel advance request
                                    </p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => {
                                            setShowHistory(true);
                                            fetchAdvanceHistory();
                                        }}
                                        className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 text-white hover:bg-white/20 transition-all duration-200"
                                    >
                                        <FileText className="h-5 w-5" />
                                        <span className="font-medium">History</span>
                                    </button>
                                    <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
                                        <span className="text-white font-medium">{salesPersonName}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6 p-8">
                            {/* Sales Person Name */}
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-slate-700 mb-3">
                                    Sales Person Name
                                </label>
                                <input
                                    type="text"
                                    name="salesPersonName"
                                    value={formData.salesPersonName}
                                    readOnly
                                    className="w-full px-4 py-3 bg-gray-100 border border-slate-200 rounded-xl shadow-sm text-slate-700 font-medium cursor-not-allowed"
                                />
                            </div>

                            {/* From and To Location */}
                            <div className="grid gap-6 lg:grid-cols-2">
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-slate-700 mb-3">
                                        From Location *
                                    </label>
                                    <input
                                        type="text"
                                        name="fromLocation"
                                        value={formData.fromLocation}
                                        onChange={handleInputChange}
                                        placeholder="Enter departure location"
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 text-slate-700 font-medium"
                                    />
                                    {errors.fromLocation && (
                                        <p className="text-red-500 text-sm mt-2 font-medium">
                                            {errors.fromLocation}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-slate-700 mb-3">
                                        To Location *
                                    </label>
                                    <input
                                        type="text"
                                        name="toLocation"
                                        value={formData.toLocation}
                                        onChange={handleInputChange}
                                        placeholder="Enter destination location"
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 text-slate-700 font-medium"
                                    />
                                    {errors.toLocation && (
                                        <p className="text-red-500 text-sm mt-2 font-medium">
                                            {errors.toLocation}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Start and End Dates */}
                            <div className="grid gap-6 lg:grid-cols-2">
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-slate-700 mb-3">
                                        <Calendar className="inline h-4 w-4 mr-2" />
                                        Start Date *
                                    </label>
                                    <input
                                        type="date"
                                        name="startDate"
                                        value={formData.startDate}
                                        onChange={handleInputChange}
                                        min={formatDateInput(new Date())}
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
                                        <Calendar className="inline h-4 w-4 mr-2" />
                                        End Date *
                                    </label>
                                    <input
                                        type="date"
                                        id="endDate"
                                        name="endDate"
                                        value={formData.endDate}
                                        onChange={handleInputChange}
                                        min={formData.startDate || formatDateInput(new Date())}
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 text-slate-700 font-medium"
                                    />
                                    {errors.endDate && (
                                        <p className="text-red-500 text-sm mt-2 font-medium">
                                            {errors.endDate}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Travel Type and Advance Amount */}
                            <div className="grid gap-6 lg:grid-cols-2">
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-slate-700 mb-3">
                                        Travel Type *
                                    </label>
                                    <select
                                        name="travelType"
                                        value={formData.travelType}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 text-slate-700 font-medium"
                                    >
                                        <option value="">Select travel type</option>
                                        <option value="Bus">Bus</option>
                                        <option value="Train">Train</option>
                                        <option value="Flight">Flight</option>
                                    </select>
                                    {errors.travelType && (
                                        <p className="text-red-500 text-sm mt-2 font-medium">
                                            {errors.travelType}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-slate-700 mb-3">
                                        <DollarSign className="inline h-4 w-4 mr-2" />
                                        Advance Amount (₹) *
                                    </label>
                                    <input
                                        type="number"
                                        name="advanceAmount"
                                        value={formData.advanceAmount}
                                        onChange={handleInputChange}
                                        placeholder="Enter advance amount"
                                        min="0"
                                        step="0.01"
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 text-slate-700 font-medium"
                                    />
                                    {errors.advanceAmount && (
                                        <p className="text-red-500 text-sm mt-2 font-medium">
                                            {errors.advanceAmount}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Company Name */}
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-slate-700 mb-3">
                                    <Building className="inline h-4 w-4 mr-2" />
                                    Visit Company Name *
                                </label>
                                <input
                                    type="text"
                                    name="companyName"
                                    value={formData.companyName}
                                    onChange={handleInputChange}
                                    placeholder="Enter company name to visit"
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 text-slate-700 font-medium"
                                />
                                {errors.companyName && (
                                    <p className="text-red-500 text-sm mt-2 font-medium">
                                        {errors.companyName}
                                    </p>
                                )}
                            </div>

                            {/* Remarks */}
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-slate-700 mb-3">
                                    Remarks
                                </label>
                                <textarea
                                    name="remarks"
                                    value={formData.remarks}
                                    onChange={handleInputChange}
                                    placeholder="Enter any additional remarks"
                                    rows={3}
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 text-slate-700 font-medium resize-none"
                                />
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:via-teal-700 hover:to-cyan-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Submitting Advance Request...
                                    </span>
                                ) : (
                                    "Submit Advance Request"
                                )}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};

// ✅ FIXED: Admin History Component
const AdminHistoryPage = ({ onBack, isLoading, history, onRefreshHistory, showToast, salesPersonName, formatTimestamp }) => {
    return (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden h-full flex flex-col">
            <div className="bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 px-8 py-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onBack}
                            className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 text-white hover:bg-white/20 transition-all duration-200"
                        >
                            <ArrowLeft className="h-5 w-5" />
                            <span>Back</span>
                        </button>
                        <div>
                            <h3 className="text-2xl font-bold text-white mb-2">
                                <History className="inline h-6 w-6 mr-2" />
                                Completed Requests History
                            </h3>
                            <p className="text-emerald-50 text-lg">
                                View all approved and rejected advance requests
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
                        <span className="text-white font-medium">{salesPersonName}</span>
                        <span className="text-yellow-300 ml-2 text-sm">(Admin)</span>
                    </div>
                </div>
            </div>

            <div className="p-8">
                {isLoading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                        <p className="text-slate-600 font-medium">Loading completed requests...</p>
                    </div>
                ) : history.length === 0 ? (
                    <div className="text-center py-12">
                        <CheckCircle className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500 text-lg font-medium mb-2">No completed requests found</p>
                        <p className="text-slate-400">Approved and rejected requests will appear here</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-slate-200 max-h-[600px] overflow-y-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                                <tr>
                                    <th className="text-left p-4 font-semibold text-slate-700 border-r border-slate-200">Serial No</th>
                                    <th className="text-left p-4 font-semibold text-slate-700 border-r border-slate-200">Employee</th>
                                    <th className="text-left p-4 font-semibold text-slate-700 border-r border-slate-200">Route</th>
                                    <th className="text-left p-4 font-semibold text-slate-700 border-r border-slate-200">Company</th>
                                    <th className="text-left p-4 font-semibold text-slate-700 border-r border-slate-200">Amount</th>
                                    <th className="text-left p-4 font-semibold text-slate-700 border-r border-slate-200">Status</th>
                                    <th className="text-left p-4 font-semibold text-slate-700 border-r border-slate-200">Approved By</th>
                                    <th className="text-left p-4 font-semibold text-slate-700 border-r border-slate-200">Action Date</th>
                                    <th className="text-left p-4 font-semibold text-slate-700">Remarks</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map((item, index) => (
                                    <tr key={index} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                        <td className="p-4 border-r border-slate-100">
                                            <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                                                {item.serialNumber}
                                            </span>
                                        </td>
                                        <td className="p-4 border-r border-slate-100">
                                            <div className="font-medium text-slate-800">{item.salesPersonName}</div>
                                        </td>
                                        <td className="p-4 border-r border-slate-100">
                                            <div className="font-medium text-slate-800">
                                                {item.fromLocation} → {item.toLocation}
                                            </div>
                                        </td>
                                        <td className="p-4 text-slate-700 border-r border-slate-100">{item.companyName}</td>
                                        <td className="p-4 border-r border-slate-100">
                                            <span className="font-bold text-emerald-600 text-lg">₹{item.advanceAmount}</span>
                                        </td>
                                        <td className="p-4 border-r border-slate-100">
                                            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${item.status === 'Approved' ? 'bg-green-100 text-green-800' :
                                                item.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                                                    'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {item.status || 'Pending'}
                                            </span>
                                        </td>
                                        <td className="p-4 border-r border-slate-100">
                                            <div className="font-medium text-purple-700">
                                                {item.approvedBy || '-'}
                                            </div>
                                        </td>
                                        <td className="p-4 text-slate-700 text-sm border-r border-slate-100">
                                            {formatTimestamp(item.actual)}
                                        </td>
                                        <td className="p-4 text-slate-700 text-sm">
                                            <div className="max-w-32 truncate" title={item.adminRemarks}>
                                                {item.adminRemarks || '-'}
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

// ✅ UPDATED: Admin Action Component
const AdvanceHistory = ({ salesPersonName, onBack, isLoading, history, onRefreshHistory, showToast, APPS_SCRIPT_URL, isAdmin, onShowAdminHistory }) => {
    const { currentUser } = useContext(AuthContext);
    const [actionData, setActionData] = useState({});
    const [isSubmittingAction, setIsSubmittingAction] = useState(false);

    const handleActionChange = (rowIndex, field, value) => {
        setActionData(prev => ({
            ...prev,
            [rowIndex]: {
                ...prev[rowIndex],
                [field]: value
            }
        }));
    };

    const handleActionSubmit = async (item) => {
        const action = actionData[item.rowIndex];
        if (!action?.status) {
            showToast("Please select approve or reject", "error");
            return;
        }

        if (action.status === 'Rejected' && !action.remarks?.trim()) {
            showToast("Please provide remarks for rejection", "error");
            return;
        }

        setIsSubmittingAction(true);

        try {
            console.log("🔄 Submitting action for row:", item.originalIndex, "Serial:", item.serialNumber);

            const payload = new URLSearchParams({
                action: "updateAdvanceStatus",
                rowNumber: item.originalIndex,
                status: action.status,
                adminRemarks: action.remarks || '',
                serialNumber: item.serialNumber,
                adminName: salesPersonName
            });

            const response = await fetch(APPS_SCRIPT_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: payload
            });

            let result;
            try {
                result = await response.json();
            } catch (jsonError) {
                result = { success: true, message: "Request submitted successfully" };
            }

            if (result.success !== false) {
                showToast(`Request ${action.status.toLowerCase()} successfully!`, "success");

                setActionData(prev => {
                    const newData = { ...prev };
                    delete newData[item.rowIndex];
                    return newData;
                });

                if (onRefreshHistory) {
                    setTimeout(() => {
                        onRefreshHistory();
                    }, 1000);
                }
            } else {
                showToast(result.message || "Action failed", "error");
            }

        } catch (error) {
            console.error("💥 Action submission error:", error);
            showToast("Action submitted. Please check the sheet to confirm.", "info");

            setActionData(prev => {
                const newData = { ...prev };
                delete newData[item.rowIndex];
                return newData;
            });

            if (onRefreshHistory) {
                setTimeout(() => {
                    onRefreshHistory();
                }, 1000);
            }
        } finally {
            setIsSubmittingAction(false);
        }
    };

    return (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden h-full flex flex-col">
            <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-8 py-6 flex-shrink-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {!isAdmin && (
                            <button
                                onClick={onBack}
                                className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 text-white hover:bg-white/20 transition-all duration-200"
                            >
                                <ArrowLeft className="h-5 w-5" />
                                <span>Back</span>
                            </button>
                        )}
                        <div>
                            <h3 className="text-2xl font-bold text-white mb-2">
                                {isAdmin ? "Outstation Travel Request" : "Outstation Travel Request History"}
                            </h3>
                            <p className="text-indigo-50 text-lg">
                                {isAdmin ? "Review and approve advance requests" : "View your submitted advance requests"}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {isAdmin && onShowAdminHistory && (
                            <button
                                onClick={onShowAdminHistory}
                                className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 text-white hover:bg-white/20 transition-all duration-200"
                            >
                                <History className="h-5 w-5" />
                                <span>View History</span>
                            </button>
                        )}
                        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
                            <span className="text-white font-medium">{salesPersonName}</span>
                            {isAdmin && <span className="text-yellow-300 ml-2 text-sm">(Admin)</span>}
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-8 flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                        <p className="text-slate-600 font-medium">Loading advance history...</p>
                    </div>
                ) : history.length === 0 ? (
                    <div className="text-center py-12">
                        <FileText className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500 text-lg font-medium mb-2">
                            {isAdmin ? "No pending requests found" : "No advance requests found"}
                        </p>
                        <p className="text-slate-400">
                            {isAdmin ? "All requests have been processed" : "Your submitted advance requests will appear here"}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-slate-200 max-h-[600px] overflow-y-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="text-left p-4 font-semibold text-slate-700 border-r border-slate-200">Serial No</th>
                                    {isAdmin && <th className="text-left p-4 font-semibold text-slate-700 border-r border-slate-200">Employee</th>}
                                    <th className="text-left p-4 font-semibold text-slate-700 border-r border-slate-200">Route</th>
                                    <th className="text-left p-4 font-semibold text-slate-700 border-r border-slate-200">Company</th>
                                    <th className="text-left p-4 font-semibold text-slate-700 border-r border-slate-200">Travel Type</th>
                                    <th className="text-left p-4 font-semibold text-slate-700 border-r border-slate-200">Amount</th>
                                    <th className="text-left p-4 font-semibold text-slate-700 border-r border-slate-200">Start Date</th>
                                    <th className="text-left p-4 font-semibold text-slate-700 border-r border-slate-200">End Date</th>
                                    {/* <th className="text-left p-4 font-semibold text-slate-700 border-r border-slate-200">Submitted</th> */}
                                    <th className="text-left p-4 font-semibold text-slate-700 border-r border-slate-200">Status</th>
                                    {!isAdmin && <th className="text-left p-4 font-semibold text-slate-700 border-r border-slate-200">Approved By</th>}
                                    <th className="text-left p-4 font-semibold text-slate-700 border-r border-slate-200">Remarks</th>
                                    {isAdmin && <th className="text-left p-4 font-semibold text-slate-700">Action</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {history.map((item, index) => {
                                    const currentAction = actionData[item.rowIndex] || {};
                                    return (
                                        <tr key={index} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                            <td className="p-4 border-r border-slate-100">
                                                <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                                                    {item.serialNumber}
                                                </span>
                                            </td>
                                            {isAdmin && (
                                                <td className="p-4 border-r border-slate-100">
                                                    <div className="font-medium text-slate-800">{item.salesPersonName}</div>
                                                </td>
                                            )}
                                            <td className="p-4 border-r border-slate-100">
                                                <div className="font-medium text-slate-800">
                                                    {item.fromLocation} → {item.toLocation}
                                                </div>
                                            </td>
                                            <td className="p-4 text-slate-700 border-r border-slate-100">{item.companyName}</td>
                                            <td className="p-4 border-r border-slate-100">
                                                <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                                                    {item.travelType}
                                                </span>
                                            </td>
                                            <td className="p-4 border-r border-slate-100">
                                                <span className="font-bold text-emerald-600 text-lg">₹{item.advanceAmount}</span>
                                            </td>
                                            <td className="p-4 text-slate-700 border-r border-slate-100">{item.startDate}</td>
                                            <td className="p-4 text-slate-700 border-r border-slate-100">{item.endDate}</td>
                                            {/* <td className="p-4 text-slate-700 text-sm border-r border-slate-100">{item.timestamp}</td> */}
                                            <td className="p-4 border-r border-slate-100">
                                                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${item.status === 'Approved' ? 'bg-green-100 text-green-800' :
                                                    item.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                                                        'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                    {item.status || 'Pending'}
                                                </span>
                                            </td>
                                            {!isAdmin && (
                                                <td className="p-4 border-r border-slate-100">
                                                    <div className="font-medium text-purple-700">
                                                        {item.approvedBy || '-'}
                                                    </div>
                                                </td>
                                            )}
                                            <td className="p-4 text-slate-700 text-sm border-r border-slate-100">
                                                <div className="max-w-32 truncate" title={item.adminRemarks || item.remarks}>
                                                    {item.adminRemarks || item.remarks || '-'}
                                                </div>
                                            </td>
                                            {isAdmin && (
                                                <td className="p-4">
                                                    <div className="space-y-2 min-w-48">
                                                        <select
                                                            value={currentAction.status || ''}
                                                            onChange={(e) => handleActionChange(item.rowIndex, 'status', e.target.value)}
                                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                        >
                                                            <option value="">Select Action</option>
                                                            <option value="Approved">Approve</option>
                                                            <option value="Rejected">Reject</option>
                                                        </select>

                                                        {currentAction.status === 'Rejected' && (
                                                            <textarea
                                                                value={currentAction.remarks || ''}
                                                                onChange={(e) => handleActionChange(item.rowIndex, 'remarks', e.target.value)}
                                                                placeholder="Enter rejection reason..."
                                                                rows={2}
                                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                                                            />
                                                        )}

                                                        {currentAction.status && (
                                                            <button
                                                                onClick={() => handleActionSubmit(item)}
                                                                disabled={isSubmittingAction}
                                                                className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                {isSubmittingAction ? (
                                                                    <span className="flex items-center justify-center gap-1">
                                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                                        Submitting...
                                                                    </span>
                                                                ) : (
                                                                    'Submit'
                                                                )}
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Advance;
