import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  BarChart3,
  Factory,
  ShoppingCart,
  FileText,
  Package,
} from "lucide-react";

export default function Sidebar() {
  const location = useLocation();

  const navItems = [
    { name: "Dashboard", icon: <BarChart3 size={20} />, path: "/" },
    { name: "Production", icon: <Factory size={20} />, path: "/production" },
    { name: "Sales", icon: <ShoppingCart size={20} />, path: "/sales" },
    { name: "Raw Materials", icon: <Package size={20} />, path: "/raw-materials" },
    { name: "Reports", icon: <FileText size={20} />, path: "/reports" },
  ];

  return (
    <div className="w-64 bg-blue-700 text-white flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-blue-600">
        <h1 className="text-2xl font-bold tracking-wide">Ghimire Trades</h1>
        <p className="text-sm text-blue-200">Stock Management</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${
                isActive
                  ? "bg-blue-900 text-white shadow-inner"
                  : "text-blue-100 hover:bg-blue-800 hover:text-white"
              }`}
            >
              {item.icon}
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 text-center border-t border-blue-600 text-sm text-blue-200">
        © {new Date().getFullYear()} Ghimire Trades
      </div>
    </div>
  );
}
