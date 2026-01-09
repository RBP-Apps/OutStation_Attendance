"use client";

import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthContext } from "./context/AuthContext";
import Login from "./pages/Login";
import Attendance from "./pages/Attendents";
import Sidebar from "./components/Sidebaar";
import Travel from "./pages/Travel";
import History from "./pages/History";
import Video from "./pages/Video";
import License from "./pages/Licence";
import LocalTravel from "./pages/LocalTravel";
import LocalTravelHistory from "./pages/LocalTravelHistory";
import AdvanceRequest from "./pages/Advance";
import Approval from "./pages/Approval";

const App = () => {
  // CRITICAL FIX: Initialize auth state from localStorage SYNCHRONOUSLY
  // Using lazy initializer functions to read from localStorage on first render
  // This prevents the flash of login page on page reload

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Synchronously check localStorage on initial render
    const auth = localStorage.getItem("isAuthenticated");
    return auth === "true";
  });

  const [notification, setNotification] = useState(null);

  const [currentUser, setCurrentUser] = useState(() => {
    // Synchronously get user from localStorage on initial render
    const storedUser = localStorage.getItem("currentUser");
    if (storedUser) {
      try {
        return JSON.parse(storedUser);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [userType, setUserType] = useState(() => {
    return localStorage.getItem("userType") || null;
  });

  const [tabs, setTabs] = useState(() => {
    const storedUser = localStorage.getItem("currentUser");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        return parsed.tabs || [];
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  // Spreadsheet ID for Google Sheets data
  const SPREADSHEET_ID = "10coGuAVkdMNVUoX_L2HedehSb7d5lpgGQHTNjAZiGaQ";

  // This useEffect is now only for listening to storage changes (e.g., from other tabs)
  // The initial state is already set synchronously above
  useEffect(() => {
    // Listen for storage changes from other tabs
    const handleStorageChange = (e) => {
      if (e.key === "isAuthenticated") {
        setIsAuthenticated(e.newValue === "true");
      }
      if (e.key === "currentUser" && e.newValue) {
        try {
          const parsedUser = JSON.parse(e.newValue);
          setCurrentUser(parsedUser);
          setTabs(parsedUser.tabs || []);
        } catch (error) {
          console.error("Error parsing stored user:", error);
        }
      }
      if (e.key === "userType") {
        setUserType(e.newValue);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const login = async (username, password) => {
    try {
      const masterSheetUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=Master`;
      const response = await fetch(masterSheetUrl);
      const text = await response.text();

      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}") + 1;
      const jsonData = text.substring(jsonStart, jsonEnd);
      const data = JSON.parse(jsonData);

      if (!data?.table?.rows) {
        showNotification(
          "Failed to fetch user data from Master sheet.",
          "error"
        );
        return false;
      }

      const rows = data.table.rows;

      console.log("rows", rows);

      const foundUserRow = rows.find((row) => {
        const rowUsername = row.c?.[1]?.v;
        const rowPassword = row.c?.[2]?.v;

        return (
          String(rowUsername) === String(username) &&
          String(rowPassword) === String(password)
        );
      });

      if (foundUserRow) {
        const accessValue = foundUserRow.c?.[4]?.v;

        const InFiled = foundUserRow.c?.[5]?.v;

        let userTabs = [];

        if (accessValue === "all") {
          userTabs = [
            "History",
            "Travel",
            "Approval",
            "Attendance",
            "Video",
            "License",
            "Local Travel",
            "Local Travel History",
            "OTR",
          ];
        } else if (accessValue && typeof accessValue === "string") {
          userTabs = accessValue
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);
        }

        const userInfo = {
          username: username,
          salesPersonName: foundUserRow.c?.[0]?.v || "Unknown Sales Person",
          role: foundUserRow.c?.[3]?.v || "user",
          loginTime: new Date().toISOString(),
          tabs: userTabs,
        };

        setIsAuthenticated(true);
        setCurrentUser(userInfo);
        setUserType(userInfo.role);
        setTabs(userInfo.tabs);

        localStorage.setItem("isAuthenticated", "true");
        localStorage.setItem("currentUser", JSON.stringify(userInfo));
        localStorage.setItem("userType", userInfo.role);
        localStorage.setItem("InFiled", InFiled);

        showNotification(
          `Welcome, ${userInfo.salesPersonName || username}!`,
          "success"
        );
        return true;
      } else {
        showNotification("Invalid username or password", "error");
        return false;
      }
    } catch (error) {
      console.error("Login error:", error);
      showNotification("An error occurred during login", "error");
      return false;
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setUserType(null);
    setTabs([]);
    localStorage.clear();
    showNotification("Logged out successfully", "success");
  };

  const showNotification = (message, type = "info") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const isAdmin = () => userType === "admin";

  const ProtectedRoute = ({ children, adminOnly = false }) => {
    if (!isAuthenticated) return <Navigate to="/login" />;
    if (adminOnly && !isAdmin()) {
      showNotification(
        "You don't have permission to access this page",
        "error"
      );
      return <Navigate to="/attendance" />;
    }
    return children;
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        login,
        logout,
        currentUser,
        userType,
        isAdmin,
        showNotification,
        tabs,
      }}
    >
      <Router>
        <div className="flex h-screen bg-gray-50 text-gray-900">
          {isAuthenticated && (
            <div className=" md:fixed md:inset-y-0 md:left-0 md:w-64 md:bg-gray-800 md:text-white md:z-20 md:shadow-lg">
              <Sidebar
                logout={logout}
                userType={userType}
                username={currentUser?.salesPersonName || currentUser?.username}
                tabs={tabs}
              />
            </div>
          )}

          <div
            className={`flex flex-col flex-1 overflow-hidden ${
              isAuthenticated ? "md:ml-64" : ""
            }`}
          >
            {notification && (
              <div
                className={`p-4 text-sm ${
                  notification.type === "error"
                    ? "bg-red-100 text-red-700"
                    : notification.type === "success"
                    ? "bg-green-100 text-green-700"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {notification.message}
              </div>
            )}

            <div className="sm:mt-0 mt-12 flex-1 min-h-0 overflow-y-auto px-2 sm:px-6 py-4 flex flex-col justify-between">
              <div className="mb-5">
                <Routes>
                  <Route
                    path="/login"
                    element={
                      !isAuthenticated ? (
                        <Login />
                      ) : (
                        <Navigate to="/attendance" />
                      )
                    }
                  />
                  <Route
                    path="/travel"
                    element={
                      <ProtectedRoute>
                        <Travel />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/approval"
                    element={
                      <ProtectedRoute>
                        <Approval />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/history"
                    element={
                      <ProtectedRoute>
                        <History />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/attendance"
                    element={
                      <ProtectedRoute>
                        <Attendance />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/video"
                    element={
                      <ProtectedRoute>
                        <Video />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/license"
                    element={
                      <ProtectedRoute>
                        <License />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/localtravel"
                    element={
                      <ProtectedRoute>
                        <LocalTravel />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/localtravelhistory"
                    element={
                      <ProtectedRoute>
                        <LocalTravelHistory />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/advance"
                    element={
                      <ProtectedRoute>
                        <AdvanceRequest />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="*" element={<Navigate to="/attendance" />} />
                </Routes>
              </div>

              <footer className=" fixed bottom-0 left-0 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white text-center py-3 shadow-inner z-50">
                <p className="text-sm font-medium">
                  Powered by{" "}
                  <a
                    href="https://www.botivate.in/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-yellow-300 transition"
                  >
                    Botivate
                  </a>
                </p>
              </footer>
            </div>
          </div>
        </div>
      </Router>
    </AuthContext.Provider>
  );
};

export default App;
