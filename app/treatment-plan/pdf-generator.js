// ============================================================================
// FILE 2: pdf-generator.js - COMPLETE REPLACEMENT
// Replace your ENTIRE pdf-generator.js file with this:
// ============================================================================

import { jsPDF } from 'jspdf';

export const generatePDF = (plan) => {
    const doc = new jsPDF();
    const margin = 20;
    let currentY = 20;
    const availableWidth = 210 - (2 * margin);
    const pageHeight = doc.internal.pageSize.height;

    // --- HEADER ---
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(41, 128, 185);
    doc.text('Treatment Plan / Prescription', 105, currentY, { align: 'center' });
    currentY += 12;
    
    // Divider line
    doc.setDrawColor(41, 128, 185);
    doc.setLineWidth(0.5);
    doc.line(margin, currentY, 210 - margin, currentY);
    currentY += 10;
    
    // --- PATIENT & DOCTOR INFO BOX ---
    doc.setFillColor(245, 247, 250);
    doc.rect(margin, currentY, availableWidth, 30, 'F');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50);
    
    let infoY = currentY + 7;
    doc.text('Date:', margin + 5, infoY);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date().toLocaleDateString(), margin + 35, infoY);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Doctor:', 120, infoY);
    doc.setFont('helvetica', 'normal');
    doc.text(`Dr. ${plan.doctorName || 'N/A'}`, 145, infoY);
    
    infoY += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('Patient:', margin + 5, infoY);
    doc.setFont('helvetica', 'normal');
    doc.text(plan.patientName || 'N/A', margin + 35, infoY);
    
    doc.setFont('helvetica', 'bold');
    doc.text('MR Number:', 120, infoY);
    doc.setFont('helvetica', 'normal');
    doc.text(plan.patientMRNumber || 'N/A', 145, infoY);
    
    infoY += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('Plan Title:', margin + 5, infoY);
    doc.setFont('helvetica', 'normal');
    doc.text(plan.title || 'N/A', margin + 35, infoY);
    
    currentY += 32;
    
    // --- DIAGNOSIS & OBJECTIVE ---
    const addSection = (title, content, yPos) => {
        if (yPos > pageHeight - 40) {
            doc.addPage();
            yPos = margin;
        }
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(41, 128, 185);
        doc.text(title, margin, yPos);
        yPos += 6;
        
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(50);
        doc.setFontSize(10);
        const splitContent = doc.splitTextToSize(content || 'N/A', availableWidth);
        doc.text(splitContent, margin, yPos);
        return yPos + (splitContent.length * 5) + 8;
    };
    
    currentY = addSection('Diagnosis:', plan.diagnosis, currentY);
    currentY = addSection('Objective:', plan.objective, currentY);
    
    // --- TABLE DRAWING FUNCTION ---
    const drawTable = (title, data, columns, startY) => {
        let tableY = startY;
        const rowHeight = 8;
        const headerHeight = 10;
        
        // Check page break before table
        if (tableY > pageHeight - 60) {
            doc.addPage();
            tableY = margin;
        }
        
        // Table Title
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(41, 128, 185);
        doc.text(title, margin, tableY);
        tableY += 8;
        
        // Table Header
        doc.setFillColor(41, 128, 185);
        doc.setDrawColor(200);
        let x = margin;
        
        columns.forEach(col => {
            doc.rect(x, tableY, col.width, headerHeight, 'FD');
            x += col.width;
        });
        
        // Header Text
        x = margin;
        doc.setTextColor(255);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        
        columns.forEach(col => {
            const textX = col.align === 'center' ? x + col.width / 2 : x + 3;
            doc.text(col.header, textX, tableY + 6, { 
                align: col.align === 'center' ? 'center' : 'left' 
            });
            x += col.width;
        });
        
        tableY += headerHeight;
        
        // Table Body
        doc.setTextColor(50);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setFillColor(255);
        
        data.forEach((row, idx) => {
            // Check page break
            if (tableY + rowHeight > pageHeight - margin) {
                doc.addPage();
                tableY = margin;
                
                // Redraw header on new page
                x = margin;
                doc.setFillColor(41, 128, 185);
                columns.forEach(col => {
                    doc.rect(x, tableY, col.width, headerHeight, 'FD');
                    x += col.width;
                });
                
                x = margin;
                doc.setTextColor(255);
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                columns.forEach(col => {
                    const textX = col.align === 'center' ? x + col.width / 2 : x + 3;
                    doc.text(col.header, textX, tableY + 6, { 
                        align: col.align === 'center' ? 'center' : 'left' 
                    });
                    x += col.width;
                });
                tableY += headerHeight;
                doc.setTextColor(50);
                doc.setFont('helvetica', 'normal');
            }
            
            // Alternating row colors
            if (idx % 2 === 0) {
                doc.setFillColor(248, 249, 250);
                doc.rect(margin, tableY, availableWidth, rowHeight, 'F');
            }
            
            // Draw cells
            x = margin;
            doc.setDrawColor(220);
            columns.forEach(col => {
                doc.rect(x, tableY, col.width, rowHeight, 'S');
                const content = String(row[col.key] || '');
                const textX = col.align === 'center' ? x + col.width / 2 : x + 3;
                doc.text(content, textX, tableY + 5, { 
                    align: col.align === 'center' ? 'center' : 'left',
                    maxWidth: col.width - 6
                });
                x += col.width;
            });
            
            tableY += rowHeight;
        });
        
        return tableY + 10;
    };
    
    // --- MEDICATIONS TABLE ---
    const medicationColumns = [
        { header: '#', key: 'num', width: 12, align: 'center' },
        { header: 'Medicine', key: 'drug_name', width: 48, align: 'left' },
        { header: 'Dosage', key: 'dosage', width: 28, align: 'left' },
        { header: 'Frequency', key: 'frequency', width: 28, align: 'left' },
        { header: 'Duration', key: 'duration', width: 26, align: 'left' },
        { header: 'Route', key: 'route', width: 28, align: 'left' },
    ];
    
    const medicationData = (plan.medications && plan.medications.length > 0) 
        ? plan.medications.map((med, index) => ({
            num: index + 1,
            drug_name: med.drug_name || 'N/A',
            dosage: med.dosage || 'N/A',
            frequency: med.frequency || 'N/A',
            duration: med.duration || 'N/A',
            route: med.route || 'Oral',
        })) 
        : [{ num: '-', drug_name: 'No medications prescribed', dosage: '', frequency: '', duration: '', route: '' }];
    
    currentY = drawTable('Medications', medicationData, medicationColumns, currentY);
    
    // --- PROCEDURES/TESTS TABLE ---
    const itemColumns = [
        { header: '#', key: 'num', width: 12, align: 'center' },
        { header: 'Type', key: 'item_type', width: 28, align: 'left' },
        { header: 'Name', key: 'name', width: 50, align: 'left' },
        { header: 'Date', key: 'scheduled_date', width: 30, align: 'left' },
        { header: 'Notes/Status', key: 'notes', width: 50, align: 'left' },
    ];
    
    const treatmentItemData = (plan.treatmentItems && plan.treatmentItems.length > 0)
        ? plan.treatmentItems.map((item, index) => ({
            num: index + 1,
            item_type: item.item_type || 'N/A',
            name: item.name || 'N/A',
            scheduled_date: item.scheduled_date || 'N/A',
            notes: (item.result_status || item.notes || 'Planned').substring(0, 35),
        })) 
        : [{ num: '-', item_type: 'No', name: 'other treatments prescribed', scheduled_date: '', notes: '' }];
    
    currentY = drawTable('Other Treatments (Procedures/Tests/Therapies)', treatmentItemData, itemColumns, currentY);
    
    // --- PROGRESS NOTES ---
    if (plan.progress_notes && plan.progress_notes.trim() !== '') {
        currentY = addSection('Progress Notes:', plan.progress_notes, currentY);
    }
    
    // --- FINANCIAL SUMMARY (TABLE FORMAT) ---
    if (currentY > pageHeight - 70) {
        doc.addPage();
        currentY = margin;
    }
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(41, 128, 185);
    doc.text('Financial Summary', margin, currentY);
    currentY += 8;
    
    // Financial table
    const boxWidth = 80;
    const boxX = 210 - margin - boxWidth;
    
    doc.setFillColor(245, 247, 250);
    doc.setDrawColor(41, 128, 185);
    doc.rect(boxX, currentY, boxWidth, 30, 'FD');
    
    doc.setFontSize(10);
    doc.setTextColor(50);
    doc.setFont('helvetica', 'bold');
    
    let finY = currentY + 8;
    doc.text('Estimated Total:', boxX + 5, finY);
    doc.setFont('helvetica', 'normal');
    doc.text(`Rs. ${(plan.totalCost || 0).toFixed(2)}`, boxX + boxWidth - 5, finY, { align: 'right' });
    
    finY += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('Amount Paid:', boxX + 5, finY);
    doc.setFont('helvetica', 'normal');
    doc.text(`Rs. ${(plan.amountPaid || 0).toFixed(2)}`, boxX + boxWidth - 5, finY, { align: 'right' });
    
    // Balance line
    doc.setDrawColor(41, 128, 185);
    doc.setLineWidth(0.3);
    finY += 2;
    doc.line(boxX + 5, finY, boxX + boxWidth - 5, finY);
    
    finY += 6;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 38, 38);
    doc.text('Balance Due:', boxX + 5, finY);
    doc.text(`Rs. ${((plan.totalCost || 0) - (plan.amountPaid || 0)).toFixed(2)}`, boxX + boxWidth - 5, finY, { align: 'right' });
    
    currentY += 35;
    
    // --- NEXT STEPS ---
    currentY = addSection('Next Steps / Instructions:', plan.next_steps || 'No specific instructions provided.', currentY);
    
    // --- FOOTER ---
    if (currentY > pageHeight - 30) {
        doc.addPage();
        currentY = pageHeight - 30;
    } else {
        currentY = pageHeight - 25;
    }
    
    doc.setDrawColor(200);
    doc.line(margin, currentY, margin + 60, currentY);
    currentY += 5;
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text('Doctor Signature', margin, currentY);
    
    // Save
    const filename = `TreatmentPlan_${plan.patientName?.replace(/\s+/g, '_') || 'Patient'}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
};