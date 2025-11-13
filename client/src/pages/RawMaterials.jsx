// src/pages/RawMaterials.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function RawMaterials() {
  const API = "http://localhost:5000/api/raw-materials";

  // data
  const [materials, setMaterials] = useState([]);
  const [logs, setLogs] = useState([]);

  // tabs
  const [tab, setTab] = useState("materials");

  // add / edit material form
  const [newMaterialName, setNewMaterialName] = useState("");
  const [newMaterialUnit, setNewMaterialUnit] = useState("");
  const [editingMaterial, setEditingMaterial] = useState(null);

  // transaction form (receive/use)
  const [type, setType] = useState("in");
  const [materialName, setMaterialName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [editingLog, setEditingLog] = useState(null);

  // ui
  const [message, setMessage] = useState("");

  // fetch everything
  const fetchAll = async () => {
    try {
      const [mRes, lRes] = await Promise.all([
        axios.get(API),
        axios.get(`${API}/logs`),
      ]);
      setMaterials(mRes.data || []);
      setLogs(lRes.data || []);
    } catch (err) {
      console.error("Fetch error:", err);
      setMessage("Failed to load data from server.");
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const flash = (text, ms = 3000) => {
    setMessage(text);
    setTimeout(() => setMessage(""), ms);
  };

  /* ---------------------------
     Material CRUD
  ---------------------------*/
  const handleAddMaterial = async (e) => {
    e?.preventDefault();
    if (!newMaterialName.trim() || !newMaterialUnit.trim()) {
      flash("Please enter material name and unit.");
      return;
    }
    try {
      const res = await axios.post(API, {
        name: newMaterialName.trim(),
        unit: newMaterialUnit.trim(),
      });
      flash(res.data.message || "Material added");
      setNewMaterialName("");
      setNewMaterialUnit("");
      await fetchAll();
      setTab("materials");
    } catch (err) {
      console.error("Add material error:", err);
      flash(err.response?.data?.error || "Failed to add material");
    }
  };

  const openEditMaterial = (mat) => {
    setEditingMaterial(mat);
    setNewMaterialName(mat.name);
    setNewMaterialUnit(mat.unit);
    setTab("materials");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleUpdateMaterial = async () => {
    if (!editingMaterial) return;
    if (!newMaterialName.trim() || !newMaterialUnit.trim()) {
      flash("Please enter name and unit.");
      return;
    }
    try {
      const res = await axios.put(`${API}/${editingMaterial._id}`, {
        name: newMaterialName.trim(),
        unit: newMaterialUnit.trim(),
      });
      flash(res.data.message || "Material updated");
      setEditingMaterial(null);
      setNewMaterialName("");
      setNewMaterialUnit("");
      await fetchAll();
    } catch (err) {
      console.error("Update material error:", err);
      flash(err.response?.data?.error || "Failed to update material");
    }
  };

  const handleDeleteMaterial = async (id) => {
    if (!window.confirm("Delete material? (only allowed if there are no logs)")) return;
    try {
      const res = await axios.delete(`${API}/${id}`);
      flash(res.data.message || "Material deleted");
      await fetchAll();
    } catch (err) {
      console.error("Delete material error:", err);
      flash(err.response?.data?.error || "Failed to delete material");
    }
  };

  /* ---------------------------
     Logs CRUD
  ---------------------------*/
  const clearLogForm = () => {
    setType("in");
    setMaterialName("");
    setQuantity("");
    setNotes("");
    setEditingLog(null);
  };

  const handleSubmitLog = async (e) => {
    e?.preventDefault();
    if (!materialName || !quantity) {
      flash("Please select material and enter quantity.");
      return;
    }
    try {
      if (editingLog) {
        const res = await axios.put(`${API}/logs/${editingLog._id}`, {
          materialName,
          type,
          quantity: Number(quantity),
          notes,
        });
        flash(res.data.message || "Log updated");
      } else {
        const endpoint = type === "in" ? "receive" : "use";
        const res = await axios.post(`${API}/${endpoint}`, {
          materialName,
          quantity: Number(quantity),
          notes,
        });
        flash(res.data.message || (type === "in" ? "Received" : "Used"));
      }
      await fetchAll();
      clearLogForm();
      setTab("logs");
    } catch (err) {
      console.error("Log submit error:", err);
      flash(err.response?.data?.error || "Failed to submit log");
    }
  };

  const handleEditLog = (log) => {
    setEditingLog(log);
    setMaterialName(log.materialName);
    setType(log.type);
    setQuantity(log.quantity);
    setNotes(log.notes || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTab("logs");
  };

  const handleDeleteLog = async (id) => {
    if (!window.confirm("Delete this log? This will revert stock changes.")) return;
    try {
      const res = await axios.delete(`${API}/logs/${id}`);
      flash(res.data.message || "Log deleted");
      await fetchAll();
    } catch (err) {
      console.error("Delete log error:", err);
      flash(err.response?.data?.error || "Failed to delete log");
    }
  };

  /* ---------------------------
     Reports
  ---------------------------*/
  const totals = materials.reduce(
    (acc, m) => {
      acc.received += Number(m.received || 0);
      acc.used += Number(m.used || 0);
      acc.stock += Number(m.inStock || 0);
      return acc;
    },
    { received: 0, used: 0, stock: 0 }
  );

  const exportCSV = () => {
    const rows = [];
    rows.push(["Raw Material Summary"]);
    rows.push(["Name", "Unit", "Received", "Used", "InStock"]);
    materials.forEach((m) => {
      rows.push([m.name, m.unit, m.received, m.used, m.inStock]);
    });
    rows.push([]);
    rows.push(["Transaction Logs"]);
    rows.push(["Date", "Material", "Type", "Quantity", "Unit", "Notes"]);
    logs.forEach((l) => {
      rows.push([
        new Date(l.date).toLocaleString(),
        l.materialName,
        l.type,
        l.quantity,
        l.unit,
        l.notes || "",
      ]);
    });

    const csvContent = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `raw-materials-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ✅ FIXED & IMPROVED PDF EXPORT */
  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("Raw Materials Report", pageWidth / 2, 20, { align: "center" });

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

    // Summary Table
    autoTable(doc, {
      startY: 38,
      head: [["Total Received", "Total Used", "Current Stock"]],
      body: [[totals.received, totals.used, totals.stock]],
      styles: { halign: "center" },
      headStyles: { fillColor: [41, 128, 185] },
    });

    // Material Summary
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [["Name", "Unit", "Received", "Used", "In Stock"]],
      body: materials.map((m) => [
        m.name,
        m.unit,
        m.received,
        m.used,
        m.inStock,
      ]),
      styles: { fontSize: 10 },
      headStyles: { fillColor: [52, 152, 219] },
    });

    // Logs Table
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [["Date", "Material", "Type", "Quantity", "Unit", "Notes"]],
      body: logs.map((l) => [
        new Date(l.date).toLocaleString(),
        l.materialName,
        l.type.toUpperCase(),
        l.quantity,
        l.unit,
        l.notes || "",
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [44, 62, 80], textColor: 255 },
      didDrawPage: (data) => {
        // Footer
        doc.setFontSize(9);
        doc.text(
          `Page ${doc.internal.getNumberOfPages()}`,
          pageWidth - 20,
          doc.internal.pageSize.getHeight() - 10
        );
      },
    });

    doc.save(`raw-materials-report-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  /* ---------------------------
     Render
  ---------------------------*/
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-semibold">Raw Material Management</h1>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab("materials")}
          className={`px-4 py-2 rounded ${tab === "materials" ? "bg-blue-600 text-white" : "bg-white border"}`}
        >
          Materials
        </button>
        <button
          onClick={() => setTab("logs")}
          className={`px-4 py-2 rounded ${tab === "logs" ? "bg-blue-600 text-white" : "bg-white border"}`}
        >
          Logs
        </button>
        <button
          onClick={() => setTab("report")}
          className={`px-4 py-2 rounded ${tab === "report" ? "bg-blue-600 text-white" : "bg-white border"}`}
        >
          Report
        </button>
      </div>

      {message && <div className="text-center text-sm text-gray-700">{message}</div>}

      {/* ---------- MATERIALS TAB ---------- */}
      {tab === "materials" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Add/Edit Material */}
          <div className="bg-white p-6 rounded shadow border">
            <h2 className="text-lg font-semibold mb-3">
              {editingMaterial ? "Edit Material" : "Add Material"}
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                editingMaterial ? handleUpdateMaterial() : handleAddMaterial(e);
              }}
              className="space-y-3"
            >
              <div className="flex gap-2">
                <input
                  className="flex-1 border p-2 rounded"
                  placeholder="Material name (e.g., lime)"
                  value={newMaterialName}
                  onChange={(e) => setNewMaterialName(e.target.value)}
                />
                <input
                  className="w-40 border p-2 rounded"
                  placeholder="Unit (kg, tip, liter)"
                  value={newMaterialUnit}
                  onChange={(e) => setNewMaterialUnit(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                {editingMaterial ? (
                  <>
                    <button
                      type="button"
                      onClick={handleUpdateMaterial}
                      className="bg-yellow-500 px-4 py-2 rounded text-white"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingMaterial(null);
                        setNewMaterialName("");
                        setNewMaterialUnit("");
                      }}
                      className="px-4 py-2 rounded border"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    type="submit"
                    className="bg-green-600 px-4 py-2 rounded text-white"
                  >
                    Add Material
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Material List */}
          <div className="bg-white p-6 rounded shadow border overflow-x-auto">
            <h2 className="text-lg font-semibold mb-3">Material Summary</h2>
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2">Name</th>
                  <th className="p-2">Unit</th>
                  <th className="p-2">Received</th>
                  <th className="p-2">Used</th>
                  <th className="p-2">In Stock</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((m) => (
                  <tr key={m._id} className="border-t">
                    <td className="p-2 font-medium">{m.name}</td>
                    <td className="p-2">{m.unit}</td>
                    <td className="p-2">{m.received}</td>
                    <td className="p-2">{m.used}</td>
                    <td className="p-2 font-semibold">{m.inStock}</td>
                    <td className="p-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditMaterial(m)}
                          className="px-2 py-1 bg-yellow-400 rounded text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteMaterial(m._id)}
                          className="px-2 py-1 bg-red-600 text-white rounded text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {materials.length === 0 && (
                  <tr>
                    <td colSpan="6" className="p-4 text-center text-gray-500">
                      No materials yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------- LOGS TAB ---------- */}
      {tab === "logs" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded shadow border">
            <h2 className="text-lg font-semibold mb-3">
              {editingLog ? "Edit Transaction" : "Record Transaction"}
            </h2>

            <form onSubmit={handleSubmitLog} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div>
                <label className="text-sm block mb-1">Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="border p-2 rounded w-full"
                >
                  <option value="in">Receive (IN)</option>
                  <option value="out">Use (OUT)</option>
                </select>
              </div>

              <div>
                <label className="text-sm block mb-1">Material</label>
                <select
                  value={materialName}
                  onChange={(e) => setMaterialName(e.target.value)}
                  className="border p-2 rounded w-full"
                >
                  <option value="">Select material</option>
                  {materials.map((m) => (
                    <option key={m._id} value={m.name}>
                      {m.name} — {m.inStock} {m.unit}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm block mb-1">Quantity</label>
                <input
                  type="number"
                  step="any"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="border p-2 rounded w-full"
                  placeholder="Quantity"
                />
              </div>

              <div className="md:col-span-3">
                <label className="text-sm block mb-1">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="border p-2 rounded w-full"
                  rows="2"
                />
              </div>

              <div className="md:col-span-3 flex gap-2">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
                  {editingLog ? "Update Log" : type === "in" ? "Record Receive" : "Record Use"}
                </button>
                {editingLog && (
                  <button type="button" onClick={clearLogForm} className="px-4 py-2 rounded border">
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="bg-white p-6 rounded shadow border overflow-x-auto">
            <h2 className="text-lg font-semibold mb-3">Transaction Logs</h2>
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2">Date</th>
                  <th className="p-2">Material</th>
                  <th className="p-2">Type</th>
                  <th className="p-2">Quantity</th>
                  <th className="p-2">Unit</th>
                  <th className="p-2">Notes</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l._id} className="border-t">
                    <td className="p-2">{new Date(l.date).toLocaleString()}</td>
                    <td className="p-2">{l.materialName}</td>
                    <td className={`p-2 font-semibold ${l.type === "in" ? "text-green-600" : "text-red-600"}`}>
                      {l.type.toUpperCase()}
                    </td>
                    <td className="p-2">{l.quantity}</td>
                    <td className="p-2">{l.unit}</td>
                    <td className="p-2">{l.notes}</td>
                    <td className="p-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditLog(l)}
                          className="px-2 py-1 bg-yellow-400 rounded text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteLog(l._id)}
                          className="px-2 py-1 bg-red-600 text-white rounded text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan="7" className="p-4 text-center text-gray-500">
                      No transaction logs yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------- REPORT TAB ---------- */}
      {tab === "report" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded shadow border grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="p-4 border rounded">
              <div className="text-sm text-gray-500">Total Received</div>
              <div className="text-2xl font-bold text-green-600">{totals.received}</div>
            </div>
            <div className="p-4 border rounded">
              <div className="text-sm text-gray-500">Total Used</div>
              <div className="text-2xl font-bold text-red-600">{totals.used}</div>
            </div>
            <div className="p-4 border rounded">
              <div className="text-sm text-gray-500">Current Stock</div>
              <div className="text-2xl font-bold text-blue-600">{totals.stock}</div>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={exportPDF} className="bg-red-600 text-white px-4 py-2 rounded">
              📄 Download Report (PDF)
            </button>
            <button onClick={exportCSV} className="bg-green-600 text-white px-4 py-2 rounded">
              ⬇️ Export CSV
            </button>
          </div>

          <div className="bg-white p-6 rounded shadow border">
            <h3 className="font-semibold mb-2">Notes</h3>
            <p className="text-sm text-gray-600">
              This report includes a summary of all materials and transaction logs. You can download it as a PDF or CSV file.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
