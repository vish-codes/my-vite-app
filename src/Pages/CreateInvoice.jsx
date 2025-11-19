import { useState, useEffect, useRef } from "react"
import { Plus } from "lucide-react"
import { AgGridReact } from "ag-grid-react"
import "ag-grid-community/styles/ag-grid.css"
import "ag-grid-community/styles/ag-theme-quartz.css"
import DashboardPdf from "../Components/DashboardPdf"
import GeneratePDF from "./GeneratePDF"
import LoaderOverlay from "./LoaderOverlay"
import toast, { Toaster } from "react-hot-toast";

const API_URL = "http://localhost:3000/api/invoices"
const CLIENT_API_URL = "http://localhost:3000/api/clients"
// const API_URL = "https://pgsql-invoice.onrender.com/api/invoices";
// const CLIENT_API_URL = "https://pgsql-invoice.onrender.com/api/clients";

const emptyForm = {
  invoice_no: "",
  client_id: "",
  issue_date: "",
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
  const [clients, setClients] = useState([])
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
  const [projectsWithEmployees, setProjectsWithEmployees] = useState([])
  const [checkedProjects, setCheckedProjects] = useState(new Set())
  const [checkedEmployees, setCheckedEmployees] = useState(new Set())
  const [employeeInputs, setEmployeeInputs] = useState({})
  const [generatedInvoice, setGeneratedInvoice] = useState(null);

  // TODO
  const dailyRate = 1000
  const overtimeRate = 200

  const onGridReady = (params) => {
    gridApiRef.current = params.api
    params.api.sizeColumnsToFit()
    window.addEventListener("resize", () => {
      setTimeout(() => params.api.sizeColumnsToFit())
    })
  }

  useEffect(() => {
    fetchInvoices()
    fetchClients()
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
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function fetchClients() {
    try {
      const res = await fetch(CLIENT_API_URL)
      if (!res.ok) throw new Error("Failed to fetch clients")
      const data = await res.json()
      setClients(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("Error fetching clients:", err)
      toast.error("Error fetching clients")
    }
  }

  // Fetch client details (projects + employees) when a client is selected
  const fetchClientDetails = async (clientId) => {
    if (!clientId) return
    setLoading(true)
    try {
      const res = await fetch(`${CLIENT_API_URL}/${clientId}/details`)
      if (!res.ok) throw new Error("Failed to fetch client details")
      const data = await res.json()
      let normalized = []

      if (Array.isArray(data.projectsWithEmployees)) {
        normalized = data.projectsWithEmployees.map((p) => ({
          id: p.id,
          project_name: p.project_name || p.name,
          billing_amt: p.billing_amt || 0,
          billing_method: p.billing_method || "days",
          overtime_amt: p.overtime_amt || 0,
          employees: Array.isArray(p.employees) ? p.employees : [],
        }));
      }

      // ----------------------------------------
      // Case 2: { projects: [...], employees_by_project: {...} }
      // ----------------------------------------
      else if (Array.isArray(data.projects)) {
        const employeesByProject = data.employees_by_project || {};
        normalized = data.projects.map((p) => ({
          id: p.id,
          project_name: p.project_name || p.name,
          billing_amt: p.billing_amt || 0,
          billing_method: p.billing_method || "days",
          overtime_amt: p.overtime_amt || 0,
          employees: employeesByProject[p.id] || [],
        }));
      }

      // ----------------------------------------
      // Case 3: Flat array (your current backend)
      // ----------------------------------------
      else if (Array.isArray(data)) {
        const map = new Map();

        data.forEach((row) => {
          const pid = row.project_id;
          const pname = row.project_name;

          if (!map.has(pid)) {
            map.set(pid, {
              id: pid,
              project_name: pname,
              billing_amt: row.billing_amt || 0,
              billing_method: row.billing_method || "days",
              overtime_amt: row.overtime_amt || 0,
              employees: [],
            });
          }

          if (row.employee_id) {
            map.get(pid).employees.push({
              id: row.employee_id,
              name: row.employee_name,
            });
          }
        });

        normalized = Array.from(map.values());
      }

      // ----------------------------------------
      // Save to state
      // ----------------------------------------
      setProjectsWithEmployees(normalized);

      // Auto-select all projects
      const projSet = new Set(normalized.map((p) => p.id));

      const empSet = new Set(
        normalized.flatMap((p) => (p.employees || []).map((e) => e.id))
      );

      // Prepare inputs
      const inputs = {};
      normalized.forEach((p) => {
        (p.employees || []).forEach((e) => {
          inputs[e.id] = employeeInputs[e.id] || {
            days: "",
            paid_leaves: "",
            unpaid_leaves: "",
            over_time: "",
          };
        });
      });

      setCheckedProjects(projSet);
      setCheckedEmployees(empSet);
      setEmployeeInputs(inputs);

    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : "Failed to fetch client details")
    } finally {
      setLoading(false)
    }
  }

  const validateForm = () => {
    const errors = {}
    if (!formData.invoice_no.trim()) errors.invoice_no = "Invoice number is required"
    if (!formData.client_id) errors.client_id = "Client is required"
    if (!formData.issue_date) errors.issue_date = "Issue date is required"
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
    setProjectsWithEmployees([])
    setCheckedProjects(new Set())
    setCheckedEmployees(new Set())
    setEmployeeInputs({})
    setShowForm(true)
    setValidationErrors({})
  }

  const handleEdit = (invoice) => {
    if (!invoice) {
      console.error("❌ handleEdit called without invoice");
      return;
    }

    console.log("📌 Editing invoice:", invoice);

    setFormData({
      invoice_no: invoice.invoice_no || "",
      client_id: invoice.client_id?.toString?.() || "",
      issue_date: invoice.issue_date ? invoice.issue_date.slice(0, 10) : "",
    });

    const id =
      invoice.id ||
      invoice.invoice_id ||
      invoice._id ||
      null;

    if (!id) {
      console.error("❌ Invoice ID missing:", invoice);
    }

    setEditingId(id);

    resetAllViews();
    setShowForm(true);
    setValidationErrors({});

    if (invoice.client_id) fetchClientDetails(invoice.client_id);
  };


  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (validationErrors[name]) {
      setValidationErrors({ ...validationErrors, [name]: "" })
    }
    // if client dropdown changed, fetch details
    if (name === "client_id") {
      setProjectsWithEmployees([])
      setCheckedProjects(new Set())
      setCheckedEmployees(new Set())
      setEmployeeInputs({})
      if (value) fetchClientDetails(value)
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
    setLoading(true);

    try {
      // 1 - collect project ids
      const project_ids = Array.from(checkedProjects);

      // 2 - build employee_entries
      const employee_entries = [];
      Object.keys(employeeInputs).forEach((eid) => {
        const idNum = Number(eid);
        if (checkedEmployees.has(idNum)) {
          const vals = employeeInputs[eid] || {};
          employee_entries.push({
            employee_id: idNum,
            days: Number(vals.days || 0),
            paid_leaves: Number(vals.paid_leaves || 0),
            unpaid_leaves: Number(vals.unpaid_leaves || 0),
            over_time: Number(vals.over_time || 0),
            overtime_rate: Number(vals.overtime_rate || 0),
          });
        }
      });

      // 3 - compute total
      const totalAmount = computePreviewTotal();

      // 4 - payload
      const payload = {
        ...formData,
        project_ids,
        employees: employee_entries,
        total_amount: totalAmount,
      };

      // 5 - call API
      const res = await fetch(editingId ? `${API_URL}/${editingId}` : API_URL, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to save invoice");
      }

      const result = await res.json();
      // store server invoice cleanly
      setGeneratedInvoice(result.invoice); // optional, if you still need it

      // build unified pdf data shape
      const pdfData = {
        invoice: result.invoice,
        client: clients.find((c) => String(c.id) === String(formData.client_id)) || null,
        projects: projectsWithEmployees,
        employeesRaw: employeeInputs,
        employeeEntries: employee_entries,
        selectedProjects: Array.from(checkedProjects),
        selectedEmployees: Array.from(checkedEmployees),
        totalAmount,
      };

      // set pdf state and show PDF (do NOT call resetAllViews here)
      setPdfInvoiceData(pdfData);
      setShowSample(true);
      setShowForm(false);
      setShowPreview(false);
      toast.success(editingId ? "Invoice updated!" : "Invoice created!");

      // OPTIONAL: clear the form fields but keep pdfInvoiceData/showSample intact
      setFormData(emptyForm);
      setEditingId(null);
      setProjectsWithEmployees([]);
      setCheckedProjects(new Set());
      setCheckedEmployees(new Set());
      setEmployeeInputs({});

      // reload invoices list (if you want)
      if (fetchInvoices) fetchInvoices();
    } catch (err) {
      toast.error(err?.message || "Failed to create invoice");
    } finally {
      setLoading(false);
    }
  };



  const handleDelete = (id) => setDeleteId(id)

  const confirmDelete = async () => {
    if (!deleteId) return
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/${deleteId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete invoice")
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
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/${id}`);
      if (!res.ok) throw new Error("Failed to fetch invoice details");
      const apiRes = await res.json(); // depends on API shape

      // If your API returns { message, invoice } use apiRes.invoice, otherwise adapt
      const invoiceFromServer = apiRes.invoice || apiRes;

      // Build a consistent pdfData object (you may need to fetch projects/employees for this invoice too)
      const pdfData = {
        invoice: invoiceFromServer,
        client: clients.find((c) => String(c.id) === String(invoiceFromServer.client_id)) || null,
        projects: projectsWithEmployees, // if you have to fetch project data for this invoice, call that API
        employeesRaw: employeeInputs,
        employeeEntries: [], // if you can fetch employee breakdown, populate here
        selectedProjects: Array.from(checkedProjects),
        selectedEmployees: Array.from(checkedEmployees),
        totalAmount: Number(invoiceFromServer.total_amount || 0),
      };

      setPdfInvoiceData(pdfData);
      setShowSample(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate PDF");
    } finally {
      setLoading(false);
    }
  };


  // toggle project checked
  const toggleProject = (projectId) => {
    const next = new Set(checkedProjects)
    if (next.has(projectId)) {
      next.delete(projectId)
      // when project unchecked, also uncheck its employees
      const proj = projectsWithEmployees.find((p) => p.id === projectId)
      if (proj?.employees) {
        const nextEmp = new Set(checkedEmployees)
        proj.employees.forEach((e) => nextEmp.delete(e.id))
        setCheckedEmployees(nextEmp)
      }
    } else {
      next.add(projectId)
      // when project checked, auto check its employees
      const proj = projectsWithEmployees.find((p) => p.id === projectId)
      if (proj?.employees) {
        const nextEmp = new Set(checkedEmployees)
        proj.employees.forEach((e) => nextEmp.add(e.id))
        setCheckedEmployees(nextEmp)
      }
    }
    setCheckedProjects(next)
  }

  // toggle employee checked
  const toggleEmployee = (employeeId) => {
    const next = new Set(checkedEmployees)
    if (next.has(employeeId)) next.delete(employeeId)
    else next.add(employeeId)
    setCheckedEmployees(next)
  }

  // handle per-employee numeric input change
  const handleEmployeeInputChange = (employeeId, field, value) => {
    setEmployeeInputs((prev) => ({
      ...prev,
      [employeeId]: {
        ...((prev && prev[employeeId]) || { days: "", paid_leaves: "", unpaid_leaves: "", over_time: "" }),
        [field]: value,
      },
    }))
  }

  // compute total amount for preview
  const computePreviewTotal = () => {
    let total = 0;

    Object.keys(employeeInputs).forEach((eid) => {
      const idNum = Number(eid);
      if (!checkedEmployees.has(idNum)) return;

      const vals = employeeInputs[eid] || {};
      const days = Number(vals.days || 0);
      const unpaid = Number(vals.unpaid_leaves || 0);
      const overtime = Number(vals.over_time || 0);

      const payableDays = Math.max(0, days - unpaid);

      // 🔍 Find project for this employee
      const project = projectsWithEmployees.find((p) =>
        p.employees.some((e) => e.id === idNum)
      );

      if (!project) return;

      // ⬅️ Take project-based daily & overtime rates
      const dailyRate = Number(project.billing_amt || 0);
      const overtimeRate = Number(project.overtime_amt || 0);

      // 💰 Calculate employee total based on project rates
      total += payableDays * dailyRate + overtime * overtimeRate;
    });

    return total;
  };


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
      field: "client_name",
      headerName: "Client Name",
      minWidth: 150,
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
                {/* Invoice No and Client */}
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
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${validationErrors.invoice_no ? "border-red-500 bg-red-50" : "border-slate-300 bg-white"
                        }`}
                    />
                    {validationErrors.invoice_no && (
                      <p className="text-red-600 text-sm mt-1">{validationErrors.invoice_no}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Select Client <span className="text-red-600">*</span>
                    </label>
                    <select
                      name="client_id"
                      value={formData.client_id}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${validationErrors.client_id ? "border-red-500 bg-red-50" : "border-slate-300 bg-white"
                        }`}
                    >
                      <option value="">-- Select Client --</option>
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
                </div>

                {/* Issue Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">Issue Date</label>
                    <input
                      type="date"
                      name="issue_date"
                      value={formData.issue_date}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />
                    {validationErrors.issue_date && (
                      <p className="text-red-600 text-sm mt-1">{validationErrors.issue_date}</p>
                    )}
                  </div>
                </div>

                {/* Projects & Employees nested UI */}
                <div>
                  {/* Projects */}
                  {projectsWithEmployees.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-lg font-medium text-slate-900 mb-2">Projects</h3>
                      <div className="space-y-3">
                        {projectsWithEmployees.map((proj) => (
                          <div key={proj.id} className="bg-slate-50 rounded-lg p-4 border">
                            <div className="flex items-center justify-between mb-3">
                              <label className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={checkedProjects.has(proj.id)}
                                  onChange={() => toggleProject(proj.id)}
                                  className="h-4 w-4 accent-blue-600"
                                />
                                <span className="font-semibold text-slate-800">{proj.project_name || proj.name}</span>
                              </label>
                            </div>

                            {/* Employees for the project */}
                            <div className="space-y-2">
                              {(proj.employees || []).map((emp) => {
                                const empId = emp.id
                                const empVals = employeeInputs[empId] || { days: "", paid_leaves: "", unpaid_leaves: "", over_time: "" }
                                return (
                                  <div key={emp.id} className="grid grid-cols-12 gap-3 items-center bg-white p-2 rounded-md">
                                    <div className="col-span-3 flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        checked={checkedEmployees.has(empId)}
                                        onChange={() => toggleEmployee(empId)}
                                        className="h-4 w-4 accent-green-600"
                                      />
                                      <div className="text-sm font-medium text-slate-900">{emp.name}</div>
                                    </div>

                                    <div className="col-span-9 grid grid-cols-4 gap-2">
                                      <input
                                        type="number"
                                        placeholder="Days"
                                        value={empVals.days}
                                        onChange={(e) => handleEmployeeInputChange(empId, "days", e.target.value)}
                                        className="w-full px-2 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400"
                                      />
                                      <input
                                        type="number"
                                        placeholder="Paid Leaves"
                                        value={empVals.paid_leaves}
                                        onChange={(e) => handleEmployeeInputChange(empId, "paid_leaves", e.target.value)}
                                        className="w-full px-2 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400"
                                      />
                                      <input
                                        type="number"
                                        placeholder="Unpaid Leaves"
                                        value={empVals.unpaid_leaves}
                                        onChange={(e) => handleEmployeeInputChange(empId, "unpaid_leaves", e.target.value)}
                                        className="w-full px-2 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400"
                                      />
                                      <input
                                        type="number"
                                        placeholder="Overtime"
                                        value={empVals.over_time}
                                        onChange={(e) => handleEmployeeInputChange(empId, "over_time", e.target.value)}
                                        className="w-full px-2 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400"
                                      />
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* If no projects loaded but a client chosen, show message */}
                  {formData.client_id && projectsWithEmployees.length === 0 && (
                    <p className="text-sm text-slate-500">No projects/employees found for the selected client.</p>
                  )}
                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false)
                      setFormData(emptyForm)
                      setEditingId(null)
                      setValidationErrors({})
                      setProjectsWithEmployees([])
                      setCheckedProjects(new Set())
                      setCheckedEmployees(new Set())
                      setEmployeeInputs({})
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
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">Invoice No</p>
                    <p className="text-lg font-semibold text-slate-900">{formData.invoice_no || "—"}</p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">Client</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {clients.find((c) => String(c.id) === String(formData.client_id))?.name || "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">Issue Date</p>
                    <p className="text-lg font-semibold text-slate-900">{formData.issue_date || "—"}</p>
                  </div>

                  {/* Projects & Employees summary */}
                  <div>
                    <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-2">Projects & Employees</p>
                    <div className="space-y-3">
                      {projectsWithEmployees
                        .filter((p) => checkedProjects.has(p.id))
                        .map((p) => (
                          <div key={p.id} className="p-3 bg-white rounded-md border">
                            <div className="font-semibold text-slate-800 mb-2">{p.project_name}</div>
                            <div className="space-y-2">
                              {(p.employees || [])
                                .filter((e) => checkedEmployees.has(e.id))
                                .map((e) => {
                                  const vals = employeeInputs[e.id] || {}
                                  return (
                                    <div key={e.id} className="flex items-center justify-between">
                                      <div className="text-sm text-slate-900">{e.name}</div>
                                      <div className="text-sm text-slate-700">
                                        days: {vals.days || 0} • paid: {vals.paid_leaves || 0} • unpaid: {vals.unpaid_leaves || 0} • ot: {vals.over_time || 0}
                                      </div>
                                    </div>
                                  )
                                })}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Calculated Total Amount */}
                  <div>
                    <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">Total Amount</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {computePreviewTotal().toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
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
                  Confirm & Submit
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

        {showSample && pdfInvoiceData && (
          <div className="mt-4">
            <GeneratePDF invoiceData={pdfInvoiceData} />
            <div className="flex justify-center mt-4">
              <button onClick={() => { setShowSample(false); setPdfInvoiceData(null); }} className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-lg shadow-md transition-colors">
                Back to List
              </button>
            </div>
          </div>
        )}


        {!showForm && !showPreview && !showSample && (
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
        )}
      </div>
    </div>
  )
}

export default CreateInvoice
