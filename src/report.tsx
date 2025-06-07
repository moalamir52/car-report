import { useState, useEffect } from "react";

const yellow = '#FFD600';
const yellowDark = '#FFC300';
const purple = '#6A1B9A';
const purpleDark = '#4A148C';
const white = '#fff';

const th = {
  padding: '10px',
  textAlign: 'center',
  border: `1.5px solid ${purple}`,
  backgroundColor: yellow,
  color: purpleDark,
  fontWeight: 'bold',
  fontSize: '15px',
  letterSpacing: '0.5px'
};

const td = {
  padding: '8px',
  textAlign: 'center',
  border: `1px solid ${purple}`,
  background: white,
  color: purpleDark,
  fontSize: '14px'
};

export default function DailyBookingReport() {
  const [data, setData] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [latestInvygoGroup, setLatestInvygoGroup] = useState(null);
  const [loadingInvygo, setLoadingInvygo] = useState(true);

  useEffect(() => {
    const fetchSheet = async () => {
      try {
        const response = await fetch(
          "https://docs.google.com/spreadsheets/d/1XwBko5v8zOdTdv-By8HK_DvZnYT2T12mBw_SIbCfMkE/export?format=csv&gid=769459790"
        );
        const text = await response.text();
        const rows = text.split("\n").map((r) => r.split(","));
        const headers = rows.find((row) => row.some((c) => c.trim() !== ""));
        const values = rows.slice(rows.indexOf(headers) + 1);
        const parsed = values
          .filter((r) => r.length === headers.length && r.some((c) => c.trim() !== ""))
          .map((r) => Object.fromEntries(r.map((c, i) => [headers[i]?.trim(), c?.trim()])))
        setData(parsed);
      } catch (error) {
        console.error("Error loading report:", error);
      }
    };
    fetchSheet();
  }, []);

  useEffect(() => {
    const fetchInvygo = async () => {
      try {
        const response = await fetch(
          "https://docs.google.com/spreadsheets/d/1XwBko5v8zOdTdv-By8HK_DvZnYT2T12mBw_SIbCfMkE/export?format=csv&gid=1830448171"
        );
        const text = await response.text();
        const rows = text.split("\n").map((r) => r.split(","));
        const grouped = [];
        let currentDate = null;

        for (const row of rows) {
          const firstCell = row[0]?.trim();
          const isDate = /^\d{2}\/\d{2}\/\d{4}$/.test(firstCell);

          if (isDate) {
            currentDate = firstCell;
            grouped.push({ date: currentDate, contracts: [] });
          } else if (currentDate && row.some((c) => c.trim() !== "")) {
            grouped[grouped.length - 1].contracts.push(row);
          }
        }

        // حفظ كل المجموعات في latestInvygoGroup
        setLatestInvygoGroup({
          ...grouped[grouped.length - 1],
          allGroups: grouped
        });
      } catch (err) {
        console.error("Failed to load INVYGO Closed data:", err);
      } finally {
        setLoadingInvygo(false);
      }
    };

    fetchInvygo();
  }, []);

  const pad = (v) => (v ? v.toString().padStart(2, "0") : "00");

  const filteredByDate = data.filter((row) => {
    const rawDate = row["Pick-up Date"];
    if (!rawDate) return false;
    const cleaned = rawDate.split(" ")[0].replaceAll("/", "-");
    const parts = cleaned.split("-");
    let yyyy, mm, dd;
    if (parts[0]?.length === 4) {
      [yyyy, mm, dd] = parts;
    } else {
      [dd, mm, yyyy] = parts;
    }
    const normalized = `${yyyy}-${pad(mm)}-${pad(dd)}`;
    return normalized === selectedDate;
  });

  const normalizeModel = (model) => {
    if (!model) return "غير محدد";
    const m = model.toLowerCase().replace(/\s+/g, "");

    // Peugeot 2008 Active, 2008 2025, PEUGEOT - 2008
    if (
      m.includes("peugeot2008") ||
      m === "20082025" ||
      m === "peugeot-2008" ||
      m === "peugeot2008active"
    ) {
      return "Peugeot 2008";
    }

    // MG5 1.5L CVT STD, MG5 1.5L AT STD, MG5
    if (
      m.includes("mg51.5lcvtstd") ||
    m.includes("mg51.5latstd") ||
    m.includes("mg5") ||
    m === "52025" //
    ) {
      return "MG5 2025";
    }

    // 5 2024 تحت MG5 2024
    if (m === "52024") {
      return "MG5 2024";
    }

    // jac s4, jac js4, s4 2023, jac-js4
    if (
      m.includes("jacs4") ||
      m.includes("jacjs4") ||
      m === "s42023" ||
      m.includes("jac-js4")
    ) {
      return "JAC S4";
    }

    // tiggo 4 pro, tiggo 4 2025 (أي اختلاف في المسافات)
    if (m.includes("tiggo4pro") || m.includes("tiggo42025")) {
      return "Tiggo 4 2025";
    }

    // Pegas 2024, KIA Pegas
    if (
      m === "pegas2024" ||
      m === "kiapegas"
    ) {
      return "Pegas 2024";
    }

    // Attrage 2023, Mitsubishi Attrage
    if (
      m === "attrage2023" ||
      m === "mitsubishiattrage"
    ) {
      return "Attrage 2023";
    }

    // يمكنك إضافة قواعد أخرى هنا حسب الحاجة

    return model.trim();
  };

  const allCarCount = (() => {
    const grouped = {};
    data.forEach((row) => {
      const booking = row["Booking Number"] || "";
      if (!booking || isNaN(Number(booking))) return;
      let model = normalizeModel(row["Model"]);
      grouped[model] = (grouped[model] || 0) + 1;
    });
    return grouped;
  })();

  // الأعمدة المطلوبة بالترتيب الفعلي في ملفك
  const invygoClosedColumns = [
    "Contract No.",
    "Booking Number",
    "Customer",
    "Pick-up Branch",
    "Plate No.",
    "Model",
    "Plate No. 2",
    "Model 2",
    "Pick-up Date",
    "Contact"
  ];

  // معالجة بيانات INVYGO: كل مجموعة مع تاريخها
  const allInvygoGroups = (() => {
    if (!latestInvygoGroup || !latestInvygoGroup.allGroups) return [];
    return latestInvygoGroup.allGroups;
  })();

  const filteredInvygoClosed = (() => {
    if (!latestInvygoGroup) return [];
    // تحقق من تطابق التاريخ
    const group = latestInvygoGroup.date === selectedDate ? latestInvygoGroup : null;
    if (!group) return [];
    // توقع أن أول صف هو العناوين
    const [headers, ...rows] = group.contracts;
    // أنشئ بيانات الصفوف بحيث تتبع ترتيب الأعمدة المطلوبة
    return rows.map(row => {
      return invygoClosedColumns.map(col => {
        // ابحث عن العمود في رؤوس الأعمدة الأصلية
        const idx = headers.findIndex(h => h.trim().toLowerCase() === col.trim().toLowerCase());
        return idx !== -1 ? row[idx] : "";
      });
    });
  })();

  // دالة لتحويل dd/mm/yyyy إلى yyyy-mm-dd
  const formatInvygoDate = (dateStr) => {
    if (!dateStr) return "";
    const [dd, mm, yyyy] = dateStr.split("/");
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  };

  // تصفية المجموعات حسب التاريخ المختار
  const selectedInvygoGroups = allInvygoGroups.filter(
    group => formatInvygoDate(group.date) === selectedDate
  );

  return (

    <div style={{ padding: 24, fontFamily: "Cairo, Arial, sans-serif", background: "#fffbe7", minHeight: "100vh" }}>
      <div style={{
        backgroundColor: yellow,
        color: purpleDark,
        border: `2.5px solid ${purple}`,
        borderRadius: 16,
        padding: '12px 32px',
        fontWeight: 'bold',
        fontSize: '24px',
        margin: '0 auto 32px auto',
        textAlign: 'center',
        boxShadow: '0 2px 12px #ffd60044',
        maxWidth: 500
      }}>
        🚗 Rented Cars Report
d0c31bd (Add server.js with MongoDB integration)
      </div>

      <div style={{ marginBottom: 18, textAlign: "center" }}>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          style={{
            padding: '10px',
            borderRadius: 8,
            border: `1.5px solid ${purple}`,
            fontSize: '14px',
            marginTop: '4px',
            marginBottom: '4px'
          }}
        />
      </div>

      <div style={{
        display: "flex",
        gap: "32px",
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "flex-start",
        marginTop: 32
      }}>
        {/* العمود الأيسر: Total of Cars */}
        <div style={{
          background: white,
          padding: 16,
          border: `1.5px solid ${purple}`,
          borderRadius: 12,
          minWidth: "320px",
          maxWidth: 500,
          flex: "1 1 40%",
          boxShadow: '0 2px 12px #ffd60022'
        }}>
          {/* عنوان Total of Cars */}
          <div style={{
            display: "flex",
            justifyContent: "center"
          }}>
            <div style={{
              background: purple,
              color: yellow,
              fontWeight: "bold",
              fontSize: 17,
              borderRadius: 24,
              boxShadow: `0 2px 8px #ffd60044`,
              border: `1.5px solid ${purple}`,
              padding: "7px 22px",
              marginBottom: 8,
              marginTop: 4,
              display: "inline-block"
            }}>
              Total of Cars 📦
            </div>
          </div>
          <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: 8 }}>
            <thead>
              <tr>
                <th style={th}>Model</th>
                <th style={th}>Total Cars</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(allCarCount).map(([model, count], idx) => (
                <tr key={idx}>
                  <td style={td}>{model}</td>
                  <td style={td}>{count}</td>
                </tr>
              ))}
              <tr>
                <td style={th}><strong>TOTAL</strong></td>
                <td style={th}>
                  <strong>{Object.values(allCarCount).reduce((a, b) => a + b, 0)}</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* العمود الأيمن: Booked Cars فوق، تحته INVYGO Closed Contracts */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "32px",
          minWidth: "400px",
          flex: "1 1 40%",
          alignItems: "stretch"
        }}>
          {/* جدول Booked Cars */}
          <div style={{
            background: white,
            padding: 16,
            border: `1.5px solid ${purple}`,
            borderRadius: 12,
            boxShadow: '0 2px 12px #ffd60022'
          }}>
            {/* عنوان Booked Cars */}
            <div style={{
              display: "flex",
              justifyContent: "center"
            }}>
              <div style={{
                background:purple ,
                color: yellow,
                fontWeight: "bold",
                fontSize: 17,
                borderRadius: 24,
                boxShadow: `0 2px 8px #ffd60044`,
                border: `1.5px solid ${purple}`,
                padding: "7px 22px",
                marginBottom: 8,
                marginTop: 4,
                display: "inline-block"
              }}>
                Booked Cars 🚘 {selectedDate}
              </div>
            </div>
            <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: 8 }}>
              <thead>
                <tr>
                  <th style={th}>Model</th>
                  <th style={th}>Plate Number</th>
                </tr>
              </thead>
              <tbody>
                {filteredByDate.map((row, idx) => (
                  <tr key={idx}>
                    <td style={td}>{row["Model"]}</td>
                    <td style={td}>{row["INVYGO"]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* جدول INVYGO Closed Contracts */}
          <div style={{
            background: white,
            padding: 16,
            border: `1.5px solid ${purple}`,
            borderRadius: 12,
            boxShadow: '0 2px 12px #ffd60022'
          }}>
            {/* عنوان INVYGO Closed Contracts */}
            <div style={{
              display: "flex",
              justifyContent: "center"
            }}>
              <div style={{
                background: purple,
                color: yellow,
                fontWeight: "bold",
                fontSize: 17,
                borderRadius: 24,
                boxShadow: `0 2px 8px #ffd60044`,
                border: `1.5px solid ${purple}`,
                padding: "7px 22px",
                marginBottom: 8,
                marginTop: 4,
                display: "inline-block"
              }}>
                INVYGO Closed Contracts 📂
              </div>
            </div>
            <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: 8 }}>
              <thead>
                <tr>
                  <th style={th}>Model</th>
                  <th style={th}>Plate Number</th>
                </tr>
              </thead>
              <tbody>
                {selectedInvygoGroups.length > 0 && selectedInvygoGroups[0].contracts.length > 0 ? (
                  selectedInvygoGroups[0].contracts.map((row, idx) => (
                    <tr key={idx}>
                      <td style={td}>{row[5] || ""}</td>
                      <td style={td}>{row[4] || ""}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td style={td} colSpan={2}>No closed contracts for this date.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div style={{
        marginTop: 40,
        background: white,
        border: `1.5px solid ${purple}`,
        borderRadius: 12,
        boxShadow: '0 2px 12px #ffd60022',
        padding: 18
      }}>
        <div style={{ display: "flex", justifyContent: "center" }}>
  <div style={{
    background: purple,
    color: yellow,
    fontWeight: "bold",
    fontSize: 17,
    borderRadius: 24,
    boxShadow: `0 2px 8px #ffd60044`,
    border: `1.5px solid ${purple}`,
    padding: "7px 22px",
    marginBottom: 8,
    marginTop: 4,
    display: "inline-block"
  }}>
    INVYGO Closed Contracts 📂
  </div>
</div>

        {loadingInvygo ? (
          <p style={{ textAlign: "center", color: purpleDark }}>Loading INVYGO Closed contracts...</p>
        ) : (
          <div style={{ marginBottom: 30 }}>
            <table style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead>
                <tr>
                  <th
                    colSpan={invygoClosedColumns.length}
                    style={{
                      ...th,
                      background: yellow,
                      color: purpleDark,
                      fontWeight: 'bold',
                      fontSize: '17px',
                      borderTopLeftRadius: 12,
                      borderTopRightRadius: 12,
                      textAlign: 'center',
                      padding: "12px 0"
                    }}
                  >
                    Date: {selectedInvygoGroups.length > 0 ? selectedInvygoGroups[0].date : selectedDate}
                  </th>
                </tr>
                <tr>
                  {invygoClosedColumns.map((col, idx) => (
                    <th key={idx} style={th}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selectedInvygoGroups.length > 0 ? (
                  selectedInvygoGroups.map((group, gIdx) => (
                    <>
                      {group.contracts.length > 0 ? (
                        group.contracts.map((row, idx) => (
                          <tr key={`row-${gIdx}-${idx}`}>
                            {invygoClosedColumns.map((_, i) => (
                              <td key={i} style={td}>{row[i] || ""}</td>
                            ))}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          {invygoClosedColumns.map((_, idx) => (
                            <td key={idx} style={td}></td>
                          ))}
                        </tr>
                      )}
                    </>
                  ))
                ) : (
                  <tr>
                    <td colSpan={invygoClosedColumns.length} style={td}>No closed contracts found for this date.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ position: "absolute", top: 40, left: 20 }}>
        <a
          href="https://moalamir52.github.io/Yelo/#dashboard"
          style={{
            backgroundColor: yellow,
            color: purpleDark,
            padding: "10px 22px",
            textDecoration: "none",
            fontWeight: "bold",
            borderRadius: "8px",
            border: `2px solid ${purple}`,
            fontSize: '15px',
            boxShadow: '0 2px 12px #ffd60044',
            transition: 'all 0.2s'
          }}
          onMouseOver={e => (e.currentTarget.style.backgroundColor = yellowDark)}
          onMouseOut={e => (e.currentTarget.style.backgroundColor = yellow)}
        >
          ← Back to Dashboard
        </a>
      </div>
    </div>
  );
}
