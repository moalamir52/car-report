import { useState, useEffect } from "react";
import React from 'react';

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
const getBookingColor = (type) => {
  switch (type.toLowerCase()) {
    case "invygo": return "#0D47A1";       // blue
    case "monthly": return "#4A148C";      // purple
    case "daily": return "#EF6C00";        // orange
    case "leasing": return "#2E7D32";      // green
    default: return "#999";               // grey
  }
};

export default function DailyBookingReport() {
  const [data, setData] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [latestInvygoGroup, setLatestInvygoGroup] = useState(null);
  const [loadingInvygo, setLoadingInvygo] = useState(true);
const [selectedRow, setSelectedRow] = useState(null);
const [showModal, setShowModal] = useState(false);
const [rowSource, setRowSource] = useState(""); // 'booked' أو 'closed'
const [currentList, setCurrentList] = useState([]); // كل البيانات المفتوحة
const [currentIndex, setCurrentIndex] = useState(-1); // الفهرس الحالي
const [monthlyClosedGroup, setMonthlyClosedGroup] = useState(null);


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
        .map((r) => Object.fromEntries(r.map((c, i) => [headers[i]?.trim(), c?.trim()])));
      setData(parsed);
    } catch (error) {
      console.error("Error loading report:", error);
    }
  };

  fetchSheet();
  const fetchMonthlyClosed = async (gid) => {
    try {
      const response = await fetch(
        "https://docs.google.com/spreadsheets/d/1XwBko5v8zOdTdv-By8HK_DvZnYT2T12mBw_SIbCfMkE/export?format=csv&gid=375289726"
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
              grouped.push({ date: currentDate, contracts: [], source: "monthly" });


            } else if (currentDate && row.some(c => c.trim() !== "")) {
              grouped[grouped.length - 1].contracts.push(row);
            }
          }
          

      setMonthlyClosedGroup({
        ...grouped[grouped.length - 1],
        allGroups: grouped
      });
    } catch (err) {
      console.error("Failed to load Monthly Closed data:", err);
    }
  };

  fetchMonthlyClosed();
  // ✅ كود التنقل بالأسهم
  const handleKeyDown = (e) => {
    if (!showModal) return;

    if (e.key === "ArrowRight" && currentIndex < currentList.length - 1) {
      setCurrentIndex((prev) => {
        const nextIndex = prev + 1;
        setSelectedRow(currentList[nextIndex]);
        return nextIndex;
      });
    } else if (e.key === "ArrowLeft" && currentIndex > 0) {
      setCurrentIndex((prev) => {
        const prevIndex = prev - 1;
        setSelectedRow(currentList[prevIndex]);
        return prevIndex;
      });
    }
  };

  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}, [showModal, currentIndex, currentList]);


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
            grouped.push({ date: currentDate, contracts: [], source: "invygo" });

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

  // ✅ عرض عدد السيارات حسب الموديل بعد التجميع الصحيح
const unifiedModelName = (model: string): string => {
  const cleaned = model.trim().toLowerCase();

  if (
    cleaned === 'peugeot - 2008' ||
    cleaned === '2008 2025' ||
    cleaned === 'peugeot 2008 active'
  ) return 'Peugeot 2008';

  if (
    cleaned === 'mg5 1.5l cvt std' ||
    cleaned === 'mg5 1.5l at std' ||
    cleaned === '5 2025'
  ) return 'MG5 2025';

  if (cleaned === '5 2024' || cleaned === 'mg5 2024') return 'MG5 2024';
  if (cleaned === 'mg5 del 2024') return 'MG5 DEL';

  if (
    cleaned === 'tiggo 4 pro' ||
    cleaned === 'tiggo 4  2025' ||
    cleaned === 'tiggo 4 2025'
  ) return 'Tiggo 4';

  if (
    cleaned === 'emgrand 2024' ||
    cleaned === 'geely emgrand gs' ||
    cleaned === 'emgrand gk 2024'
  ) return 'Geely Emgrand';

  if (
    cleaned === 'attrage 2023' ||
    cleaned === 'mitsubishi attrage' ||
    cleaned === 'attrage - 2023'
  ) return 'Attrage 2023';

  if (cleaned === 'attrage 2022') return 'Attrage 2022';

  if (
    cleaned === 'pegas 2024' ||
    cleaned === 'kia pegas 2024' ||
    cleaned === 'kia - pegas' ||
    cleaned === 'kia pegas'
  ) return 'Pegas 2024';

  if (cleaned === 'kia pegas') return 'KIA Pegas';

  if (
    cleaned === 's4 2023' ||
    cleaned === 'jac-js4'
  ) return 'JAC S4';

  if (cleaned === 's3 2023') return 'S3 2023';
  if (cleaned === 'j7 2023') return 'J7 2023';

  return model.trim(); // كل الباقي يرجع كما هو
};


