import jsPDF from "jspdf";
import "jspdf-autotable";

declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: { finalY: number };
  }
}

export const exportAttendancePDF = (
  className: string,
  date: string,
  students: { rollNumber: string; name: string; status: string }[]
) => {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text("Attendance Report", 14, 20);
  doc.setFontSize(11);
  doc.text(`Class: ${className}`, 14, 30);
  doc.text(`Date: ${date}`, 14, 37);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 44);

  doc.autoTable({
    startY: 52,
    head: [["#", "Roll No", "Student Name", "Status"]],
    body: students.map((s, i) => [i + 1, s.rollNumber || "—", s.name, s.status]),
    theme: "grid",
    headStyles: { fillColor: [59, 130, 246] },
  });

  const present = students.filter(s => s.status === "Present").length;
  const y = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(10);
  doc.text(`Total: ${students.length} | Present: ${present} | Absent: ${students.length - present} | Rate: ${students.length ? Math.round((present / students.length) * 100) : 0}%`, 14, y);

  doc.save(`attendance-${className}-${date}.pdf`);
};

export const exportFeeReceiptPDF = (fee: {
  studentName: string;
  title: string;
  amount: number;
  paidAmount: number;
  status: string;
  dueDate: string | null;
  paymentDate: string | null;
  receiptNumber: string | null;
}) => {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text("Fee Receipt", 14, 20);
  doc.setFontSize(11);

  if (fee.receiptNumber) doc.text(`Receipt #: ${fee.receiptNumber}`, 14, 30);
  doc.text(`Date: ${fee.paymentDate ? new Date(fee.paymentDate).toLocaleDateString() : new Date().toLocaleDateString()}`, 14, 37);

  doc.autoTable({
    startY: 47,
    head: [["Field", "Details"]],
    body: [
      ["Student", fee.studentName],
      ["Fee Title", fee.title],
      ["Amount", `₹${fee.amount}`],
      ["Paid", `₹${fee.paidAmount}`],
      ["Balance", `₹${fee.amount - fee.paidAmount}`],
      ["Status", fee.status.toUpperCase()],
      ["Due Date", fee.dueDate || "—"],
    ],
    theme: "grid",
    headStyles: { fillColor: [59, 130, 246] },
  });

  doc.save(`fee-receipt-${fee.receiptNumber || Date.now()}.pdf`);
};

export const exportSalarySlipPDF = (salary: {
  teacherName: string;
  month: string;
  year: number;
  baseSalary: number;
  bonus: number;
  deductions: number;
  netSalary: number;
  status: string;
  paidDate: string | null;
}) => {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text("Salary Slip", 14, 20);
  doc.setFontSize(11);
  doc.text(`Period: ${salary.month} ${salary.year}`, 14, 30);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 37);

  doc.autoTable({
    startY: 47,
    head: [["Field", "Details"]],
    body: [
      ["Teacher", salary.teacherName],
      ["Base Salary", `₹${salary.baseSalary}`],
      ["Bonus", `₹${salary.bonus}`],
      ["Deductions", `₹${salary.deductions}`],
      ["Net Salary", `₹${salary.netSalary}`],
      ["Status", salary.status.toUpperCase()],
      ["Paid Date", salary.paidDate ? new Date(salary.paidDate).toLocaleDateString() : "—"],
    ],
    theme: "grid",
    headStyles: { fillColor: [59, 130, 246] },
  });

  doc.save(`salary-slip-${salary.teacherName}-${salary.month}-${salary.year}.pdf`);
};
