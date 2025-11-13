import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function Dashboard() {
  const [summary, setSummary] = useState([]);
  const [totals, setTotals] = useState({ produced: 0, sold: 0, stock: 0 });

  const fetchData = async () => {
    try {
      const [prodRes, salesRes] = await Promise.all([
        axios.get("http://localhost:5000/api/blocks"),
        axios.get("http://localhost:5000/api/blocks/sales"),
      ]);

      const production = prodRes.data || [];
      const sales = salesRes.data || [];
      const blockSizes = ["4 inch", "6 inch", "8 inch"];

      const summaryData = blockSizes.map((size) => {
        const produced = production
          .filter((p) => (p.size || p.blockSize) === size)
          .reduce((sum, p) => sum + (p.produced || p.quantity || 0), 0);

        const sold = sales
          .filter((s) => (s.blockSize || s.size) === size)
          .reduce((sum, s) => sum + (s.quantity || 0), 0);

        const stock = produced - sold;
        return { size, produced, sold, stock };
      });

      const totalProduced = summaryData.reduce((a, b) => a + b.produced, 0);
      const totalSold = summaryData.reduce((a, b) => a + b.sold, 0);
      const totalStock = totalProduced - totalSold;

      setSummary(summaryData);
      setTotals({
        produced: totalProduced,
        sold: totalSold,
        stock: totalStock,
      });
    } catch (err) {
      console.error("❌ Error fetching dashboard data:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ✅ Identify low stock items
  const lowStockBlocks = summary.filter((b) => b.stock <= 50);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-semibold mb-6 text-gray-800">
        Dashboard Overview
      </h1>

      {/* ===== SUMMARY CARDS ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
        <div className="bg-gradient-to-r from-blue-100 to-blue-200 border border-blue-300 p-6 rounded-xl shadow hover:shadow-lg transition">
          <h2 className="text-gray-700 text-sm font-medium mb-2">
            Total Produced
          </h2>
          <p className="text-4xl font-extrabold text-blue-800">
            {totals.produced}
          </p>
        </div>

        <div className="bg-gradient-to-r from-green-100 to-green-200 border border-green-300 p-6 rounded-xl shadow hover:shadow-lg transition">
          <h2 className="text-gray-700 text-sm font-medium mb-2">Total Sold</h2>
          <p className="text-4xl font-extrabold text-green-800">
            {totals.sold}
          </p>
        </div>

        <div className="bg-gradient-to-r from-yellow-100 to-yellow-200 border border-yellow-300 p-6 rounded-xl shadow hover:shadow-lg transition">
          <h2 className="text-gray-700 text-sm font-medium mb-2">
            Current Stock
          </h2>
          <p className="text-4xl font-extrabold text-yellow-800">
            {totals.stock}
          </p>
        </div>
      </div>

      {/* ===== CHART SECTION ===== */}
      <div className="bg-white border border-gray-200 rounded-xl shadow p-6 mb-10">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">
          Production vs Sales Chart
        </h2>

        {summary.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={summary}
              margin={{ top: 20, right: 20, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="size" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="produced" fill="#2563eb" name="Produced" />
              <Bar dataKey="sold" fill="#16a34a" name="Sold" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-gray-500 italic">Loading chart data...</p>
        )}
      </div>

      {/* ===== LOW STOCK ALERT SECTION ===== */}
      <div className="bg-white border border-gray-200 rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold text-red-700 mb-4">
          ⚠️ Low Stock Alerts
        </h2>

        {lowStockBlocks.length > 0 ? (
          <table className="w-full border-collapse">
            <thead className="bg-red-100 text-red-800">
              <tr>
                <th className="p-3 text-left">Block Size</th>
                <th className="p-3 text-left">Produced</th>
                <th className="p-3 text-left">Sold</th>
                <th className="p-3 text-left">Remaining Stock</th>
              </tr>
            </thead>
            <tbody>
              {lowStockBlocks.map((b) => (
                <tr
                  key={b.size}
                  className="border-t hover:bg-red-50 transition-colors"
                >
                  <td className="p-3 font-medium">{b.size}</td>
                  <td className="p-3">{b.produced}</td>
                  <td className="p-3">{b.sold}</td>
                  <td className="p-3 font-bold text-red-600">{b.stock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-green-600 text-sm font-medium italic">
            ✅ All blocks are sufficiently stocked.
          </p>
        )}
      </div>
    </div>
  );
}
