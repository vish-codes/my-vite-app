import { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import { Download } from "lucide-react";

const formatToDDMMYY = (dateStr) => {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear());
  return `${day}/${month}/${year}`;
};
const formatToLongDate = (dateStr) => {
  if (!dateStr) return "N/A";

  const date = new Date(dateStr);
  const day = date.getDate();
  const year = date.getFullYear();
  const month = date.toLocaleString("en-US", { month: "long" });

  const getSuffix = (d) => {
    if (d > 3 && d < 21) return "th";
    switch (d % 10) {
      case 1: return "st";
      case 2: return "nd";
      case 3: return "rd";
      default: return "th";
    }
  };

  return `${day}${getSuffix(day)} ${month} ${year}`;
};


const GeneratePDF = ({ invoiceData }) => {
  const [pdfUrl, setPdfUrl] = useState("");

  console.log("Invoice Data === ", invoiceData);

  useEffect(() => {
    if (invoiceData && Object.keys(invoiceData).length > 0) {
      generatePDF();
    }
  }, [invoiceData]);

  const {
    projects,
    employeesRaw,
    employeeEntries,
  } = invoiceData || {};

  const commonDataForPdf = {
    invoiceNo: invoiceData?.invoice?.invoice_no || "N/A",
    dateOfInvoice: formatToDDMMYY(invoiceData?.invoice?.issue_date),
    billingFrom: invoiceData?.billingFrom,
    billingTo: invoiceData?.billingTo,
    // COMPANY DETAILS
    companyName: invoiceData?.company?.name || "N/A",
    companyAddress: invoiceData?.company?.address || "N/A",
    companyState: invoiceData?.company?.state || "N/A",
    companyGst: invoiceData?.company?.gst_number || "N/A",
    companyPan: invoiceData?.company?.pan || "N/A",
    companyAccountNumber:
      invoiceData?.company?.bank_account_number || "N/A",
    companyIfscCode: invoiceData?.company?.ifsc_code || "N/A",
    // CLIENT DETAILS
    clientName: invoiceData?.client?.name || "N/A",
    clientAddress: invoiceData?.client?.address || "N/A",
    clientState: invoiceData?.client?.client_state || "N/A",
    clientGst: invoiceData?.client?.gst_number || "N/A",

    add2: "Gurgaon, Haryana - 122001",
    gstRate: invoiceData?.client?.tax_rate || "N/A",
    currencyType: "INR",
  };

  const resourcesArr =
    employeeEntries && employeeEntries.length > 0
      ? employeeEntries.map((emp) => {
          const project = projects?.find((p) =>
            p.employees.some((e) => e.id === emp.employee_id)
          );

          const empRaw = employeesRaw?.[String(emp.employee_id)] || {};

          const payPerDay = project?.billing_amt
            ? Number(project.billing_amt)
            : 0;

          const total = payPerDay * (emp.days || 0);

          return {
            userId: emp.project_emp_code,
            employeeName:
              project?.employees.find((e) => e.id === emp.employee_id)?.name ||
              "Employee",
            workingOn: project?.project_name || "Project",
            sacCode: "9983",

            fromDate: formatToLongDate(commonDataForPdf.billingFrom),
            toDate: formatToLongDate(commonDataForPdf.billingTo),

            days: emp.days || 0,
            payPerDay,
            totalAmount: total,
            remark_days: empRaw.remark_days || "",
            remark_overtime: empRaw.remark_overtime || "",
          };
        })
      : [];

  /* ------------------ GST CALCULATION LOGIC ------------------ */
  const calculateTotals = (gstRateStr) => {
    const subTotal = resourcesArr.reduce(
      (acc, val) => acc + val.totalAmount,
      0
    );

    let gstType = "NONE";
    let igst = 0;
    let cgst = 0;
    let sgst = 0;

    if (!gstRateStr || gstRateStr === "N/A") {
      gstType = "NONE";
    } else if (gstRateStr === "18%") {
      gstType = "IGST";
      igst = (subTotal * 18) / 100;
    } else if (gstRateStr === "9% + 9%") {
      gstType = "CGST_SGST";
      cgst = (subTotal * 9) / 100;
      sgst = (subTotal * 9) / 100;
    }

    const total = subTotal + igst + cgst + sgst;

    return { subTotal, igst, cgst, sgst, total, gstType };
  };

  const totals = calculateTotals(commonDataForPdf.gstRate);

  const generatePDF = (status) => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [300, 225],
    });

    // ---------- HEADER ----------
    doc.setFontSize(15);
    doc.text(commonDataForPdf.companyName, 30, 32);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(61, 121, 216);
    doc.text(`INVOICE NO: ${commonDataForPdf.invoiceNo}`, 133, 32);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "bold");
    doc.text("Registered Address: ", 30, 42);
    doc.setFont("helvetica", "normal");
    doc.text("621-622, Tower 1,", 65, 42);
    doc.text("Assotech Business Cresterra Sector - 135,", 30, 46);
    doc.text("Noida, Uttar Pradesh - 201305", 30, 50);

    // ---------- BANK DETAILS ----------
    doc.rect(30, 56, 170, 20);
    doc.line(110, 56, 110, 76);
    doc.line(110, 62, 200, 62);
    doc.line(110, 69, 200, 69);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Bank Details:", 32, 60.5);
    doc.setFont("helvetica", "normal");
    doc.text(`Name - ${commonDataForPdf.companyName}`, 32, 65);
    doc.text(`Account No - ${commonDataForPdf.companyAccountNumber}`, 32, 69);
    doc.text(`IFSC Code - ${commonDataForPdf.companyIfscCode}`, 32, 73);

    doc.setFontSize(8.8);
    doc.setFont("helvetica", "bold");
    doc.text("Date of Invoice: ", 130, 60.5);
    doc.setFont("helvetica", "normal");
    doc.text(`${commonDataForPdf.dateOfInvoice}`, 154.6, 60.5);

    doc.setFont("helvetica", "bold");
    doc.text("GSTIN: ", 130, 67);
    doc.setFont("helvetica", "normal");
    doc.text(`${commonDataForPdf.companyGst}`, 141.8, 67);

    doc.setFont("helvetica", "bold");
    doc.text("PAN: ", 130, 73.5);
    doc.setFont("helvetica", "normal");
    doc.text(`${commonDataForPdf.companyPan}`, 139, 73.5);

    // ---------- BILL TO ----------
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("BILL TO", 34, 85.5).rect(32, 81, 52, 7);
    doc.setFontSize(10);
    doc.text(commonDataForPdf.clientName, 30, 98);
    doc.setFontSize(9);
    doc.text(commonDataForPdf.clientAddress, 30, 106);
    doc.text(commonDataForPdf.add2, 30, 110);
    doc.text("GSTIN: ", 30, 122);
    doc.text(commonDataForPdf.clientGst, 43, 122);

    // ---------- TABLE ----------
    const startY = 130;
    const rowHeight = 18;
    const numRows = resourcesArr.length;
    const tableHeight = rowHeight * numRows + 25;
    const totalTableHeight = startY + tableHeight;

    doc.rect(30, startY, 165, tableHeight);
    doc.line(30, startY + 7, 195, startY + 7);
    doc.line(130, startY, 130, totalTableHeight);
    doc.line(160, startY, 160, totalTableHeight);

    doc.setFontSize(10.5);
    doc.setFont("helvetica", "bold");
    doc.text("DESCRIPTION", 66, startY + 5);
    doc.text("SAC CODE", 135, startY + 5);
    doc.text("AMOUNT", 169, startY + 5);

    resourcesArr.forEach((res, index) => {
      console.log("res frm resource array ",res);
      const currentY = startY + 11 + index * rowHeight;
      const remarkDaysText = res.remark_days ? ` (${res.remark_days})` : "";

      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");

      doc.text(
        `Consultancy charges ${res.employeeName} on ${res.workingOn} (${res.userId})`,
        31.5,
        currentY
      );
      doc.text(`(${res.fromDate} - ${res.toDate})`, 31.5, currentY + 3.3);
      doc.text(`${res.days} Days${remarkDaysText}`, 31.5, currentY + 6.7);
      if (res.remark_overtime)
        doc.text(`OT: ${res.remark_overtime}`, 31.5, currentY + 10);
      doc.text(res.sacCode, 141, currentY + 3.3);
      // doc.text(`${commonDataForPdf.currencyType} ${res.payPerDay}`, 165, currentY + 6.7); overtime amount
      doc.text(res.totalAmount.toString(), 173, currentY + 3.3);

      if (index < numRows - 1)
        doc.line(30, currentY + 10, 195, currentY + 10);
    });

    // ---------- TOTALS ----------
    const subtotalY = totalTableHeight - 10;
    const gst1Y = subtotalY + 7;
    const gst2Y = gst1Y + 7;
    const totalY = gst2Y + 7;

    doc.setFont("helvetica", "bold");
    doc.line(30, subtotalY - 9, 195, subtotalY - 9);
    doc.text("SUBTOTAL", 31.5, subtotalY - 5);
    doc.text(totals.subTotal.toFixed(2), 173, subtotalY - 5);
    doc.text(commonDataForPdf.currencyType, 165, subtotalY - 5);

    /* ---- IGST Case ---- */
    if (totals.gstType === "IGST") {
      doc.text("IGST 18%", 31.5, gst1Y - 6);
      doc.text(totals.igst.toFixed(2), 173, gst1Y - 6);
      doc.text(commonDataForPdf.currencyType, 165, gst1Y - 6);
    }

    /* ---- CGST + SGST Case ---- */
    if (totals.gstType === "CGST_SGST") {
      doc.text("CGST 9%", 31.5, gst1Y - 6);
      doc.text(totals.cgst.toFixed(2), 173, gst1Y - 6);

      doc.text("SGST 9%", 31.5, gst2Y - 6);
      doc.text(totals.sgst.toFixed(2), 173, gst2Y - 6);
    }

    /* ---- NO GST Case ---- */
    if (totals.gstType === "NONE") {
      // Skip GST rows
    }

    /* ---- TOTAL ---- */
    doc.text("TOTAL", 31.5, totalY - 6.5);
    doc.text(totals.total.toFixed(2), 173, totalY - 6.5);
    doc.text(commonDataForPdf.currencyType, 165, totalY - 6.5);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Thanks for your business.", 28, totalY + 8);

    // ---------- PREVIEW ----------
    const pdfBlob = doc.output("blob");
    const url = URL.createObjectURL(pdfBlob);
    setPdfUrl(url);

    if (status === "download") {
      doc.save(`${commonDataForPdf.companyName}.pdf`);
    }
  };

  // --------------------------
  // UI
  // --------------------------
  return (
    <div className="w-full">
      {pdfUrl ? (
        <div className="bg-white shadow-lg flex flex-col rounded-lg overflow-hidden">
          <div className="flex items-center justify-between h-14 px-6 bg-slate-100 border-b">
            <h3 className="text-lg font-semibold text-slate-900">
              Invoice Preview
            </h3>

            <button
              onClick={() => generatePDF("download")}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </button>
          </div>

          <div className="relative w-full" style={{ height: "600px" }}>
            <iframe
              src={pdfUrl}
              style={{ width: "100%", height: "100%" }}
              title="PDF Preview"
            />
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-slate-600">
          Loading invoice preview...
        </div>
      )}
    </div>
  );
};

export default GeneratePDF;
