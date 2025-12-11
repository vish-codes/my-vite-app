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

const formatClientAddressLines = (client) => {
  const address = client?.address || "";
  if (!address) return [];

  const parts = address
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length < 4) {
    return [address];
  }

  const lines = [];
  lines.push(parts.slice(0, 4).join(", "));
  if (parts[4]) {
    lines.push(parts[4]);
  }

  if (parts[5] && parts[6]) {
    lines.push(`${parts[5]}, ${parts[6]}`);
  } else if (parts[5]) {
    lines.push(parts[5]);
  }

  return lines;
};

const GeneratePDF = ({ invoiceData }) => {
  const [pdfUrl, setPdfUrl] = useState("");

  useEffect(() => {
    if (invoiceData && Object.keys(invoiceData).length > 0) {
      generatePDF();
    }
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

    gstRate: invoiceData?.client?.tax_rate || "N/A",
    currencyType: "INR",
  };

  /* ------------------ PER EMPLOYEE CALCULATION ------------------ */
  const resourcesArr =
    employeeEntries && employeeEntries.length > 0
      ? employeeEntries.map((emp) => {
        const project =
          projects?.find((p) => Number(p.id) === Number(emp.project_id)) ||
          projects?.find((p) => (p.employees || []).some((e) => e.id === emp.employee_id));

        const empInsideProject =
          (project?.employees || []).find((e) => e.id === emp.employee_id) || {};


        const billingMethod =
          empInsideProject?.billing_method?.toLowerCase() ||
          emp.billing_method?.toLowerCase() ||
          "days";

        const billingAmt = Number(
          empInsideProject?.billing_amt || emp.billing_amt || 0
        );

        const workingDays = Number(emp.days || 0);
        const unpaidLeaves = Number(emp.unpaid_leaves || 0);

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
          perDaySal =
            workingDays > 0 ? Math.round(billingAmt / workingDays) : 0;
          baseAmount = billingAmt - perDaySal * unpaidLeaves;
        } else {
          perDaySal = billingAmt;
          baseAmount = perDaySal * workingDays;
        }

        baseAmount = Math.round(baseAmount);
        const totalEmpAmount = baseAmount + overtimeAmount;

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
    // TODO
    return { subTotal, igst, cgst, sgst, total, gstType };
  };

  const totals = calculateTotals(commonDataForPdf.gstRate);


  const getRowHeight = (res) => {
    let lines = 3;
    if (res.overtimeDays > 0 || res.remark_overtime) lines += 1;
    const lineHeight = 4.2;
    return lines * lineHeight + 4;
  };

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
    doc.rect(30, 56, 165, 20);
    doc.line(110, 56, 110, 76);
    doc.line(110, 62, 195, 62);
    doc.line(110, 69, 195, 69);
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

    // Client name
    doc.text(commonDataForPdf.clientName, 30, 98);

    // Address lines
    let lineY = 104;
    const addressLines = formatClientAddressLines(invoiceData?.client);
    addressLines.forEach((line) => {
      doc.text(line, 30, lineY);
      lineY += 5;
    });

    // GSTIN line
    lineY += 2;
    doc.setFont("helvetica", "bold");
    doc.text("GSTIN :", 30, lineY);
    doc.text(commonDataForPdf.clientGst || "N/A", 50, lineY);

    const billToBottomY = lineY + 6;

    // ---------- TABLE ----------
    const TABLE_LEFT = 30;
    const TABLE_WIDTH = 165;
    const TABLE_RIGHT = TABLE_LEFT + TABLE_WIDTH;

    const tableTopY = billToBottomY + 8;
    const headerBottomY = tableTopY + 7;

    doc.setFontSize(10.5);
    doc.setFont("helvetica", "bold");
    doc.text("DESCRIPTION", 66, tableTopY + 5);
    doc.text("SAC CODE", 135, tableTopY + 5);
    doc.text("AMOUNT", 169, tableTopY + 5);
    doc.line(TABLE_LEFT, headerBottomY, TABLE_RIGHT, headerBottomY);

    // rows
    let yCursor = headerBottomY;

    resourcesArr.forEach((res) => {
      const rowH = getRowHeight(res);
      const baseY = yCursor + 4;

      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");

      const remarkDaysText = res.remark_days
        ? ` (${res.remark_days})`
        : "";

      // DESCRIPTION
      doc.text(
        `Consultancy charges ${res.employeeName} on ${res.workingOn} (${res.userId})`,
        TABLE_LEFT + 1.5,
        baseY
      );
      doc.text(
        `(${res.fromDate} - ${res.toDate})`,
        TABLE_LEFT + 1.5,
        baseY + 3.5
      );
      doc.text(
        `${res.days} Days${remarkDaysText}`,
        TABLE_LEFT + 1.5,
        baseY + 7
      );
      if (res.overtimeDays > 0 || res.remark_overtime) {
        const otText =
          res.overtimeDays > 0
            ? `${res.overtimeDays} OT${res.remark_overtime
              ? ` (${res.remark_overtime})`
              : ""
            }`
            : res.remark_overtime;
        doc.text(otText, TABLE_LEFT + 1.5, baseY + 10.5);
      }

      // SAC CODE
      doc.text(res.sacCode, 141, baseY + 3.5);

      // AMOUNT
      const curr = commonDataForPdf.currencyType;
      doc.text(
        `${curr} ${formatINR(res.baseAmount)}`,
        169,
        baseY + 3.5
      );
      if (res.overtimeAmount > 0) {
        doc.text(
          `${curr} ${formatINR(res.overtimeAmount)}`,
          169,
          baseY + 10.5
        );
      }

      yCursor += rowH;
      doc.line(TABLE_LEFT, yCursor, TABLE_RIGHT, yCursor);
    });

    // ---------- TOTALS INSIDE TABLE ----------
    const totalsRowHeight = 8;
    const curr = commonDataForPdf.currencyType;

    const addTotalRow = (label, value, bold = false) => {
      const textY = yCursor + 5;
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.text(label, TABLE_LEFT + 1.5, textY);
      doc.text(
        `${curr} ${formatINR(value)}`,
        165,
        textY
      );
      yCursor += totalsRowHeight;
      doc.line(TABLE_LEFT, yCursor, TABLE_RIGHT, yCursor);
    };

    // SUBTOTAL
    addTotalRow("SUBTOTAL", totals.subTotal, false);

    // TAX ROW(S)
    if (totals.gstType === "IGST") {
      addTotalRow("IGST 18%", totals.igst, false);
    } else if (totals.gstType === "CGST_SGST") {
      addTotalRow("CGST 9%", totals.cgst, false);
      addTotalRow("SGST 9%", totals.sgst, false);
    }

    // TOTAL
    addTotalRow("TOTAL", totals.total, true);

    const tableBottomY = yCursor;

    // outer border & column lines AFTER knowing bottom
    doc.rect(
      TABLE_LEFT,
      tableTopY,
      TABLE_WIDTH,
      tableBottomY - tableTopY
    );
    doc.line(130, tableTopY, 130, tableBottomY);
    doc.line(160, tableTopY, 160, tableBottomY);

    // footer text
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Thanks for your business.", 28, tableBottomY + 8);

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
