"use client";

import { useState, useEffect, useContext } from "react";
import {
  MapPin,
  Loader2,
  Upload,
  Eye,
  Plus,
  Trash2,
  ArrowLeft,
} from "lucide-react";
import { AuthContext } from "../context/AuthContext";

const Travel = () => {
  const [travels, setTravels] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [showOutSection, setShowOutSection] = useState(false);
  const [submittedInData, setSubmittedInData] = useState(null);
  const [fmsSerialNumber, setFmsSerialNumber] = useState("");

  const { currentUser, isAuthenticated } = useContext(AuthContext);

  const salesPersonName = currentUser?.salesPersonName || "Unknown User";
  const userRole = currentUser?.role || "User";

  const SPREADSHEET_ID = "10coGuAVkdMNVUoX_L2HedehSb7d5lpgGQHTNjAZiGaQ";
  const APPS_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbylk0DYGG9b3iru8zGT8e6yPmEEFShWppHX3YsAM9M_OUbogsHNtcdg3CZaL5Y35EHnkg/exec";

  const DRIVE_FOLDER_ID = "1W4vfmH4c_MSp76VjPlY0tkUsarJhPIyc";

  const checkPendingOutFromServer = async () => {
    try {

      const payload = {
        action: "checkPendingOut",
        sheetName: "FMS",
        personName: salesPersonName,
      };

      const urlEncodedData = new URLSearchParams(payload);

      const response = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: urlEncodedData,
        mode: "no-cors",
      });


      // Since we can't get response due to no-cors, we'll still rely on localStorage
      // but also implement a backup mechanism
      return false;
    } catch (error) {
      console.error("Error checking pending OUT from server:", error);
      return false;
    }
  };

  // Updated hasPendingOutForm function with better logging
  const hasPendingOutForm = () => {
    const pendingOutKey = `pendingOut_${salesPersonName}`;
    const pendingOutData = localStorage.getItem(pendingOutKey);
    const hasPending = pendingOutData !== null;


    return hasPending;
  };

  // Check for pending OUT form on component mount and enforce completion
  useEffect(() => {
    const checkAndEnforcePendingOutForm = async () => {
      const pendingOutKey = `pendingOut_${salesPersonName}`;
      let pendingOutData = localStorage.getItem(pendingOutKey);


      // If no local data, check if there might be incomplete entries on server
      if (!pendingOutData) {

        // Try to get the last incomplete entry for this user
        // This is a fallback mechanism since we can't directly read server response
        const possiblePendingData = sessionStorage.getItem(
          `serverPending_${salesPersonName}`
        );
        if (possiblePendingData) {
          pendingOutData = possiblePendingData;
          // Restore to localStorage for consistency
          localStorage.setItem(pendingOutKey, pendingOutData);
        }
      }

      if (pendingOutData) {
        try {
          const parsedData = JSON.parse(pendingOutData);

          // Set submitted IN data
          setSubmittedInData(parsedData);

          // Update form data with pending information
          setFormData({
            personName: parsedData.personName,
            fromLocation: parsedData.fromLocation,
            toLocation: parsedData.toLocation,
            travelDate: parsedData.travelDate,
            inVehicleType: parsedData.inVehicleType,
            inVehicleMeterNumber: parsedData.inVehicleMeterNumber,
            remarks: parsedData.remarks,
            // OUT form fields - pre-fill with defaults
            outVehicleType: parsedData.inVehicleType,
            outVehicleMeterNumber: "",
            outVehicleMeterImage: null,
            outVehicleMeterImageName: "",
            outBusTicketImage: null,
            outBusTicketImageName: "",
            outBusAmount: "",
            outBillReceipt: null,
            outBillReceiptName: "",
            outRentAmount: "",
            returnDate: formatDateInput(new Date()),
            outRemarks: "",
            // IN form fields - keep existing files as null since they're already uploaded
            inVehicleMeterImage: null,
            inVehicleMeterImageName: "",
            inBusTicketImage: null,
            inBusTicketImageName: "",
            inBusAmount: parsedData.busAmount || "",
            inBillReceipt: null,
            inBillReceiptName: "",
            inRentAmount: parsedData.rentAmount || "",
          });

          setFmsSerialNumber(parsedData.serialNumber);
          setShowOutSection(true);
        } catch (error) {
          console.error("Error parsing pending OUT data:", error);
          localStorage.removeItem(pendingOutKey);
          sessionStorage.removeItem(`serverPending_${salesPersonName}`);
        }
      } else {
        // Ensure we're showing IN form if no pending OUT
        setShowOutSection(false);
        setSubmittedInData(null);
      }
    };

    // Only check if we have a valid sales person name
    if (currentUser?.salesPersonName && salesPersonName !== "Unknown User") {
      checkAndEnforcePendingOutForm();

      // Also trigger server check (for future enhancement)
      checkPendingOutFromServer();
    }
  }, [currentUser?.salesPersonName, salesPersonName]);

  const formatDateInput = (date) => {
    return date.toISOString().split("T")[0];
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

  const [localTravels, setLocalTravels] = useState([]);

  const [highestNumber, setHighestNumber] = useState("");

  const generateSerialNumber = async () => {
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
        return { serialNumber: "TI-001", count: 1 };
      }

      // Skip the header row (first row)
      const rows = data.table.rows.slice(1);

      if (rows.length === 0) {
        return { serialNumber: "TI-001", count: 1 };
      }

      const formattedHistory = rows
        .map((row, index) => {
          const serialNumber = row.c?.[1]?.v; // Column B - Serial Number

          return {
            serialNumber,
            originalIndex: index,
          };
        })
        .filter((item) => item.serialNumber); // Filter out entries without serial number

      if (formattedHistory.length === 0) {
        return { serialNumber: "TI-001", count: 1 };
      }

      setLocalTravels(formattedHistory);

      // Get all TI- serial numbers and extract numeric parts
      const tiNumbers = formattedHistory
        .map((item) => item.serialNumber)
        .filter((serial) => serial && serial.toString().startsWith("TI-"))
        .map((serial) => {
          const numPart = serial.split("-")[1];
          const num = parseInt(numPart, 10);
          return isNaN(num) ? 0 : num;
        })
        .filter((num) => num > 0);

      if (tiNumbers.length === 0) {
        return { serialNumber: "TI-001", count: 1 };
      }

      // Find the highest number
      const highestNumber = Math.max(...tiNumbers);


      setHighestNumber(highestNumber);

      return {
        serialNumber: highestNumber,
        // count: nextCount,
        lastSerialNumber: `TI-${highestNumber.toString().padStart(3, "0")}`,
      };
    } catch (error) {
      console.error("Error generating serial number:", error);
      return { serialNumber: "TI-001", count: 1 };
    }
  };

  useEffect(() => {
    generateSerialNumber();
  }, []);

  const calculateTotalRunningKm = (inMeter, outMeter) => {
    const inMeterNum = parseFloat(inMeter) || 0;
    const outMeterNum = parseFloat(outMeter) || 0;

    if (inMeterNum > 0 && outMeterNum > 0 && outMeterNum > inMeterNum) {
      return (outMeterNum - inMeterNum).toString();
    }
    return "0";
  };

  // Initialize formData - will be updated by useEffect when checking pending forms
  const [formData, setFormData] = useState({
    personName: salesPersonName,
    fromLocation: "",
    toLocation: "",
    inVehicleType: "",
    inVehicleMeterNumber: "",
    inVehicleMeterImage: null,
    inVehicleMeterImageName: "",
    inBusTicketImage: null,
    inBusTicketImageName: "",
    inBusAmount: "",
    inBillReceipt: null,
    inBillReceiptName: "",
    inRentAmount: "",
    outVehicleType: "",
    outVehicleMeterNumber: "",
    outVehicleMeterImage: null,
    outVehicleMeterImageName: "",
    outBusTicketImage: null,
    outBusTicketImageName: "",
    outBusAmount: "",
    outBillReceipt: null,
    outBillReceiptName: "",
    outRentAmount: "",
    travelDate: formatDateInput(new Date()),
    returnDate: formatDateInput(new Date()),
    remarks: "",
    outRemarks: "",
  });

  const showToast = (message, type = "success") => {
    const toast = document.createElement("div");
    toast.className = `fixed top-4 right-4 p-4 rounded-md text-white z-50 ${
      type === "success"
        ? "bg-green-500"
        : type === "info"
        ? "bg-blue-500"
        : "bg-red-500"
    }`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) {
        document.body.removeChild(toast);
      }
    }, 3000);
  };

  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const fetchTravelHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const payload = {
        action: "insert",
        sheetName: "FMS",
        personName: salesPersonName,
      };

      const urlEncodedData = new URLSearchParams(payload);

      const response = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: urlEncodedData,
        mode: "no-cors",
      });

    } catch (error) {
      console.error("Error fetching travel history:", error);
      showToast("Error loading travel history", "error");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (currentUser?.salesPersonName) {
      fetchTravelHistory();
    }
  }, [currentUser?.salesPersonName]);

  const uploadFileToGoogleDrive = async (file, fileName) => {
    try {
      const base64Data = await convertToBase64(file);
      const base64String = base64Data.split(",")[1];

      const uploadPayload = {
        action: "uploadFile",
        fileName: fileName,
        fileData: base64String,
        mimeType: file.type,
        folderId: DRIVE_FOLDER_ID,
      };

      const urlEncodedUploadData = new URLSearchParams(uploadPayload);

      const uploadResponse = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: urlEncodedUploadData,
        mode: "no-cors",
      });

      return fileName;
    } catch (error) {
      console.error("Error uploading file to Google Drive:", error);
      throw error;
    }
  };

  const validateInForm = () => {
    const newErrors = {};

    if (!formData.fromLocation.trim()) {
      newErrors.fromLocation = "From location is required";
    }
    if (!formData.toLocation.trim()) {
      newErrors.toLocation = "To location is required";
    }
    if (!formData.inVehicleType) {
      newErrors.inVehicleType = "IN vehicle type is required";
    }
    if (!formData.travelDate) {
      newErrors.travelDate = "Travel date is required";
    }

    if (
      formData.inVehicleType &&
      (formData.inVehicleType === "Car" || formData.inVehicleType === "Bike")
    ) {
      if (!formData.inVehicleMeterNumber) {
        newErrors.inVehicleMeterNumber = "Vehicle meter number is required";
      }
      if (!formData.inVehicleMeterImage) {
        newErrors.inVehicleMeterImage = "Vehicle meter image is required";
      }
    }

    if (formData.inVehicleType === "Bus") {
      if (!formData.inBusTicketImage) {
        newErrors.inBusTicketImage = "Bus ticket image is required";
      }
      if (!formData.inBusAmount) {
        newErrors.inBusAmount = "Bus amount is required";
      }
    }

    if (
      formData.inVehicleType === "Rent Car" ||
      formData.inVehicleType === "Rent Bike"
    ) {
      if (!formData.inBillReceipt) {
        newErrors.inBillReceipt = "Bill receipt is required";
      }
      if (!formData.inRentAmount) {
        newErrors.inRentAmount = "Rent amount is required";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateOutForm = () => {
    const newErrors = {};

    if (!formData.returnDate) {
      newErrors.returnDate = "Return date is required";
    }

    if (
      formData.outVehicleType === "Car" ||
      formData.outVehicleType === "Bike"
    ) {
      if (!formData.outVehicleMeterNumber) {
        newErrors.outVehicleMeterNumber =
          "OUT vehicle meter number is required";
      }
      if (!formData.outVehicleMeterImage) {
        newErrors.outVehicleMeterImage = "OUT vehicle meter image is required";
      }
      const inMeter = parseFloat(submittedInData?.inVehicleMeterNumber || 0);
      const outMeter = parseFloat(formData.outVehicleMeterNumber || 0);
      if (outMeter > 0 && inMeter > 0 && outMeter <= inMeter) {
        newErrors.outVehicleMeterNumber =
          "OUT meter number should be greater than IN meter number";
      }
    }

    if (formData.outVehicleType === "Bus") {
      if (!formData.outBusTicketImage) {
        newErrors.outBusTicketImage = "OUT bus ticket image is required";
      }
      if (!formData.outBusAmount) {
        newErrors.outBusAmount = "OUT bus amount is required";
      }
    }

    if (
      formData.outVehicleType === "Rent Car" ||
      formData.outVehicleType === "Rent Bike"
    ) {
      if (!formData.outBillReceipt) {
        newErrors.outBillReceipt = "OUT bill receipt is required";
      }
      if (!formData.outRentAmount) {
        newErrors.outRentAmount = "OUT rent amount is required";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Column mapping constants for FMS sheet
  const FMS_COLUMNS = {
    TIMESTAMP: 0, // A
    SERIAL_NUMBER: 1, // B
    PERSON_NAME: 2, // C
    FROM_LOCATION: 3, // D
    TO_LOCATION: 4, // E
    IN_VEHICLE_TYPE: 5, // F
    IN_METER_NUMBER: 6, // G
    TOTAL_RUNNING_KM: 7, // H
    IN_IMAGES: 8, // I
    TRAVEL_DATE: 9, // J
    IN_REMARKS: 10, // K
    IN_AMOUNT: 11, // L
    OUT_AMOUNT: "", // M - OUT Amount
    CURRENT_DATE: 13, // N - Planned Date (IN submit time)
    // RETURN_DATE_FORMATTED: 14, // O
    RETURN_DATE: 15, // P
    OUT_VEHICLE_TYPE: 16, // Q
    OUT_METER_NUMBER: 17, // R
    OUT_IMAGES: 18, // S
    OUT_REMARKS: 19, // T
    OUT_TOTAL_AMOUNT: 20, // U
  };

  const handleInSubmit = async (e) => {
    e.preventDefault();

    // Check if user already has a pending OUT form
    if (hasPendingOutForm()) {
      showToast("पहले अपना pending OUT form complete करें!", "error");
      return;
    }

    if (!validateInForm()) {
      showToast("Please fix the form errors", "error");
      return;
    }

    setIsSubmitting(true);

    try {
      const timestamp = formatDateTime(new Date());
      let vehicleImageLinks = [];

      // Upload images
      if (formData.inVehicleMeterImage) {
        try {
          const fileName = `in_vehicle_meter_${salesPersonName}_${
            formData.travelDate
          }.${formData.inVehicleMeterImage.name.split(".").pop()}`;
          await uploadFileToGoogleDrive(formData.inVehicleMeterImage, fileName);
          vehicleImageLinks.push(fileName);
        } catch (uploadError) {
          showToast("Error uploading vehicle meter image", "error");
          setIsSubmitting(false);
          return;
        }
      }

      if (formData.inBusTicketImage) {
        try {
          const fileName = `in_bus_ticket_${salesPersonName}_${
            formData.travelDate
          }.${formData.inBusTicketImage.name.split(".").pop()}`;
          await uploadFileToGoogleDrive(formData.inBusTicketImage, fileName);
          vehicleImageLinks.push(fileName);
        } catch (uploadError) {
          showToast("Error uploading bus ticket image", "error");
          setIsSubmitting(false);
          return;
        }
      }

      if (formData.inBillReceipt) {
        try {
          const fileName = `in_bill_receipt_${salesPersonName}_${
            formData.travelDate
          }.${formData.inBillReceipt.name.split(".").pop()}`;
          await uploadFileToGoogleDrive(formData.inBillReceipt, fileName);
          vehicleImageLinks.push(fileName);
        } catch (uploadError) {
          showToast("Error uploading bill receipt", "error");
          setIsSubmitting(false);
          return;
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Generate serial number
      // const { serialNumber, count } = localTravels;
      // setFmsSerialNumber(serialNumber);

      // Get all TI- serial numbers and extract numeric parts
      const tiNumbers = localTravels
        .map((item) => item.serialNumber)
        .filter((serial) => serial && serial.toString().startsWith("TI-"))
        .map((serial) => {
          const numPart = serial.split("-")[1];
          const num = parseInt(numPart, 10);
          return isNaN(num) ? 0 : num;
        })
        .filter((num) => num > 0);


      if (tiNumbers.length === 0) {
        return { serialNumber: "TI-001", count: 1 };
      }

      // Find the highest number
      const highestNumber = Math.max(...tiNumbers);
      const nextCount = highestNumber + 1;
      const nextSerialNumber = `TI-${nextCount.toString().padStart(3, "0")}`;

      // Create row data with proper column mapping
      const rowData = Array(21).fill("");

      rowData[FMS_COLUMNS.TIMESTAMP] = timestamp;
      rowData[FMS_COLUMNS.SERIAL_NUMBER] = nextSerialNumber;
      rowData[FMS_COLUMNS.PERSON_NAME] = formData.personName;
      rowData[FMS_COLUMNS.FROM_LOCATION] = formData.fromLocation;
      rowData[FMS_COLUMNS.TO_LOCATION] = formData.toLocation;
      rowData[FMS_COLUMNS.IN_VEHICLE_TYPE] = formData.inVehicleType;
      rowData[FMS_COLUMNS.IN_METER_NUMBER] =
        formData.inVehicleMeterNumber || "";
      rowData[FMS_COLUMNS.TOTAL_RUNNING_KM] = "";
      rowData[FMS_COLUMNS.IN_IMAGES] = vehicleImageLinks.join(" | ");
      rowData[FMS_COLUMNS.TRAVEL_DATE] = formData.travelDate;
      rowData[FMS_COLUMNS.IN_REMARKS] = formData.remarks || "";

      const inBusAmount = parseFloat(formData.inBusAmount) || 0;
      const inRentAmount = parseFloat(formData.inRentAmount) || 0;
      const inTotalAmount = inBusAmount + inRentAmount;
      rowData[FMS_COLUMNS.IN_AMOUNT] = inTotalAmount.toString();

      // OUT related columns - empty for IN submission
      rowData[FMS_COLUMNS.OUT_AMOUNT] = "";
      rowData[FMS_COLUMNS.CURRENT_DATE] = ""; // Column N - Empty during IN submission
      rowData[FMS_COLUMNS.RETURN_DATE_FORMATTED] = "";
      rowData[FMS_COLUMNS.RETURN_DATE] = "";
      rowData[FMS_COLUMNS.OUT_VEHICLE_TYPE] = "";
      rowData[FMS_COLUMNS.OUT_METER_NUMBER] = "";
      rowData[FMS_COLUMNS.OUT_IMAGES] = "";
      rowData[FMS_COLUMNS.OUT_REMARKS] = "";
      rowData[FMS_COLUMNS.OUT_TOTAL_AMOUNT] = "";


      const payload = {
        sheetName: "FMS",
        action: "insert",
        rowData: JSON.stringify(rowData),
      };

      const response = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(payload),
          mode: "no-cors",
      });

      await new Promise((resolve) => setTimeout(resolve, 3000));

      showToast(
        "IN travel information submitted successfully! अब OUT form fill करें।",
        "success"
      );

      // Store pending OUT data with enhanced persistence
      const pendingOutData = {
        serialNumber: nextSerialNumber,
        //   rowIndex: count,
        personName: formData.personName,
        fromLocation: formData.fromLocation,
        toLocation: formData.toLocation,
        travelDate: formData.travelDate,
        inVehicleType: formData.inVehicleType,
        inVehicleMeterNumber: formData.inVehicleMeterNumber,
        busAmount: formData.inBusAmount,
        rentAmount: formData.inRentAmount,
        remarks: formData.remarks,
        createdAt: new Date().toISOString(), // Add timestamp for tracking
        status: "pending_out", // Add status for better tracking
      };

      const pendingOutKey = `pendingOut_${salesPersonName}`;
      localStorage.setItem(pendingOutKey, JSON.stringify(pendingOutData));

      // Also store in sessionStorage as backup
      sessionStorage.setItem(
        `serverPending_${salesPersonName}`,
        JSON.stringify(pendingOutData)
      );

      setSubmittedInData(pendingOutData);

      // Reset OUT form fields but keep planned return date
      setFormData((prev) => ({
        ...prev,
        outVehicleType: prev.inVehicleType,
        outVehicleMeterNumber: "",
        outVehicleMeterImage: null,
        outVehicleMeterImageName: "",
        outBusTicketImage: null,
        outBusTicketImageName: "",
        outBusAmount: "",
        outBillReceipt: null,
        outBillReceiptName: "",
        outRentAmount: "",
        returnDate: formatDateInput(new Date()),
        outRemarks: "",
      }));

      setShowOutSection(true);
      setErrors({});
      generateSerialNumber();
    } catch (error) {
      console.error("IN submission error:", error);
      showToast(`Error: ${error.message}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOutSubmit = async (e) => {
    e.preventDefault();

    if (!validateOutForm()) {
      showToast("Please fix the OUT form errors", "error");
      return;
    }

    if (!submittedInData) {
      showToast("Error: No IN data found", "error");
      return;
    }

    setIsSubmitting(true);

    try {
      let outVehicleImageLinks = [];

      // Upload OUT images
      if (formData.outVehicleMeterImage) {
        try {
          const fileName = `out_vehicle_meter_${salesPersonName}_${
            formData.returnDate
          }.${formData.outVehicleMeterImage.name.split(".").pop()}`;
          await uploadFileToGoogleDrive(
            formData.outVehicleMeterImage,
            fileName
          );
          outVehicleImageLinks.push(fileName);
        } catch (uploadError) {
          showToast("Error uploading OUT meter image", "error");
          setIsSubmitting(false);
          return;
        }
      }

      if (formData.outBusTicketImage) {
        try {
          const fileName = `out_bus_ticket_${salesPersonName}_${
            formData.returnDate
          }.${formData.outBusTicketImage.name.split(".").pop()}`;
          await uploadFileToGoogleDrive(formData.outBusTicketImage, fileName);
          outVehicleImageLinks.push(fileName);
        } catch (uploadError) {
          showToast("Error uploading OUT bus ticket", "error");
          setIsSubmitting(false);
          return;
        }
      }

      if (formData.outBillReceipt) {
        try {
          const fileName = `out_bill_receipt_${salesPersonName}_${
            formData.returnDate
          }.${formData.outBillReceipt.name.split(".").pop()}`;
          await uploadFileToGoogleDrive(formData.outBillReceipt, fileName);
          outVehicleImageLinks.push(fileName);
        } catch (uploadError) {
          showToast("Error uploading OUT bill receipt", "error");
          setIsSubmitting(false);
          return;
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Calculate amounts
      const outBusAmount = parseFloat(formData.outBusAmount) || 0;
      const outRentAmount = parseFloat(formData.outRentAmount) || 0;
      const outTotalAmount = outBusAmount + outRentAmount;

      const totalRunningKm = calculateTotalRunningKm(
        submittedInData.inVehicleMeterNumber,
        formData.outVehicleMeterNumber
      );

      // Create update data with proper column mapping for Apps Script
      const updateData = Array(21).fill("");

      updateData[FMS_COLUMNS.TOTAL_RUNNING_KM] = totalRunningKm;
      updateData[FMS_COLUMNS.OUT_AMOUNT] = outTotalAmount.toString();
      updateData[FMS_COLUMNS.CURRENT_DATE] = formatDateInput(new Date()); // Column N - Actual date when OUT form is submitted
      // updateData[FMS_COLUMNS.RETURN_DATE_FORMATTED] = formatDateDDMMYYYY(new Date(formData.returnDate));
      updateData[FMS_COLUMNS.RETURN_DATE] = formData.returnDate;
      updateData[FMS_COLUMNS.OUT_VEHICLE_TYPE] = formData.outVehicleType;
      updateData[FMS_COLUMNS.OUT_METER_NUMBER] = formData.outVehicleMeterNumber;
      updateData[FMS_COLUMNS.OUT_IMAGES] = outVehicleImageLinks.join(" | ");
      updateData[FMS_COLUMNS.OUT_REMARKS] = formData.outRemarks || "";
      updateData[FMS_COLUMNS.OUT_TOTAL_AMOUNT] = outTotalAmount.toString();

      const serialNumberToUpdate = submittedInData.serialNumber; // TI-025

      // Send the correct payload format
      const payload = {
        sheetName: "FMS",
        action: "updateOutData",
        serialNumber: serialNumberToUpdate,
        rowData: JSON.stringify(updateData),
      };


      console.log(
        "🔍 Attempting to update row with serial:",
        serialNumberToUpdate
      );
      console.log("📊 Update data:", updateData);

      const response = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(payload),
        mode: "no-cors",
      });

      await new Promise((resolve) => setTimeout(resolve, 3000));

      showToast(
        "Complete travel information submitted successfully!",
        "success"
      );

      console.log("✅ OUT submission completed for serial:", serialNumberToUpdate);

      // Enhanced cleanup - remove from all storage locations
      const pendingOutKey = `pendingOut_${salesPersonName}`;
      localStorage.removeItem(pendingOutKey);
      sessionStorage.removeItem(`serverPending_${salesPersonName}`);

      // Clear all form data and state
      setFormData({
        personName: salesPersonName,
        fromLocation: "",
        toLocation: "",
        inVehicleType: "",
        inVehicleMeterNumber: "",
        inVehicleMeterImage: null,
        inVehicleMeterImageName: "",
        inBusTicketImage: null,
        inBusTicketImageName: "",
        inBusAmount: "",
        inBillReceipt: null,
        inBillReceiptName: "",
        inRentAmount: "",
        outVehicleType: "",
        outVehicleMeterNumber: "",
        outVehicleMeterImage: null,
        outVehicleMeterImageName: "",
        outBusTicketImage: null,
        outBusTicketImageName: "",
        outBusAmount: "",
        outBillReceipt: null,
        outBillReceiptName: "",
        outRentAmount: "",
        travelDate: formatDateInput(new Date()),
        returnDate: formatDateInput(new Date()),
        remarks: "",
        outRemarks: "",
      });

      setErrors({});
      setShowOutSection(false);
      setSubmittedInData(null);

      try {
        await fetchTravelHistory();
      } catch (historyError) {
        console.error("History fetch error:", historyError);
      }
    } catch (error) {
      console.error("OUT submission error:", error);
      showToast(`Error: ${error.message}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        showToast("File size should be less than 10MB.", "error");
        return;
      }

      if (!file.type.startsWith("image/")) {
        showToast("Please select a valid image file.", "error");
        return;
      }

      if (type === "inVehicleMeter") {
        setFormData((prev) => ({
          ...prev,
          inVehicleMeterImage: file,
          inVehicleMeterImageName: file.name,
        }));
      } else if (type === "inBusTicket") {
        setFormData((prev) => ({
          ...prev,
          inBusTicketImage: file,
          inBusTicketImageName: file.name,
        }));
      } else if (type === "inBillReceipt") {
        setFormData((prev) => ({
          ...prev,
          inBillReceipt: file,
          inBillReceiptName: file.name,
        }));
      } else if (type === "outVehicleMeter") {
        setFormData((prev) => ({
          ...prev,
          outVehicleMeterImage: file,
          outVehicleMeterImageName: file.name,
        }));
      } else if (type === "outBusTicket") {
        setFormData((prev) => ({
          ...prev,
          outBusTicketImage: file,
          outBusTicketImageName: file.name,
        }));
      } else if (type === "outBillReceipt") {
        setFormData((prev) => ({
          ...prev,
          outBillReceipt: file,
          outBillReceiptName: file.name,
        }));
      }
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
        {/* Travel Form */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 px-8 py-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  Local Travel Information
                </h3>
                <p className="text-emerald-50 text-lg">
                  Record your travel details and expenses
                </p>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
                <MapPin className="h-5 w-5 text-white" />
                <span className="text-white font-medium">
                  {salesPersonName}
                </span>
              </div>
            </div>
          </div>

          {/* IN Travel Form - Only show if no pending OUT form */}
          {!showOutSection && !hasPendingOutForm() && (
            <form onSubmit={handleInSubmit} className="space-y-8 p-8">
              <div className="bg-blue-50 rounded-xl p-6">
                <h4 className="text-lg font-semibold text-blue-800 mb-4">
                  IN Travel Details
                </h4>

                {/* Person Name (Pre-filled) */}
                <div className="space-y-2 mb-4">
                  <label className="block text-sm font-semibold text-slate-700 mb-3">
                    Person Name
                  </label>
                  <input
                    type="text"
                    name="personName"
                    value={formData.personName}
                    readOnly
                    className="w-full px-4 py-3 bg-gray-100 border border-slate-200 rounded-xl shadow-sm text-slate-700 font-medium cursor-not-allowed"
                  />
                </div>

                {/* Travel Date */}
                <div className="space-y-2 mb-4">
                  <label className="block text-sm font-semibold text-slate-700 mb-3">
                    Travel Date
                  </label>
                  <input
                    type="date"
                    name="travelDate"
                    value={formData.travelDate}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 text-slate-700 font-medium"
                  />
                  {errors.travelDate && (
                    <p className="text-red-500 text-sm mt-2 font-medium">
                      {errors.travelDate}
                    </p>
                  )}
                </div>

                {/* From Location and To Location */}
                <div className="grid gap-6 lg:grid-cols-2 mb-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-3">
                      From Location
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
                      To Location
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

                {/* Vehicle Type */}
                <div className="space-y-2 mb-4">
                  <label className="block text-sm font-semibold text-slate-700 mb-3">
                    Vehicle Type
                  </label>
                  <select
                    name="inVehicleType"
                    value={formData.inVehicleType}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 text-slate-700 font-medium"
                  >
                    <option value="">Select vehicle type</option>
                    <option value="Car">Car</option>
                    <option value="Bike">Bike</option>
                    <option value="Bus">Bus</option>
                    <option value="Rent Car">Rent Car</option>
                    <option value="Rent Bike">Rent Bike</option>
                  </select>
                  {errors.inVehicleType && (
                    <p className="text-red-500 text-sm mt-2 font-medium">
                      {errors.inVehicleType}
                    </p>
                  )}
                </div>

                {/* Car/Bike Fields */}
                {(formData.inVehicleType === "Car" ||
                  formData.inVehicleType === "Bike") && (
                  <div className="grid gap-4 lg:grid-cols-2 mb-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-700 mb-3">
                        Vehicle Meter Number (IN)
                      </label>
                      <input
                        type="text"
                        name="inVehicleMeterNumber"
                        value={formData.inVehicleMeterNumber}
                        onChange={handleInputChange}
                        placeholder="Enter meter reading"
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 text-slate-700 font-medium"
                      />
                      {errors.inVehicleMeterNumber && (
                        <p className="text-red-500 text-sm mt-2 font-medium">
                          {errors.inVehicleMeterNumber}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-700 mb-3">
                        Vehicle Meter Image
                      </label>
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            handleFileChange(e, "inVehicleMeter")
                          }
                          className="hidden"
                          id="inVehicleMeterUpload"
                        />
                        <label
                          htmlFor="inVehicleMeterUpload"
                          className="flex items-center justify-center w-full px-4 py-4 bg-white border-2 border-dashed border-slate-300 rounded-xl hover:border-emerald-400 hover:bg-emerald-50 transition-all duration-200 cursor-pointer"
                        >
                          <div className="text-center">
                            <Upload className="h-6 w-6 text-slate-400 mx-auto mb-1" />
                            <p className="text-slate-600 text-sm">
                              {formData.inVehicleMeterImageName ||
                                "Upload meter image"}
                            </p>
                          </div>
                        </label>
                      </div>
                      {errors.inVehicleMeterImage && (
                        <p className="text-red-500 text-sm mt-2 font-medium">
                          {errors.inVehicleMeterImage}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Bus Fields */}
                {formData.inVehicleType === "Bus" && (
                  <div className="grid gap-4 lg:grid-cols-2 mb-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-700 mb-3">
                        Bus Ticket Image
                      </label>
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileChange(e, "inBusTicket")}
                          className="hidden"
                          id="inBusTicketUpload"
                        />
                        <label
                          htmlFor="inBusTicketUpload"
                          className="flex items-center justify-center w-full px-4 py-4 bg-white border-2 border-dashed border-slate-300 rounded-xl hover:border-emerald-400 hover:bg-emerald-50 transition-all duration-200 cursor-pointer"
                        >
                          <div className="text-center">
                            <Upload className="h-6 w-6 text-slate-400 mx-auto mb-1" />
                            <p className="text-slate-600 text-sm">
                              {formData.inBusTicketImageName ||
                                "Upload bus ticket"}
                            </p>
                          </div>
                        </label>
                      </div>
                      {errors.inBusTicketImage && (
                        <p className="text-red-500 text-sm mt-2 font-medium">
                          {errors.inBusTicketImage}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-700 mb-3">
                        Bus Amount
                      </label>
                      <input
                        type="number"
                        name="inBusAmount"
                        value={formData.inBusAmount}
                        onChange={handleInputChange}
                        placeholder="Enter bus fare amount"
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 text-slate-700 font-medium"
                      />
                      {errors.inBusAmount && (
                        <p className="text-red-500 text-sm mt-2 font-medium">
                          {errors.inBusAmount}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Rent Car/Bike Fields */}
                {(formData.inVehicleType === "Rent Car" ||
                  formData.inVehicleType === "Rent Bike") && (
                  <div className="grid gap-4 lg:grid-cols-2 mb-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-700 mb-3">
                        Bill Receipt
                      </label>
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileChange(e, "inBillReceipt")}
                          className="hidden"
                          id="inBillReceiptUpload"
                        />
                        <label
                          htmlFor="inBillReceiptUpload"
                          className="flex items-center justify-center w-full px-4 py-4 bg-white border-2 border-dashed border-slate-300 rounded-xl hover:border-emerald-400 hover:bg-emerald-50 transition-all duration-200 cursor-pointer"
                        >
                          <div className="text-center">
                            <Upload className="h-6 w-6 text-slate-400 mx-auto mb-1" />
                            <p className="text-slate-600 text-sm">
                              {formData.inBillReceiptName ||
                                "Upload bill receipt"}
                            </p>
                          </div>
                        </label>
                      </div>
                      {errors.inBillReceipt && (
                        <p className="text-red-500 text-sm mt-2 font-medium">
                          {errors.inBillReceipt}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-700 mb-3">
                        Amount
                      </label>
                      <input
                        type="number"
                        name="inRentAmount"
                        value={formData.inRentAmount}
                        onChange={handleInputChange}
                        placeholder="Enter rent amount"
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 text-slate-700 font-medium"
                      />
                      {errors.inRentAmount && (
                        <p className="text-red-500 text-sm mt-2 font-medium">
                          {errors.inRentAmount}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Remarks Field */}
                <div className="space-y-2 mb-4">
                  <label className="block text-sm font-semibold text-slate-700 mb-3">
                    Remarks
                  </label>
                  <textarea
                    name="remarks"
                    value={formData.remarks}
                    onChange={handleInputChange}
                    placeholder="Enter any additional remarks or notes"
                    rows={3}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 text-slate-700 font-medium resize-none"
                  />
                </div>

                {/* Submit Button for IN */}
                <button
                  type="submit"
                  className="w-full lg:w-auto bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  disabled={isSubmitting || !currentUser?.salesPersonName}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Submitting IN Travel Info...
                    </span>
                  ) : (
                    "Submit IN Travel Information"
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Show message when user has pending OUT form */}
          {!showOutSection && hasPendingOutForm() && (
            <div className="p-8">
              <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-xl p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-8 w-8 text-yellow-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-yellow-800">
                      Pending OUT Form Required!
                    </h3>

                    <button
                      onClick={() => {
                        // Force load the pending OUT form
                        const pendingOutKey = `pendingOut_${salesPersonName}`;
                        const pendingOutData =
                          localStorage.getItem(pendingOutKey);
                        if (pendingOutData) {
                          const parsedData = JSON.parse(pendingOutData);
                          setSubmittedInData(parsedData);
                          setFormData((prev) => ({
                            ...prev,
                            personName: parsedData.personName,
                            fromLocation: parsedData.fromLocation,
                            toLocation: parsedData.toLocation,
                            travelDate: parsedData.travelDate,
                            inVehicleType: parsedData.inVehicleType,
                            inVehicleMeterNumber:
                              parsedData.inVehicleMeterNumber,
                            remarks: parsedData.remarks,
                            outVehicleType: parsedData.inVehicleType,
                            outVehicleMeterNumber: "",
                            returnDate: formatDateInput(new Date()),
                            outRemarks: "",
                          }));
                          setFmsSerialNumber(parsedData.serialNumber);
                          setShowOutSection(true);
                        }
                      }}
                      className="mt-4 bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200"
                    >
                      Complete OUT Form
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* OUT Travel Form */}
          {showOutSection && (
            <form onSubmit={handleOutSubmit} className="space-y-8 p-8">
              <div className="bg-green-50 rounded-xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-semibold text-green-800">
                    OUT Travel Details
                  </h4>
                </div>

                {/* Return Date Field */}
                <div className="space-y-2 mb-4">
                  <label className="block text-sm font-semibold text-slate-700 mb-3">
                    Return Date
                  </label>
                  <input
                    type="date"
                    name="returnDate"
                    value={formData.returnDate}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 text-slate-700 font-medium"
                  />
                  {errors.returnDate && (
                    <p className="text-red-500 text-sm mt-2 font-medium">
                      {errors.returnDate}
                    </p>
                  )}
                </div>

                {/* Vehicle Type - Auto filled but editable */}
                <div className="space-y-2 mb-4">
                  <label className="block text-sm font-semibold text-slate-700 mb-3">
                    Vehicle Type
                  </label>
                  <select
                    name="outVehicleType"
                    value={formData.outVehicleType}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 text-slate-700 font-medium"
                  >
                    <option value="">Select vehicle type</option>
                    <option value="Car">Car</option>
                    <option value="Bike">Bike</option>
                    <option value="Bus">Bus</option>
                    <option value="Rent Car">Rent Car</option>
                    <option value="Rent Bike">Rent Bike</option>
                  </select>
                </div>

                {/* Car/Bike Fields with IN meter display and OUT meter input */}
                {(formData.outVehicleType === "Car" ||
                  formData.outVehicleType === "Bike") && (
                  <div className="space-y-4 mb-4">
                    {/* Display IN meter number (read-only) */}
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-700 mb-3">
                        Vehicle Meter Number (IN) - Reference
                      </label>
                      <input
                        type="text"
                        value={submittedInData?.inVehicleMeterNumber || ""}
                        readOnly
                        className="w-full px-4 py-3 bg-gray-100 border border-slate-200 rounded-xl shadow-sm text-slate-700 font-medium cursor-not-allowed"
                        placeholder="IN meter number will appear here"
                      />
                    </div>

                    {/* OUT meter number input */}
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-700 mb-3">
                          Vehicle Meter Number (OUT){" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="outVehicleMeterNumber"
                          value={formData.outVehicleMeterNumber}
                          onChange={handleInputChange}
                          placeholder="Enter OUT meter reading"
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 text-slate-700 font-medium"
                        />
                        {errors.outVehicleMeterNumber && (
                          <p className="text-red-500 text-sm mt-2 font-medium">
                            {errors.outVehicleMeterNumber}
                          </p>
                        )}
                        {/* Show calculated distance */}
                        {formData.outVehicleMeterNumber &&
                          submittedInData?.inVehicleMeterNumber && (
                            <div className="bg-blue-100 p-3 rounded-lg">
                              <p className="text-sm text-blue-800 font-medium">
                                Total Running KM:{" "}
                                {calculateTotalRunningKm(
                                  submittedInData.inVehicleMeterNumber,
                                  formData.outVehicleMeterNumber
                                )}{" "}
                                km
                              </p>
                            </div>
                          )}
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-700 mb-3">
                          Vehicle Meter Image (OUT)
                        </label>
                        <div className="relative">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              handleFileChange(e, "outVehicleMeter")
                            }
                            className="hidden"
                            id="outVehicleMeterUpload"
                          />
                          <label
                            htmlFor="outVehicleMeterUpload"
                            className="flex items-center justify-center w-full px-4 py-4 bg-white border-2 border-dashed border-slate-300 rounded-xl hover:border-emerald-400 hover:bg-emerald-50 transition-all duration-200 cursor-pointer"
                          >
                            <div className="text-center">
                              <Upload className="h-6 w-6 text-slate-400 mx-auto mb-1" />
                              <p className="text-slate-600 text-sm">
                                {formData.outVehicleMeterImageName ||
                                  "Upload OUT meter image"}
                              </p>
                            </div>
                          </label>
                        </div>
                        {errors.outVehicleMeterImage && (
                          <p className="text-red-500 text-sm mt-2 font-medium">
                            {errors.outVehicleMeterImage}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Bus Fields */}
                {formData.outVehicleType === "Bus" && (
                  <div className="grid gap-4 lg:grid-cols-2 mb-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-700 mb-3">
                        Bus Ticket Image
                      </label>
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileChange(e, "outBusTicket")}
                          className="hidden"
                          id="outBusTicketUpload"
                        />
                        <label
                          htmlFor="outBusTicketUpload"
                          className="flex items-center justify-center w-full px-4 py-4 bg-white border-2 border-dashed border-slate-300 rounded-xl hover:border-emerald-400 hover:bg-emerald-50 transition-all duration-200 cursor-pointer"
                        >
                          <div className="text-center">
                            <Upload className="h-6 w-6 text-slate-400 mx-auto mb-1" />
                            <p className="text-slate-600 text-sm">
                              {formData.outBusTicketImageName ||
                                "Upload bus ticket"}
                            </p>
                          </div>
                        </label>
                      </div>
                      {errors.outBusTicketImage && (
                        <p className="text-red-500 text-sm mt-2 font-medium">
                          {errors.outBusTicketImage}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-700 mb-3">
                        Bus Amount
                      </label>
                      <input
                        type="number"
                        name="outBusAmount"
                        value={formData.outBusAmount}
                        onChange={handleInputChange}
                        placeholder="Enter bus fare amount"
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 text-slate-700 font-medium"
                      />
                      {errors.outBusAmount && (
                        <p className="text-red-500 text-sm mt-2 font-medium">
                          {errors.outBusAmount}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Rent Car/Bike Fields */}
                {(formData.outVehicleType === "Rent Car" ||
                  formData.outVehicleType === "Rent Bike") && (
                  <div className="grid gap-4 lg:grid-cols-2 mb-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-700 mb-3">
                        Bill Receipt
                      </label>
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            handleFileChange(e, "outBillReceipt")
                          }
                          className="hidden"
                          id="outBillReceiptUpload"
                        />
                        <label
                          htmlFor="outBillReceiptUpload"
                          className="flex items-center justify-center w-full px-4 py-4 bg-white border-2 border-dashed border-slate-300 rounded-xl hover:border-emerald-400 hover:bg-emerald-50 transition-all duration-200 cursor-pointer"
                        >
                          <div className="text-center">
                            <Upload className="h-6 w-6 text-slate-400 mx-auto mb-1" />
                            <p className="text-slate-600 text-sm">
                              {formData.outBillReceiptName ||
                                "Upload bill receipt"}
                            </p>
                          </div>
                        </label>
                      </div>
                      {errors.outBillReceipt && (
                        <p className="text-red-500 text-sm mt-2 font-medium">
                          {errors.outBillReceipt}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-700 mb-3">
                        Amount
                      </label>
                      <input
                        type="number"
                        name="outRentAmount"
                        value={formData.outRentAmount}
                        onChange={handleInputChange}
                        placeholder="Enter rent amount"
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 text-slate-700 font-medium"
                      />
                      {errors.outRentAmount && (
                        <p className="text-red-500 text-sm mt-2 font-medium">
                          {errors.outRentAmount}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* OUT Remarks Field */}
                <div className="space-y-2 mb-4">
                  <label className="block text-sm font-semibold text-slate-700 mb-3">
                    OUT Travel Remarks
                  </label>
                  <textarea
                    name="outRemarks"
                    value={formData.outRemarks}
                    onChange={handleInputChange}
                    placeholder="Enter any additional remarks for OUT travel"
                    rows={3}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 text-slate-700 font-medium resize-none"
                  />
                </div>

                {/* Submit Button for OUT */}
                <button
                  type="submit"
                  className="w-full lg:w-auto bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:via-teal-700 hover:to-cyan-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Submitting OUT Travel Info...
                    </span>
                  ) : (
                    "Submit Complete Travel Information"
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Travel;
