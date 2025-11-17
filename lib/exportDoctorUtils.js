// lib/exportDoctorUtils.js
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Export all doctors to Excel
 */
export const exportDoctorsToExcel = (doctors, fieldDefinitions) => {
  if (!doctors || doctors.length === 0) {
    alert('No doctors to export');
    return;
  }

  const excelData = doctors.map(doctor => {
    const row = {};
    Object.keys(doctor).forEach(key => {
      if (key === 'id' || key === 'created_at' || key === 'updated_at' || key === 'schedule') return;
      const header = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      row[header] = doctor[key] || '';
    });
    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(excelData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Doctors');

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
  const filename = `Doctors_List_${today}.xlsx`;
  XLSX.writeFile(workbook, filename);
};

/**
 * Export all doctors to PDF
 */
export const exportDoctorsToPDF = (doctors, fieldDefinitions) => {
  if (!doctors || doctors.length === 0) {
    alert('No doctors to export');
    return;
  }

  const doc = new jsPDF();
  const green = [76, 175, 80];
  const lightGray = [245, 245, 245];

  // Header
  doc.setFillColor(...green);
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
  doc.text('Doctor List Report', 14, 45);
  doc.setFontSize(10);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 50);
  doc.text(`Total Doctors: ${doctors.length}`, 14, 55);

  // Table header
  let yPosition = 70;
  const pageHeight = doc.internal.pageSize.height;
  doc.setFillColor(240, 250, 244);
  doc.rect(10, yPosition - 8, 190, 8, 'F');
  doc.setTextColor(60, 60, 60);
  doc.setFont(undefined, 'bold');
  doc.setFontSize(11);
  doc.text('Name', 14, yPosition - 2);
  doc.text('Specialty', 60, yPosition - 2);
  doc.text('License ID', 100, yPosition - 2);
  doc.text('Phone', 150, yPosition - 2);

  // Data rows
  yPosition += 6;
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);

  doctors.forEach((d, i) => {
    if (yPosition > pageHeight - 20) {
      doc.addPage();
      yPosition = 20;
      doc.setFillColor(...green);
      doc.rect(10, yPosition - 8, 190, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined, 'bold');
      doc.text('Name', 14, yPosition - 2);
      doc.text('Specialty', 60, yPosition - 2);
      doc.text('License ID', 100, yPosition - 2);
      doc.text('Phone', 150, yPosition - 2);
      yPosition += 6;
      doc.setFont(undefined, 'normal');
      doc.setTextColor(0, 0, 0);
    }

    // Alternate row background
    if (i % 2 === 0) {
      doc.setFillColor(...lightGray);
      doc.rect(10, yPosition - 5, 190, 8, 'F');
    }

    doc.text(d.name || 'N/A', 14, yPosition);
    doc.text(d.specialty || 'N/A', 60, yPosition);
    doc.text(d.license_id || 'N/A', 100, yPosition);
    doc.text(d.phone || 'N/A', 150, yPosition);
    yPosition += 8;
  });

  // Footer
  const pageH = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('Note: This report is system-generated and does not require a signature.', 14, pageH - 15);
  doc.text('Printed on: ' + new Date().toLocaleDateString(), 14, pageH - 10);

  const filename = `Doctors_List_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
};

/**
 * Export single doctor to PDF
 */
export const exportSingleDoctorToPDF = (doctor, fieldDefinitions) => {
  if (!doctor) {
    alert('No doctor data to export');
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
  doc.text('Doctor Summary', 14, 45);
  doc.setFontSize(10);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 50);

  // Fields to show (based on MASTER_DOCTOR_FIELDS from DoctorListPage)
  const fieldsToShow = [
    'name', 'gender', 'date_of_birth', 'phone', 'email', 'national_id',
    'highest_degree', 'specialty', 'license_id', 'institution', 'graduation_year', 'certifications',
    'role', 'department', 'consultation_fee', 'weekly_off', 'room_number'
  ];

  const fields = Object.keys(doctor)
    .filter(k => fieldsToShow.includes(k) && doctor[k] !== null && doctor[k] !== undefined && doctor[k] !== '')
    .map(k => ({
      label: k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      value: String(doctor[k])
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

    // Add schedule section after clinic fields
    if (i === fields.findIndex(f => f.label === 'Room Number') && doctor.schedule) {
      y += 10;
      doc.setFillColor(...light);
      doc.rect(14, y - 6, 180, 10, 'F');
      doc.setTextColor(...green);
      doc.text('Schedule:', 18, y);
      doc.setTextColor(0, 0, 0);
      y += 5;

      const schedule = doctor.schedule;
      WEEK_DAYS.forEach(day => {
        const daySchedule = schedule[day];
        const time = daySchedule?.start && daySchedule?.end ? `${daySchedule.start} - ${daySchedule.end}` : 'Off';
        doc.setFillColor(...light);
        doc.rect(20, y - 4, 170, 8, 'F');
        doc.text(`${day}: ${time}`, 24, y);
        y += 8;
      });
    }
  });

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('This summary is computer generated and does not require signature.', 14, 285);
  doc.text('© 2025 Medical Clinic — Confidential', 14, 290);

  const filename = `Doctor_${doctor.name?.replace(/\s+/g, '_') || 'Record'}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
};