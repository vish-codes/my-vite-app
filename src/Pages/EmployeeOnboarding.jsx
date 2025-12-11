import { useState, useEffect, useRef } from "react"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { AgGridReact } from "ag-grid-react"
import "ag-grid-community/styles/ag-grid.css"
import "ag-grid-community/styles/ag-theme-quartz.css"
import DashboardPdf from "../Components/DashboardPdf"
import LoaderOverlay from "./LoaderOverlay"
import toast, { Toaster } from "react-hot-toast"

const API_URL = import.meta.env.VITE_STATE === "DEV" ? `${import.meta.env.VITE_BASE_URL_DEV}/employee` : `${import.meta.env.VITE_BASE_URL_PROD}/employee`;

const emptyForm = {
  name: "",
  position: "",
  working_on: "",
  emp_code: "",
}

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
)

const EmployeeOnboarding = () => {
  const [employees, setEmployees] = useState([])
  const [formData, setFormData] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [loading, setLoading] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [validationErrors, setValidationErrors] = useState({})
  const gridApiRef = useRef(null)

  useEffect(() => {
    fetchEmployees()
  }, [])

  const onGridReady = (params) => {
    gridApiRef.current = params.api
    params.api.sizeColumnsToFit()
    window.addEventListener("resize", () => {
      setTimeout(() => {
        params.api.sizeColumnsToFit()
      })
    })
  }

  const fetchEmployees = async () => {
    setLoading(true)
    try {
      const res = await fetch(API_URL)
      if (!res.ok) throw new Error("Failed to fetch employees")
      const data = await res.json()
      setEmployees(data || [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to fetch employees")
    } finally {
      setLoading(false)
    }
  }

const validateForm = () => {
  const errors = {}

  const nameVal = (formData.name || "").trim()
  if (!nameVal) {
    errors.name = "Employee name is required"
  } else {
    const namePattern = /^[A-Za-z\s]+$/
    if (!namePattern.test(nameVal)) {
      errors.name = "Name can only contain alphabets and spaces"
    } else if (nameVal.length > 80) {
      errors.name = "Name must be 80 characters or less"
    }
  }

  if (!formData.position.trim()) errors.position = "Position is required"
  if (!formData.working_on.trim()) errors.working_on = "Working on is required"
  const code = (formData.emp_code || "").toString().trim().toUpperCase()
  if (!code) {
    errors.emp_code = "Employee code is required (format: PSS123)"
  } else if (!/^PSS\d+$/.test(code)) {
    errors.emp_code = "Employee code must start with 'PSS' followed by digits (e.g. PSS105)"
  } else {
    const duplicate = employees.some(
      (emp) =>
        emp.emp_code?.toString().trim().toUpperCase() === code &&
        emp.id !== editingId
    )
    if (duplicate) errors.emp_code = "This employee code is already in use"
  }

  setValidationErrors(errors)
  return Object.keys(errors).length === 0
}

  const handleOpenForm = () => {
    setFormData(emptyForm)
    setEditingId(null)
    setShowForm(true)
    setShowPreview(false)
    setValidationErrors({})
  }

  const handleEditEmployee = (employee) => {
    setFormData({
      name: employee.name || "",
      position: employee.position || "",
      working_on: employee.working_on || "",
      emp_code: (employee.emp_code || "").toString().trim().toUpperCase(),
    })
    setEditingId(employee.id)
    setShowForm(true)
    setShowPreview(false)
    setValidationErrors({})
  }

const handleChange = (e) => {
  const { name, value } = e.target

  if (name === "emp_code") {
    const normalized = value.toString().toUpperCase().replace(/\s+/g, "")
    setFormData({ ...formData, [name]: normalized })
    if (validationErrors[name]) {
      setValidationErrors({ ...validationErrors, [name]: "" })
    }
    return
  }

  if (name === "name") {
    const namePattern = /^[A-Za-z\s]*$/
    if (!namePattern.test(value)) {
      setValidationErrors((prev) => ({
        ...prev,
        name: "Name can only contain alphabets and spaces",
      }))
    } else {
      if (validationErrors.name) {
        setValidationErrors({ ...validationErrors, name: "" })
      }
    }
  }

  setFormData({ ...formData, [name]: value })
}


  const handleFormSubmit = (e) => {
    e.preventDefault()
    setFormData((prev) => ({ ...prev, emp_code: (prev.emp_code || "").toString().trim().toUpperCase() }))
    const normalizedForm = {
      ...formData,
      emp_code: (formData.emp_code || "").toString().trim().toUpperCase(),
    }
     setFormData(normalizedForm)
   const errors = {}
    if (!normalizedForm.name.trim()) errors.name = "Employee name is required"
    if (!normalizedForm.position.trim()) errors.position = "Position is required"
    if (!normalizedForm.working_on.trim()) errors.working_on = "Working on is required"

    const code = (normalizedForm.emp_code || "").toString().trim().toUpperCase()
    if (!code) {
      errors.emp_code = "Employee code is required (format: PSS123)"
    } else {
      const pattern = /^PSS\d+$/
      if (!pattern.test(code)) {
        errors.emp_code = "Employee code must start with 'PSS' followed by digits (e.g. PSS105)"
      } else {
        const duplicate = employees.some(
          (emp) =>
            (emp.emp_code || "").toString().trim().toUpperCase() === code &&
            emp.id !== editingId,
        )
        if (duplicate) errors.emp_code = "This employee code is already in use"
      }
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return
    }
    setValidationErrors({})
    setShowPreview(true)
    setShowForm(false)
  }

  const handleEditPreview = () => {
    setShowPreview(false)
    setShowForm(true)
  }

  const handleFinalSubmit = async () => {
    if (!validateForm()) {
      setShowForm(true)
      setShowPreview(false)
      return
    }

    setLoading(true)
    try {
      const method = editingId ? "PUT" : "POST"
      const url = editingId ? `${API_URL}/${editingId}` : API_URL

      const payload = {
        ...formData,
        emp_code: (formData.emp_code || "").toString().trim().toUpperCase(),
        name: (formData.name || "").toString().trim(),
        position: (formData.position || "").toString().trim(),
        working_on: (formData.working_on || "").toString().trim(),
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        let message = "Failed to save employee"
        try {
          const body = await res.json()
          if (body && body.message) message = body.message
        } catch (e) {
          /* ignore */
        }
        throw new Error(message)
      }

      await fetchEmployees()
      setShowPreview(false)
      setShowForm(false)
      setEditingId(null)
      setFormData(emptyForm)
      toast.success(editingId ? "Employee updated successfully!" : "Employee added successfully!")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save employee")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = (id) => setDeleteId(id)

  const confirmDelete = async () => {
    if (!deleteId) return
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/${deleteId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete employee")
      await fetchEmployees()
      toast.success("Employee deleted successfully!")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete employee")
    } finally {
      setDeleteId(null)
      setLoading(false)
    }
  }

  const filteredEmployees = employees.filter((employee) => {
    const q = searchQuery.toLowerCase()
    const name = (employee.name || "").toString().toLowerCase()
    const position = (employee.position || "").toString().toLowerCase()
    const code = (employee.emp_code || "").toString().toLowerCase()
    return name.includes(q) || position.includes(q) || code.includes(q)
  })

  const columnDefs = [
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
      field: "position",
      headerName: "Position",
      minWidth: 150,
      filter: true,
      floatingFilter: true,
      sortable: true,
      resizable: true,
    },
    {
      field: "working_on",
      headerName: "Working On",
      minWidth: 150,
      filter: true,
      floatingFilter: true,
      sortable: true,
      resizable: true,
    },
    {
      field: "emp_code",
      headerName: "Employee Code",
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
        <ActionCellRenderer data={params.data} onEdit={handleEditEmployee} onDelete={handleDelete} />
      ),
      sortable: false,
      filter: false,
      resizable: true,
    },
  ]

  return (
    <div className="min-h-screen font-sans">
      <Toaster position="top-right" reverseOrder={false} />
      <LoaderOverlay isLoading={loading} message="Processing..." />

      <DashboardPdf />
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Employee Management</h1>
          <p className="text-slate-600">Manage and onboard your employees efficiently</p>
        </div>

        {/* Add Button */}
        {!showForm && !showPreview && (
          <div className="flex justify-end mb-6">
            <button
              onClick={handleOpenForm}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-md transition-colors"
            >
              <Plus className="h-5 w-5" />
              Add Employee
            </button>
          </div>
        )}

        {/* Form View */}
        {showForm && (
          <div className="mb-8 bg-white rounded-lg shadow-md overflow-hidden">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="text-2xl font-bold text-slate-900">{editingId ? "Edit Employee" : "Add New Employee"}</h2>
              <p className="text-slate-600 text-sm mt-1">
                {editingId ? "Update employee information" : "Fill in the details to add a new employee"}
              </p>
            </div>
            <div className="p-6">
              <form onSubmit={handleFormSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Employee Name */}
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Employee Name <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Enter employee name"
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                        validationErrors.name ? "border-red-500 bg-red-50" : "border-slate-300 bg-white"
                      }`}
                    />
                    {validationErrors.name && <p className="text-red-600 text-sm mt-1">{validationErrors.name}</p>}
                  </div>

                  {/* Position */}
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Position <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      name="position"
                      value={formData.position}
                      onChange={handleChange}
                      placeholder="Enter position"
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                        validationErrors.position ? "border-red-500 bg-red-50" : "border-slate-300 bg-white"
                      }`}
                    />
                    {validationErrors.position && (
                      <p className="text-red-600 text-sm mt-1">{validationErrors.position}</p>
                    )}
                  </div>

                  {/* Working On */}
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Working On <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      name="working_on"
                      value={formData.working_on}
                      onChange={handleChange}
                      placeholder="Project/Department"
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                        validationErrors.working_on ? "border-red-500 bg-red-50" : "border-slate-300 bg-white"
                      }`}
                    />
                    {validationErrors.working_on && (
                      <p className="text-red-600 text-sm mt-1">{validationErrors.working_on}</p>
                    )}
                  </div>

                  {/* Employee Code */}
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Employee Code <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      name="emp_code"
                      value={formData.emp_code}
                      onChange={handleChange}
                      placeholder="Enter employee code"
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                        validationErrors.emp_code ? "border-red-500 bg-red-50" : "border-slate-300 bg-white"
                      }`}
                    />
                    {validationErrors.emp_code && <p className="text-red-600 text-sm mt-1">{validationErrors.emp_code}</p>}
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false)
                      setFormData(emptyForm)
                      setEditingId(null)
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
                    <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">Employee Name</p>
                    <p className="text-lg font-semibold text-slate-900">{formData.name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">Position</p>
                    <p className="text-lg font-semibold text-slate-900">{formData.position}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">Working On</p>
                    <p className="text-lg font-semibold text-slate-900">{formData.working_on}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">Employee Code</p>
                    <p className="text-lg font-semibold font-mono text-slate-900">{formData.emp_code || "—"}</p>
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
          <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-2">Delete Employee?</h2>
              <p className="text-sm text-slate-600 mb-6">This action cannot be undone.</p>
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

        {/* AG Grid Table View */}
        {!showForm && !showPreview && (
          <>
            {/* AG Grid Table */}
            <div className="bg-white rounded-lg overflow-hidden">
              <div className="py-4">
                <h3 className="text-lg font-semibold text-slate-900">
                  Employees <span className="text-slate-500 font-normal">({filteredEmployees.length})</span>
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  {loading ? "Loading employees..." : `Managing ${filteredEmployees.length} employee${filteredEmployees.length !== 1 ? "s" : ""}`}
                </p>
              </div>
              <div className="ag-theme-quartz" style={{ height: "500px", width: "100%" }}>
                <AgGridReact
                  rowData={filteredEmployees}
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
                    filteredEmployees.length === 0
                      ? employees.length === 0
                        ? "<span>No employees yet. Add your first employee to get started!</span>"
                        : "<span>No employees match your search.</span>"
                      : ""
                  }
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default EmployeeOnboarding
