"use client";

import { useState, useEffect, useRef } from "react";
import { Plus } from "lucide-react";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import DashboardPdf from "../Components/DashboardPdf";
import LoaderOverlay from "./LoaderOverlay";
import toast, { Toaster } from "react-hot-toast";

const PROJECT_URI = import.meta.env.VITE_STATE === "DEV" ? `${import.meta.env.VITE_BASE_URL_DEV}` : `${import.meta.env.VITE_BASE_URL_PROD}`;

const emptyForm = {
  name: "",
  client_id: "",
  emp_id: [],
  billing_amt: "",
  billing_method: "days",
  overtime_amt: "",
  active: true,
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

const ProjectOnboarding = () => {
  const [formData, setFormData] = useState(emptyForm);
  const [clients, setClients] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [openEmployeeDropdown, setOpenEmployeeDropdown] = useState(false);
  const gridApiRef = useRef(null);

  useEffect(() => {
    fetchClients();
    fetchEmployees();
    fetchProjects();
  }, []);

  const onGridReady = (params) => {
    gridApiRef.current = params.api;
    params.api.sizeColumnsToFit();
    window.addEventListener("resize", () => {
      setTimeout(() => params.api.sizeColumnsToFit());
    });
  };

  const fetchClients = async () => {
    try {
      const res = await fetch(`${PROJECT_URI}/clients`);
      if (!res.ok) throw new Error("Failed to fetch clients");
      const data = await res.json();
      setClients(data);
    } catch (err) {
      toast.error(err.message || "Error fetching clients");
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${PROJECT_URI}/employee`);
      if (!res.ok) throw new Error("Failed to fetch employees");
      const data = await res.json();
      setEmployees(data);
    } catch (err) {
      toast.error(err.message || "Error fetching employees");
    }
  };

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${PROJECT_URI}/projects`);
      if (!res.ok) throw new Error("Failed to fetch projects");
      const data = await res.json();
      setProjects(data);
    } catch (err) {
      toast.error(err.message || "Error fetching projects");
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = "Project name is required";
    if (!formData.client_id) errors.client_id = "Please select a client";
    if (!formData.emp_id.length)
      errors.emp_id = "Please select at least one employee";
    if (!formData.billing_amt || Number(formData.billing_amt) <= 0)
      errors.billing_amt = "Billing amount must be greater than 0";

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === "checkbox" ? checked : value });
    if (validationErrors[name]) {
      setValidationErrors({ ...validationErrors, [name]: "" });
    }
  };

  const handleOpenForm = () => {
    setEditingProjectId(null);
    setFormData(emptyForm);
    setShowForm(true);
    setShowPreview(false);
    setValidationErrors({});
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

  const handleEditProject = (project) => {
    setEditingProjectId(project.id);
    setFormData({
      name: project.name,
      client_id: String(project.client_id),
      emp_id: project.emp_id?.map(String) || [],
      billing_amt: String(project.billing_amt),
      billing_method: project.billing_method,
      overtime_amt: String(project.overtime_amt || ""),
      active: project.active,
    });
    setShowForm(true);
    setShowPreview(false);
    setValidationErrors({});
  };

  const handleDelete = (id) => setDeleteId(id);

  const confirmDelete = async () => {
    if (!deleteId) return;
    setLoading(true);
    try {
      const res = await fetch(`${PROJECT_URI}/projects/${deleteId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete project");
      await fetchProjects();
      setDeleteId(null);
      toast.success("Project deleted successfully!");
    } catch (err) {
      toast.error(err.message || "Failed to delete project");
    } finally {
      setLoading(false);
    }
  };

  const handleFinalSubmit = async () => {
    setLoading(true);
    try {
      const payload = {
        name: formData.name,
        client_id: Number(formData.client_id),
        emp_id: formData.emp_id.map(Number),
        billing_amt: Number(formData.billing_amt),
        billing_method: formData.billing_method,
        overtime_amt: formData.overtime_amt ? Number(formData.overtime_amt) : 0,
        active: formData.active,
      };

      const method = editingProjectId ? "PUT" : "POST";
      const url = editingProjectId
        ? `${PROJECT_URI}/projects/${editingProjectId}`
        : `${PROJECT_URI}/projects`;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to save project");

      await fetchProjects();
      setShowPreview(false);
      setShowForm(false);
      setEditingProjectId(null);
      setFormData(emptyForm);
      toast.success(
        editingProjectId
          ? "Project updated successfully!"
          : "Project created successfully!"
      );
    } catch (err) {
      toast.error(err.message || "Failed to save project");
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = projects;

  const columnDefs = [
    { field: "name", headerName: "Project Name", minWidth: 150 },
    {
      field: "client_id",
      headerName: "Client",
      minWidth: 150,
      valueGetter: (params) =>
        clients.find((c) => c.id === params.data.client_id)?.name || "-",
    },
    {
      field: "employees",
      headerName: "Employees",
      minWidth: 200,
      valueGetter: (params) => {
        return params.data.employees
          ?.map((emp) => emp.emp_name)
          .join(", ") || "-";
      },
    },
    { field: "billing_amt", headerName: "Billing Amount", minWidth: 120 },
    {
      field: "billing_method",
      headerName: "Method",
      minWidth: 100,
      valueFormatter: (params) =>
        params.value?.charAt(0).toUpperCase() + params.value?.slice(1),
    },
    { field: "overtime_amt", headerName: "Overtime", minWidth: 100 },
    {
      field: "active",
      headerName: "Status",
      minWidth: 100,
      valueFormatter: (params) => (params.value ? "Active" : "Inactive"),
    },
    {
      field: "Actions",
      headerName: "Actions",
      minWidth: 200,
      cellRenderer: (params) => (
        <ActionCellRenderer
          data={params.data}
          onEdit={handleEditProject}
          onDelete={handleDelete}
        />
      ),
    },
  ];

  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest(".employee-dropdown-area")) {
        setOpenEmployeeDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="min-h-screen font-sans">
      <LoaderOverlay isLoading={loading} message="Processing..." />
      <Toaster position="top-right" />

      <DashboardPdf />
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Project Management
          </h1>
          <p className="text-slate-600">
            Manage and onboard your projects efficiently
          </p>
        </div>

        {/* Add Button */}
        {!showForm && !showPreview && (
          <div className="flex justify-end mb-6">
            <button
              onClick={handleOpenForm}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-md transition-colors"
            >
              <Plus className="h-5 w-5" />
              Add Project
            </button>
          </div>
        )}

        {/* Your existing Form + Preview code here (unchanged) */}

        {/* Delete Confirmation Modal */}
        {deleteId && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
              <h3 className="text-lg font-semibold text-slate-900">
                Delete Project?
              </h3>
              <p className="text-sm text-slate-600 mt-1 mb-4">
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

        {/* Form View */}
        {showForm && (
          <div className="mb-8 bg-white rounded-lg shadow-md overflow-hidden">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="text-2xl font-bold text-slate-900">
                {editingProjectId ? "Edit Project" : "Add New Project"}
              </h2>
              <p className="text-slate-600 text-sm mt-1">
                {editingProjectId
                  ? "Update project information"
                  : "Fill in the details to add a new project"}
              </p>
            </div>
            <div className="p-6">
              <form onSubmit={handleFormSubmit} className="space-y-6">
                {/* Project Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    Project Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter project name"
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${validationErrors.name
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

                {/* Client and Employee */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Client <span className="text-red-600">*</span>
                    </label>
                    <select
                      name="client_id"
                      value={formData.client_id}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${validationErrors.client_id
                          ? "border-red-500 bg-red-50"
                          : "border-slate-300 bg-white"
                        }`}
                    >
                      <option value="">Select Client</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                    {validationErrors.client_id && (
                      <p className="text-red-600 text-sm mt-1">
                        {validationErrors.client_id}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="employee-dropdown-area relative">
                      <label className="block text-sm font-medium text-slate-900 mb-2">
                        Employee <span className="text-red-600">*</span>
                      </label>

                      {/* Trigger Box */}
                      <div
                        onClick={() => setOpenEmployeeDropdown((prev) => !prev)}
                        className={`w-full px-3 py-2 border rounded-lg bg-white cursor-pointer flex items-center justify-between ${validationErrors.emp_id
                            ? "border-red-500 bg-red-50"
                            : "border-slate-300"
                          }`}
                      >
                        <span className="truncate">
                          {formData.emp_id.length === 0
                            ? "Select employees"
                            : employees
                              .filter((emp) =>
                                formData.emp_id.includes(emp.id)
                              )
                              .map((emp) => emp.name)
                              .join(", ")}
                        </span>

                        <svg
                          className={`w-4 h-4 transition-transform ${openEmployeeDropdown ? "rotate-180" : ""
                            }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>

                      {/* Dropdown */}
                      {openEmployeeDropdown && (
                        <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg z-30 max-h-64 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150">
                          {employees.map((emp) => (
                            <label
                              key={emp.id}
                              className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={formData.emp_id.includes(emp.id)}
                                onChange={() => {
                                  const updated = formData.emp_id.includes(
                                    emp.id
                                  )
                                    ? formData.emp_id.filter(
                                      (id) => id !== emp.id
                                    )
                                    : [...formData.emp_id, emp.id];

                                  setFormData({ ...formData, emp_id: updated });

                                  if (validationErrors.emp_id) {
                                    setValidationErrors({
                                      ...validationErrors,
                                      emp_id: "",
                                    });
                                  }
                                }}
                                className="h-4 w-4 text-blue-600"
                              />
                              <span className="text-sm text-slate-800">
                                {emp.name}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}

                      {/* Validation Error */}
                      {validationErrors.emp_id && (
                        <p className="text-red-600 text-sm mt-1">
                          {validationErrors.emp_id}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Billing Amounts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Base Amount <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="number"
                      name="billing_amt"
                      value={formData.billing_amt}
                      onChange={handleChange}
                      placeholder="Enter billing amount"
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${validationErrors.billing_amt
                          ? "border-red-500 bg-red-50"
                          : "border-slate-300 bg-white"
                        }`}
                    />
                    {validationErrors.billing_amt && (
                      <p className="text-red-600 text-sm mt-1">
                        {validationErrors.billing_amt}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Overtime Amount{" "}
                      <span className="text-slate-500 text-xs">(Optional)</span>
                    </label>
                    <input
                      type="number"
                      name="overtime_amt"
                      value={formData.overtime_amt}
                      onChange={handleChange}
                      placeholder="Enter overtime amount"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-white"
                    />
                  </div>
                </div>

                {/* Billing Method */}
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    Billing Method
                  </label>
                  <select
                    name="billing_method"
                    value={formData.billing_method}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-white"
                  >
                    <option value="days">Days</option>
                    <option value="hours">Hours</option>
                    <option value="month">Month</option>
                  </select>
                </div>

                {/* Active Checkbox */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    name="active"
                    checked={formData.active}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                  <label className="text-sm font-medium text-slate-900">
                    Active Project
                  </label>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setFormData(emptyForm);
                      setEditingProjectId(null);
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
                      Project Name
                    </p>
                    <p className="text-lg font-semibold text-slate-900">
                      {formData.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">
                      Client
                    </p>
                    <p className="text-lg font-semibold text-slate-900">
                      {clients.find((c) => c.id === Number(formData.client_id))
                        ?.name || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">
                      Employee
                    </p>
                    <p className="text-lg font-semibold text-slate-900">
                      {formData.emp_id
                        .map(
                          (id) =>
                            employees.find((e) => e.id === Number(id))?.name
                        )
                        .join(", ")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">
                      Base Amount
                    </p>
                    <p className="text-lg font-semibold text-slate-900">
                      {formData.billing_amt}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">
                      Overtime Amount
                    </p>
                    <p className="text-lg font-semibold text-slate-900">
                      {formData.overtime_amt || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">
                      Billing Method
                    </p>
                    <p className="text-lg font-semibold text-slate-900 capitalize">
                      {formData.billing_method}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">
                      Status
                    </p>
                    <p
                      className={`text-lg font-semibold ${formData.active ? "text-green-600" : "text-red-600"
                        }`}
                    >
                      {formData.active ? "Active" : "Inactive"}
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
                  {loading
                    ? "Submitting..."
                    : editingProjectId
                      ? "Update"
                      : "Submit"}
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
                  <p className="font-semibold text-slate-900">
                    Delete Project?
                  </p>
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

        {/* AG Grid Table */}
        {!showForm && !showPreview && (
          <div className="bg-white rounded-lg overflow-hidden">
            <div className="py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                Projects{" "}
                <span className="text-slate-500 font-normal">
                  ({filteredProjects?.length || 0})
                </span>
              </h3>
            </div>

            {filteredProjects?.length > 0 ? (
              <div
                className="ag-theme-quartz"
                style={{ height: "500px", width: "100%" }}
              >
                <AgGridReact
                  rowData={filteredProjects || []}
                  columnDefs={columnDefs}
                  pagination
                  paginationPageSize={10}
                  onGridReady={onGridReady}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center text-slate-500">
                <p className="text-lg font-medium">No projects found</p>
                <p className="text-sm text-slate-400 mt-1">
                  Start by adding a new project.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectOnboarding;
