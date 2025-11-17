// /lib/createInvoicePDF.js
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Generate a PDF invoice using jsPDF
 * @param {Object} invoiceData - invoice details
 */
export const createInvoicePDF = (invoiceData) => {
  try {
    console.log('createInvoicePDF called with data:', invoiceData);
    
    const doc = new jsPDF({ unit: "pt", format: "a4" });

    const clinicInfo = {
      name: "Medical Clinic",
      address: "123 Healthcare Street, Medical District",
      phone: "+92 300 1234567",
      email: "info@medicalclinic.com",
      license: "MC-2024-001",
    };

    // Helper function to safely convert to number
    const toNum = (val) => {
      const num = Number(val);
      return isNaN(num) ? 0 : num;
    };

    // ---------------------------------------------------------------------
    // HEADER
    // ---------------------------------------------------------------------
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(18, 128, 57);
    doc.text(clinicInfo.name, 40, 50);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    doc.text(`Address: ${clinicInfo.address}`, 40, 70);
    doc.text(`Phone: ${clinicInfo.phone}`, 40, 85);
    doc.text(`Email: ${clinicInfo.email}`, 40, 100);
    doc.text(`License No: ${clinicInfo.license}`, 40, 115);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text("INVOICE", 460, 50);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Invoice #: ${invoiceData.invoiceNumber || 'N/A'}`, 460, 70);
    doc.text(`Date: ${invoiceData.date || new Date().toLocaleDateString()}`, 460, 85);
    
    const balanceDue = toNum(invoiceData.balanceDue);
    const status = balanceDue <= 0 ? "Paid" : "Outstanding";
    doc.text(`Status: ${status}`, 460, 100);

    // ---------------------------------------------------------------------
    // PATIENT & DOCTOR INFO
    // ---------------------------------------------------------------------
    doc.setDrawColor(100, 180, 120);
    doc.setLineWidth(0.8);
    doc.line(40, 135, 550, 135);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(18, 128, 57);
    doc.text("PATIENT INFORMATION", 40, 155);
    doc.text("DOCTOR INFORMATION", 320, 155);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);

    const patient = invoiceData.patient || {};
    const doctor = invoiceData.doctor || {};

    doc.text(`Name: ${patient.name || "N/A"}`, 40, 175);
    doc.text(`MR Number: ${patient.mr_number || "N/A"}`, 40, 190);
    doc.text(`Phone: ${patient.phone || "N/A"}`, 40, 205);

    doc.text(`Name: ${doctor.name || "N/A"}`, 320, 175);
    doc.text(`Specialization: ${doctor.specialization || "N/A"}`, 320, 190);
    doc.text(`Phone: ${doctor.phone || "N/A"}`, 320, 205);

    // ---------------------------------------------------------------------
    // TABLE: Services
    // ---------------------------------------------------------------------
    const tableColumn = ["#", "Description", "Quantity", "Unit Price", "Discount", "Amount"];
    const tableRows = [];

    console.log('Processing services:', invoiceData.services);

    // Ensure services is an array
    const services = Array.isArray(invoiceData.services) ? invoiceData.services : [];
    
    if (services.length === 0) {
      console.warn('No services found in invoice data');
    }

    services.forEach((item, index) => {
      const charges = toNum(item.charges);
      const discountPercent = toNum(item.discount);
      const discountAmount = (charges * discountPercent) / 100;
      const finalAmount = charges - discountAmount;
      
      tableRows.push([
        index + 1,
        item.service || "N/A",
        "1",
        `Rs. ${charges.toFixed(2)}`,
        `${discountPercent.toFixed(0)}%`,
        `Rs. ${finalAmount.toFixed(2)}`,
      ]);
    });

    // Add a row if no services
    if (tableRows.length === 0) {
      tableRows.push([
        1,
        "No services listed",
        "0",
        "Rs. 0.00",
        "0%",
        "Rs. 0.00",
      ]);
    }

    // Use autoTable with the doc instance
    autoTable(doc, {
      startY: 230,
      head: [tableColumn],
      body: tableRows,
      theme: "grid",
      headStyles: { 
        fillColor: [18, 128, 57], 
        textColor: 255, 
        halign: "center",
        fontStyle: "bold"
      },
      styles: { 
        fontSize: 10, 
        cellPadding: 6,
        overflow: 'linebreak'
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 30 },
        1: { cellWidth: 200 },
        2: { halign: "center", cellWidth: 60 },
        3: { halign: "right", cellWidth: 80 },
        4: { halign: "center", cellWidth: 60 },
        5: { halign: "right", cellWidth: 80 },
      },
    });

    // Get the Y position after the table
    const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : 400;
    let y = finalY + 20;

    // ---------------------------------------------------------------------
    // TOTAL SECTION
    // ---------------------------------------------------------------------
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    
    const grossTotal = toNum(invoiceData.grossTotal);
    const totalDiscount = toNum(invoiceData.totalDiscount);
    const finalPayable = toNum(invoiceData.finalPayable);
    const totalPaid = toNum(invoiceData.totalPaid);
    const outstanding = Math.max(balanceDue, 0);
    
    doc.setTextColor(0, 0, 0);
    doc.text(`Subtotal: Rs. ${grossTotal.toFixed(2)}`, 400, y);
    y += 15;
    doc.text(`Discount: Rs. ${totalDiscount.toFixed(2)}`, 400, y);
    y += 15;
    
    doc.setFont("helvetica", "bold");
    doc.text(`Total Amount: Rs. ${finalPayable.toFixed(2)}`, 400, y);
    y += 15;
    
    doc.setFont("helvetica", "normal");
    doc.text(`Paid Amount: Rs. ${totalPaid.toFixed(2)}`, 400, y);
    y += 15;
    
    doc.setFont("helvetica", "bold");
    doc.setTextColor(outstanding > 0 ? 200 : 0, outstanding > 0 ? 0 : 128, outstanding > 0 ? 0 : 0);
    doc.text(`Outstanding: Rs. ${outstanding.toFixed(2)}`, 400, y);

    // ---------------------------------------------------------------------
    // FOOTER
    // ---------------------------------------------------------------------
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    
    const notes = invoiceData.notes || "Thank you for choosing our medical services. Please make payment by the due date.";
    doc.text(`Notes: ${notes}`, 40, y + 40, { maxWidth: 500 });
    doc.text(`Printed on: ${new Date().toLocaleString()}`, 40, y + 60);

    // ---------------------------------------------------------------------
    // SAVE PDF
    // ---------------------------------------------------------------------
    const fileName = `${invoiceData.invoiceNumber || 'invoice'}.pdf`;
    console.log('Saving PDF as:', fileName);
    doc.save(fileName);
    
    console.log('PDF generated successfully');
    return true;

  } catch (error) {
    console.error('Error in createInvoicePDF:', error);
    console.error('Error stack:', error.stack);
    throw error;
  }
};