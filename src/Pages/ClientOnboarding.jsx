"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Plus, AlertCircle, CheckCircle } from "lucide-react";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import DashboardPdf from "../Components/DashboardPdf";

const API_URL = "https://pgsql-invoice.onrender.com/api/clients";

const emptyForm = {
  name: "",
  address: "",
  state: "",
  gst_number: "",
  company_name: "",
};

const ActionCellRenderer = ({ data, onEdit, onDelete }) => (
  <div className="flex gap-2 justify-end h-full items-center">
    <button
      onClick={() => onEdit(data)}
      className="inline-flex items-center gap-1 px-3 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors font-medium text-sm"
    >
      Edit
    </button>
    <button
      onClick={() => onDelete(data.id)}
      className="inline-flex items-center gap-1 px-3 py-1 text-red-600 hover:bg-red-50 rounded transition-colors font-medium text-sm"
    >
      Delete
    </button>
  </div>
);

const ClientOnboarding = () => {
  const [clients, setClients] = useState([]);
  const [formData, setFormData] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deleteId, setDeleteId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [validationErrors, setValidationErrors] = useState({});
  const gridApiRef = useRef(null);

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError("");
        setSuccess("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const onGridReady = (params) => {
    gridApiRef.current = params.api;
    params.api.sizeColumnsToFit();
    window.addEventListener("resize", () => {
      setTimeout(() => {
        params.api.sizeColumnsToFit();
      });
    });
  };

  const fetchClients = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error("Failed to fetch clients");
      const data = await res.json();
      setClients(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch clients");
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) errors.name = "Client name is required";
    if (!formData.address.trim()) errors.address = "Address is required";
    if (!formData.state.trim()) errors.state = "State is required";
    if (!formData.company_name.trim())
      errors.company_name = "Company Name is required";

    if (!formData.gst_number) {
      errors.gst_number = "Invalid GST Number format";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenForm = () => {
    setFormData(emptyForm);
    setEditingId(null);
    setShowForm(true);
    setShowPreview(false);
    setValidationErrors({});
  };

  const handleEditClient = (client) => {
    setFormData({
      name: client.name || "",
      address: client.address || "",
      state: client.state || "",
      gst_number: client.gst_number || "",
      company_name: client.company_name || "",
    });
    setEditingId(client.id);
    setShowForm(true);
    setShowPreview(false);
    setValidationErrors({});
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (validationErrors[name]) {
      setValidationErrors({ ...validationErrors, [name]: "" });
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setShowPreview(true);
    setShowForm(false);
  };

  const handleEditPreview = () => {
    setShowPreview(false);
    setShowForm(true);
  };

  const handleFinalSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const method = editingId ? "PUT" : "POST";
      const url = editingId ? `${API_URL}/${editingId}` : API_URL;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Failed to save client");

      await fetchClients();
      setShowPreview(false);
      setShowForm(false);
      setEditingId(null);
      setFormData(emptyForm);
      setSuccess(
        editingId
          ? "Client updated successfully!"
          : "Client added successfully!"
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save client");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id) => setDeleteId(id);

  const confirmDelete = async () => {
    if (!deleteId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete client");
      await fetchClients();
      setDeleteId(null);
      setSuccess("Client deleted successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete client");
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.state.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columnDefs = [
    {
      field: "SNo",
      maxWidth: 80,
      valueGetter: "node.rowIndex + 1",
      filter: true,
      floatingFilter: true,
      sortable: true,
      resizable: true,
    },
    {
      field: "name",
      headerName: "Name",
      minWidth: 150,
      filter: true,
      floatingFilter: true,
      sortable: true,
      resizable: true,
    },
    {
      field: "company_name",
      headerName: "Company Name",
      minWidth: 130,
      filter: true,
      floatingFilter: true,
      sortable: true,
      resizable: true,
    },
    {
      field: "address",
      headerName: "Address",
      minWidth: 180,
      filter: true,
      floatingFilter: true,
      sortable: true,
      resizable: true,
    },
    {
      field: "state",
      headerName: "State",
      minWidth: 120,
      filter: true,
      floatingFilter: true,
      sortable: true,
      resizable: true,
    },
    {
      field: "gst_number",
      headerName: "GST",
      minWidth: 150,
      filter: true,
      floatingFilter: true,
      sortable: true,
      resizable: true,
    },
    {
      field: "Actions",
      headerName: "Actions",
      minWidth: 200,
      cellRenderer: (params) => (
        <ActionCellRenderer
          data={params.data}
          onEdit={handleEditClient}
          onDelete={handleDelete}
        />
      ),
      sortable: false,
      filter: false,
      resizable: true,
    },
  ];

  return (
    <div className="min-h-screen font-sans">
      <DashboardPdf />
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Client Management
          </h1>
          <p className="text-slate-600">
            Manage and onboard your clients efficiently
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-green-800">{success}</p>
          </div>
        )}

        {/* Add Button */}
        {!showForm && !showPreview && (
          <div className="flex justify-end mb-6">
            <button
              onClick={handleOpenForm}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-md transition-colors"
            >
              <Plus className="h-5 w-5" />
              Add Client
            </button>
          </div>
        )}

        {/* Form View */}
        {showForm && (
          <div className="mb-8 bg-white rounded-lg shadow-md overflow-hidden">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="text-2xl font-bold text-slate-900">
                {editingId ? "Edit Client" : "Add New Client"}
              </h2>
              <p className="text-slate-600 text-sm mt-1">
                {editingId
                  ? "Update client information"
                  : "Fill in the details to add a new client"}
              </p>
            </div>
            <div className="p-6">
              <form onSubmit={handleFormSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Client Name */}
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Client Name <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Enter client name"
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                        validationErrors.name
                          ? "border-red-500 bg-red-50"
                          : "border-slate-300 bg-white"
                      }`}
                    />
                    {validationErrors.name && (
                      <p className="text-red-600 text-sm mt-1">
                        {validationErrors.name}
                      </p>
                    )}
                  </div>

                  {/* Company ID */}
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Company Name <span className="text-red-600">*</span>
                    </label>
                    <select
                      name="company_name"
                      value={formData.company_name}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                        validationErrors.company_name
                          ? "border-red-500 bg-red-50"
                          : "border-slate-300 bg-white"
                      }`}
                      required
                    >
                      <option value="2">Panorama Software Solutions</option>
                      <option value="1">Software Solutions Pvt. Ltd.</option>
                    </select>
                    {validationErrors.company_name && (
                      <p className="text-red-600 text-sm mt-1">
                        {validationErrors.company_name}
                      </p>
                    )}
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Address <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="Enter address"
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                        validationErrors.address
                          ? "border-red-500 bg-red-50"
                          : "border-slate-300 bg-white"
                      }`}
                    />
                    {validationErrors.address && (
                      <p className="text-red-600 text-sm mt-1">
                        {validationErrors.address}
                      </p>
                    )}
                  </div>

                  {/* State */}
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      State <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      placeholder="Enter state"
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                        validationErrors.state
                          ? "border-red-500 bg-red-50"
                          : "border-slate-300 bg-white"
                      }`}
                    />
                    {validationErrors.state && (
                      <p className="text-red-600 text-sm mt-1">
                        {validationErrors.state}
                      </p>
                    )}
                  </div>

                  {/* GST Number */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      GST Number{" "}
                      <span className="text-slate-500 text-xs">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      name="gst_number"
                      value={formData.gst_number}
                      onChange={handleChange}
                      placeholder="Enter GST number (e.g., 27AAPPC1234F1Z0)"
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                        validationErrors.gst_number
                          ? "border-red-500 bg-red-50"
                          : "border-slate-300 bg-white"
                      }`}
                    />
                    {validationErrors.gst_number && (
                      <p className="text-red-600 text-sm mt-1">
                        {validationErrors.gst_number}
                      </p>
                    )}
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setFormData(emptyForm);
                      setEditingId(null);
                      setValidationErrors({});
                    }}
                    className="px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
                  >
                    {loading ? "Loading..." : "Preview"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Preview */}
        {showPreview && (
          <div className="mb-8 bg-white rounded-lg shadow-md overflow-hidden border border-blue-200">
            <div className="border-b border-slate-200 px-6 py-4 bg-blue-50">
              <h2 className="text-2xl font-bold text-slate-900">
                Preview & Confirm
              </h2>
              <p className="text-slate-600 text-sm mt-1">
                Review the information before submitting
              </p>
            </div>
            <div className="p-6">
              <div className="bg-slate-50 rounded-lg p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">
                      Client Name
                    </p>
                    <p className="text-lg font-semibold text-slate-900">
                      {formData.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">
                      Company Name
                    </p>
                    <p className="text-lg font-semibold font-mono text-slate-900">
                      {formData.company_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">
                      Address
                    </p>
                    <p className="text-lg font-semibold text-slate-900">
                      {formData.address}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">
                      State
                    </p>
                    <p className="text-lg font-semibold text-slate-900">
                      {formData.state}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">
                      GST Number
                    </p>
                    <p className="text-lg font-semibold font-mono text-slate-900">
                      {formData.gst_number || "—"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                <button
                  onClick={handleEditPreview}
                  className="px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={handleFinalSubmit}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium rounded-lg transition-colors"
                >
                  {loading ? "Submitting..." : "Submit"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation */}
        {deleteId && (
          <div className="mb-8 bg-white rounded-lg shadow-md overflow-hidden border border-red-200">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900">Delete Client?</p>
                  <p className="text-sm text-slate-600 mt-1">
                    This action cannot be undone.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteId(null)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    disabled={loading}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium rounded-lg transition-colors"
                  >
                    {loading ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AG Grid Table View */}
        {!showForm && !showPreview && (
          <>
            {/* AG Grid Table */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="border-b border-slate-200 px-6 py-4">
                <h3 className="text-lg font-semibold text-slate-900">
                  Clients{" "}
                  <span className="text-slate-500 font-normal">
                    ({filteredClients.length})
                  </span>
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  {loading
                    ? "Loading clients..."
                    : `Managing ${filteredClients.length} client${
                        filteredClients.length !== 1 ? "s" : ""
                      }`}
                </p>
              </div>
              <div
                className="ag-theme-quartz"
                style={{ height: "500px", width: "100%" }}
              >
                <AgGridReact
                  rowData={filteredClients}
                  columnDefs={columnDefs}
                  pagination={true}
                  paginationPageSize={10}
                  rowSelection="single"
                  animateRows={true}
                  onGridReady={onGridReady}
                  ref={gridApiRef}
                  defaultColDef={{
                    resizable: true,
                    sortable: true,
                    filter: true,
                  }}
                  overlayNoRowsTemplate={
                    filteredClients.length === 0
                      ? clients.length === 0
                        ? "<span>No clients yet. Add your first client to get started!</span>"
                        : "<span>No clients match your search.</span>"
                      : ""
                  }
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ClientOnboarding;