const countByModel = (rawData: any[]): Record<string, number> => {
  const modelCount: Record<string, number> = {};

  for (const row of rawData) {
    const model = String(row['Model'] || '').trim();

    if (!model || model.toLowerCase() === 'model') continue;

    const unified = unifiedModelName(model);
    modelCount[unified] = (modelCount[unified] || 0) + 1;
  }

  return modelCount;
};



  const allCarCount = (() => {
    const grouped = {};
    data.forEach((row) => {
      const booking = row["Booking Number"] || "";
      if (!booking || isNaN(Number(booking))) return;
      let model = unifiedModelName(row["Model"]);
      grouped[model] = (grouped[model] || 0) + 1;
    });
    return grouped;
  })();

  // دالة لعرض العقود المفتوحة حسب الفئة (Invygo, Monthly, Leasing, Daily)
  const handleOpenContractsClick = (category) => {
    let filtered = [];
    if (category === 'Invygo') {
      filtered = data.filter(row => /^\d+$/.test(String(row["Booking Number"] || "").trim()));
    } else if (category === 'Monthly') {
      filtered = data.filter(row => String(row["Booking Number"] ?? "").toLowerCase().includes("monthly"));
    } else if (category === 'Leasing') {
      filtered = data.filter(row => String(row["Booking Number"] || "").toLowerCase().trim() === "leasing");
    } else if (category === 'Daily') {
      filtered = data.filter(row => String(row["Booking Number"] || "").toLowerCase().trim() === "daily");
    }
    setCurrentList(filtered);
    setShowModal(true);
  };

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
  const allClosedGroups = [
  ...(latestInvygoGroup?.allGroups || []),
  ...(monthlyClosedGroup?.allGroups || [])
];

