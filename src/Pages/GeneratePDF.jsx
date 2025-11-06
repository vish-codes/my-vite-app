import React, { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import DashboardPdf from "../Components/DashboardPdf";

const GeneratePDF = () => {
  const location = useLocation();
  const invoice = location.state?.invoice || {};
  console.log("🧾 Received invoice data:", invoice);

  const [pdfUrl, setPdfUrl] = useState("");
  const [isPdfPreviewVisible, setIsPdfPreviewVisible] = useState(false);

  // ✅ Static Invoice Data
  const commonDataForPdf = {
    invoiceNo: invoice?.invoice_no || "N/A",
    dateOfInvoice: invoice?.issue_date
      ? new Date(invoice.issue_date).toLocaleDateString()
      : "N/A",
    companyName: invoice?.company_name || "N/A",
    companyAccountNumber: invoice?.company_bank_account_number|| "N/A",
    companyIfscCode: invoice?.company_ifsc_code|| "N/A",
    companyState: invoice?.company_state|| "N/A",
    companyGst: invoice?.company_gst_number|| "N/A",
    companyPan: invoice?.company_pan|| "N/A",
    clientName:invoice?.client_name||"N/A",
    clientAddress: invoice?.client_address||"N/A",
    add2: "Gurgaon, Haryana - 122001",
    clientState: invoice?.client_state||"N/A",
    clientGst: invoice?.client_gst_number||"N/A",
    gstRate: 18,
    currencyType: "INR",
  };

  const resourcesArr = [
    {
      userId: "123",
      employeeName: invoice?.employee_name||"Project Name",
      workingOn: invoice?.project_name||"Project Name",
      sacCode: "9983", //hard code
      fromDate: "1st July",
      toDate: "30th July 2024",
      days: 21,
      hours: 8,
      payPerDay: 3000,
    },
    {
      userId: "124",
      employeeName: "Jane Smith",
      workingOn: "Lulu Hypermarket",
      sacCode: "9983",
      fromDate: "1st July",
      toDate: "31st July 2024",
      days: 20,
      hours: 8,
      payPerDay: 3200,
    },
    {
      userId: "125",
      employeeName: "Poorvi Chauhan",
      workingOn: "Lulu Hypermarket",
      sacCode: "9983",
      fromDate: "1st July",
      toDate: "31st July 2024",
      days: 20,
      hours: 8,
      payPerDay: 3200,
    },
  ];
// todo
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

  // 🧠 Main PDF Generator
  const generatePDF = (status) => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [300, 225],
    });

    // Header
    doc.setFontSize(15);
    doc.text(commonDataForPdf.companyName, 30, 32); //panorama name
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
    doc.text(`Name -${commonDataForPdf.companyName}`, 32, 65);
    doc.text(`Account No - ${commonDataForPdf.companyAccountNumber}` , 32, 69);
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
        `${res.days} Days * ${res.hours} Hours * ${res.payPerDay} ${commonDataForPdf.currencyType}`, //Total amount
        31.5,
        currentY + 6.7
      );
      doc.setFont("helvetica", "normal");
      doc.text(temp.toString(), 173, currentY + 3.3);
      doc.text(commonDataForPdf.currencyType, 185, currentY + 3.3);
      doc.text(res.sacCode, 141, currentY + 3.3);

      if (index < numRows - 1) doc.line(30, currentY + 10, 195, currentY + 10);
    });

    // Totals
    const subtotalY = totalTableHeight - 10;
    const igstY = subtotalY + 7;
    const totalY = igstY + 7;

    doc.line(30, subtotalY - 9, 195, subtotalY - 9);
    doc.text("SUBTOTAL", 31.5, subtotalY - 5);
    doc.text(totals.subTotal.toString(), 173, subtotalY - 5);
    doc.text(commonDataForPdf.currencyType, 185, subtotalY - 5);

    doc.text(`IGST ${commonDataForPdf.gstRate}%`, 31.5, igstY - 6);
    doc.text(totals.igst.toString(), 173, igstY - 6);
    doc.text(commonDataForPdf.currencyType, 185, igstY - 6);

    doc.setFont("helvetica", "bold");
    doc.text("TOTAL", 31.5, totalY - 6.5);
    doc.text(totals.total.toString(), 173, totalY - 6.5);
    doc.text(commonDataForPdf.currencyType, 185, totalY - 6.5);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Thanks for your business.", 28, totalY + 8);

    // Generate Blob URL for Preview
    if (status === "active") {
      doc.save(`${commonDataForPdf.companyName}.pdf`);
    } else {
      const pdfBlob = doc.output("blob");
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
      setIsPdfPreviewVisible(true);
    }
  };

  return (
    <div className="mx-auto">
      {/* <DashboardPdf /> */}
      {/* <div className="max-w-7xl mx-auto"> */}
        <div className="flex flex-col mt-3 rounded-2xl w-full h-screen sm:px-5 lg:px-20">
          <div className="mt-5">
            <button
              onClick={() => generatePDF()}
              className="py-2 px-6 mx-24 rounded-md bg-pano-blue text-white shadow-lg hover:bg-blue-600 transition-colors"
            >
              Generate PDF Preview
            </button>
          </div>

          {isPdfPreviewVisible ? (
            <div className="bg-gray-50 shadow-lg flex flex-col mt-5 rounded-2xl w-full h-screen sm:px-5">
              <div className="relative h-10 w-full mb-5">
                <button
                  onClick={() => generatePDF("active")}
                  className="absolute top-0 right-8 w-28 p-2 text-sm rounded-lg bg-slate-600 text-white"
                >
                  Download PDF
                </button>
              </div>
              <iframe
                src={pdfUrl}
                style={{ width: "100%", height: "800px" }}
                frameBorder="0"
                title="PDF Preview"
              />
            </div>
          ) : (
            <div className="mx-24 mt-5 text-gray-600">
              Click “Generate PDF Preview” to view sample invoice
            </div>
          )}
        </div>
      </div>
    // </div>
  );
};

export default GeneratePDF;