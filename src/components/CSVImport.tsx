import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Upload, FileSpreadsheet, Download, AlertTriangle, CheckCircle, X, Loader2, Eye
} from "lucide-react";

interface ParsedRow {
  name: string;
  email: string;
  phone?: string;
  class?: string;
  section?: string;
  roll_number?: string;
  guardian_name?: string;
  guardian_phone?: string;
  department?: string;
  qualification?: string;
}

interface CreatedUser {
  name: string;
  email: string;
  username: string;
  password: string;
  registration_id: string;
  role: string;
}

function generatePassword(length = 10): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
  let pw = "";
  for (let i = 0; i < length; i++) {
    pw += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pw;
}

function generateRegId(prefix: string, index: number): string {
  const year = new Date().getFullYear();
  return `${prefix}${year}${String(index).padStart(4, "0")}`;
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const rows: ParsedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map(v => v.trim());
    if (values.every(v => !v)) continue;

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = values[idx] || ""; });

    rows.push({
      name: row.name || row.full_name || row.student_name || row.teacher_name || "",
      email: row.email || "",
      phone: row.phone || row.mobile || "",
      class: row.class || row.class_name || "",
      section: row.section || "",
      roll_number: row.roll_number || row.roll || "",
      guardian_name: row.guardian_name || row.parent_name || "",
      guardian_phone: row.guardian_phone || row.parent_phone || "",
      department: row.department || row.subject || "",
      qualification: row.qualification || "",
    });
  }
  return rows;
}

interface CSVImportProps {
  type: "student" | "teacher";
  onComplete?: () => void;
}

