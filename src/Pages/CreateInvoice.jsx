import { useState, useEffect, useRef } from "react"
import { Plus } from "lucide-react"
import { AgGridReact } from "ag-grid-react"
import "ag-grid-community/styles/ag-grid.css"
import "ag-grid-community/styles/ag-theme-quartz.css"
import DashboardPdf from "../Components/DashboardPdf"
import GeneratePDF from "./GeneratePDF"
import LoaderOverlay from "./LoaderOverlay"
import toast, { Toaster } from "react-hot-toast"

const API_URL = "https://pgsql-invoice.onrender.com/api/invoices"

const emptyForm = {
  invoice_no: "",
  project_id: "",
  issue_date: "",
  total_amount: "",
  days: "",
  paid_leaves: "",
  unpaid_leaves: "",
  over_time: "",
}

const ActionCellRenderer = ({ data, onEdit, onDelete, onGeneratePdf }) => (
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
    <button
      onClick={() => onGeneratePdf(data.id)}
      className="inline-flex items-center gap-1 px-3 py-1 text-green-600 hover:bg-green-50 rounded transition-colors font-medium text-sm"
    >
      PDF
    </button>
  </div>
)

const CreateInvoice = () => {
  const [invoices, setInvoices] = useState([])
  const [formData, setFormData] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showSample, setShowSample] = useState(false)
  const [pdfInvoiceData, setPdfInvoiceData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})
  const gridApiRef = useRef(null)
  const [deleteId, setDeleteId] = useState(null)

  const onGridReady = (params) => {
    gridApiRef.current = params.api
    params.api.sizeColumnsToFit()
    window.addEventListener("resize", () => {
      setTimeout(() => {
        params.api.sizeColumnsToFit()
      })
    })
  }

  useEffect(() => {
    fetchInvoices()
  }, [])

  async function fetchInvoices() {
    setLoading(true)
    try {
      const res = await fetch(API_URL)
      if (!res.ok) throw new Error("Failed to fetch invoices")
      const data = await res.json()
      const rows = Array.isArray(data) ? data : []
      setInvoices(rows)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to fetch invoices")
    } finally {
      setLoading(false)
    }
  }

  const validateForm = () => {
    const errors = {}

    if (!formData.invoice_no.trim()) errors.invoice_no = "Invoice number is required"
    if (!formData.project_id.trim()) errors.project_id = "Project ID is required"
    if (!formData.total_amount.trim()) errors.total_amount = "Total amount is required"

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const resetAllViews = () => {
    setShowForm(false)
    setShowPreview(false)
    setShowSample(false)
    setPdfInvoiceData(null)
    setDeleteId(null)
  }

  const handleOpenForm = () => {
    setFormData(emptyForm)
    setEditingId(null)
    resetAllViews()
    setShowForm(true)
    setValidationErrors({})
  }

  const handleEdit = (invoice) => {
    setFormData({
      invoice_no: invoice.invoice_no || "",
      project_id: invoice.project_id?.toString?.() || "",
      issue_date: invoice.issue_date ? invoice.issue_date.slice(0, 10) : "",
      total_amount: invoice.total_amount?.toString?.() || "",
      days: invoice.days?.toString?.() || "",
      paid_leaves: invoice.paid_leaves?.toString?.() || "",
      unpaid_leaves: invoice.unpaid_leaves?.toString?.() || "",
      over_time: invoice.over_time?.toString?.() || "",
    })
    setEditingId(invoice.id)
    resetAllViews()
    setShowForm(true)
    setValidationErrors({})
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (validationErrors[name]) {
      setValidationErrors({ ...validationErrors, [name]: "" })
    }
  }

  const handleFormSubmit = (e) => {
    e.preventDefault()
    if (!validateForm()) return
    resetAllViews()
    setShowPreview(true)
  }

  const handleEditPreview = () => {
    resetAllViews()
    setShowForm(true)
  }

  const handleFinalSubmit = async () => {
    setLoading(true)
    try {
      const payload = {
        invoice_no: formData.invoice_no,
        project_id: Number(formData.project_id),
        issue_date: formData.issue_date || new Date(),
        total_amount: Number(formData.total_amount || 0),
        days: Number(formData.days || 0),
        paid_leaves: Number(formData.paid_leaves || 0),
        unpaid_leaves: Number(formData.unpaid_leaves || 0),
        over_time: Number(formData.over_time || 0),
      }

      let res
      if (editingId) {
        res = await fetch(`${API_URL}/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      }

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || "Operation failed")
      }

      await fetchInvoices()
      resetAllViews()
      setFormData(emptyForm)
      setEditingId(null)
      toast.success(editingId ? "Invoice updated successfully!" : "Invoice created successfully!")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save invoice")
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
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || "Delete failed")
      }
      await fetchInvoices()
      setDeleteId(null)
      toast.success("Invoice deleted successfully!")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete invoice")
    } finally {
      setLoading(false)
    }
  }

  const handleGeneratePdf = async (id) => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/${id}`)
      if (!res.ok) throw new Error("Failed to fetch invoice details")
      const invoiceData = await res.json()
      resetAllViews()
      setPdfInvoiceData(invoiceData)
      setShowSample(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate PDF")
    } finally {
      setLoading(false)
    }
  }

  const columnDefs = [
    {
      field: "invoice_no",
      headerName: "Invoice No",
      minWidth: 130,
      filter: true,
      floatingFilter: true,
      sortable: true,
      resizable: true,
    },
    {
      field: "project_id",
      headerName: "Project ID",
      minWidth: 120,
      filter: true,
      floatingFilter: true,
      sortable: true,
      resizable: true,
    },
    {
      field: "issue_date",
      headerName: "Issue Date",
      minWidth: 130,
      filter: true,
      floatingFilter: true,
      sortable: true,
      resizable: true,
    },
    {
      field: "total_amount",
      headerName: "Total Amount",
      minWidth: 130,
      filter: true,
      floatingFilter: true,
      sortable: true,
      resizable: true,
    },
    {
      field: "days",
      headerName: "Days",
      minWidth: 100,
      filter: true,
      floatingFilter: true,
      sortable: true,
      resizable: true,
    },
    {
      field: "paid_leaves",
      headerName: "Paid Leaves",
      minWidth: 120,
      filter: true,
      floatingFilter: true,
      sortable: true,
      resizable: true,
    },
    {
      field: "unpaid_leaves",
      headerName: "Unpaid Leaves",
      minWidth: 130,
      filter: true,
      floatingFilter: true,
      sortable: true,
      resizable: true,
    },
    {
      field: "over_time",
      headerName: "Overtime",
      minWidth: 120,
      filter: true,
      floatingFilter: true,
      sortable: true,
      resizable: true,
    },
    {
      field: "Actions",
      headerName: "Actions",
      minWidth: 220,
      cellRenderer: (params) => (
        <ActionCellRenderer
          data={params.data}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onGeneratePdf={handleGeneratePdf}
        />
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
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Invoice Management</h1>
          <p className="text-slate-600">Create, manage, and generate invoices</p>
        </div>

        {!showForm && !showPreview && !showSample && (
          <div className="flex justify-end gap-3 mb-6">
            <button
              onClick={handleOpenForm}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-md transition-colors"
            >
              <Plus className="h-5 w-5" />
              Add Invoice
            </button>
          </div>
        )}

        {showForm && (
          <div className="mb-8 bg-white rounded-lg shadow-md overflow-hidden">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="text-2xl font-bold text-slate-900">{editingId ? "Edit Invoice" : "Add New Invoice"}</h2>
              <p className="text-slate-600 text-sm mt-1">
                {editingId ? "Update invoice information" : "Fill in the details to create a new invoice"}
              </p>
            </div>
            <div className="p-6">
              <form onSubmit={handleFormSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Invoice No <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      name="invoice_no"
                      value={formData.invoice_no}
                      onChange={handleChange}
                      placeholder="Enter invoice number"
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                        validationErrors.invoice_no ? "border-red-500 bg-red-50" : "border-slate-300 bg-white"
                      }`}
                    />
                    {validationErrors.invoice_no && (
                      <p className="text-red-600 text-sm mt-1">{validationErrors.invoice_no}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Project ID <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="number"
                      name="project_id"
                      value={formData.project_id}
                      onChange={handleChange}
                      placeholder="Enter project ID"
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                        validationErrors.project_id ? "border-red-500 bg-red-50" : "border-slate-300 bg-white"
                      }`}
                    />
                    {validationErrors.project_id && (
                      <p className="text-red-600 text-sm mt-1">{validationErrors.project_id}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">Issue Date</label>
                    <input
                      type="date"
                      name="issue_date"
                      value={formData.issue_date}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Total Amount <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="total_amount"
                      value={formData.total_amount}
                      onChange={handleChange}
                      placeholder="Enter total amount"
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                        validationErrors.total_amount ? "border-red-500 bg-red-50" : "border-slate-300 bg-white"
                      }`}
                    />
                    {validationErrors.total_amount && (
                      <p className="text-red-600 text-sm mt-1">{validationErrors.total_amount}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">Days</label>
                    <input
                      type="number"
                      name="days"
                      value={formData.days}
                      onChange={handleChange}
                      placeholder="Days"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">Paid Leaves</label>
                    <input
                      type="number"
                      name="paid_leaves"
                      value={formData.paid_leaves}
                      onChange={handleChange}
                      placeholder="Paid leaves"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">Unpaid Leaves</label>
                    <input
                      type="number"
                      name="unpaid_leaves"
                      value={formData.unpaid_leaves}
                      onChange={handleChange}
                      placeholder="Unpaid leaves"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">Overtime</label>
                    <input
                      type="number"
                      name="over_time"
                      value={formData.over_time}
                      onChange={handleChange}
                      placeholder="Overtime"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />
                  </div>
                </div>

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

        {showPreview && (
          <div className="mb-8 bg-white rounded-lg shadow-md overflow-hidden border border-blue-200">
            <div className="border-b border-slate-200 px-6 py-4 bg-blue-50">
              <h2 className="text-2xl font-bold text-slate-900">Preview & Confirm</h2>
              <p className="text-sm text-slate-600 mt-1">Review the information before submitting</p>
            </div>
            <div className="p-6">
              <div className="bg-slate-50 rounded-lg p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(formData).map(([key, val]) => (
                    <div key={key}>
                      <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">
                        {key.replace("_", " ")}
                      </p>
                      <p className="text-lg font-semibold text-slate-900">{val || "—"}</p>
                    </div>
                  ))}
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

        {deleteId && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-2">Delete Invoice?</h2>
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

        {showSample && (
          <div className="mt-4">
            <GeneratePDF invoiceData={pdfInvoiceData} />
            <div className="flex justify-center mt-4">
              <button
                onClick={() => resetAllViews()}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-lg shadow-md transition-colors"
              >
                Back to List
              </button>
            </div>
          </div>
        )}

        {!showForm && !showPreview && !showSample && (
          <>
            <div className="bg-white rounded-lg overflow-hidden">
              <div className="py-4">
                <h3 className="text-lg font-semibold text-slate-900">
                  Invoices <span className="text-slate-500 font-normal">({invoices.length})</span>
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  {loading
                    ? "Loading invoices..."
                    : `Managing ${invoices.length} invoice${invoices.length !== 1 ? "s" : ""}`}
                </p>
              </div>
              <div className="ag-theme-quartz" style={{ height: "500px", width: "100%" }}>
                <AgGridReact
                  rowData={invoices}
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
                    invoices.length === 0
                      ? "<span>No invoices yet. Create your first invoice to get started!</span>"
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

export default CreateInvoice
