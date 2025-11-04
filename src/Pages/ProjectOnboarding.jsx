import React, { useState, useEffect } from "react";
import DashboardPdf from "../Components/DashboardPdf";

const PROJECT_URI = "https://pgsql-invoice.onrender.com";

const ProjectOnboarding = () => {
  const [formData, setFormData] = useState({
    name: "",
    client_id: "",
    emp_id: "",
    billing_amt: "",
    billing_method: "days",
    overtime_amt: "",
    active: true,
  });

  const [clients, setClients] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState(null);

  useEffect(() => {
    fetchClients();
    fetchEmployees();
    fetchProjects();
  }, []);

  const fetchClients = async () => {
    try {
      const res = await fetch(`${PROJECT_URI}/api/clients`);
      const data = await res.json();
      if (res.ok) setClients(data);
    } catch (error) {
      console.error("❌ Failed to fetch clients:", error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${PROJECT_URI}/api/employee`);
      const data = await res.json();
      if (res.ok) setEmployees(data);
    } catch (error) {
      console.error("❌ Failed to fetch employees:", error);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch(`${PROJECT_URI}/api/projects`);
      const data = await res.json();
      if (res.ok) setProjects(data);
    } catch (error) {
      console.error("❌ Failed to fetch projects:", error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleOpenForm = () => {
    setEditingProjectId(null);
    setFormData({
      name: "",
      client_id: "",
      emp_id: "",
      billing_amt: "",
      billing_method: "days",
      overtime_amt: "",
      active: true,
    });
    setShowForm(true);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
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
      emp_id: String(project.emp_id),
      billing_amt: String(project.billing_amt),
      billing_method: project.billing_method,
      overtime_amt: String(project.overtime_amt || ""),
      active: project.active,
    });
    setShowForm(true);
    setShowPreview(false);
  };

  const handleDeleteProject = async (id) => {
    if (!window.confirm("🗑️ Are you sure you want to delete this project?")) return;

    try {
      const res = await fetch(`${PROJECT_URI}/api/projects/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (res.ok) {
        alert("✅ Project deleted successfully!");
        await fetchProjects();
      } else {
        alert(`❌ ${data.message || "Failed to delete project"}`);
      }
    } catch (error) {
      console.error("❌ Error deleting project:", error);
    }
  };

  const handleFinalSubmit = async () => {
    setLoading(true);
    try {
      const payload = {
        name: formData.name,
        client_id: Number(formData.client_id),
        emp_id: Number(formData.emp_id),
        billing_amt: Number(formData.billing_amt),
        billing_method: formData.billing_method,
        overtime_amt: formData.overtime_amt ? Number(formData.overtime_amt) : 0,
        active: formData.active,
      };

      const method = editingProjectId ? "PUT" : "POST";
      const url = editingProjectId
        ? `${PROJECT_URI}/api/projects/${editingProjectId}`
        : `${PROJECT_URI}/api/projects`;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        alert(
          editingProjectId
            ? "✅ Project updated successfully!"
            : "✅ Project created successfully!"
        );
        setEditingProjectId(null);
        setFormData({
          name: "",
          client_id: "",
          emp_id: "",
          billing_amt: "",
          billing_method: "days",
          overtime_amt: "",
          active: true,
        });
        await fetchProjects();
      } else {
        alert(`❌ ${data.message} || "Failed to save project"}`);
      }
    } catch (error) {
      console.error("❌ Error saving project:", error);
      alert("❌ Network or server error while saving project.");
    } finally {
      setLoading(false);
      setShowPreview(false);
      setShowForm(false);
    }
  };

  return (
    <div className="mx-auto">
      <DashboardPdf />
      <div className="max-w-2xl mx-auto mt-8 bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6 text-center text-blue-800">
          Project Onboarding
        </h1>

        {!showForm && !showPreview && (
          <div className="flex justify-end mb-4">
            <button
              onClick={handleOpenForm}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-900 text-white font-semibold rounded-md shadow"
            >
              Add Entry
            </button>
          </div>
        )}

        {/* ✅ Project Form */}
        {showForm && (
          <form onSubmit={handleFormSubmit} className="space-y-4">
            {/* Project Name */}
            <div>
              <label className="block font-medium text-gray-700">
                Project Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                required
              />
            </div>

            {/* Client and Employee */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-gray-700">Client</label>
                <select
                  name="client_id"
                  value={formData.client_id}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                  required
                >
                  <option value="">Select Client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-gray-700">
                  Employee
                </label>
                <select
                  name="emp_id"
                  value={formData.emp_id}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                  required
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Amounts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-gray-700">
                  Base Amount
                </label>
                <input
                  type="number"
                  name="billing_amt"
                  value={formData.billing_amt}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                  required
                />
              </div>
              <div>
                <label className="block font-medium text-gray-700">
                  Overtime Amount
                </label>
                <input
                  type="number"
                  name="overtime_amt"
                  value={formData.overtime_amt}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                />
              </div>
            </div>

            {/* Billing Method */}
            <div>
              <label className="block font-medium text-gray-700">
                Billing Method
              </label>
              <select
                name="billing_method"
                value={formData.billing_method}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              >
                <option value="days">Days</option>
                <option value="hours">Hours</option>
                <option value="month">Month</option>
              </select>
            </div>

            {/* Active */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                name="active"
                checked={formData.active}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600"
              />
              <label className="font-medium text-gray-700">Active</label>
            </div>

            {/* Buttons */}
            <div className="pt-2 flex justify-end gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-700 hover:bg-blue-900 text-white font-semibold rounded-md shadow"
              >
                Preview
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-700 text-white font-semibold rounded-md shadow"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* ✅ Preview Section */}
        {showPreview && (
          <div className="bg-white border border-gray-200 shadow-md rounded-xl p-6 mt-4">
            <h2 className="font-bold text-xl mb-4 text-blue-700 border-b pb-2">
              Project Preview
            </h2>

            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:text-base">
              <dt className="font-semibold text-gray-700">Project Name:</dt>
              <dd className="text-gray-900">{formData.name || "-"}</dd>

              <dt className="font-semibold text-gray-700">Client:</dt>
              <dd className="text-gray-900">
                {clients.find((c) => c.id === Number(formData.client_id))?.name ||
                  "-"}
              </dd>

              <dt className="font-semibold text-gray-700">Employee:</dt>
              <dd className="text-gray-900">
                {employees.find((e) => e.id === Number(formData.emp_id))?.name ||
                  "-"}
              </dd>

              <dt className="font-semibold text-gray-700">Base Amount:</dt>
              <dd className="text-gray-900">{formData.billing_amt || "-"}</dd>

              <dt className="font-semibold text-gray-700">Overtime Amount:</dt>
              <dd className="text-gray-900">{formData.overtime_amt || "-"}</dd>

              <dt className="font-semibold text-gray-700">Billing Method:</dt>
              <dd className="capitalize text-gray-900">
                {formData.billing_method || "-"}
              </dd>

              <dt className="font-semibold text-gray-700">Active:</dt>
              <dd
                className={`font-semibold ${
                  formData.active ? "text-green-600" : "text-red-600"
                }`}
              >
                {formData.active ? "Yes" : "No"}
              </dd>
            </dl>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={handleEditPreview}
                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-lg shadow transition"
              >
                Edit
              </button>
              <button
                onClick={handleFinalSubmit}
                disabled={loading}
                className={`px-4 py-2 font-semibold rounded-lg shadow transition ${
                  loading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700 text-white"
                }`}
              >
                {loading
                  ? "Submitting..."
                  : editingProjectId
                  ? "Update"
                  : "Submit"}
              </button>
            </div>
          </div>
        )}

        {/* ✅ Projects Table */}
        {projects.length > 0 && !showForm && !showPreview && (
          <div className="mt-8 overflow-x-auto">
            <h2 className="text-lg font-semibold mb-3 text-blue-700">
              Existing Projects
            </h2>
            <table className="min-w-full border text-center text-sm">
              <thead className="bg-blue-100">
                <tr>
                  <th className="border p-2">#</th>
                  <th className="border p-2">Project</th>
                  <th className="border p-2">Client</th>
                  <th className="border p-2">Employee</th>
                  <th className="border p-2">Billing</th>
                  <th className="border p-2">Method</th>
                  <th className="border p-2">Overtime</th>
                  <th className="border p-2">Active</th>
                  <th className="border p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p, i) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="border p-2">{i + 1}</td>
                    <td className="border p-2">{p.name}</td>
                    <td className="border p-2">
                      {clients.find((c) => c.id === p.client_id)?.name || "-"}
                    </td>
                    <td className="border p-2">
                      {employees.find((e) => e.id === p.emp_id)?.name || "-"}
                    </td>
                    <td className="border p-2">{p.billing_amt}</td>
                    <td className="border p-2 capitalize">{p.billing_method}</td>
                    <td className="border p-2">{p.overtime_amt}</td>
                    <td className="border p-2">{p.active ? "✅" : "❌"}</td>
                    <td className="border p-2 flex justify-center gap-2">
                      <button
                        onClick={() => handleEditProject(p)}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteProject(p.id)}
                        className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectOnboarding;
