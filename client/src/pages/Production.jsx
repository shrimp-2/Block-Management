import React, { useEffect, useState } from "react";
import axios from "axios";

export default function Production() {
  const [blockSize, setBlockSize] = useState("");
  const [quantity, setQuantity] = useState("");
  const [productions, setProductions] = useState([]); // All production entries
  const [blocks, setBlocks] = useState([]); // Block summary
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [totals, setTotals] = useState({ produced: 0, sold: 0, stock: 0 });

  const API = "http://localhost:5000/api/blocks";

  // Fetch production entries and block summary
  const fetchData = async () => {
    try {
      const [blocksRes, prodRes] = await Promise.all([
        axios.get(API),
        axios.get(`${API}/production`),
      ]);
      const blockData = blocksRes.data || [];
      const prodData = prodRes.data || [];

      setBlocks(blockData);
      setProductions(prodData);

      const totalProduced = blockData.reduce((sum, b) => sum + (b.produced || 0), 0);
      const totalSold = blockData.reduce((sum, b) => sum + (b.sold || 0), 0);
      const totalStock = blockData.reduce((sum, b) => sum + (b.inStock || 0), 0);

      setTotals({ produced: totalProduced, sold: totalSold, stock: totalStock });
    } catch (err) {
      console.error("❌ Fetch error:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle add or update
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!blockSize || !quantity) {
      setMessage("⚠️ Please fill all fields!");
      return;
    }

    try {
      if (editingId) {
        await axios.put(`${API}/production/${editingId}`, {
          blockSize,
          quantity: Number(quantity),
        });
        setMessage("✅ Production updated successfully!");
      } else {
        await axios.post(`${API}/production`, {
          blockSize,
          quantity: Number(quantity),
        });
        setMessage("✅ Production added successfully!");
      }

      setBlockSize("");
      setQuantity("");
      setEditingId(null);
      fetchData();
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      console.error("❌ Submit error:", err);
      setMessage("❌ Operation failed. Check console for details.");
    }
  };

  // Handle edit
  const handleEdit = (prod) => {
    setEditingId(prod._id);
    setBlockSize(prod.blockSize);
    setQuantity(prod.quantity);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Handle delete
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;

    try {
      await axios.delete(`${API}/production/${id}`);
      setMessage("🗑️ Production deleted successfully!");
      fetchData();
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      console.error("❌ Delete error:", err);
      setMessage("❌ Failed to delete production.");
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-semibold mb-6 text-gray-800">Production Management</h1>

      {/* ===== SUMMARY CARDS ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
        <div className="bg-blue-100 border border-blue-300 p-6 rounded-xl shadow">
          <h2 className="text-gray-700 text-sm mb-2">Total Produced</h2>
          <p className="text-3xl font-extrabold text-blue-800">{totals.produced}</p>
        </div>

        <div className="bg-green-100 border border-green-300 p-6 rounded-xl shadow">
          <h2 className="text-gray-700 text-sm mb-2">Total Sold</h2>
          <p className="text-3xl font-extrabold text-green-800">{totals.sold}</p>
        </div>

        <div className="bg-yellow-100 border border-yellow-300 p-6 rounded-xl shadow">
          <h2 className="text-gray-700 text-sm mb-2">Current Stock</h2>
          <p className="text-3xl font-extrabold text-yellow-800">{totals.stock}</p>
        </div>
      </div>

      {/* ===== FORM ===== */}
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-xl shadow-md mb-8 flex flex-col gap-4 max-w-md border border-gray-200"
      >
        <h2 className="text-lg font-semibold text-gray-800">
          {editingId ? "✏️ Edit Production Entry" : "➕ Add New Production Entry"}
        </h2>

        <select
          value={blockSize}
          onChange={(e) => setBlockSize(e.target.value)}
          className="border p-2 rounded focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select Block Size</option>
          <option value="4 inch">4 inch</option>
          <option value="6 inch">6 inch</option>
          <option value="8 inch">8 inch</option>
        </select>

        <input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="Quantity Produced"
          className="border p-2 rounded focus:ring-2 focus:ring-blue-500"
        />

        <button
          type="submit"
          className={`${
            editingId ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"
          } text-white px-4 py-2 rounded font-medium transition`}
        >
          {editingId ? "Update Production" : "Add Production"}
        </button>
      </form>

      {/* ===== MESSAGE ALERT ===== */}
      {message && (
        <div
          className={`mb-6 p-3 rounded-lg text-center font-medium transition ${
            message.includes("✅")
              ? "bg-green-100 text-green-700 border border-green-300"
              : "bg-red-100 text-red-700 border border-red-300"
          }`}
        >
          {message}
        </div>
      )}

      {/* ===== BLOCK SUMMARY ===== */}
      <h2 className="text-xl font-semibold mb-3 text-gray-800">📦 Current Block Summary</h2>
      <div className="overflow-x-auto mb-10">
        <table className="w-full bg-white rounded-xl shadow border border-gray-200">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="p-3 text-left">Block Size</th>
              <th className="p-3 text-left">Produced</th>
              <th className="p-3 text-left">Sold</th>
              <th className="p-3 text-left">In Stock</th>
            </tr>
          </thead>
          <tbody>
            {blocks.length ? (
              blocks.map((item) => (
                <tr
                  key={item._id}
                  className={`border-t hover:bg-gray-50 ${
                    item.inStock <= 50 ? "bg-red-50" : ""
                  }`}
                >
                  <td className="p-3 font-medium">{item.size}</td>
                  <td className="p-3">{item.produced}</td>
                  <td className="p-3">{item.sold}</td>
                  <td
                    className={`p-3 font-semibold ${
                      item.inStock <= 50 ? "text-red-600" : "text-green-700"
                    }`}
                  >
                    {item.inStock}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="p-4 text-center text-gray-500 italic">
                  No production records yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ===== PRODUCTION RECORDS ===== */}
      <h2 className="text-xl font-semibold mb-3 text-gray-800">🧱 Production Records</h2>
      <div className="overflow-x-auto">
        <table className="w-full bg-white rounded-xl shadow border border-gray-200">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="p-3 text-left">Block Size</th>
              <th className="p-3 text-left">Quantity</th>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {productions.length ? (
              productions.map((prod) => (
                <tr key={prod._id} className="border-t hover:bg-gray-50">
                  <td className="p-3">{prod.blockSize}</td>
                  <td className="p-3">{prod.quantity}</td>
                  <td className="p-3">{new Date(prod.date).toLocaleDateString()}</td>
                  <td className="p-3 flex gap-2">
                    <button
                      onClick={() => handleEdit(prod)}
                      className="bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(prod._id)}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="p-4 text-center text-gray-500 italic">
                  No production entries found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
