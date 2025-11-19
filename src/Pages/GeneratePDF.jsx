"use client";

import { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import { Download } from "lucide-react";

const GeneratePDF = ({ invoiceData }) => {
  console.log("Invoice DAta=== ",invoiceData);
  const invoice = invoiceData || {};
  const [pdfUrl, setPdfUrl] = useState("");

  useEffect(() => {
    if (invoiceData && Object.keys(invoiceData).length > 0) {
      generatePDF();
    }
  }, [invoiceData]);

  // ✅ Common Data for PDF Header
  const commonDataForPdf = {
    invoiceNo: invoice?.invoice_no || "N/A",
    dateOfInvoice: invoice?.issue_date
      ? new Date(invoice.issue_date).toLocaleDateString()
      : "N/A",
    companyName: invoice?.company_name || "N/A",
    companyAccountNumber: invoice?.company_bank_account_number || "N/A",
    companyIfscCode: invoice?.company_ifsc_code || "N/A",
    companyState: invoice?.company_state || "N/A",
    companyGst: invoice?.company_gst_number || "N/A",
    companyPan: invoice?.company_pan || "N/A",
    clientName: invoice?.client_name || "N/A",
    clientAddress: invoice?.client_address || "N/A",
    add2: "Gurgaon, Haryana - 122001",
    clientState: invoice?.client_state || "N/A",
    clientGst: invoice?.client_gst_number || "N/A",
    gstRate: 18,
    currencyType: "INR",
  };

  // ✅ Dynamic resources (employees)
  const resourcesArr =
    invoice?.employees && invoice.employees.length > 0
      ? invoice.employees.map((emp, i) => ({
          userId: emp.id || `EMP-${i + 1}`,
          employeeName: emp.employee_name,
          workingOn: invoice.project_name || "Project",
          sacCode: "9983",
          fromDate: emp.from_date || invoice.from_date || "1st Nov 2025",
          toDate: emp.to_date || invoice.to_date || "30th Nov 2025",
          days: emp.days || 0,
          hours: 8,
          payPerDay:
            emp.total_amount && emp.days
              ? Math.round(Number(emp.total_amount) / emp.days)
              : 0,
          totalAmount: emp.total_amount || 0,
        }))
      : [
          {
            userId: "123",
            employeeName: invoice?.employee_name || "Employee",
            workingOn: invoice?.project_name || "Project",
            sacCode: "9983",
            fromDate: "1st November 2025",
            toDate: "30th November 2025",
            days: invoice?.days || 0,
            hours: 8,
            payPerDay:
              invoice?.total_amount && invoice?.days
                ? Math.round(Number(invoice.total_amount) / invoice.days)
                : 0,
            totalAmount: invoice?.total_amount || 0,
          },
        ];

  // ✅ Calculate total for all employees
  const calculateTotals = (gstRate) => {
    const subTotal = resourcesArr.reduce(
      (acc, val) => acc + val.payPerDay * val.days,
      0
    );
    const igst = (subTotal * gstRate) / 100;
    const total = subTotal + igst;
    return { subTotal, igst, total };
  };

  const totals = calculateTotals(commonDataForPdf.gstRate);

  // ✅ Generate PDF
  const generatePDF = (status) => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [300, 225],
    });

    // Header
    doc.setFontSize(15);
    doc.text(commonDataForPdf.companyName, 30, 32);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(61, 121, 216);
    doc.text(`INVOICE NO: ${commonDataForPdf.invoiceNo}`, 112, 32);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9.5);
    doc.text("621-622, Tower 1, Assotech Business Cresterra", 30, 42);
    doc.text("Sector - 135, Noida,", 30, 46);
    doc.text("Uttar Pradesh - 201305", 30, 50);

    // Bank Details
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

    // Company Info
    doc.setFontSize(8.8);
    doc.setFont("helvetica", "bold");
    doc.text(`Date of Invoice: `, 130, 60.5);
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

    // Bill To
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("BILL TO", 34, 85.5).rect(32, 81, 52, 7);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(commonDataForPdf.clientName, 30, 98);
    doc.setFontSize(9);
    doc.text(commonDataForPdf.clientAddress, 30, 106);
    doc.text(commonDataForPdf.add2, 30, 110);
    doc.text(commonDataForPdf.clientState, 30, 114);
    doc.setFont("helvetica", "bold");
    doc.text("GSTIN: ", 30, 122);
    doc.setFont("helvetica", "normal");
    doc.text(commonDataForPdf.clientGst, 43, 122);

    // Table
    const startY = 130;
    const rowHeight = 14;
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
      const currentY = startY + 11 + index * rowHeight;
      const temp = res.payPerDay * res.days;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.text(
        `Consultancy charges ${res.employeeName} on ${res.workingOn} (${res.userId})`,
        31.5,
        currentY
      );
      doc.text(`(${res.fromDate} - ${res.toDate})`, 31.5, currentY + 3.3);
      doc.setFont("helvetica", "bold");
      doc.text(
        `${res.days} Days * ${res.hours} Hours * ${res.payPerDay} ${commonDataForPdf.currencyType}`,
        31.5,
        currentY + 6.7
      );
      doc.setFont("helvetica", "normal");
      doc.text(temp.toString(), 173, currentY + 3.3);
      doc.text(commonDataForPdf.currencyType, 185, currentY + 3.3);
      doc.text(res.sacCode, 141, currentY + 3.3);

      if (index < numRows - 1)
        doc.line(30, currentY + 10, 195, currentY + 10);
    });

    // Totals
    const subtotalY = totalTableHeight - 10;
    const igstY = subtotalY + 7;
    const totalY = igstY + 7;

    doc.line(30, subtotalY - 9, 195, subtotalY - 9);
    doc.text("SUBTOTAL", 31.5, subtotalY - 5);
    doc.text(totals.subTotal.toFixed(2), 173, subtotalY - 5);
    doc.text(commonDataForPdf.currencyType, 185, subtotalY - 5);

    doc.text(`IGST ${commonDataForPdf.gstRate}%`, 31.5, igstY - 6);
    doc.text(totals.igst.toFixed(2), 173, igstY - 6);
    doc.text(commonDataForPdf.currencyType, 185, igstY - 6);

    doc.setFont("helvetica", "bold");
    doc.text("TOTAL", 31.5, totalY - 6.5);
    doc.text(totals.total.toFixed(2), 173, totalY - 6.5);
    doc.text(commonDataForPdf.currencyType, 185, totalY - 6.5);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Thanks for your business.", 28, totalY + 8);

    // Preview
    const pdfBlob = doc.output("blob");
    const url = URL.createObjectURL(pdfBlob);
    setPdfUrl(url);

    if (status === "download") {
      doc.save(`${commonDataForPdf.companyName}.pdf`);
    }
  };

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
              frameBorder="0"
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