const CSVImport = ({ type, onComplete }: CSVImportProps) => {
  const { profile } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [createdUsers, setCreatedUsers] = useState<CreatedUser[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [importComplete, setImportComplete] = useState(false);

  const prefix = type === "student" ? "STU" : "TCH";
  const sampleHeaders = type === "student"
    ? "name,email,phone,class,section,roll_number,guardian_name,guardian_phone"
    : "name,email,phone,department,qualification";
  const sampleRow = type === "student"
    ? "John Doe,john@example.com,9876543210,10th,A,101,Jane Doe,9876543211"
    : "Jane Smith,jane@example.com,9876543210,Mathematics,M.Sc";

  const handleFile = useCallback((file: File) => {
    setErrors([]);
    setCreatedUsers([]);
    setImportComplete(false);

    if (!file.name.endsWith(".csv")) {
      setErrors(["Please upload a CSV file."]);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseCSV(text);
      if (rows.length === 0) {
        setErrors(["No valid data found in CSV."]);
        return;
      }

      // Validate
      const errs: string[] = [];
      const emails = new Set<string>();
      rows.forEach((r, i) => {
        if (!r.name) errs.push(`Row ${i + 2}: Name is required`);
        if (!r.email) errs.push(`Row ${i + 2}: Email is required`);
        else if (emails.has(r.email.toLowerCase())) errs.push(`Row ${i + 2}: Duplicate email "${r.email}"`);
        else emails.add(r.email.toLowerCase());
      });

      if (errs.length > 0) {
        setErrors(errs.slice(0, 10));
        if (errs.length > 10) setErrors(prev => [...prev, `...and ${errs.length - 10} more errors`]);
      }

      setParsedRows(rows);
      setShowPreview(true);
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleImport = async () => {
    if (!profile?.institution_id || parsedRows.length === 0 || errors.length > 0) return;

    setImporting(true);
    const created: CreatedUser[] = [];
    const importErrors: string[] = [];

    // Get existing count for sequential IDs
    let startIndex = 1;
    if (type === "student") {
      const { count } = await supabase.from("students").select("id", { count: "exact", head: true }).eq("institution_id", profile.institution_id);
      startIndex = (count || 0) + 1;
    } else {
      const { count } = await supabase.from("teachers").select("id", { count: "exact", head: true }).eq("institution_id", profile.institution_id);
      startIndex = (count || 0) + 1;
    }

    // Get class map for students
    let classMap: Record<string, string> = {};
    if (type === "student") {
      const { data: classes } = await supabase
        .from("classes")
        .select("id, class_name, section")
        .eq("institution_id", profile.institution_id);
      classes?.forEach(c => {
        classMap[`${c.class_name}${c.section || ""}`.toLowerCase()] = c.id;
        classMap[c.class_name.toLowerCase()] = c.id;
      });
    }

    for (let i = 0; i < parsedRows.length; i++) {
      const row = parsedRows[i];
      const password = generatePassword();
      const regId = generateRegId(prefix, startIndex + i);

      try {
        const body: any = {
          full_name: row.name,
          email: row.email,
          password,
          role: type === "student" ? "STUDENT" : "TEACHER",
        };

        if (type === "student") {
          const classKey = `${row.class}${row.section || ""}`.toLowerCase();
          body.class_id = classMap[classKey] || classMap[row.class?.toLowerCase() || ""] || null;
          body.roll_number = row.roll_number || regId;
          body.guardian_name = row.guardian_name || null;
          body.guardian_phone = row.guardian_phone || null;
        } else {
          body.department = row.department || null;
          body.qualification = row.qualification || null;
        }

        const res = await supabase.functions.invoke("create-user", { body });

        if (res.error || !res.data?.success) {
          importErrors.push(`${row.name} (${row.email}): ${res.data?.message || "Failed"}`);
        } else {
          created.push({
            name: row.name,
            email: row.email,
            username: row.email,
            password,
            registration_id: regId,
            role: type === "student" ? "STUDENT" : "TEACHER",
          });
        }
      } catch (err: any) {
        importErrors.push(`${row.name}: ${err.message || "Unknown error"}`);
      }
    }

    setCreatedUsers(created);
    setErrors(importErrors);
    setImporting(false);
    setImportComplete(true);
    setShowPreview(false);
    onComplete?.();
  };

  const downloadSampleCSV = () => {
    const content = `${sampleHeaders}\n${sampleRow}`;
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sample_${type}s.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCredentials = () => {
    if (createdUsers.length === 0) return;
    const header = "Name,Registration ID,Username (Email),Password";
    const rows = createdUsers.map(u =>
      `${u.name},${u.registration_id},${u.username},${u.password}`
    );
    const content = [header, ...rows].join("\n");
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}_credentials.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setParsedRows([]);
    setErrors([]);
    setCreatedUsers([]);
    setImportComplete(false);
    setShowPreview(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="space-y-4">
      {/* Upload area */}
      {!showPreview && !importComplete && (
        <>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
            }`}
          >
            <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium">
              Drop your CSV file here or click to browse
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Only .csv files are accepted
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </div>

          <button
            onClick={downloadSampleCSV}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download Sample CSV
          </button>
        </>
      )}

      {/* Preview */}
      {showPreview && parsedRows.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Preview ({parsedRows.length} {type}s)
            </h3>
            <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-auto max-h-64">
            <table className="w-full text-xs">
              <thead className="bg-muted sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">#</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Email</th>
                  {type === "student" && (
                    <>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Class</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Section</th>
                    </>
                  )}
                  {type === "teacher" && (
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Department</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {parsedRows.map((r, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2">{r.name || "—"}</td>
                    <td className="px-3 py-2">{r.email || "—"}</td>
                    {type === "student" && (
                      <>
                        <td className="px-3 py-2">{r.class || "—"}</td>
                        <td className="px-3 py-2">{r.section || "—"}</td>
                      </>
                    )}
                    {type === "teacher" && (
                      <td className="px-3 py-2">{r.department || "—"}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleImport}
              disabled={importing || errors.length > 0}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-2"
            >
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
              {importing ? "Importing..." : `Import ${parsedRows.length} ${type}s`}
            </button>
            <button
              onClick={reset}
              className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 space-y-1">
          {errors.map((e, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-destructive">
              <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
              {e}
            </div>
          ))}
        </div>
      )}

      {/* Success / Download credentials */}
      {importComplete && createdUsers.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-primary bg-primary/10 border border-primary/20 rounded-xl p-3">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            Successfully created {createdUsers.length} {type} accounts!
          </div>

          <button
            onClick={downloadCredentials}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download Credentials CSV
          </button>

          <div className="bg-card border border-border rounded-xl overflow-auto max-h-64">
            <table className="w-full text-xs">
              <thead className="bg-muted sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Reg ID</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Username</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Password</th>
                </tr>
              </thead>
              <tbody>
                {createdUsers.map((u, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-3 py-2">{u.name}</td>
                    <td className="px-3 py-2 font-mono">{u.registration_id}</td>
                    <td className="px-3 py-2">{u.username}</td>
                    <td className="px-3 py-2 font-mono">{u.password}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={reset}
            className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors"
          >
            Import More
          </button>
        </div>
      )}
    </div>
  );
};

export default CSVImport;
