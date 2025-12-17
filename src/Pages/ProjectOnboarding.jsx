"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Pencil, DollarSign, Clock, User, Hash } from "lucide-react";
import { AgGridReact } from "ag-grid-react";
import LoaderOverlay from "./LoaderOverlay";
import toast, { Toaster } from "react-hot-toast";
import DashboardPdf from "../Components/DashboardPdf";

// ModuleRegistry.registerModules([AllCommunityModule])

const PROJECT_URI =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_STATE === "DEV"
    ? import.meta.env?.VITE_BASE_URL_DEV || ""
    : import.meta.env?.VITE_BASE_URL_PROD || "";

const emptyEmployee = {
  emp_id: "",
  billing_amt: "",
  overtime_amt: "",
  billing_method: "days",
  project_emp_code: "",
};

const emptyForm = {
  name: "",
  client_id: "",
  project_employees: [emptyEmployee],
  active: true,
};

// <CHANGE> Updated ActionCellRenderer to use icon buttons
const ActionCellRenderer = ({ data, onEdit, onDelete }) => (
  <div className="flex gap-1 justify-end h-full items-center">
    <button
      onClick={() => onEdit(data)}
      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
      title="Edit"
    >
      <Pencil className="h-4 w-4" />
    </button>
    <button
      onClick={() => onDelete(data.id)}
      className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
      title="Delete"
    >
      <Trash2 className="h-4 w-4" />
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

    if (!formData.project_employees.length) {
      errors.project_employees = "Please add at least one employee";
    } else {
      formData.project_employees.forEach((emp, index) => {
        if (!emp.emp_id) {
          errors[`emp_id_${index}`] = "Employee is required";
        }
        if (!emp.billing_amt || Number(emp.billing_amt) <= 0) {
          errors[`billing_amt_${index}`] =
            "Billing amount must be greater than 0";
        }
      });
    }

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

  const handleAddEmployee = () => {
    setFormData({
      ...formData,
      project_employees: [...formData.project_employees, { ...emptyEmployee }],
    });
  };

  const handleRemoveEmployee = (index) => {
    const updatedEmployees = formData.project_employees.filter(
      (_, i) => i !== index
    );
    setFormData({ ...formData, project_employees: updatedEmployees });
  };

  const handleEmployeeChange = (index, field, value) => {
    const updatedEmployees = [...formData.project_employees];
    updatedEmployees[index] = { ...updatedEmployees[index], [field]: value };
    setFormData({ ...formData, project_employees: updatedEmployees });

    const errorKey = `${field}_${index}`;
    if (validationErrors[errorKey]) {
      const newErrors = { ...validationErrors };
      delete newErrors[errorKey];
      setValidationErrors(newErrors);
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

    let initialEmployees = [];

    if (
      project.employees &&
      Array.isArray(project.employees) &&
      project.employees.length > 0 &&
      project.employees[0].billing_amt
    ) {
      initialEmployees = project.employees.map((emp) => ({
        emp_id: String(emp.emp_id || emp.id),
        billing_amt: String(emp.billing_amt),
        overtime_amt: String(emp.overtime_amt || ""),
        billing_method: emp.billing_method || "days",
        project_emp_code: String(emp.project_emp_code || ""),
      }));
    } else if (project.emp_id && Array.isArray(project.emp_id)) {
      initialEmployees = project.emp_id.map((id) => ({
        emp_id: String(id),
        billing_amt: String(project.billing_amt),
        overtime_amt: String(project.overtime_amt || ""),
        billing_method: project.billing_method || "days",
        project_emp_code: "",
      }));
    } else {
      initialEmployees = [emptyEmployee];
    }

    setFormData({
      name: project.name,
      client_id: String(project.client_id),
      project_employees: initialEmployees,
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
        employees: formData.project_employees.map((emp) => ({
          emp_id: Number(emp.emp_id),
          project_emp_code: emp.project_emp_code || null,
          billing_amt: emp.billing_amt ? Number(emp.billing_amt) : 0,
          billing_method: emp.billing_method || "days",
          overtime_amt: emp.overtime_amt ? Number(emp.overtime_amt) : 0,
        })),
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

  const StatusCellRenderer = ({ value }) => (
    <div className="flex items-center h-full">
      <span
        className={`px-2 py-0.5 text-xs font-medium rounded-md ${value ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}
      >
        {value ? "Active" : "Inactive"}
      </span>
    </div>
  );

  const columnDefs = [
    { field: "name", headerName: "Project Name", minWidth: 150, flex: 1 },
    {
      field: "client_id",
      headerName: "Client",
      minWidth: 150,
      flex: 1,
      valueGetter: (params) =>
        clients.find((c) => c.id === params.data.client_id)?.name || "-",
    },
    {
      field: "employees",
      headerName: "Employees",
      minWidth: 200,
      flex: 2,
      valueGetter: (params) =>
        params.data.employees
          ?.map((emp) => emp.emp_name || emp.name)
          .join(", ") || "-",
    },
    {
      field: "active",
      headerName: "Status",
      minWidth: 100,
      flex: 1,
      cellRenderer: StatusCellRenderer,
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

  const getEmployeeName = (empId) => {
    const emp = employees.find((e) => String(e.id) === String(empId));
    return emp?.name || "Unknown";
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <LoaderOverlay isLoading={loading} message="Processing..." />
      <Toaster position="top-right" />
      <DashboardPdf />

      <div className="max-w-6xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">
            Project Management
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Manage and onboard your projects
          </p>
        </div>

        {/* Add Button */}
        {!showForm && !showPreview && (
          <div className="flex justify-end mb-4">
            <button
              onClick={handleOpenForm}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md shadow-sm transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Project
            </button>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteId && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-5 max-w-sm w-full">
              <h3 className="text-base font-semibold text-slate-900">
                Delete Project?
              </h3>
              <p className="text-sm text-slate-500 mt-1 mb-4">
                This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setDeleteId(null)}
                  className="px-3 py-1.5 border border-slate-300 text-slate-700 text-sm font-medium rounded-md hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={loading}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-sm font-medium rounded-md transition-colors"
                >
                  {loading ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Form View */}
        {showForm && (
          <div className="mb-6 bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-3">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingProjectId ? "Edit Project" : "Add New Project"}
              </h2>
              <p className="text-slate-500 text-xs mt-0.5">
                {editingProjectId
                  ? "Update project information"
                  : "Fill in the details to add a new project"}
              </p>
            </div>

            <div className="p-5">
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Project Name */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Project Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Enter project name"
                      className={`w-full px-2.5 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 transition ${validationErrors.name
                          ? "border-red-400 bg-red-50"
                          : "border-slate-300 bg-white"
                        }`}
                    />
                    {validationErrors.name && (
                      <p className="text-red-500 text-xs mt-0.5">
                        {validationErrors.name}
                      </p>
                    )}
                  </div>

                  {/* Client */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Client <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="client_id"
                      value={formData.client_id}
                      onChange={handleChange}
                      className={`w-full px-2.5 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 transition ${validationErrors.client_id
                          ? "border-red-400 bg-red-50"
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
                      <p className="text-red-500 text-xs mt-0.5">
                        {validationErrors.client_id}
                      </p>
                    )}
                  </div>
                </div>

                {/* Employee Repeater */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-medium text-slate-700">
                      Project Employees <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleAddEmployee}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 rounded font-medium transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                      Add
                    </button>
                  </div>

                  {validationErrors.project_employees && (
                    <p className="text-red-500 text-xs">
                      {validationErrors.project_employees}
                    </p>
                  )}

                  <div className="space-y-2">
                    {formData.project_employees.map((emp, index) => (
                      <div
                        key={index}
                        className="border border-slate-200 rounded-md bg-white overflow-hidden"
                      >
                        {/* Card Header */}
                        <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                              <User className="h-3 w-3 text-blue-600" />
                            </div>
                            <span className="text-xs font-medium text-slate-700">
                              Employee {index + 1}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveEmployee(index)}
                            className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                            title="Remove employee"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div className="p-3">
                          <div className="flex flex-wrap items-start gap-3">
                            {/* Employee Select */}
                            <div className="flex-1 min-w-[140px]">
                              <label className="block text-[10px] uppercase tracking-wide font-medium text-slate-500 mb-1">
                                Employee
                              </label>
                              <select
                                value={emp.emp_id}
                                onChange={(e) =>
                                  handleEmployeeChange(
                                    index,
                                    "emp_id",
                                    e.target.value
                                  )
                                }
                                className={`w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 transition ${validationErrors[`emp_id_${index}`]
                                    ? "border-red-400 bg-red-50"
                                    : "border-slate-300 bg-white"
                                  }`}
                              >
                                <option value="">Select</option>
                                {employees.map((empOpt) => (
                                  <option
                                    key={empOpt.id}
                                    value={empOpt.id}
                                    disabled={formData.project_employees.some(
                                      (item, i) =>
                                        i !== index &&
                                        item.emp_id === String(empOpt.id)
                                    )}
                                  >
                                    {empOpt.name}
                                  </option>
                                ))}
                              </select>
                              {validationErrors[`emp_id_${index}`] && (
                                <p className="text-red-500 text-[10px] mt-0.5">
                                  {validationErrors[`emp_id_${index}`]}
                                </p>
                              )}
                            </div>

                            {/* Project Employee Code - NEW FIELD */}
                            <div className="flex-1 min-w-[120px]">
                              <label className="block text-[10px] uppercase tracking-wide font-medium text-slate-500 mb-1">
                                Project Emp Code
                              </label>
                              <div className="relative">
                                <Hash className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                                <input
                                  type="text"
                                  value={emp.project_emp_code}
                                  onChange={(e) =>
                                    handleEmployeeChange(
                                      index,
                                      "project_emp_code",
                                      e.target.value
                                    )
                                  }
                                  placeholder="Code"
                                  className="w-full pl-6 pr-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 transition bg-white"
                                />
                              </div>
                            </div>

                            {/* Billing Amount */}
                            <div className="flex-1 min-w-[100px]">
                              <label className="block text-[10px] uppercase tracking-wide font-medium text-slate-500 mb-1">
                                Base Rate
                              </label>
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                                  ₹
                                </span>

                                <input
                                  type="number"
                                  value={emp.billing_amt}
                                  onChange={(e) =>
                                    handleEmployeeChange(index, "billing_amt", e.target.value)
                                  }
                                  placeholder="0"
                                  className={`w-full pl-6 pr-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 transition ${validationErrors[`billing_amt_${index}`]
                                      ? "border-red-400 bg-red-50"
                                      : "border-slate-300 bg-white"
                                    }`}
                                />
                              </div>
                              {validationErrors[`billing_amt_${index}`] && (
                                <p className="text-red-500 text-[10px] mt-0.5">Required</p>
                              )}
                            </div>

                            {/* Overtime Amount */}
                            <div className="flex-1 min-w-[100px]">
                              <label className="block text-[10px] uppercase tracking-wide font-medium text-slate-500 mb-1">
                                Overtime Amount
                              </label>
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                                  ₹
                                </span>

                                <input
                                  type="number"
                                  value={emp.overtime_amt}
                                  onChange={(e) =>
                                    handleEmployeeChange(index, "overtime_amt", e.target.value)
                                  }
                                  placeholder="0"
                                  className="w-full pl-6 pr-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 transition bg-white"
                                />
                              </div>
                            </div>

                            {/* Billing Method - Segmented buttons */}
                            <div className="flex-1 min-w-[130px]">
                              <label className="block text-[10px] uppercase tracking-wide font-medium text-slate-500 mb-1">
                                Method
                              </label>
                              <div className="flex border border-slate-300 rounded overflow-hidden">
                                {["days", "hours", "month"].map((method) => (
                                  <button
                                    key={method}
                                    type="button"
                                    onClick={() =>
                                      handleEmployeeChange(
                                        index,
                                        "billing_method",
                                        method
                                      )
                                    }
                                    className={`flex-1 px-1.5 py-1.5 text-[10px] font-medium capitalize transition-colors ${emp.billing_method === method
                                        ? "bg-blue-600 text-white"
                                        : "bg-white text-slate-600 hover:bg-slate-50"
                                      }`}
                                  >
                                    {method === "month" ? "Month" : method}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Active Status */}
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-slate-700">
                    Status:
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, active: !formData.active })
                    }
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${formData.active
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-red-100 text-red-700 hover:bg-red-200"
                      }`}
                  >
                    {formData.active ? "Active" : "Inactive"}
                  </button>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-3 py-1.5 border border-slate-300 text-slate-700 text-sm font-medium rounded-md hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md shadow-sm transition-colors"
                  >
                    Preview
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Preview Modal */}
        {showPreview && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full my-8">
              <div className="border-b border-slate-200 px-5 py-3 flex justify-between items-center">
                <h3 className="text-base font-semibold text-slate-900">
                  Confirm Project Details
                </h3>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-0.5">
                      Project Name
                    </p>
                    <p className="text-sm font-medium text-slate-900">
                      {formData.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-0.5">
                      Client
                    </p>
                    <p className="text-sm font-medium text-slate-900">
                      {clients.find((c) => String(c.id) === formData.client_id)
                        ?.name || "-"}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-2">
                    Employees ({formData.project_employees.length})
                  </p>
                  <div className="space-y-1.5">
                    {formData.project_employees.map((emp, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between text-sm bg-slate-50 px-3 py-2 rounded"
                      >
                        <div>
                          <span className="font-medium text-slate-700">
                            {getEmployeeName(emp.emp_id)}
                          </span>
                          {emp.project_emp_code && (
                            <span className="text-slate-400 text-xs ml-2">
                              ({emp.project_emp_code})
                            </span>
                          )}
                        </div>
                        <span className="text-slate-500 text-xs">
                          ${emp.billing_amt}/{emp.billing_method}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                  <button
                    onClick={handleEditPreview}
                    className="px-3 py-1.5 border border-slate-300 text-slate-700 text-sm font-medium rounded-md hover:bg-slate-50 transition-colors"
                  >
                    Back to Edit
                  </button>
                  <button
                    onClick={handleFinalSubmit}
                    disabled={loading}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-md shadow-sm transition-colors"
                  >
                    {loading ? "Saving..." : "Confirm & Save"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Grid View */}
        {!showForm && !showPreview && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div
              className="ag-theme-quartz"
              style={{ height: "500px", width: "100%" }}
            >
              <AgGridReact
                ref={gridApiRef}
                rowData={filteredProjects}
                columnDefs={columnDefs}
                pagination
                paginationPageSize={10}
                onGridReady={onGridReady}
                overlayLoadingTemplate='<span class="ag-overlay-loading-center">Loading projects...</span>'
                overlayNoRowsTemplate='<span class="ag-overlay-no-rows-center">No projects found</span>'
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectOnboarding;
