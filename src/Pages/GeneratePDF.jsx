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
      case 1:
        return "st";
      case 2:
        return "nd";
      case 3:
        return "rd";
      default:
        return "th";
    }
  };

  return `${day}${getSuffix(day)} ${month} ${year}`;
};

// INR formatter – 100000 => "1,00,000"
const formatINR = (amount) => {
  const num = Math.round(Number(amount || 0));
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(num);
};

const GeneratePDF = ({ invoiceData }) => {
  const [pdfUrl, setPdfUrl] = useState("");

  useEffect(() => {
    if (invoiceData && Object.keys(invoiceData).length > 0) {
      generatePDF();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceData]);

  const { projects, employeeEntries } = invoiceData || {};

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

  /* ------------------ PER EMPLOYEE CALCULATION ------------------ */
  const resourcesArr =
    employeeEntries && employeeEntries.length > 0
      ? employeeEntries.map((emp) => {
          const project = projects?.find((p) =>
            p.employees.some((e) => e.id === emp.employee_id)
          );

          // Employee’s record inside the project
          const empInsideProject = project?.employees.find(
            (e) => e.id === emp.employee_id
          );

          // Billing method: "days" | "hours" | "month"
          const billingMethod =
            empInsideProject?.billing_method?.toLowerCase() ||
            emp.billing_method?.toLowerCase() ||
            "days";

          // Base billing amount (monthly or per-day/hour depending on method)
          const billingAmt = Number(
            empInsideProject?.billing_amt || emp.billing_amt || 0
          );

          // From form
          const workingDays = Number(emp.days || 0); // working days entered
          const unpaidLeaves = Number(emp.unpaid_leaves || 0);

          // Overtime
          const overtimeRate = Number(
            empInsideProject?.overtime_amt ||
              emp.overtime_amt ||
              emp.overtime_rate ||
              0
          );
          const overtimeDays = Number(emp.over_time || 0);
          const overtimeAmount = Math.round(overtimeRate * overtimeDays);

          let perDaySal = 0;
          let baseAmount = 0;

          if (billingMethod === "month") {
            // perDaySal = billing_amt / workingDays (rounded)
            perDaySal =
              workingDays > 0 ? Math.round(billingAmt / workingDays) : 0;

            // base = billing_amt - perDaySal * unpaidLeaves
            baseAmount = billingAmt - perDaySal * unpaidLeaves;
          } else {
            // "days" / "hours" – existing behaviour
            perDaySal = billingAmt;
            baseAmount = perDaySal * workingDays;
          }

          baseAmount = Math.round(baseAmount);
          const totalEmpAmount = baseAmount + overtimeAmount; // used for subtotal

          return {
            userId: emp.project_emp_code,
            employeeName: empInsideProject?.name || "Employee",
            workingOn: project?.project_name || "Project",
            sacCode: "9983",

            fromDate: formatToLongDate(commonDataForPdf.billingFrom),
            toDate: formatToLongDate(commonDataForPdf.billingTo),

            days: workingDays,
            unpaidLeaves,
            payPerDay: perDaySal,
            baseAmount,
            overtimeRate,
            overtimeDays,
            overtimeAmount,
            totalEmpAmount,

            remark_days: emp.remark_days || "",
            remark_overtime: emp.remark_overtime || "",
          };
        })
      : [];

  /* ------------------ GST CALCULATION LOGIC ------------------ */
  const calculateTotals = (gstRateStr) => {
    const rawSubTotal = resourcesArr.reduce(
      (acc, val) => acc + val.totalEmpAmount,
      0
    );
    const subTotal = Math.round(rawSubTotal);

    let gstType = "NONE";
    let igst = 0;
    let cgst = 0;
    let sgst = 0;

    if (!gstRateStr || gstRateStr === "N/A") {
      gstType = "NONE";
    } else if (gstRateStr === "18%") {
      gstType = "IGST";
      igst = Math.round((subTotal * 18) / 100);
    } else if (gstRateStr === "9% + 9%") {
      gstType = "CGST_SGST";
      cgst = Math.round((subTotal * 9) / 100);
      sgst = Math.round((subTotal * 9) / 100);
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
    const rowHeight = 22;
    const numRows = resourcesArr.length;
    const tableHeight = rowHeight * numRows + 32;
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

    // rows
    resourcesArr.forEach((res, index) => {
      const currentY = startY + 11 + index * rowHeight;
      const remarkDaysText = res.remark_days
        ? ` (${res.remark_days})`
        : "";

      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");

      doc.text(
        `Consultancy charges ${res.employeeName} on ${res.workingOn} (${res.userId})`,
        31.5,
        currentY
      );
      doc.text(`(${res.fromDate} - ${res.toDate})`,31.5,currentY + 3.3);
      doc.text(`${res.days} Days${remarkDaysText}`,31.5,currentY + 6.7);
      if (res.overtimeDays > 0 && res.remark_overtime) 
      {
        doc.text(`${res.overtimeDays} OT (${res.remark_overtime})`,31.5,currentY + 10);
      }

      // SAC CODE column
      doc.text(res.sacCode, 141, currentY + 3.3);

      const baseStr = `${commonDataForPdf.currencyType} ${formatINR(res.baseAmount)}`;
      doc.text(baseStr, 169, currentY + 3);

      if (res.overtimeAmount > 0) 
      {
        const otStr = `${commonDataForPdf.currencyType} ${formatINR(res.overtimeAmount)}`;
        doc.text(otStr, 169, currentY + 10);
      }

      // horizontal line at bottom of row
      if (index < numRows - 1) {
        const lineY = startY + (index + 1) * rowHeight;
        doc.line(30, lineY, 195, lineY);
      }
    });

    // ---------- TOTALS ----------
    const subtotalY = totalTableHeight - 10;
    const gst1Y = subtotalY + 7;
    const gst2Y = gst1Y + 7;
    const totalY = gst2Y + 7;

    doc.setFont("helvetica", "bold");
    doc.line(30, subtotalY - 9, 195, subtotalY - 9);

    // SUBTOTAL
    doc.text("SUBTOTAL", 31.5, subtotalY - 5);
    doc.text(`${commonDataForPdf.currencyType} ${formatINR(totals.subTotal)}`,165,subtotalY - 5);

    /* ---- IGST Case ---- */
    if (totals.gstType === "IGST") {
      doc.text("IGST 18%", 31.5, gst1Y - 6);
      doc.text(`${commonDataForPdf.currencyType} ${formatINR(totals.igst)}`,165,gst1Y - 6);
    }

    /* ---- CGST + SGST Case ---- */
    if (totals.gstType === "CGST_SGST") {
      doc.text("CGST 9%", 31.5, gst1Y - 6);
      doc.text(`${commonDataForPdf.currencyType} ${formatINR(totals.cgst)}`,165,gst1Y - 6);

      doc.text("SGST 9%", 31.5, gst2Y - 6);
      doc.text(`${commonDataForPdf.currencyType} ${formatINR(totals.sgst)}`,165,gst2Y - 6);
    }

    /* ---- TOTAL ---- */
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL", 31.5, totalY - 6.5);
    doc.text(`${commonDataForPdf.currencyType} ${formatINR(totals.total)}`,165,totalY - 6.5);

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

  // -------------------------- UI --------------------------
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
