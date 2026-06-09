"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Navbar } from "@/components/portal/navbar";
import { calculateWorkdays } from "@/lib/utils/workdays";
import { LEAVE_TYPE_LABELS } from "@/components/portal/status-badge";

interface UserOption {
  id: string;
  name: string;
  email: string;
  department?: string;
}

const LEAVE_TYPES = Object.entries(LEAVE_TYPE_LABELS);

export default function NewLeavePage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [leaveType, setLeaveType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [address, setAddress] = useState("");
  const [handoverPersonId, setHandoverPersonId] = useState("");
  const [description, setDescription] = useState("");
  const [users, setUsers] = useState<UserOption[]>([]);
  const [workdays, setWorkdays] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/users").then((r) => r.json()).then(setUsers).catch(console.error);
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      const s = new Date(startDate), e = new Date(endDate);
      setWorkdays(e >= s ? calculateWorkdays(s, e) : null);
    } else {
      setWorkdays(null);
    }
  }, [startDate, endDate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!leaveType || !startDate || !endDate) { setError("İzin türü, başlangıç ve bitiş tarihi zorunludur."); return; }
    if (workdays === 0) { setError("Seçilen tarihler arasında iş günü bulunmuyor."); return; }
    setLoading(true); setError("");
    const res = await fetch("/api/leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leaveType, startDate, endDate, address, handoverPersonId, description }),
    });
    setLoading(false);
    if (!res.ok) { const d = await res.json(); setError(d.error ?? "Bir hata oluştu."); }
    else router.push("/dashboard");
  }

  const user = session?.user as { name?: string | null; email?: string | null; role?: string } | undefined;

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-secondary)" }}>
      {user && <Navbar user={user} />}

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 fade-up">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm mb-4"
            style={{ color: "var(--text-secondary)" }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Geri
          </button>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Yeni İzin Talebi</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Talebiniz yöneticinize otomatik iletilecek
          </p>
        </div>

        <div className="card overflow-hidden">
          <form onSubmit={handleSubmit}>
            {/* İzin Türü */}
            <div className="p-5 sm:p-6" style={{ borderBottom: "1px solid var(--border)" }}>
              <h2 className="text-sm font-semibold uppercase tracking-wide mb-4" style={{ color: "var(--text-tertiary)" }}>
                İzin Türü
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {LEAVE_TYPES.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setLeaveType(value)}
                    className="p-3.5 rounded-xl border text-sm font-medium text-left transition-all"
                    style={{
                      background: leaveType === value ? "var(--primary)" : "var(--bg-secondary)",
                      borderColor: leaveType === value ? "var(--primary)" : "var(--border)",
                      color: leaveType === value ? "#fff" : "var(--text)",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tarihler */}
            <div className="p-5 sm:p-6" style={{ borderBottom: "1px solid var(--border)" }}>
              <h2 className="text-sm font-semibold uppercase tracking-wide mb-4" style={{ color: "var(--text-tertiary)" }}>
                Tarih Aralığı
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium" style={{ color: "var(--text)" }}>Başlangıç</label>
                  <input
                    type="date"
                    className="input-apple"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    min={today}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium" style={{ color: "var(--text)" }}>Bitiş</label>
                  <input
                    type="date"
                    className="input-apple"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate || today}
                    required
                  />
                </div>
              </div>

              {/* Canlı hesap */}
              {workdays !== null && (
                <div
                  className="flex items-center gap-3 mt-4 px-4 py-3 rounded-xl"
                  style={{
                    background: workdays > 0 ? "var(--primary-light)" : "var(--error-light)",
                    color: workdays > 0 ? "var(--primary)" : "var(--error)",
                  }}
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d={workdays > 0
                        ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        : "M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"} />
                  </svg>
                  <span className="text-sm font-medium">
                    {workdays > 0
                      ? `${workdays} iş günü (hafta sonu ve tatiller hariç)`
                      : "Seçilen tarihler arasında iş günü yok"}
                  </span>
                </div>
              )}
            </div>

            {/* Opsiyonel alanlar */}
            <div className="p-5 sm:p-6 space-y-4" style={{ borderBottom: "1px solid var(--border)" }}>
              <h2 className="text-sm font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--text-tertiary)" }}>
                Ek Bilgiler
              </h2>

              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: "var(--text)" }}>
                  Yerine Bakacak Kişi <span style={{ color: "var(--text-tertiary)" }}>(opsiyonel)</span>
                </label>
                <select
                  className="input-apple"
                  value={handoverPersonId}
                  onChange={(e) => setHandoverPersonId(e.target.value)}
                >
                  <option value="">Seçin...</option>
                  {users.filter((u) => u.email !== session?.user?.email).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}{u.department ? ` — ${u.department}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: "var(--text)" }}>
                  İzin Adresi / Acil İletişim <span style={{ color: "var(--text-tertiary)" }}>(opsiyonel)</span>
                </label>
                <input
                  type="text"
                  className="input-apple"
                  placeholder="Adres veya telefon..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: "var(--text)" }}>
                  Açıklama <span style={{ color: "var(--text-tertiary)" }}>(opsiyonel)</span>
                </label>
                <textarea
                  className="input-apple resize-none"
                  rows={3}
                  placeholder="Eklemek istediğiniz not..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 sm:p-6 space-y-3">
              {error && (
                <div
                  className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm"
                  style={{ background: "var(--error-light)", color: "var(--error)" }}
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              )}
              <div className="flex gap-3">
                <button type="button" onClick={() => router.back()} className="btn-secondary flex-1">
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={loading || !leaveType || workdays === 0}
                  className="btn-primary flex-1"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Gönderiliyor...
                    </span>
                  ) : "Talebi Gönder"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
