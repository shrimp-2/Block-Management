import React, { useState, useEffect } from "react";
import axios from "axios";

export default function Sales() {
  const [blockSize, setBlockSize] = useState("");
  const [quantity, setQuantity] = useState("");
  const [customer, setCustomer] = useState("");
  const [sales, setSales] = useState([]);
  const [message, setMessage] = useState("");
  const [editingSale, setEditingSale] = useState(null);

  // ✅ Fetch all sales
  const fetchSales = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/blocks/sales");
      setSales(res.data);
    } catch (err) {
      console.error("❌ Error fetching sales:", err);
      setMessage("❌ Failed to load sales records.");
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  // ✅ Handle form submit (Add or Update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!blockSize || !quantity || !customer) {
      setMessage("⚠️ Please fill in all fields!");
      return;
    }

    try {
      if (editingSale) {
        // 🟡 Update existing sale
        const res = await axios.put(
          `http://localhost:5000/api/blocks/sales/${editingSale._id}`,
          { blockSize, quantity: Number(quantity), customer }
        );
        setMessage(res.data.message || "✅ Sale updated!");
      } else {
        // 🟢 Add new sale
        const res = await axios.post("http://localhost:5000/api/blocks/sales", {
          blockSize,
          quantity: Number(quantity),
          customer,
        });
        setMessage(res.data.message || "✅ Sale added!");
      }

      setBlockSize("");
      setQuantity("");
      setCustomer("");
      setEditingSale(null);
      await fetchSales();
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      console.error("❌ Error saving sale:", err);
      setMessage(
        err.response?.data?.error ||
          "❌ Failed to save sale. Please check stock or connection."
      );
    }
  };

  // ✏️ Edit sale
  const handleEdit = (sale) => {
    setEditingSale(sale);
    setBlockSize(sale.blockSize);
    setQuantity(sale.quantity);
    setCustomer(sale.customer);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // 🗑️ Delete sale
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this sale?")) return;
    try {
      const res = await axios.delete(
        `http://localhost:5000/api/blocks/sales/${id}`
      );
      setMessage(res.data.message || "🗑️ Sale deleted successfully!");
      await fetchSales();
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      console.error("❌ Error deleting sale:", err);
      setMessage("❌ Failed to delete sale.");
    }
  };

  return (
    <div className="p-6">
      {/* ===== HEADER ===== */}
      <h1 className="text-2xl font-semibold mb-6 text-gray-800">
        Sales Management
      </h1>

      {/* ===== ADD/EDIT SALE FORM ===== */}
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-xl shadow-md mb-8 flex flex-col gap-4 max-w-md"
      >
        <h2 className="text-lg font-semibold text-gray-800">
          {editingSale ? "✏️ Edit Sale" : "➕ Add New Sale"}
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
          placeholder="Quantity"
          className="border p-2 rounded focus:ring-2 focus:ring-blue-500"
        />

        <input
          type="text"
          value={customer}
          onChange={(e) => setCustomer(e.target.value)}
          placeholder="Customer Name"
          className="border p-2 rounded focus:ring-2 focus:ring-blue-500"
        />

        <button
          type="submit"
          className={`${
            editingSale
              ? "bg-yellow-600 hover:bg-yellow-700"
              : "bg-green-600 hover:bg-green-700"
          } text-white px-4 py-2 rounded font-medium transition`}
        >
          {editingSale ? "Update Sale" : "Add Sale"}
        </button>

        {editingSale && (
          <button
            type="button"
            onClick={() => {
              setEditingSale(null);
              setBlockSize("");
              setQuantity("");
              setCustomer("");
            }}
            className="text-gray-500 underline text-sm mt-2"
          >
            Cancel Edit
          </button>
        )}
      </form>

      {/* ===== MESSAGE ===== */}
      {message && (
        <p
          className={`text-center mb-4 font-medium ${
            message.includes("✅") || message.includes("🗑️")
              ? "text-green-600"
              : "text-red-600"
          }`}
        >
          {message}
        </p>
      )}

      {/* ===== SALES TABLE ===== */}
      <h2 className="text-xl font-semibold mb-3 text-gray-800">
        Sales Records
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full bg-white rounded-xl shadow border border-gray-200">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="p-3 text-left">Block Size</th>
              <th className="p-3 text-left">Quantity</th>
              <th className="p-3 text-left">Customer</th>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sales.length > 0 ? (
              sales.map((item) => (
                <tr key={item._id} className="border-t hover:bg-gray-50">
                  <td className="p-3 font-medium">{item.blockSize}</td>
                  <td className="p-3">{item.quantity}</td>
                  <td className="p-3">{item.customer || "—"}</td>
                  <td className="p-3 text-gray-600">
                    {new Date(item.date).toLocaleString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => handleEdit(item)}
                      className="bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded mr-2"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item._id)}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="5"
                  className="p-4 text-center text-gray-500 italic"
                >
                  No sales records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
