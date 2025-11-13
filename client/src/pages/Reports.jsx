import React, { useEffect, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Reports() {
  const [report, setReport] = useState([]);
  const [sales, setSales] = useState([]);

  const fetchData = async () => {
    try {
      // ✅ Updated endpoints
      const [prodRes, salesRes] = await Promise.all([
        axios.get("http://localhost:5000/api/blocks"),
        axios.get("http://localhost:5000/api/blocks/sales"),
      ]);

      const production = prodRes.data || [];
      const salesData = salesRes.data || [];
      setSales(salesData);

      const blockSizes = ["4 inch", "6 inch", "8 inch"];

      // ✅ Create summary report
      const summary = blockSizes.map((size) => {
        const produced = production
          .filter((p) => (p.size || p.blockSize) === size)
          .reduce((sum, p) => sum + (p.produced || p.quantity || 0), 0);

        const sold = salesData
          .filter((s) => (s.blockSize || s.size) === size)
          .reduce((sum, s) => sum + (s.quantity || 0), 0);

        const inStock = produced - sold;
        return { size, produced, sold, inStock };
      });

      setReport(summary);
    } catch (err) {
      console.error("❌ Error fetching report data:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ✅ Download PDF report
  const handleDownloadPDF = () => {
    if (!report.length) return alert("No data available to generate report.");

    const doc = new jsPDF();
    const currentDate = new Date().toLocaleDateString();

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("GHIMIRE TRADES - STOCK REPORT", 14, 20);
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Address: Itahari, Sunsari | Contact: +977-9800000000", 14, 28);
    doc.text(`Date: ${currentDate}`, 14, 34);

    // Summary table
    autoTable(doc, {
      startY: 45,
      head: [["Block Size", "Produced", "Sold", "In Stock"]],
      body: report.map((r) => [
        r.size,
        r.produced,
        r.sold,
        r.inStock,
      ]),
      headStyles: { fillColor: [25, 55, 155], textColor: 255 },
    });

    // Sales detail table
    if (sales.length > 0) {
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 15,
        head: [["Customer", "Block Size", "Quantity", "Date"]],
        body: sales.map((s) => [
          s.customer || "—",
          s.blockSize,
          s.quantity,
          new Date(s.date).toLocaleDateString(),
        ]),
        styles: { fontSize: 10 },
        headStyles: { fillColor: [85, 115, 225], textColor: 255 },
      });
    }

    doc.save("Ghimire_Trades_Report.pdf");
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6 text-gray-800">
        Reports & Stock Overview
      </h1>

      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="p-3">Block Size</th>
              <th className="p-3">Produced</th>
              <th className="p-3">Sold</th>
              <th className="p-3">In Stock</th>
            </tr>
          </thead>
          <tbody>
            {report.length ? (
              report.map((row) => (
                <tr key={row.size} className="border-t hover:bg-gray-50">
                  <td className="p-3 font-medium">{row.size}</td>
                  <td className="p-3">{row.produced}</td>
                  <td className="p-3">{row.sold}</td>
                  <td
                    className={`p-3 font-semibold ${
                      row.inStock <= 50 ? "text-red-500" : "text-green-600"
                    }`}
                  >
                    {row.inStock}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="p-4 text-center text-gray-500 italic">
                  No report data available.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <button
          onClick={handleDownloadPDF}
          className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg shadow-md transition"
        >
          📄 Download PDF Report
        </button>
      </div>
    </div>
  );
}