const selectedClosedGroups = allClosedGroups.filter(
  group => formatInvygoDate(group.date) === selectedDate
);

  const preferredOrder = [
    "Mitsubishi Attrage",
    "Geely Emgrand 2024",
    "MG 5 2024",
    "MG 5 2025",
    "Kia Pegas 2024",
    "Chery Tiggo 2025",
    "Peugeot 2008 2025",
    "Peugeot 208 2025",
    "Peugeot 408 2025/2026",
    "Chery Arrizo 5 2025",
    "Peugeot 2008 Active 2025"
  ];

  // رسالة النسخ
  const [copyMsg, setCopyMsg] = useState("");
  const showCopyMsg = (msg) => {
    setCopyMsg(msg);
    setTimeout(() => setCopyMsg(""), 1200);
  };
  // دالة نسخ نص
  const copyToClipboard = async (text, msg = "Copied!") => {
    try {
      await navigator.clipboard.writeText(text);
      showCopyMsg(msg);
    } catch {
      showCopyMsg("Copy failed");
    }
  };

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
              Total of Cars 📦( Invygo)
              
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
              {Object.entries(allCarCount)
                .sort(([modelA], [modelB]) => {
                  const idxA = preferredOrder.indexOf(modelA);
                  const idxB = preferredOrder.indexOf(modelB);
                  if (idxA === -1 && idxB === -1) return modelA.localeCompare(modelB);
                  if (idxA === -1) return 1;
                  if (idxB === -1) return -1;
                  return idxA - idxB;
                })
                .map(([model, count], idx) => (
                  <tr key={idx}>
                    <td style={td}>{model}</td>
                    <td style={{...td, cursor: 'pointer', color: '#0D47A1', fontWeight: 'bold'}} onClick={() => handleModelCountClick(model)}>{count}</td>
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
          {/* ✅ جدول الفئات Open Contracts */}
<div style={{
  background: white,
  padding: 16,
  border: `1.5px solid ${purple}`,
  borderRadius: 12,
  minWidth: "320px",
  maxWidth: 500,
  flex: "1 1 40%",
  boxShadow: '0 2px 12px #ffd60022',
  marginTop: 32
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
      Open Contracts 📋
    </div>
  </div>

  <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: 8 }}>
    <thead>
      <tr>
        <th style={th}>Category</th>
        <th style={th}>Total</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style={td}>Invygo Monthly</td>
        <td style={{...td, cursor: 'pointer', color: '#0D47A1', fontWeight: 'bold'}} onClick={() => handleOpenContractsClick('Invygo')}>
          {
            data.filter(row =>
              /^\d+$/.test(String(row["Booking Number"] || "").trim())
            ).length
          }
        </td>
      </tr>
      <tr>
        <td style={td}>Monthly Customers</td>
        <td style={{...td, cursor: 'pointer', color: '#4A148C', fontWeight: 'bold'}} onClick={() => handleOpenContractsClick('Monthly')}>
          {
            data.filter(row =>
              String(row["Booking Number"] ?? "").toLowerCase().includes("monthly")
            ).length
          }
        </td>
      </tr>
      <tr>
        <td style={td}>Leasing</td>
        <td style={{...td, cursor: 'pointer', color: '#2E7D32', fontWeight: 'bold'}} onClick={() => handleOpenContractsClick('Leasing')}>
          {
            data.filter(row =>
              String(row["Booking Number"] || "").toLowerCase().trim() === "leasing"
            ).length
          }
        </td>
      </tr>
      <tr>
        <td style={td}>Daily</td>
        <td style={{...td, cursor: 'pointer', color: '#EF6C00', fontWeight: 'bold'}} onClick={() => handleOpenContractsClick('Daily')}>
          {
            data.filter(row =>
              String(row["Booking Number"] || "").toLowerCase().trim() === "daily"
            ).length
          }
        </td>
      </tr>
      <tr>
        <td style={th}><strong>TOTAL Rented Business Bay</strong></td>
        <td style={th}>
          <strong>
            {
              data.filter(row =>
                Object.keys(row).length > 1 && row["Customer"] && row["Customer"]
              ).length
            }
          </strong>
        </td>
      </tr>
    </tbody>
  </table>
</div>

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
  {filteredByDate.map((row, idx) => {
    const bookingRaw = String(row["Booking Number"] || "").trim().toLowerCase();

    let type = "Unknown";
    if (/^\d+$/.test(bookingRaw)) {
      type = "Invygo";
    } else if (bookingRaw === "daily") {
      type = "Daily";
    } else if (bookingRaw === "leasing") {
      type = "Leasing";
    } else if (bookingRaw.includes("monthly")) {
      type = "Monthly";
    }

    const getBookingColor = (type) => {
      switch (type.toLowerCase()) {
        case "invygo": return "#0D47A1";
        case "monthly": return "#4A148C";
        case "daily": return "#EF6C00";
        case "leasing": return "#2E7D32";
        default: return "#999";
      }
    };

    const color = getBookingColor(type);

    return (
      <tr
        key={idx}
        onClick={() => {
          setSelectedRow(row);
          setCurrentList(filteredByDate);
          setCurrentIndex(idx);
          setRowSource("booked");
          setShowModal(true);
        }}
        style={{ cursor: "pointer", backgroundColor: "#f9f9f9" }}
      >
        <td style={{ ...td, textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', gap: '16px', alignItems: 'center', justifyContent: 'center' }}>
            <span>{row["Model"]}</span>
            <span style={{
              border: `1.5px solid ${color}`,
              color: color,
              padding: "2px 10px",
              borderRadius: "12px",
              fontSize: "12px",
              fontWeight: "bold",
              whiteSpace: "nowrap"
            }}>
              {type}
            </span>
          </div>
        </td>
        <td style={td}>{row["INVYGO"]}</td>
      </tr>
    );
  })}
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
  {selectedClosedGroups.length > 0 ? (
    selectedClosedGroups.map((group, gIdx) => {
      return group.contracts.map((row, idx) => {
        const bookingRaw = String(row[1] || '').trim().toLowerCase();

        let type = "Unknown";
        if (/^\d+$/.test(bookingRaw)) {
          type = "Invygo";
        } else if (bookingRaw === "daily") {
          type = "Daily";
        } else if (bookingRaw === "leasing") {
          type = "Leasing";
        } else if (bookingRaw.includes("monthly")) {
          type = "Monthly";
        }

        const bookingColor = getBookingColor(type);
        const model = row[5] || "";
        const plate = row[4] || "";

        const rowData = {};
        invygoClosedColumns.forEach((col, i) => {
          rowData[col] = row[i] || "";
        });

        return (
          <tr
            key={`row-${gIdx}-${idx}`}
            onClick={() => {
              setSelectedRow(rowData);
              setCurrentList(
                group.contracts.map(r => {
                  const obj = {};
                  invygoClosedColumns.forEach((col, i) => {
                    obj[col] = r[i] || "";
                  });
                  return obj;
                })
              );
              setCurrentIndex(idx);
              setRowSource("closed");
              setShowModal(true);
            }}
            style={{ cursor: "pointer", backgroundColor: "#fdfbe3" }}
          >
            <td style={td}>
              {model} <span style={{ border: `1px solid ${bookingColor}`, padding: "2px 6px", borderRadius: 8, marginLeft: 6, fontSize: "12px", fontWeight: "bold", color: bookingColor }}>{type}</span>
            </td>
            <td style={td}>{plate}</td>
          </tr>
        );
      });
    })
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
                    Date: {selectedClosedGroups.length > 0 ? selectedClosedGroups[0].date : selectedDate}
                  </th>
                </tr>
                <tr>
                  {invygoClosedColumns.map((col, idx) => (
                    <th key={idx} style={th}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selectedClosedGroups.length > 0 ? (
                  selectedClosedGroups.map((group, gIdx) => (
  <React.Fragment key={`group-${gIdx}`}>
    {group.contracts.length > 0 ? (
      group.contracts.map((row, idx) => (
        <tr key={`row-${gIdx}-${idx}`}>
          {invygoClosedColumns.map((_, i) => (
            <td key={`col-${i}`} style={td}>{row[i] || ""}</td>
          ))}
        </tr>
      ))
    ) : (
      <tr key={`empty-${gIdx}`}>
        {invygoClosedColumns.map((_, idx) => (
          <td key={`col-${idx}`} style={td}></td>
        ))}
      </tr>
    )}
  </React.Fragment>
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
{showModal && selectedRow && (
  <div
    onClick={() => setShowModal(false)}
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      backgroundColor: "rgba(0,0,0,0.5)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 9999
    }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        background: "#fffbea",
        padding: "24px",
        borderRadius: "16px",
        maxWidth: "600px",
        width: "90%",
        boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
        border: "2px solid #800080",
        fontFamily: "'Segoe UI', sans-serif",
        textAlign: "center" // يجعل النصوص في المنتصف
      }}
    >
      <button
        onClick={() => setShowModal(false)}
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          background: "transparent",
          border: "none",
          fontSize: 24,
          cursor: "pointer",
          color: "#800080"
        }}
      >
        ×
      </button>

      {/* العنوان الرئيسي */}
      <div style={{
  backgroundColor: "#800080",
  color: "#fff",
  fontWeight: "bold",
  fontSize: "18px",
  padding: "10px 24px",
  borderRadius: "30px",
  display: "inline-block",
  marginBottom: "24px",
  textAlign: "center"
}}>
  {rowSource === "closed" ? "📂 Closed Contract Details" : "📋 Booking Details"}
</div>


      {/* الجدول */}
      <table style={{
        width: "100%",
        borderCollapse: "collapse",
        border: "2px solid #800080"
      }}>
        <thead>
          <tr style={{ backgroundColor: "#FFD700" }}>
            <th style={{
              padding: "12px",
              border: "1px solid #800080",
              color: "#800080",
              fontWeight: "bold",
              textAlign: "center"
            }}>
              Category
            </th>
            <th style={{
              padding: "12px",
              border: "1px solid #800080",
              color: "#800080",
              fontWeight: "bold",
              textAlign: "center"
            }}>
              Details
            </th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(selectedRow)
            .filter(([_, value]) => value !== null && value !== undefined && value !== "")
            .map(([key, value], i) => (
              <tr key={i} style={{ backgroundColor: i % 2 === 0 ? "#ffffff" : "#fff7d1" }}>
                <td style={{
                  padding: "12px",
                  border: "1px solid #800080",
                  color: "#333",
                  fontWeight: "500",
                  textAlign: "center",
                  verticalAlign: "middle"
                }}>
                  {key}
                </td>
                <td style={{
                  padding: "12px",
                  border: "1px solid #800080",
                  color: "#222",
                  textAlign: "center",
                  verticalAlign: "middle"
                }}>
                  {value}
                </td>
              </tr>
            ))}
        </tbody>
        <tfoot>
          <tr style={{ backgroundColor: "#FFD700" }}>
            <td colSpan={2} style={{
              padding: "12px",
              textAlign: "center",
              fontWeight: "bold",
              color: "#800080",
              border: "1px solid #800080"
            }}>
              ✅ End of Booking Info
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
)}

      {showModal && currentList && (
        <div
          onClick={() => setShowModal(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "#fffbea",
              padding: "24px 12px 24px 12px",
              borderRadius: "16px",
              maxWidth: "1200px",
              width: "98vw",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
              border: "2px solid #800080",
              fontFamily: "'Segoe UI', sans-serif",
              textAlign: "center",
              position: "relative"
            }}
          >
            <button
              onClick={() => setShowModal(false)}
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                background: "transparent",
                border: "none",
                fontSize: 24,
                cursor: "pointer",
                color: "#800080"
              }}
            >
              ×
            </button>
            <div style={{
              backgroundColor: "#800080",
              color: "#fff",
              fontWeight: "bold",
              fontSize: "18px",
              padding: "10px 24px",
              borderRadius: "30px",
              display: "inline-block",
              marginBottom: "24px",
              textAlign: "center"
            }}>
              Open Contracts for this Model
            </div>
            <div style={{overflowX: 'auto', padding: '0 2px 0 2px', position: 'relative'}}>
              {copyMsg && (
                <div style={{
                  position: 'absolute',
                  top: 8,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: '#800080',
                  color: '#fff',
                  padding: '6px 18px',
                  borderRadius: 16,
                  fontWeight: 'bold',
                  fontSize: 15,
                  zIndex: 10000,
                  boxShadow: '0 2px 8px #80008044',
                  pointerEvents: 'none',
                  opacity: 0.95
                }}>{copyMsg}</div>
              )}
              {currentList.length > 0 ? (
                <table style={{ width: "100%", borderCollapse: "collapse", border: "2px solid #800080", fontSize: '13px', minWidth: '900px' }}>
                  <thead>
                    <tr style={{ backgroundColor: "#FFD700" }}>
                      <th style={{ padding: "8px", border: "1px solid #800080", color: "#800080", fontWeight: "bold", textAlign: "center", background: '#fffbe7', position: 'sticky', top: 0, cursor: 'pointer' }}
                        onClick={() => copyToClipboard(currentList.map((row, i) => Object.entries(row).filter(([key]) => key.toLowerCase() !== 'replacement').map(([_, value]) => value).join('\t')).join('\n'), 'All rows copied!')}
                      >#</th>
                      {Object.keys(currentList[0]).filter(key => key.toLowerCase() !== 'replacement').map((key, i) => (
                        <th key={i} style={{ padding: "8px", border: "1px solid #800080", color: "#800080", fontWeight: "bold", textAlign: "center", background: '#fffbe7', position: 'sticky', top: 0 }}>{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {currentList.map((row, i) => (
                      <tr key={i} style={{ backgroundColor: i % 2 === 0 ? "#ffffff" : "#fff7d1", borderBottom: '1px solid #e0e0e0' }}>
                        <td
                          style={{ padding: "8px 4px", border: "1px solid #e0e0e0", color: "#800080", textAlign: "center", verticalAlign: "middle", fontWeight: 'bold', cursor: 'pointer', background: '#f3eaff' }}
                          onClick={() => copyToClipboard(Object.entries(row).filter(([key]) => key.toLowerCase() !== 'replacement').map(([_, value]) => value).join('\t'), 'Row copied!')}
                          title="Copy whole row"
                        >{i + 1}</td>
                        {Object.entries(row).filter(([key]) => key.toLowerCase() !== 'replacement').map(([_, value], j) => (
                          <td
                            key={j}
                            style={{ padding: "8px 4px", border: "1px solid #e0e0e0", color: "#222", textAlign: "center", verticalAlign: "middle", whiteSpace: 'nowrap', cursor: 'pointer' }}
                            onClick={() => copyToClipboard(String(value))}
                            title="Copy cell"
                          >{value}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ color: "#800080", fontWeight: "bold", margin: "24px 0" }}>No open contracts for this model.</div>
              )}
            </div>
          </div>
        </div>
      )}


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
