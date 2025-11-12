"use client"

import { useState, useEffect, useRef } from "react"
import { Plus } from "lucide-react"
import { AgGridReact } from "ag-grid-react"
import "ag-grid-community/styles/ag-grid.css"
import "ag-grid-community/styles/ag-theme-quartz.css"
import DashboardPdf from "../Components/DashboardPdf"
import LoaderOverlay from "./LoaderOverlay"
import toast, { Toaster } from "react-hot-toast"

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
  const [deleteId, setDeleteId] = useState(null)
  const [validationErrors, setValidationErrors] = useState({})
  const gridApiRef = useRef(null)

  useEffect(() => {
    fetchClients()
    fetchEmployees()
    fetchProjects()
  }, [])

  const onGridReady = (params) => {
    gridApiRef.current = params.api
    params.api.sizeColumnsToFit()
    window.addEventListener("resize", () => {
      setTimeout(() => params.api.sizeColumnsToFit())
    })
  }

  const fetchClients = async () => {
    try {
      const res = await fetch(`${PROJECT_URI}/api/clients`)
      if (!res.ok) throw new Error("Failed to fetch clients")
      const data = await res.json()
      setClients(data)
    } catch (err) {
      toast.error(err.message || "Error fetching clients")
    }
  }

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${PROJECT_URI}/api/employee`)
      if (!res.ok) throw new Error("Failed to fetch employees")
      const data = await res.json()
      setEmployees(data)
    } catch (err) {
      toast.error(err.message || "Error fetching employees")
    }
  }

  const fetchProjects = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${PROJECT_URI}/api/projects`)
      if (!res.ok) throw new Error("Failed to fetch projects")
      const data = await res.json()
      setProjects(data)
    } catch (err) {
      toast.error(err.message || "Error fetching projects")
    } finally {
      setLoading(false)
    }
  }

  const validateForm = () => {
    const errors = {}
    if (!formData.name.trim()) errors.name = "Project name is required"
    if (!formData.client_id) errors.client_id = "Please select a client"
    if (!formData.emp_id) errors.emp_id = "Please select an employee"
    if (!formData.billing_amt || Number(formData.billing_amt) <= 0)
      errors.billing_amt = "Billing amount must be greater than 0"

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData({ ...formData, [name]: type === "checkbox" ? checked : value })
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

  const handleDelete = (id) => setDeleteId(id)

  const confirmDelete = async () => {
    if (!deleteId) return
    setLoading(true)
    try {
      const res = await fetch(`${PROJECT_URI}/api/projects/${deleteId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to delete project")
      await fetchProjects()
      setDeleteId(null)
      toast.success("Project deleted successfully!")
    } catch (err) {
      toast.error(err.message || "Failed to delete project")
    } finally {
      setLoading(false)
    }
  }

  const handleFinalSubmit = async () => {
    setLoading(true)
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
      const url = editingProjectId
        ? `${PROJECT_URI}/api/projects/${editingProjectId}`
        : `${PROJECT_URI}/api/projects`

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
      toast.success(editingProjectId ? "Project updated successfully!" : "Project created successfully!")
    } catch (err) {
      toast.error(err.message || "Failed to save project")
    } finally {
      setLoading(false)
    }
  }

  const filteredProjects = projects

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
      field: "emp_id",
      headerName: "Employee",
      minWidth: 150,
      valueGetter: (params) =>
        employees.find((e) => e.id === params.data.emp_id)?.name || "-",
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
  ]

  return (
    <div className="min-h-screen font-sans">
      <LoaderOverlay isLoading={loading} message="Processing..." />
      <Toaster position="top-right" />

      <DashboardPdf />
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Project Management</h1>
          <p className="text-slate-600">Manage and onboard your projects efficiently</p>
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
              <h3 className="text-lg font-semibold text-slate-900">Delete Project?</h3>
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

        {/* AG Grid Table */}
        {!showForm && !showPreview && (
          <div className="bg-white rounded-lg overflow-hidden">
            <div className="py-4">
              <h3 className="text-lg font-semibold text-slate-900">
                Projects <span className="text-slate-500 font-normal">({filteredProjects.length})</span>
              </h3>
            </div>
            <div className="ag-theme-quartz" style={{ height: "500px", width: "100%" }}>
              <AgGridReact
                rowData={filteredProjects}
                columnDefs={columnDefs}
                pagination
                paginationPageSize={10}
                onGridReady={onGridReady}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProjectOnboarding
