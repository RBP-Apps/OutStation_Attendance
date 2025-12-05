"use client";

import React, { useContext } from "react";
import { Play, Users, Settings, BarChart3, FileText, Wrench, Clock, MapPin, Receipt, CreditCard, History } from "lucide-react";
import { AuthContext } from "../App";

const Video = () => {
  const { currentUser } = useContext(AuthContext);
  
  const salesPersonName = currentUser?.salesPersonName || "User";
  const userRole = currentUser?.role || "user";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-0 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
          <div className="bg-gradient-to-r from-red-500 via-pink-500 to-purple-500 px-8 py-6">
            <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
              <Play className="h-8 w-8" />
              Help Video
            </h3>
            <p className="text-red-50 text-lg">
              Video tutorial and guidance for using the system
            </p>
            <div className="mt-2 text-red-100 text-sm">
              Welcome, {salesPersonName} ({userRole})
            </div>
          </div>

          <div className="p-8">
            <div className="mb-8">
              {/* Video Container */}
              <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-xl p-6 border border-red-100">
                <div className="relative w-full max-w-4xl mx-auto">
                  <div className="aspect-video bg-white rounded-lg shadow-lg overflow-hidden">
                    <iframe
                      width="100%"
                      height="100%"
                      src="https://www.youtube.com/embed/aHJ6uyF2Pzo"
                      title="Admin Help Video"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      className="rounded-lg"
                    ></iframe>
                  </div>
                </div>
              </div>
            </div>



            {/* Travel & Attendance Management Features */}
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-100">
              <h5 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                Travel & Attendance Management Features:
              </h5>
              
              <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
                <div className="flex items-start gap-3 text-blue-700 p-3 bg-white/50 rounded-lg">
                  <Clock className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
                  <div>
                    <span className="text-sm font-semibold block">One-Click Attendance Management</span>
                    <span className="text-xs text-blue-600">Mark attendance status: In, Out, or Leave with a single click</span>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 text-blue-700 p-3 bg-white/50 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
                  <div>
                    <span className="text-sm font-semibold block">Automated Travel Forms</span>
                    <span className="text-xs text-blue-600">Auto-filled user details with travel dates, origin & destination</span>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 text-blue-700 p-3 bg-white/50 rounded-lg">
                  <MapPin className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
                  <div>
                    <span className="text-sm font-semibold block">Multi-Modal Transport Support</span>
                    <span className="text-xs text-blue-600">Choose transport mode & upload travel receipts for all vehicle types</span>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 text-blue-700 p-3 bg-white/50 rounded-lg">
                  <Receipt className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
                  <div>
                    <span className="text-sm font-semibold block">Comprehensive Expense Tracking</span>
                    <span className="text-xs text-blue-600">Add accommodation, meals & local travel expenses with bill uploads</span>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 text-blue-700 p-3 bg-white/50 rounded-lg md:col-span-1 lg:col-span-2">
                  <div className="flex gap-2">
                    <History className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold block">Complete Travel Lifecycle Management</span>
                    <span className="text-xs text-blue-600">Submit advance amounts, receive confirmations & view past travel records in history tab</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Video;