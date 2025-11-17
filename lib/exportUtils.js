// lib/exportUtils.js
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Export all patients to Excel
 */
export const exportPatientsToExcel = (patients, fieldDefinitions) => {
  if (!patients || patients.length === 0) {
    alert('No patients to export');
    return;
  }

  const excelData = patients.map(patient => {
    const row = {};
    Object.keys(patient).forEach(key => {
      if (key === 'id' || key === 'created_at' || key === 'updated_at') return;
      const header = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      row[header] = patient[key] || '';
    });
    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(excelData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Patients');

  const maxWidth = 50;
  const colWidths = Object.keys(excelData[0] || {}).map(key => {
    const maxLength = Math.max(
      key.length,
      ...excelData.map(row => String(row[key] || '').length)
    );
    return { wch: Math.min(maxLength + 2, maxWidth) };
  });
  worksheet['!cols'] = colWidths;

  const today = new Date().toISOString().split('T')[0];
  const filename = `Patients_List_${today}.xlsx`;
  XLSX.writeFile(workbook, filename);
};

/**
 * Export all patients to PDF (styled only)
 */
export const exportPatientsToPDF = (patients, fieldDefinitions) => {
  if (!patients || patients.length === 0) {
    alert('No patients to export');
    return;
  }

  const doc = new jsPDF();
  const green = [76, 175, 80];
  const lightGray = [245, 245, 245];

  // Header (cleaner look)
  doc.setFillColor(18, 128, 57);
  doc.rect(0, 0, 210, 28, 'F');
  doc.setTextColor(255, 255, 255);

  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text('Medical Clinic', 14, 18);
  doc.setFontSize(10);
  doc.text('123 Healthcare Street, Medical District', 14, 23);
  doc.text('Phone: +92 300 1234567 | info@medicalclinic.com', 14, 28);

  // Title
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('Patient List Report', 14, 45);
  doc.setFontSize(10);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 50);
  doc.text(`Total Patients: ${patients.length}`, 14, 55);

  // Table header
  let yPosition = 70;
  const pageHeight = doc.internal.pageSize.height;
  doc.setFillColor(240, 250, 244);
  doc.rect(10, yPosition - 8, 190, 8, 'F');
  doc.setTextColor(60, 60, 60);
  doc.setFont(undefined, 'bold');
  doc.setFontSize(11);
  doc.text('Name', 14, yPosition - 2);
  doc.text('Phone', 60, yPosition - 2);
  doc.text('MR Number', 100, yPosition - 2);
  doc.text('Email', 150, yPosition - 2);

  // Data rows
  yPosition += 6;
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);

  patients.forEach((p, i) => {
    if (yPosition > pageHeight - 20) {
      doc.addPage();
      yPosition = 20;
      doc.setFillColor(...green);
      doc.rect(10, yPosition - 8, 190, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined, 'bold');
      doc.text('Name', 14, yPosition - 2);
      doc.text('Phone', 60, yPosition - 2);
      doc.text('MR Number', 100, yPosition - 2);
      doc.text('Email', 150, yPosition - 2);
      yPosition += 6;
      doc.setFont(undefined, 'normal');
      doc.setTextColor(0, 0, 0);
    }

    // Alternate row background
    if (i % 2 === 0) {
      doc.setFillColor(...lightGray);
      doc.rect(10, yPosition - 5, 190, 8, 'F');
    }

    doc.text(p.name || 'N/A', 14, yPosition);
    doc.text(p.phone || 'N/A', 60, yPosition);
    doc.text(p.mr_number || 'N/A', 100, yPosition);
    doc.text(p.email || 'N/A', 150, yPosition);
    yPosition += 8;
  });

  // Footer
  const pageH = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('Note: This report is system-generated and does not require a signature.', 14, pageH - 15);
  doc.text('Printed on: ' + new Date().toLocaleDateString(), 14, pageH - 10);

  const filename = `Patients_List_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
};

/**
 * Export single patient to PDF (styled + simplified fields)
 */
export const exportSinglePatientToPDF = (patient, fieldDefinitions) => {
  if (!patient) {
    alert('No patient data to export');
    return;
  }

  const doc = new jsPDF('p', 'mm', 'a4');
  const green = [76, 175, 80];
  const light = [245, 247, 250];

  // Header
  doc.setFillColor(...green);
  doc.rect(0, 0, 210, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text('Medical Clinic', 14, 18);
  doc.setFontSize(10);
  doc.text('123 Healthcare Street, Medical District', 14, 23);
  doc.text('Phone: +92 300 1234567 | info@medicalclinic.com', 14, 28);

  // Title
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('Patient Summary', 14, 45);
  doc.setFontSize(10);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 50);

  // Only keep key fields
  const keysToShow = [
    'name', 'mr_number', 'age', 'gender',
    'phone', 'email', 'address', 'assign_doctor',
    'blood_group', 'medical_alert'
  ];

  const fields = Object.keys(patient)
    .filter(k => keysToShow.includes(k) && patient[k])
    .map(k => ({
      label: k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      value: String(patient[k])
    }));

  let y = 65;
  doc.setFontSize(11);

  fields.forEach((f, i) => {
    doc.setFillColor(...light);
    doc.rect(14, y - 6, 180, 10, 'F');
    doc.setTextColor(...green);
    doc.setFont(undefined, 'bold');
    doc.text(`${f.label}:`, 18, y);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
    const lines = doc.splitTextToSize(f.value, 120);
    doc.text(lines, 70, y);
    y += 10 + (lines.length - 1) * 5;
  });

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('This summary is computer generated and does not require signature.', 14, 285);
  doc.text('© 2025 Medical Clinic — Confidential', 14, 290);

  const filename = `Patient_${patient.name?.replace(/\s+/g, '_') || 'Record'}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
};
