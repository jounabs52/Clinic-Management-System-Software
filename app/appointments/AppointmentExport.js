import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { toast } from 'react-hot-toast'

// ============================================================================
// Utility Functions
// ============================================================================
const formatTime = (time) => {
  if (!time) return '-'
  const [hours, minutes] = time.split(':')
  const h = parseInt(hours, 10)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${minutes.padStart(2, '0')} ${ampm}`
}

const formatDate = (dateString) => {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  } catch (error) {
    return dateString
  }
}

// ============================================================================
// PDF Export Function - All Appointments
// ============================================================================
export const exportAppointmentsToPDF = (appointments) => {
  try {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    })
    
    // Title
    doc.setFontSize(22)
    doc.setTextColor(147, 51, 234) // Purple color
    doc.text('Appointment Report', 14, 20)
    
    // Subtitle with date and count
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(`Generated: ${new Date().toLocaleString('en-US', { 
      dateStyle: 'medium', 
      timeStyle: 'short' 
    })}`, 14, 28)
    doc.text(`Total: ${appointments.length} appointments`, 14, 33)
    
    // Draw a line
    doc.setDrawColor(147, 51, 234)
    doc.setLineWidth(0.5)
    doc.line(14, 38, 283, 38)
    
    // Prepare table data
    const tableData = appointments.map(app => [
      formatDate(app.appointment_date),
      formatTime(app.start_time),
      formatTime(app.end_time),
      app.doctor_name || 'N/A',
      app.patient_name || 'N/A',
      app.mr_number || 'N/A',
      app.status || 'N/A',
      app.appointment_type || 'N/A',
      `Rs ${app.fee || 0}`
    ])
    
    // Generate table
    autoTable(doc, {
      head: [['Date', 'Start', 'End', 'Doctor', 'Patient', 'MR#', 'Status', 'Type', 'Fee']],
      body: tableData,
      startY: 44,
      styles: { 
        fontSize: 9,
        cellPadding: 2.5,
        overflow: 'linebreak'
      },
      headStyles: { 
        fillColor: [147, 51, 234],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center'
      },
      alternateRowStyles: {
        fillColor: [245, 243, 255]
      },
      columnStyles: {
        0: { cellWidth: 24 },
        1: { cellWidth: 20 },
        2: { cellWidth: 20 },
        3: { cellWidth: 35 },
        4: { cellWidth: 35 },
        5: { cellWidth: 22 },
        6: { cellWidth: 24 },
        7: { cellWidth: 28 },
        8: { cellWidth: 22 }
      },
      margin: { top: 44, left: 14, right: 14 },
      didDrawPage: (data) => {
        // Footer on each page
        doc.setFontSize(8)
        doc.setTextColor(128)
        doc.text(
          `Page ${doc.internal.getCurrentPageInfo().pageNumber}`,
          doc.internal.pageSize.width / 2,
          doc.internal.pageSize.height - 10,
          { align: 'center' }
        )
        doc.text(
          'Gynecology Admin Portal',
          14,
          doc.internal.pageSize.height - 10
        )
      }
    })
    
    // Save the PDF
    const filename = `appointments_${new Date().toISOString().split('T')[0]}.pdf`
    doc.save(filename)
    
    toast.success('PDF exported successfully!')
  } catch (error) {
    console.error('Error exporting PDF:', error)
    toast.error('Error exporting PDF. Please try again.')
  }
}

// ============================================================================
// Excel Export Function
// ============================================================================
export const exportAppointmentsToExcel = (appointments) => {
  try {
    // Prepare data for Excel
    const excelData = appointments.map(app => ({
      'Date': formatDate(app.appointment_date),
      'Start Time': formatTime(app.start_time),
      'End Time': formatTime(app.end_time),
      'Doctor': app.doctor_name || 'N/A',
      'Patient': app.patient_name || 'N/A',
      'MR Number': app.mr_number || 'N/A',
      'Phone': app.patient_phone || 'N/A',
      'Status': app.status || 'N/A',
      'Type': app.appointment_type || 'N/A',
      'Fee (PKR)': app.fee || 0,
      'Notes': app.notes || 'N/A'
    }))
    
    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(excelData)
    
    // Set column widths
    ws['!cols'] = [
      { wch: 12 },  // Date
      { wch: 12 },  // Start Time
      { wch: 12 },  // End Time
      { wch: 20 },  // Doctor
      { wch: 20 },  // Patient
      { wch: 12 },  // MR Number
      { wch: 15 },  // Phone
      { wch: 12 },  // Status
      { wch: 15 },  // Type
      { wch: 10 },  // Fee
      { wch: 30 }   // Notes
    ]
    
    // Create workbook
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Appointments')
    
    // Add a summary sheet
    const summaryData = [
      { 'Metric': 'Total Appointments', 'Value': appointments.length },
      { 'Metric': 'Scheduled', 'Value': appointments.filter(a => a.status === 'Scheduled').length },
      { 'Metric': 'Confirmed', 'Value': appointments.filter(a => a.status === 'Confirmed').length },
      { 'Metric': 'Completed', 'Value': appointments.filter(a => a.status === 'Completed').length },
      { 'Metric': 'Cancelled', 'Value': appointments.filter(a => a.status === 'Cancelled').length },
      { 'Metric': 'No Show', 'Value': appointments.filter(a => a.status === 'No Show').length },
      { 'Metric': 'Total Revenue (PKR)', 'Value': appointments.reduce((sum, a) => sum + parseFloat(a.fee || 0), 0).toFixed(2) }
    ]
    
    const summaryWs = XLSX.utils.json_to_sheet(summaryData)
    summaryWs['!cols'] = [{ wch: 25 }, { wch: 15 }]
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary')
    
    // Save the file
    const filename = `appointments_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(wb, filename)
    
    toast.success('Excel exported successfully!')
  } catch (error) {
    console.error('Error exporting Excel:', error)
    toast.error('Error exporting Excel. Please try again.')
  }
}

