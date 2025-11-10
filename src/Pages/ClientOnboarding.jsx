"use client"

import { useState, useEffect, useRef } from "react"
import { Plus } from "lucide-react"
import { AgGridReact } from "ag-grid-react"
import "ag-grid-community/styles/ag-grid.css"
import "ag-grid-community/styles/ag-theme-quartz.css"
import DashboardPdf from "../Components/DashboardPdf"
import LoaderOverlay from "./LoaderOverlay"
import toast, { Toaster } from "react-hot-toast"

const API_URL = "https://pgsql-invoice.onrender.com/api/clients"

const emptyForm = {
  name: "",
  address: "",
  state: "",
  gst_number: "",
  company_name: "",
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

const ClientOnboarding = () => {
  const [clients, setClients] = useState([])
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
    fetchClients()
  }, [])

  const onGridReady = (params) => {
    gridApiRef.current = params.api
    params.api.sizeColumnsToFit()
    window.addEventListener("resize", () => {
      setTimeout(() => params.api.sizeColumnsToFit())
    })
  }

  const fetchClients = async () => {
    setLoading(true)
    try {
      const res = await fetch(API_URL)
      if (!res.ok) throw new Error("Failed to fetch clients")
      const data = await res.json()
      setClients(data)
    } catch (err) {
      toast.error(err.message || "Failed to fetch clients")
    } finally {
      setLoading(false)
    }
  }

  const validateForm = () => {
    const errors = {}
    if (!formData.name.trim()) errors.name = "Client name is required"
    if (!formData.address.trim()) errors.address = "Address is required"
    if (!formData.state.trim()) errors.state = "State is required"
    if (!formData.company_name.trim()) errors.company_name = "Company Name is required"
    if (!formData.gst_number) errors.gst_number = "Invalid GST Number format"
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

  const handleEditClient = (client) => {
    setFormData({
      name: client.name || "",
      address: client.address || "",
      state: client.state || "",
      gst_number: client.gst_number || "",
      company_name: client.company_name || "",
    })
    setEditingId(client.id)
    setShowForm(true)
    setShowPreview(false)
    setValidationErrors({})
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
    if (validationErrors[name]) {
      setValidationErrors({ ...validationErrors, [name]: "" })
    }
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

  const handleFinalSubmit = async () => {
    setLoading(true)
    try {
      const method = editingId ? "PUT" : "POST"
      const url = editingId ? `${API_URL}/${editingId}` : API_URL

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!res.ok) throw new Error("Failed to save client")

      await fetchClients()
      setShowPreview(false)
      setShowForm(false)
      setEditingId(null)
      setFormData(emptyForm)

      toast.success(editingId ? "Client updated successfully!" : "Client added successfully!")
    } catch (err) {
      toast.error(err.message || "Failed to save client")
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
      if (!res.ok) throw new Error("Failed to delete client")
      await fetchClients()
      toast.success("Client deleted successfully!")
    } catch (err) {
      toast.error(err.message || "Failed to delete client")
    } finally {
      setDeleteId(null)
      setLoading(false)
    }
  }

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.state.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const columnDefs = [
    { field: "name", headerName: "Name", minWidth: 150, filter: true, floatingFilter: true, sortable: true },
    { field: "company_name", headerName: "Company Name", minWidth: 130, filter: true, floatingFilter: true, sortable: true },
    { field: "address", headerName: "Address", minWidth: 180, filter: true, floatingFilter: true, sortable: true },
    { field: "state", headerName: "State", minWidth: 120, filter: true, floatingFilter: true, sortable: true },
    { field: "gst_number", headerName: "GST", minWidth: 150, filter: true, floatingFilter: true, sortable: true },
    {
      field: "Actions",
      headerName: "Actions",
      minWidth: 200,
      cellRenderer: (params) => (
        <ActionCellRenderer data={params.data} onEdit={handleEditClient} onDelete={handleDelete} />
      ),
      sortable: false,
      filter: false,
    },
  ]

  return (
    <div className="min-h-screen font-sans">
      <Toaster position="top-right" reverseOrder={false} />
      <LoaderOverlay isLoading={loading} message="Processing..." />
      <DashboardPdf />

      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Client Management</h1>
          <p className="text-slate-600">Manage and onboard your clients efficiently</p>
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

        {/* Delete Confirmation Modal */}
        {deleteId && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-2">Delete Client?</h2>
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

        {/* AG Grid Table */}
        {!showForm && !showPreview && (
          <div className="bg-white rounded-lg overflow-hidden">
            <div className="py-4">
              <h3 className="text-lg font-semibold text-slate-900">
                Clients <span className="text-slate-500 font-normal">({filteredClients.length})</span>
              </h3>
            </div>
            <div className="ag-theme-quartz" style={{ height: "500px", width: "100%" }}>
              <AgGridReact
                rowData={filteredClients}
                columnDefs={columnDefs}
                pagination={true}
                paginationPageSize={10}
                rowSelection="single"
                animateRows={true}
                onGridReady={onGridReady}
                ref={gridApiRef}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ClientOnboarding
