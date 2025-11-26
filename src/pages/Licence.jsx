"use client";

import React from "react";
import { Shield } from "lucide-react";

const License = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">License Agreement</h1>
              <p className="text-gray-600">Software license terms and conditions</p>
            </div>
          </div>
        </div>

        {/* License Content Cards */}
        <div className="space-y-6">
          {/* Main License Card */}
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-8">
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                © BOTIVATE SERVICES LLP
              </h2>
              <p className="text-gray-600 leading-relaxed">
                This software is developed exclusively by Botivate Services LLP for use by its clients.
                Unauthorized use, distribution, or copying of this software is strictly prohibited and may
                result in legal action.
              </p>
            </div>
          </div>

          {/* Contact Information Card */}
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-8">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-blue-600 mb-4">
                Contact Information
              </h3>
              <p className="text-gray-600 mb-6">
                For license inquiries or technical support, please contact our support team:
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                  <a 
                    href="mailto:info@botivate.in" 
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    info@botivate.in
                  </a>
                </div>
                
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 bg-blue-400 rounded-full"></div>
                  <a 
                    href="https://www.botivate.in/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    www.botivate.in
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default License;