// ============================================================================
// Export individual appointment as PDF - Enhanced Design
// ============================================================================
export const exportSingleAppointmentPDF = (appointment) => {
  try {
    const doc = new jsPDF()
    
    // Add background color for header
    doc.setFillColor(147, 51, 234) // Purple
    doc.rect(0, 0, 210, 40, 'F')
    
    // Clinic Name/Logo Area
    doc.setFontSize(26)
    doc.setTextColor(255, 255, 255)
    doc.text('MEDICAL CLINIC', 105, 18, { align: 'center' })
    
    doc.setFontSize(10)
    doc.text('Appointment Receipt', 105, 26, { align: 'center' })
    doc.text(`Date: ${new Date().toLocaleDateString('en-US', { dateStyle: 'medium' })}`, 105, 32, { align: 'center' })
    
    let yPos = 55
    
    // Appointment ID / Reference Number (if available)
    if (appointment.id) {
      doc.setFontSize(10)
      doc.setTextColor(100)
      doc.text(`Reference: #${appointment.id}`, 14, yPos)
      yPos += 10
    }
    
    // Patient Information Section
    doc.setFillColor(245, 243, 255) // Light purple
    doc.rect(14, yPos, 182, 10, 'F')
    doc.setFontSize(12)
    doc.setTextColor(147, 51, 234)
    doc.setFont(undefined, 'bold')
    doc.text('PATIENT INFORMATION', 20, yPos + 7)
    doc.setFont(undefined, 'normal')
    yPos += 16
    
    doc.setFontSize(10)
    doc.setTextColor(60)
    doc.text('Name:', 20, yPos)
    doc.setFont(undefined, 'bold')
    doc.text(appointment.patient_name || 'N/A', 50, yPos)
    doc.setFont(undefined, 'normal')
    yPos += 6
    
    doc.text('MR Number:', 20, yPos)
    doc.text(appointment.mr_number || 'N/A', 50, yPos)
    yPos += 6
    
    if (appointment.patient_phone) {
      doc.text('Phone:', 20, yPos)
      doc.text(appointment.patient_phone, 50, yPos)
      yPos += 10
    } else {
      yPos += 6
    }
    
    // Doctor Information Section
    doc.setFillColor(245, 243, 255)
    doc.rect(14, yPos, 182, 10, 'F')
    doc.setFontSize(12)
    doc.setTextColor(147, 51, 234)
    doc.setFont(undefined, 'bold')
    doc.text('DOCTOR INFORMATION', 20, yPos + 7)
    doc.setFont(undefined, 'normal')
    yPos += 16
    
    doc.setFontSize(10)
    doc.setTextColor(60)
    doc.text('Doctor:', 20, yPos)
    doc.setFont(undefined, 'bold')
    doc.text(appointment.doctor_name || 'N/A', 50, yPos)
    doc.setFont(undefined, 'normal')
    yPos += 12
    
    // Appointment Details Section
    doc.setFillColor(245, 243, 255)
    doc.rect(14, yPos, 182, 10, 'F')
    doc.setFontSize(12)
    doc.setTextColor(147, 51, 234)
    doc.setFont(undefined, 'bold')
    doc.text('APPOINTMENT DETAILS', 20, yPos + 7)
    doc.setFont(undefined, 'normal')
    yPos += 16
    
    doc.setFontSize(10)
    doc.setTextColor(60)
    
    // Date
    doc.text('Date:', 20, yPos)
    doc.text(new Date(appointment.appointment_date).toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }), 50, yPos)
    yPos += 6
    
    // Time
    doc.text('Time:', 20, yPos)
    doc.text(`${formatTime(appointment.start_time)} - ${formatTime(appointment.end_time)}`, 50, yPos)
    yPos += 6
    
    // Type
    doc.text('Type:', 20, yPos)
    doc.text(appointment.appointment_type || 'N/A', 50, yPos)
    yPos += 6
    
    // Status with colored badge
    doc.text('Status:', 20, yPos)
    const status = appointment.status || 'N/A'
    const statusColors = {
      'Scheduled': [147, 51, 234],
      'Confirmed': [59, 130, 246],
      'Completed': [107, 114, 128],
      'Cancelled': [239, 68, 68],
      'No Show': [249, 115, 22]
    }
    const statusColor = statusColors[status] || [107, 114, 128]
    doc.setFillColor(statusColor[0], statusColor[1], statusColor[2])
    doc.roundedRect(48, yPos - 3.5, status.length * 3 + 4, 5, 1, 1, 'F')
    doc.setTextColor(255, 255, 255)
    doc.text(status, 50, yPos)
    doc.setTextColor(60)
    yPos += 10
    
    // Fee Section - Highlighted
    doc.setFillColor(245, 243, 255)
    doc.rect(14, yPos, 182, 12, 'F')
    doc.setDrawColor(147, 51, 234)
    doc.setLineWidth(0.5)
    doc.rect(14, yPos, 182, 12)
    
    doc.setFontSize(11)
    doc.setTextColor(60)
    doc.text('Consultation Fee:', 20, yPos + 8)
    doc.setFont(undefined, 'bold')
    doc.setFontSize(14)
    doc.setTextColor(147, 51, 234)
    doc.text(`PKR ${appointment.fee || 0}`, 175, yPos + 8, { align: 'right' })
    doc.setFont(undefined, 'normal')
    yPos += 18
    
    // Notes Section (if available)
    if (appointment.notes && appointment.notes !== 'N/A') {
      doc.setFillColor(245, 243, 255)
      doc.rect(14, yPos, 182, 10, 'F')
      doc.setFontSize(12)
      doc.setTextColor(147, 51, 234)
      doc.setFont(undefined, 'bold')
      doc.text('NOTES', 20, yPos + 7)
      doc.setFont(undefined, 'normal')
      yPos += 16
      
      doc.setFontSize(10)
      doc.setTextColor(60)
      const splitNotes = doc.splitTextToSize(appointment.notes, 170)
      doc.text(splitNotes, 20, yPos)
      yPos += splitNotes.length * 5 + 10
    }
    
    // Footer
    yPos = Math.max(yPos, 260) // Ensure footer is at bottom
    doc.setDrawColor(147, 51, 234)
    doc.setLineWidth(0.3)
    doc.line(14, yPos, 196, yPos)
    yPos += 6
    
    doc.setFontSize(8)
    doc.setTextColor(128)
    doc.text('Thank you for choosing our services!', 105, yPos, { align: 'center' })
    yPos += 4
    doc.text('For inquiries, please contact: +92 300 1234567 | info@medicalclinic.com', 105, yPos, { align: 'center' })
    yPos += 4
    doc.text('Address: 123 Healthcare Street, Medical District', 105, yPos, { align: 'center' })
    
    // Save with meaningful filename
    const patientName = appointment.patient_name.replace(/\s+/g, '_')
    const date = appointment.appointment_date
    const filename = `Appointment_${patientName}_${date}.pdf`
    doc.save(filename)
    
    toast.success('Appointment receipt exported!')
  } catch (error) {
    console.error('Error exporting appointment PDF:', error)
    toast.error('Error exporting PDF. Please try again.')
  }
}