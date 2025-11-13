import React from "react";
import { Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Production from "./pages/Production";
import Sales from "./pages/Sales";
import Reports from "./pages/Reports";
import RawMaterials from "./pages/RawMaterials";

export default function App() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 p-10 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/production" element={<Production />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/raw-materials" element={<RawMaterials />} />
          <Route path="/reports" element={<Reports />} />
        </Routes>
      </div>
    </div>
  );
}
