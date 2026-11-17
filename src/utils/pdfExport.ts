import { jsPDF } from 'jspdf';
import type { Bill, LabReport, Patient, Prescription, PrescriptionItem } from '../types/hms.ts';

function addHospitalHeader(doc: jsPDF, title: string, docCode: string) {
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text('CITYSTONE MEDICAL CENTER', 14, 12);
  doc.setFontSize(9);
  doc.text('42 Residency Road, Bengaluru 560025  |  Tel: +91 80 4120 8800', 14, 18);
  doc.text('GSTIN: 29AABCC1234M1Z5  |  care@citystonemedical.org', 14, 23);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(14);
  doc.text(title, 14, 40);
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(`Document Ref: ${docCode}`, 140, 40);
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 44, 196, 44);
}

export function downloadPrescriptionPdf(rx: Prescription, patient?: Patient | null) {
  const doc = new jsPDF();
  addHospitalHeader(doc, 'DIGITAL PRESCRIPTION', rx.prescriptionCode);

  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`Patient: ${rx.patientName || patient?.fullName || 'Patient'} (${rx.patientCode || patient?.patientCode || '-'})`, 14, 52);
  doc.text(`Prescribing Physician: ${rx.doctorName || 'Consultant Doctor'}`, 14, 58);
  doc.text(`Date Issued: ${new Date(rx.createdAt).toLocaleDateString()}`, 140, 52);
  if (rx.followUpDate) {
    doc.text(`Follow-up: ${rx.followUpDate}`, 140, 58);
  }

  doc.setFontSize(11);
  doc.text(`Clinical Diagnosis: ${rx.diagnosis}`, 14, 68);
  doc.line(14, 72, 196, 72);

  let items: PrescriptionItem[] = [];
  try {
    items = JSON.parse(rx.itemsJson);
  } catch {
    items = [];
  }

  let y = 82;
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text('Medication', 14, y);
  doc.text('Dosage', 84, y);
  doc.text('Frequency', 115, y);
  doc.text('Duration', 165, y);
  y += 4;
  doc.line(14, y, 196, y);
  y += 7;

  doc.setTextColor(15, 23, 42);
  for (const item of items) {
    doc.text(item.medicineName, 14, y);
    doc.text(item.dosage, 84, y);
    doc.text(item.frequency, 115, y);
    doc.text(item.duration, 165, y);
    y += 5;
    if (item.instructions) {
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Note: ${item.instructions}`, 18, y);
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      y += 6;
    } else {
      y += 3;
    }
  }

  if (rx.recommendedLabTestsJson) {
    try {
      const tests: string[] = JSON.parse(rx.recommendedLabTestsJson);
      if (tests.length > 0) {
        y += 6;
        doc.setFontSize(10);
        doc.text(`Recommended Lab Tests: ${tests.join(', ')}`, 14, y);
      }
    } catch {
      // ignore
    }
  }

  if (rx.generalAdvice) {
    y += 10;
    doc.setFontSize(10);
    doc.text('Clinical Advice:', 14, y);
    y += 6;
    const split = doc.splitTextToSize(rx.generalAdvice, 180);
    doc.text(split, 14, y);
  }

  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Electronically signed via Citystone Medical Center HMS.', 14, 280);
  doc.save(`${rx.prescriptionCode}.pdf`);
}

export function downloadLabReportPdf(report: LabReport, patient?: Patient | null) {
  const doc = new jsPDF();
  addHospitalHeader(doc, 'DIAGNOSTIC LABORATORY REPORT', report.reportCode);

  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`Patient: ${report.patientName || patient?.fullName || 'Patient'} (${report.patientCode || patient?.patientCode || '-'})`, 14, 52);
  doc.text(`Investigation: ${report.testName || 'Diagnostic Test'} (${report.testCode || ''})`, 14, 58);
  doc.text(`Category: ${report.category || 'Pathology'}`, 14, 64);
  doc.text(`Status: ${report.processingStatus.toUpperCase()}`, 140, 52);
  doc.text(`Verified By: ${report.verifiedBy || 'Pending Verification'}`, 140, 58);
  doc.line(14, 70, 196, 70);

  let y = 80;
  if (report.resultValuesJson) {
    try {
      const vals: Array<{ parameter: string; value: string; range: string; flag: string }> =
        JSON.parse(report.resultValuesJson);
      doc.setTextColor(71, 85, 105);
      doc.text('Parameter', 14, y);
      doc.text('Observed Value', 85, y);
      doc.text('Reference Range', 130, y);
      doc.text('Flag', 180, y);
      y += 4;
      doc.line(14, y, 196, y);
      y += 7;
      doc.setTextColor(15, 23, 42);
      for (const row of vals) {
        doc.text(row.parameter, 14, y);
        doc.text(row.value, 85, y);
        doc.text(row.range, 130, y);
        doc.text(row.flag, 180, y);
        y += 7;
      }
    } catch {
      // ignore
    }
  }

  y += 6;
  doc.setFontSize(10);
  doc.text('Clinical Summary:', 14, y);
  y += 6;
  const summaryLines = doc.splitTextToSize(
    report.resultSummary || report.notes || 'Report under clinical processing.',
    180
  );
  doc.text(summaryLines, 14, y);

  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('NABL-Aligned Clinical Diagnostics Division · Citystone Medical Center', 14, 280);
  doc.save(`${report.reportCode}.pdf`);
}

export function downloadInvoicePdf(bill: Bill, patient?: Patient | null) {
  const doc = new jsPDF();
  addHospitalHeader(doc, 'TAX INVOICE & BILLING STATEMENT', bill.invoiceNumber);

  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`Billed To: ${bill.patientName || patient?.fullName || 'Patient'} (${bill.patientCode || patient?.patientCode || '-'})`, 14, 52);
  doc.text(`Invoice Date: ${new Date(bill.createdAt).toLocaleDateString()}`, 140, 52);
  doc.text(`Payment Status: ${bill.status.toUpperCase()}`, 140, 58);
  doc.line(14, 65, 196, 65);

  let items: Array<{ label: string; amount: number }> = [];
  try {
    items = JSON.parse(bill.lineItemsJson);
  } catch {
    items = [];
  }

  let y = 75;
  doc.setTextColor(71, 85, 105);
  doc.text('Service Description', 14, y);
  doc.text('Amount (INR)', 165, y);
  y += 4;
  doc.line(14, y, 196, y);
  y += 8;

  doc.setTextColor(15, 23, 42);
  for (const item of items) {
    doc.text(item.label, 14, y);
    doc.text(`Rs. ${item.amount.toLocaleString()}`, 165, y);
    y += 8;
  }

  y += 4;
  doc.line(110, y, 196, y);
  y += 8;
  doc.text('Subtotal:', 120, y);
  doc.text(`Rs. ${bill.subtotal.toLocaleString()}`, 165, y);
  y += 7;
  doc.text('Discount:', 120, y);
  doc.text(`- Rs. ${bill.discountAmount.toLocaleString()}`, 165, y);
  y += 7;
  doc.text(`GST (${bill.taxRatePercent}%):`, 120, y);
  doc.text(`Rs. ${bill.taxAmount.toLocaleString()}`, 165, y);
  y += 8;
  doc.setFontSize(11);
  doc.text('Total Payable:', 120, y);
  doc.text(`Rs. ${bill.totalAmount.toLocaleString()}`, 165, y);
  y += 7;
  doc.setFontSize(10);
  doc.text('Amount Paid:', 120, y);
  doc.text(`Rs. ${bill.paidAmount.toLocaleString()}`, 165, y);
  y += 7;
  doc.text('Balance Due:', 120, y);
  doc.text(`Rs. ${Math.max(0, bill.totalAmount - bill.paidAmount).toLocaleString()}`, 165, y);

  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Computer-generated hospital invoice. Card numbers & UPI PINs are never stored.', 14, 280);
  doc.save(`${bill.invoiceNumber}.pdf`);
}

export function exportToCsv(filename: string, rows: Array<Record<string, unknown>>) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csvLines = [
    headers.join(','),
    ...rows.map((r) =>
      headers
        .map((h) => {
          const val = String(r[h] ?? '').replace(/"/g, '""');
          return `"${val}"`;
        })
        .join(',')
    ),
  ];
  const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
