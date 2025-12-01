"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import DashboardPdf from "../Components/DashboardPdf";
import LoaderOverlay from "./LoaderOverlay";
import toast, { Toaster } from "react-hot-toast";

const API_URL =
  import.meta.env.VITE_STATE === "DEV"
    ? `${import.meta.env.VITE_BASE_URL_DEV}/clients`
    : `${import.meta.env.VITE_BASE_URL_PROD}/clients`;

const emptyForm = {
  name: "",
  address: "",
  tax_rate: "",
  gst_number: "",
  company_id: "",
};

const companyOptions = [
  { id: 1, name: "Panorama Software Solutions" },
  { id: 2, name: "Software Solutions Pvt. Ltd." },
];

const ActionCellRenderer = ({ data, onEdit, onDelete }) => (
  <div className="flex gap-2 justify-end h-full items-center">
    <button
      onClick={() => onEdit(data)}
      className="inline-flex items-center gap-1 px-3 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors font-medium text-sm"
    >
      <Pencil className="h-4 w-4" />
    </button>
    <button
      onClick={() => onDelete(data.id)}
      className="inline-flex items-center gap-1 px-3 py-1 text-red-600 hover:bg-red-50 rounded transition-colors font-medium text-sm"
    >
      <Trash2 className="h-4 w-4" />
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
  const [deleteId, setDeleteId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [validationErrors, setValidationErrors] = useState({});
  const [companyOptions, setCompanyOptions] = useState([]);
  const gridApiRef = useRef(null);

  useEffect(() => {
    fetchCompanies();
    fetchClients();
  }, []);

  const fetchCompanies = async () => {
    try {
      const res = await fetch(
        import.meta.env.VITE_STATE === "DEV"
          ? `${import.meta.env.VITE_BASE_URL_DEV}/companies`
          : `${import.meta.env.VITE_BASE_URL_PROD}/companies`
      );

      const data = await res.json();
      setCompanyOptions(data.companies);
    } catch (err) {
      console.error("Error fetching companies:", err);
    }
  };
  const onGridReady = (params) => {
    gridApiRef.current = params.api;
    params.api.sizeColumnsToFit();
    window.addEventListener("resize", () => {
      setTimeout(() => params.api.sizeColumnsToFit());
    });
  };

  const fetchClients = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error("Failed to fetch clients");
      const data = await res.json();
      setClients(data);
    } catch (err) {
      toast.error(err.message || "Failed to fetch clients");
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = "Client name is required";
    if (!formData.address.trim()) errors.address = "Address is required";
    if (!formData.tax_rate.trim()) errors.tax_rate = "Tax rate is required";
    if (!formData.company_id)
      errors.company_id = "Company Name is required";
    if (formData.tax_rate !== "N/A") {
      if (!formData.gst_number.trim()) {
        errors.gst_number = "GST Number is required";
      } else {
        const gstRegex =
          /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

        if (!gstRegex.test(formData.gst_number.toUpperCase())) {
          errors.gst_number = "Invalid GST Number format";
        }
      }
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

  const handleEditClient = async (client) => {
    setLoading(true);
    try {
      // Fetch latest client data from the API
      const res = await fetch(`${API_URL}/${client.id}`);
      if (!res.ok) throw new Error("Failed to fetch client details");
      const data = await res.json();

      // Populate form with API response
      setFormData({
        name: data.name || "",
        address: data.address || "",
        tax_rate: data.tax_rate || "",
        gst_number: data.gst_number || "",
        company_id: data.company_id || "",
      });

      setEditingId(data.id);
      setShowForm(true);
      setShowPreview(false);
      setValidationErrors({});
    } catch (err) {
      toast.error(err.message || "Failed to load client details");
    } finally {
      setLoading(false);
    }
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
    try {
      const method = editingId ? "PUT" : "POST";
      const url = editingId ? `${API_URL}/${editingId}` : API_URL;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      console.log("res", res);
      if (!res.ok) throw new Error("Failed to save client");

      await fetchClients();
      setShowPreview(false);
      setShowForm(false);
      setEditingId(null);
      setFormData(emptyForm);

      toast.success(
        editingId
          ? "Client updated successfully!"
          : "Client added successfully!"
      );
    } catch (err) {
      toast.error(err.message || "Failed to save client");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id) => setDeleteId(id);

  const confirmDelete = async () => {
    if (!deleteId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete client");
      await fetchClients();
      toast.success("Client deleted successfully!");
    } catch (err) {
      toast.error(err.message || "Failed to delete client");
    } finally {
      setDeleteId(null);
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.company_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.tax_rate.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCompanyName = (id) => {
    const company = companyOptions.find((c) => c.id == id);
    return company ? company.name : "N/A";
  };

  useEffect(() => {
    if (formData.tax_rate === "N/A") {
      setFormData((prev) => ({ ...prev, gst_number: "" }));
    }
  }, [formData.tax_rate]);

  const columnDefs = [
    {
      field: "name",
      headerName: "Name",
      minWidth: 150,
      filter: true,
      floatingFilter: true,
      sortable: true,
    },
    {
      field: "company_id",
      headerName: "Company Name",
      minWidth: 150,
      filter: true,
      floatingFilter: true,
      sortable: true,
      valueGetter: (params) => getCompanyName(params.data.company_id),
    },
    {
      field: "address",
      headerName: "Address",
      minWidth: 180,
      filter: true,
      floatingFilter: true,
      sortable: true,
    },
    {
      field: "tax_rate",
      headerName: "Tax Rate",
      minWidth: 120,
      filter: true,
      floatingFilter: true,
      sortable: true,
    },
    {
      field: "gst_number",
      headerName: "GST",
      minWidth: 150,
      filter: true,
      floatingFilter: true,
      sortable: true,
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
    },
  ];

  console.log("formData---->", formData);

  return (
    <div className="min-h-screen font-sans">
      <Toaster position="top-right" reverseOrder={false} />
      <LoaderOverlay isLoading={loading} message="Processing..." />
      <DashboardPdf />

      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Client Management
          </h1>
          <p className="text-slate-600">
            Manage and onboard your clients efficiently
          </p>
        </div>

        {/* Add Client Button */}
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

                  {/* Company Name */}
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Company Name <span className="text-red-600">*</span>
                    </label>
                    <select
                      name="company_id"
                      value={formData.company_id || ""}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        validationErrors.company_id
                          ? "border-red-500 bg-red-50"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      <option value="">Select a company</option>

                      {companyOptions.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                    {validationErrors.company_id && (
                      <p className="text-red-600 text-sm mt-1">
                        {validationErrors.company_id}
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

                  {/* ----------------- */}
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Tax rate <span className="text-red-600">*</span>
                    </label>

                    <select
                      name="tax_rate"
                      value={formData.tax_rate}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring   -blue-500 transition ${
                        validationErrors.tax_rate
                          ? "border-red-500 bg-red-50"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      <option value="">Select GST value</option>
                      <option value="9% + 9%">9% + 9%</option>
                      <option value="18%">18%</option>
                      <option value="N/A">N/A</option>
                    </select>

                    {validationErrors.tax_rate && (
                      <p className="text-red-600 text-sm mt-1">
                        {validationErrors.tax_rate}
                      </p>
                    )}
                  </div>

                  {/* GST Number */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      GST Number <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      name="gst_number"
                      value={formData.gst_number}
                      onChange={handleChange}
                      placeholder="Enter GST Number"
                      disabled={formData.tax_rate === "N/A"}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        formData.tax_rate === "N/A"
                          ? "bg-slate-100 cursor-not-allowed"
                          : "focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      } ${
                        validationErrors.gst_number &&
                        formData.tax_rate !== "N/A"
                          ? "border-red-500 bg-red-50"
                          : "border-slate-300"
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
                    <p className="text-lg font-semibold text-slate-900">
                      {getCompanyName(formData.company_id)}
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
                      Tax rate
                    </p>
                    <p className="text-lg font-semibold text-slate-900">
                      {formData.tax_rate}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">
                      GST Number
                    </p>
                    <p className="text-lg font-semibold font-mono text-slate-900">
                      {formData.gst_number}
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

        {/* Delete Confirmation Modal */}
        {deleteId && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-2">
                Delete Client?
              </h2>
              <p className="text-sm text-slate-600 mb-6">
                This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
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
        )}

        {/* AG Grid Table */}
        {!showForm && !showPreview && (
          <div className="bg-white rounded-lg overflow-hidden">
            <div className="py-4">
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
        )}
      </div>
    </div>
  );
};

export default ClientOnboarding;
