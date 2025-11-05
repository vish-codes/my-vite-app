import React, { useState } from "react";
import { jsPDF } from "jspdf";
import { motion } from "framer-motion";
import { useLocation } from "react-router-dom";
import DashboardPdf from "../Components/DashboardPdf";

const GeneratePDF = () => {
  const location = useLocation();
  const invoice = location.state?.invoice || {};
  console.log("🧾 Received invoice data:", invoice);

  const [pdfUrl, setPdfUrl] = useState("");
  const [isPdfPreviewVisible, setIsPdfPreviewVisible] = useState(false);

  const commonDataForPdf = {
    invoiceNo: invoice?.invoice_no || "N/A",
    dateOfInvoice: invoice?.issue_date
      ? new Date(invoice.issue_date).toLocaleDateString()
      : "N/A",
    companyName: invoice?.company_name || "N/A",
    clientName: invoice?.client_name || "N/A",
    employeeName: invoice?.employee_name || "N/A",
    projectName: invoice?.project_name || "N/A",
    totalAmount: invoice?.total_amount || 0,
    days: invoice?.days || 0,
    paidLeaves: invoice?.paid_leaves || 0,
    unpaidLeaves: invoice?.unpaid_leaves || 0,
    overTime: invoice?.over_time || 0,
  };

  const totals = {
    subTotal: parseFloat(commonDataForPdf.totalAmount),
    igst: (parseFloat(commonDataForPdf.totalAmount) * 18) / 100,
    total: parseFloat(commonDataForPdf.totalAmount) * 1.18,
  };

  const generatePDF = (status) => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [300, 225],
    });

    doc.setFontSize(15);
    doc.text("Panorama Software Solutions", 30, 32);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(61, 121, 216);
    doc.text(`INVOICE NO: ${commonDataForPdf.invoiceNo}`, 112, 32);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9.5);
    doc.text("621-622, Tower 1, Assotech Business Cresterra", 30, 42);
    doc.text("Sector - 135, Noida,", 30, 46);
    doc.text("Uttar Pradesh - 201305", 30, 50);

    doc.setFontSize(8.8);
    doc.setFont("helvetica", "bold");
    doc.text(`Date of Invoice: `, 130, 60.5);
    doc.setFont("helvetica", "normal");
    doc.text(`${commonDataForPdf.dateOfInvoice}`, 154.6, 60.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("BILL TO", 34, 85.5).rect(32, 81, 52, 7);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(commonDataForPdf.companyName, 30, 98);
    doc.setFontSize(9);
    doc.text(`Client: ${commonDataForPdf.clientName}`, 30, 106);
    doc.text(`Project: ${commonDataForPdf.projectName}`, 30, 110);
    doc.text(`Employee: ${commonDataForPdf.employeeName}`, 30, 114);

    const startY = 130;
    doc.rect(30, startY, 165, 25);
    doc.line(30, startY + 7, 195, startY + 7);
    doc.line(130, startY, 130, startY + 25);
    doc.line(160, startY, 160, startY + 25);
    doc.setFontSize(10.5);
    doc.setFont("helvetica", "bold");
    doc.text("DESCRIPTION", 66, startY + 5);
    doc.text("DAYS", 135, startY + 5);
    doc.text("AMOUNT", 170, startY + 5);

    doc.setFont("helvetica", "normal");
    doc.text(`Billing for ${commonDataForPdf.projectName}`, 31.5, startY + 13);
    doc.text(commonDataForPdf.days.toString(), 140, startY + 13);
    doc.text(commonDataForPdf.totalAmount.toString(), 175, startY + 13);

    const subtotalY = startY + 35;
    doc.text("SUBTOTAL", 31.5, subtotalY - 5);
    doc.text(totals.subTotal.toFixed(2).toString(), 173, subtotalY - 5);
    doc.text("IGST 18%", 31.5, subtotalY + 2);
    doc.text(totals.igst.toFixed(2).toString(), 173, subtotalY + 2);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL", 31.5, subtotalY + 9);
    doc.text(totals.total.toFixed(2).toString(), 173, subtotalY + 9);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Thanks for your business.", 28, subtotalY + 20);

    if (status === "active") {
      doc.save(`${commonDataForPdf.clientName}.pdf`);
    } else {
      const pdfBlob = doc.output("blob");
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
      setIsPdfPreviewVisible(true);
    }
  };

  return (
    <div className="mx-auto">
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
  );
};

export default GeneratePDF;
