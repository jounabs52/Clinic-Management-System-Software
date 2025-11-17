// /lib/testPDF.js
import jsPDF from "jspdf";
import "jspdf-autotable";

export const testPDF = () => {
  const doc = new jsPDF();

  doc.text("Testing jsPDF + AutoTable", 10, 10);

  doc.autoTable({
    head: [["#", "Name", "Amount"]],
    body: [
      ["1", "Test Item", "500"],
      ["2", "Another Item", "1000"],
    ],
  });

  doc.save("test.pdf");
};
