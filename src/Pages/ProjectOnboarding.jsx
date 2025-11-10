"use client"

import { useState, useEffect, useRef } from "react"
import { Plus, AlertCircle, CheckCircle } from "lucide-react"
import { AgGridReact } from "ag-grid-react"
import "ag-grid-community/styles/ag-grid.css"
import "ag-grid-community/styles/ag-theme-quartz.css"
import DashboardPdf from "../Components/DashboardPdf"
import LoaderOverlay from "./LoaderOverlay.jsx"

const PROJECT_URI = "https://pgsql-invoice.onrender.com"

const emptyForm = {
  name: "",
  client_id: "",
  emp_id: "",
  billing_amt: "",
  billing_method: "days",
  overtime_amt: "",
  active: true,
}

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
)

const ProjectOnboarding = () => {
  const [formData, setFormData] = useState(emptyForm)
  const [clients, setClients] = useState([])
  const [employees, setEmployees] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [editingProjectId, setEditingProjectId] = useState(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [deleteId, setDeleteId] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [validationErrors, setValidationErrors] = useState({})
  const gridApiRef = useRef(null)

  useEffect(() => {
    fetchClients()
    fetchEmployees()
    fetchProjects()
  }, [])

  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError("")
        setSuccess("")
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, success])

  const onGridReady = (params) => {
    gridApiRef.current = params.api
    params.api.sizeColumnsToFit()
    window.addEventListener("resize", () => {
      setTimeout(() => {
        params.api.sizeColumnsToFit()
      })
    })
  }

  const fetchClients = async () => {
    try {
      const res = await fetch(`${PROJECT_URI}/api/clients`)
      if (!res.ok) throw new Error("Failed to fetch clients")
      const data = await res.json()
      setClients(data)
    } catch (err) {
      console.error("Error fetching clients:", err)
    }
  }

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${PROJECT_URI}/api/employee`)
      if (!res.ok) throw new Error("Failed to fetch employees")
      const data = await res.json()
      setEmployees(data)
    } catch (err) {
      console.error("Error fetching employees:", err)
    }
  }

  const fetchProjects = async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`${PROJECT_URI}/api/projects`)
      if (!res.ok) throw new Error("Failed to fetch projects")
      const data = await res.json()
      setProjects(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch projects")
    } finally {
      setLoading(false)
    }
  }

  const validateForm = () => {
    const errors = {}

    if (!formData.name.trim()) errors.name = "Project name is required"
    if (!formData.client_id) errors.client_id = "Please select a client"
    if (!formData.emp_id) errors.emp_id = "Please select an employee"
    if (!formData.billing_amt) {
      errors.billing_amt = "Billing amount is required"
    } else if (Number(formData.billing_amt) <= 0) {
      errors.billing_amt = "Billing amount must be greater than 0"
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    })
    if (validationErrors[name]) {
      setValidationErrors({ ...validationErrors, [name]: "" })
    }
  }

  const handleOpenForm = () => {
    setEditingProjectId(null)
    setFormData(emptyForm)
    setShowForm(true)
    setShowPreview(false)
    setValidationErrors({})
  }

  const handleFormSubmit = (e) => {
    e.preventDefault()
    if (!validateForm()) return
    setShowPreview(true)
    setShowForm(false)
  }

  const handleEditPreview = () => {
    setShowPreview(false)
    setShowForm(true)
  }

  const handleEditProject = (project) => {
    setEditingProjectId(project.id)
    setFormData({
      name: project.name,
      client_id: String(project.client_id),
      emp_id: String(project.emp_id),
      billing_amt: String(project.billing_amt),
      billing_method: project.billing_method,
      overtime_amt: String(project.overtime_amt || ""),
      active: project.active,
    })
    setShowForm(true)
    setShowPreview(false)
    setValidationErrors({})
  }

  const handleDelete = (id) => {
    setDeleteId(id)
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`${PROJECT_URI}/api/projects/${deleteId}`, {
        method: "DELETE",
      })

      if (!res.ok) throw new Error("Failed to delete project")

      await fetchProjects()
      setDeleteId(null)
      setSuccess("Project deleted successfully!")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete project")
    } finally {
      setLoading(false)
    }
  }

  const handleFinalSubmit = async () => {
    setLoading(true)
    setError("")
    try {
      const payload = {
        name: formData.name,
        client_id: Number(formData.client_id),
        emp_id: Number(formData.emp_id),
        billing_amt: Number(formData.billing_amt),
        billing_method: formData.billing_method,
        overtime_amt: formData.overtime_amt ? Number(formData.overtime_amt) : 0,
        active: formData.active,
      }

      const method = editingProjectId ? "PUT" : "POST"
      const url = editingProjectId ? `${PROJECT_URI}/api/projects/${editingProjectId}` : `${PROJECT_URI}/api/projects`

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error("Failed to save project")

      await fetchProjects()
      setShowPreview(false)
      setShowForm(false)
      setEditingProjectId(null)
      setFormData(emptyForm)
      setSuccess(editingProjectId ? "Project updated successfully!" : "Project created successfully!")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save project")
    } finally {
      setLoading(false)
    }
  }

  const filteredProjects = projects.filter(
    (project) =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clients
        .find((c) => c.id === project.client_id)
        ?.name.toLowerCase()
        .includes(searchQuery.toLowerCase()),
  )

  const columnDefs = [
    // {
    //   field: "SNo",
    //   maxWidth: 80,
    //   valueGetter: "node.rowIndex + 1",
    //   filter: true,
    //   floatingFilter: true,
    //   sortable: true,
    //   resizable: true,
    // },
    {
      field: "name",
      headerName: "Project Name",
      minWidth: 150,
      filter: true,
      floatingFilter: true,
      sortable: true,
      resizable: true,
    },
    {
      field: "client_id",
      headerName: "Client",
      minWidth: 150,
      filter: true,
      floatingFilter: true,
      sortable: true,
      resizable: true,
      valueGetter: (params) => clients.find((c) => c.id === params.data.client_id)?.name || "-",
    },
    {
      field: "emp_id",
      headerName: "Employee",
      minWidth: 150,
      filter: true,
      floatingFilter: true,
      sortable: true,
      resizable: true,
      valueGetter: (params) => employees.find((e) => e.id === params.data.emp_id)?.name || "-",
    },
    {
      field: "billing_amt",
      headerName: "Billing Amount",
      minWidth: 120,
      filter: true,
      floatingFilter: true,
      sortable: true,
      resizable: true,
    },
    {
      field: "billing_method",
      headerName: "Method",
      minWidth: 100,
      filter: true,
      floatingFilter: true,
      sortable: true,
      resizable: true,
      valueFormatter: (params) => params.value?.charAt(0).toUpperCase() + params.value?.slice(1),
    },
    {
      field: "overtime_amt",
      headerName: "Overtime",
      minWidth: 100,
      filter: true,
      floatingFilter: true,
      sortable: true,
      resizable: true,
    },
    {
      field: "active",
      headerName: "Status",
      minWidth: 100,
      filter: true,
      floatingFilter: true,
      sortable: true,
      resizable: true,
      valueFormatter: (params) => (params.value ? "Active" : "Inactive"),
    },
    {
      field: "Actions",
      headerName: "Actions",
      minWidth: 200,
      cellRenderer: (params) => (
        <ActionCellRenderer data={params.data} onEdit={handleEditProject} onDelete={handleDelete} />
      ),
      sortable: false,
      filter: false,
      resizable: true,
    },
  ]

  return (
    <div className="min-h-screen font-sans">
      <LoaderOverlay isLoading={loading} message="Processing..." />

      <DashboardPdf />
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Project Management</h1>
          <p className="text-slate-600">Manage and onboard your projects efficiently</p>
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
              Add Project
            </button>
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
                {editingProjectId ? "Update project information" : "Fill in the details to add a new project"}
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
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                      validationErrors.name ? "border-red-500 bg-red-50" : "border-slate-300 bg-white"
                    }`}
                  />
                  {validationErrors.name && <p className="text-red-600 text-sm mt-1">{validationErrors.name}</p>}
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
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                        validationErrors.client_id ? "border-red-500 bg-red-50" : "border-slate-300 bg-white"
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
                      <p className="text-red-600 text-sm mt-1">{validationErrors.client_id}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Employee <span className="text-red-600">*</span>
                    </label>
                    <select
                      name="emp_id"
                      value={formData.emp_id}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                        validationErrors.emp_id ? "border-red-500 bg-red-50" : "border-slate-300 bg-white"
                      }`}
                    >
                      <option value="">Select Employee</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name}
                        </option>
                      ))}
                    </select>
                    {validationErrors.emp_id && <p className="text-red-600 text-sm mt-1">{validationErrors.emp_id}</p>}
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
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                        validationErrors.billing_amt ? "border-red-500 bg-red-50" : "border-slate-300 bg-white"
                      }`}
                    />
                    {validationErrors.billing_amt && (
                      <p className="text-red-600 text-sm mt-1">{validationErrors.billing_amt}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Overtime Amount <span className="text-slate-500 text-xs">(Optional)</span>
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
                  <label className="block text-sm font-medium text-slate-900 mb-2">Billing Method</label>
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
                  <label className="text-sm font-medium text-slate-900">Active Project</label>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false)
                      setFormData(emptyForm)
                      setEditingProjectId(null)
                      setValidationErrors({})
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
              <h2 className="text-2xl font-bold text-slate-900">Preview & Confirm</h2>
              <p className="text-slate-600 text-sm mt-1">Review the information before submitting</p>
            </div>
            <div className="p-6">
              <div className="bg-slate-50 rounded-lg p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">Project Name</p>
                    <p className="text-lg font-semibold text-slate-900">{formData.name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">Client</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {clients.find((c) => c.id === Number(formData.client_id))?.name || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">Employee</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {employees.find((e) => e.id === Number(formData.emp_id))?.name || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">Base Amount</p>
                    <p className="text-lg font-semibold text-slate-900">{formData.billing_amt}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">Overtime Amount</p>
                    <p className="text-lg font-semibold text-slate-900">{formData.overtime_amt || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">Billing Method</p>
                    <p className="text-lg font-semibold text-slate-900 capitalize">{formData.billing_method}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">Status</p>
                    <p className={`text-lg font-semibold ${formData.active ? "text-green-600" : "text-red-600"}`}>
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
                  {loading ? "Submitting..." : editingProjectId ? "Update" : "Submit"}
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
                  <p className="font-semibold text-slate-900">Delete Project?</p>
                  <p className="text-sm text-slate-600 mt-1">This action cannot be undone.</p>
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
          <div className="bg-white rounded-lg  overflow-hidden">
            <div className="py-4">
              <h3 className="text-lg font-semibold text-slate-900">
                Projects <span className="text-slate-500 font-normal">({filteredProjects.length})</span>
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                {loading
                  ? "Loading projects..."
                  : `Managing ${filteredProjects.length} project${filteredProjects.length !== 1 ? "s" : ""}`}
              </p>
            </div>
            <div className="ag-theme-quartz" style={{ height: "500px", width: "100%" }}>
              <AgGridReact
                rowData={filteredProjects}
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
                  filteredProjects.length === 0
                    ? projects.length === 0
                      ? "<span>No projects yet. Add your first project to get started!</span>"
                      : "<span>No projects match your search.</span>"
                    : ""
                }
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProjectOnboarding
