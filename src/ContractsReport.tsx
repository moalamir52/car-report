import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { utils, writeFile } from 'xlsx';

export default function ContractsReport({ onBack }) {
  // دالة تعيد تاريخ اليوم بصيغة yyyy-mm-dd
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  };

  const [startDate, setStartDate] = useState(getTodayDate());
  const [endDate, setEndDate] = useState(getTodayDate());
  const [fileData, setFileData] = useState([]);
  const [openedContracts, setOpenedContracts] = useState([]);
  const [closedContracts, setClosedContracts] = useState([]);
  const [error, setError] = useState(null);
  const [invygoFileName, setInvygoFileName] = useState('');
  const [activeTab, setActiveTab] = useState('opened');
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [dateOrder, setDateOrder] = useState('DMY'); // DMY = dd/mm/yyyy, MDY = mm/dd/yyyy
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedContract, setSelectedContract] = useState(null);
  const [showModal, setShowModal] = useState(false);


// ✅ Contract Check Logic
const [contractCheckResults, setContractCheckResults] = useState([]);
  const [checkingContracts, setCheckingContracts] = useState(false);
  const [checkFilter, setCheckFilter] = useState('');

  const normalize = (val) => (val || '').toString().trim().toLowerCase();

  const runContractCheck = async () => {
    if (!fileData || fileData.length === 0) {
      alert("📂 Upload EJAR File First");
      return;
    }
    setCheckingContracts(true);
    setContractCheckResults([]);

    try {
      const openListURL = "https://gsx2json.com/api?id=1XwBko5v8zOdTdv-By8HK_DvZnYT2T12mBw_SIbCfMkE&sheet=Open%20Contract";
      const invygoClosedURL = "https://gsx2json.com/api?id=1XwBko5v8zOdTdv-By8HK_DvZnYT2T12mBw_SIbCfMkE&sheet=Invygo%20Closed";
      const monthlyClosedURL = "https://gsx2json.com/api?id=1XwBko5v8zOdTdv-By8HK_DvZnYT2T12mBw_SIbCfMkE&sheet=Monthly%20Closed";

      const resOpen = await fetch(openListURL).then(r => r.json());
      const resInvygo = await fetch(invygoClosedURL).then(r => r.json());
      const resMonthly = await fetch(monthlyClosedURL).then(r => r.json());

      const openList = new Set((resOpen.rows || []).map(r => normalize(r['Contract No.'])));
      const invygoList = new Set((resInvygo.rows || []).map(r => normalize(r['Contract No.'] || r['Agreement'])));
      const monthlyList = new Set((resMonthly.rows || []).map(r => normalize(r['Contract No.'] || r['Agreement'])));

      const output = fileData.map(row => {
        const contract = normalize(row['Contract No.'] || row['Agreement']);
        const status = (row['Status'] || '').toLowerCase();
        if (!contract) return null;

        if (status.includes('close') || status.includes('delivered')) {
          // ✅ استبعاد العقود القديمة المغلقة (عدى عليها أكثر من 6 شهور ومش موجودة في شيتات الإغلاق)
const dropoffRaw = row['Drop-off Date'];
const parsedDropoff = parseDateEjarFile(dropoffRaw);
const sixMonthsAgo = new Date();
sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

if (
  parsedDropoff instanceof Date &&
  !isNaN(parsedDropoff) &&
  parsedDropoff < sixMonthsAgo &&
  !invygoList.has(contract) &&
  !monthlyList.has(contract)
) {
  return null; // 🧹 تجاهل العقد نهائيًا
}

          if (openList.has(contract)) return { contract, status: 'Closed', location: '⚠️ Already in Open', result: '❌ Error' };
          if (invygoList.has(contract)) return { contract, status: 'Closed', location: '✅ Invygo Closed', result: '✅ OK' };
          if (monthlyList.has(contract)) return { contract, status: 'Closed', location: '✅ Monthly Closed', result: '✅ OK' };
          return { contract, status: 'Closed', location: '❌ Not Found', result: '❌ Missing' };
        } else if (status.includes('open')) {
          if (openList.has(contract)) return { contract, status: 'Open', location: '✅ Open List', result: '✅ OK' };
          return { contract, status: 'Open', location: '❌ Not in Open', result: '❌ Missing' };
        }
        return { contract, status: '❓ Unknown', location: '❌', result: '⚠️ Unknown' };
      }).filter(Boolean);

      setContractCheckResults(output);
    } catch (err) {
      console.error("Error in contract check", err);
      alert("❌ حصل خطأ أثناء الفحص");
    } finally {
      setCheckingContracts(false);
    }
  };



  const tableRef = useRef(null);

  // دالة للملفات المرفوعة من إيجار فقط (ترجع كائن Date)
  const parseDateEjarFile = (value) => {
    if (!value) return null;
    try {
      const toEnglishDigits = (str) =>
        str.replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));

      if (typeof value === 'number') {
        const parsed = XLSX.SSF.parse_date_code(value);
        if (!parsed) return null;
        return new Date(parsed.y, parsed.m - 1, parsed.d);
      }
      if (typeof value === 'string') {
        let cleaned = value.trim();
        cleaned = cleaned.split(' ')[0];
        cleaned = cleaned.replaceAll("/", "-").replaceAll(".", "-");
        cleaned = toEnglishDigits(cleaned);

        if (!isNaN(cleaned) && cleaned !== '') {
          const num = parseFloat(cleaned);
          const parsed = XLSX.SSF.parse_date_code(num);
          if (parsed) return new Date(parsed.y, parsed.m - 1, parsed.d);
        }

        const parts = cleaned.split("-").map((v) => parseInt(v));
        if (parts.length === 3 && parts.every((v) => !isNaN(v))) {
          if (parts[0] > 1900) return new Date(parts[0], parts[1] - 1, parts[2]);
          if (parts[2] > 1900) {
            if (parts[0] > 12) return new Date(parts[2], parts[1] - 1, parts[0]);
            if (parts[1] > 12) return new Date(parts[2], parts[0] - 1, parts[1]);
            return new Date(parts[2], parts[1] - 1, parts[0]);
          }
        }
      }
    } catch (e) {
      console.warn("Invalid date format:", value);
    }
    return null;
  };

  // دالة pad
  const pad = (v) => v && v.toString().padStart(2, "0");

  const parseDateGoogleSheet = (value, row = {}, referenceDate = null) => {
    if (!value) return null;
    try {
      const toEnglishDigits = (str) =>
        str.replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));

      if (typeof value === 'number') {
        const parsed = XLSX.SSF.parse_date_code(value);
        if (parsed) return `${parsed.y}-${pad(parsed.m)}-${pad(parsed.d)}`;
      }

      if (typeof value === 'string') {
        let cleaned = value.trim().split(' ')[0].replaceAll("/", "-").replaceAll(".", "-");
        cleaned = toEnglishDigits(cleaned);

        if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;

        const parts = cleaned.split("-");
        if (parts.length !== 3) return null;

        let [a, b, c] = parts.map(x => parseInt(x, 10));
        if ([a, b, c].some(isNaN)) return null;

        const currentMonth = new Date().getMonth() + 1;
        let yyyy, mm, dd;

        // استخراج رقم الشهر من رقم العقد (مثل: 2506 => 06)
        const contract = row['Contract No.'] || row['Agreement'] || '';
        const contractMonthMatch = contract.match(/25(\d{2})/);
        const hintMonth = contractMonthMatch ? parseInt(contractMonthMatch[1]) : null;

        if (a <= 12 && b <= 12 && c > 1900) {
          if (hintMonth === a) {
            mm = a; dd = b;
          } else if (hintMonth === b) {
            mm = b; dd = a;
          } else if (a === currentMonth) {
            mm = a; dd = b;
          } else if (b === currentMonth) {
            mm = b; dd = a;
          } else {
            mm = a; dd = b; // افتراضي
          }

          yyyy = c;

          // ✳️ التحقق بناءً على التاريخ المرجعي (مثل Pick-up Date)
          if (referenceDate) {
            const parsed = new Date(`${yyyy}-${pad(mm)}-${pad(dd)}`);
            const ref = new Date(referenceDate);
            if (parsed < ref) {
              const test = new Date(`${yyyy}-${pad(dd)}-${pad(mm)}`);
              if (!isNaN(test) && test > ref) {
                [mm, dd] = [dd, mm];
              }
            }
          }
        } else if (a > 1900) {
          yyyy = a; mm = b; dd = c;
        } else if (c > 1900) {
          yyyy = c; mm = a; dd = b;
        } else {
          return null;
        }

        const testDate = new Date(yyyy, mm - 1, dd);
        if (isNaN(testDate)) return null;

        return `${yyyy}-${pad(mm)}-${pad(dd)}`;
      }
    } catch (e) {
      console.warn("Invalid date format in Google Sheet:", value);
    }
    return null;
  };

  const toDateOnlyString = (date) => {
    const offset = date.getTimezoneOffset();
    const adjusted = new Date(date.getTime() - offset * 60 * 1000);
    return adjusted.toISOString().slice(0, 10);
  };

  // تحليل البيانات مع دالة التاريخ المناسبة
  const isInRange = (dateStr) => {
    if (!dateStr || !startDate || !endDate) return false;
    return dateStr >= startDate && dateStr <= endDate;
  };

  const analyzeData = (data, parseDateFn) => {
    try {
      const opened = [];
      const closed = [];
      data.forEach((row) => {
        const pickupDate = parseDateFn(row['Pick-up Date'], row, 'Pick-up Date');
        const dropoffDate = parseDateFn(row['Drop-off Date'], row, 'Drop-off Date');

        const status = row['Status']?.toString();

        let pickupStr = typeof pickupDate === "string" ? pickupDate : (pickupDate instanceof Date && !isNaN(pickupDate) ? toDateOnlyString(pickupDate) : null);
        let dropoffStr = typeof dropoffDate === "string" ? dropoffDate : (dropoffDate instanceof Date && !isNaN(dropoffDate) ? toDateOnlyString(dropoffDate) : null);

        if (isInRange(pickupStr)) opened.push({ ...row, _sortDate: pickupStr });
        if (isInRange(dropoffStr) && status?.startsWith('Delivered')) closed.push({ ...row, _sortDate: dropoffStr });
      });

      // ترتيب من الأقدم للأحدث
      const sortByDateAsc = (a, b) => {
        if (!a._sortDate) return 1;
        if (!b._sortDate) return -1;
        return a._sortDate.localeCompare(b._sortDate);
      };
      // ترتيب من الأحدث للأقدم
      const sortByDateDesc = (a, b) => {
        if (!a._sortDate) return 1;
        if (!b._sortDate) return -1;
        return b._sortDate.localeCompare(a._sortDate);
      };

      setOpenedContracts(opened.sort(sortByDateDesc).map(r => {
        const { _sortDate, ...rest } = r;
        return rest;
      }));
      setClosedContracts(closed.sort(sortByDateAsc).map(r => {
        const { _sortDate, ...rest } = r;
        return rest;
      }));
      setError(null);
    } catch (err) {
      setError('❌ An error occurred while analyzing the data.');
    }
  };

  // لتتبع آخر دالة تحليل مستخدمة
  const lastParseDateFn = useRef(parseDateEjarFile);

  // حفظ واسترجاع البيانات من localStorage
  useEffect(() => {
    const saved = localStorage.getItem('contracts_file_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFileData(parsed);
        lastParseDateFn.current = parseDateEjarFile;
        analyzeData(parsed, parseDateEjarFile);
        setError(null);
        return;
      } catch {}
    }
    // لا تفعل أي شيء إذا لم يوجد ملف محفوظ
    setFileData([]);
    setOpenedContracts([]);
    setClosedContracts([]);
    setError(null);
  }, []);

  useEffect(() => {
    if (fileData.length > 0) {
      analyzeData(fileData, lastParseDateFn.current);
      // حفظ البيانات في localStorage عند كل تغيير
      localStorage.setItem('contracts_file_data', JSON.stringify(fileData));
    }
  }, [fileData, startDate, endDate]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      setFileData(json);
      lastParseDateFn.current = parseDateEjarFile;
      analyzeData(json, parseDateEjarFile);
      localStorage.setItem('contracts_file_data', JSON.stringify(json));
    } catch (err) {
      console.error('Error reading file:', err);
      setError('❌ Failed to read Excel file. Please check the format.');
    }
  };

  const COLUMN_MAP = {
    'Booking Number': 'Booking ID',
    'Customer': 'Customer Name',
    'Phone Number': 'Customer Phone Number'
  };

  const handleInvygoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setInvygoFileName(file.name);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const invygoData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      const updated = fileData.map((item) => {
        const match = invygoData.find((d) =>
          normalize(d['Agreement']) === normalize(item['Contract No.'])
        );
        if (match) {
          let merged = { ...item };
          Object.entries(COLUMN_MAP).forEach(([ejarKey, invygoKey]) => {
            if (match[invygoKey]) {
              merged[ejarKey] = match[invygoKey];
            }
          });
          return merged;
        }
        return item;
      });

      setFileData(updated);
      analyzeData(updated, lastParseDateFn.current);
      localStorage.setItem('contracts_file_data', JSON.stringify(updated));
    } catch (err) {
      console.error('Error processing INVYGO file:', err);
      setError('❌ Failed to process INVYGO file.');
    }
  };

  // نسخ الأعمدة المحددة
  const handleCopySelectedColumns = () => {
    const data = activeTab === 'opened' ? openedContracts : closedContracts;
    if (selectedColumns.length === 0) return;
    const rows = data.map(row =>
      selectedColumns.map(col => {
        if (col === 'Booking Number') {
          return row[col] || 'Monthly';
        }
        return row[col] ?? '';
      }).join('\t')
    );
    const text = rows.join('\n');
    navigator.clipboard.writeText(text);
    // setSelectedColumns([]); // تم التعليق حتى لا يتم إلغاء التحديد بعد النسخ
  };

  // 1. أضف دالة نسخ كل الجدول بدون رؤوس الأعمدة
  const handleCopyAllTable = () => {
    const data = activeTab === 'opened' ? openedContracts : closedContracts;
    if (data.length === 0) return;
    const copyOrder = [
      'Contract No.',
      'Booking Number',
      'Customer',
      'Pick-up Branch',
      'Plate No.',
      'Model',
      'Plate No.',
      'Model',
      'Pick-up Date',
      'Phone Number'
    ];

    const rows = data.map(row =>
      copyOrder.map(colKey => {
        if (colKey === 'Booking Number') {
          const val = row['Booking Number'];
          if (val && String(val).trim().toLowerCase().startsWith('c')) {
            return 'Leasing';
          }
          return val || 'Monthly';
        }
        if (colKey === 'Pick-up Date') {
          return formatToDDMMYYYY(row['Pick-up Date']);
        }
        return row[colKey] ?? '';
      }).join('\t')
    );
    const text = rows.join('\n');
    navigator.clipboard.writeText(text);
    setCopyToast('All table data copied!');
    setTimeout(() => setCopyToast(''), 1500);
  };

  // دالة تتحقق إذا كان Booking Number رقم فقط وأقل من 7 أرقام (Invygo)
  function isInvygo(val) {
    if (!val) return false;
    const str = String(val).trim();
    return /^\d{1,6}$/.test(str);
  }

  const handleCopyInvygoOnly = () => {
    const data = activeTab === 'opened' ? openedContracts : closedContracts;
    if (!data.length) return;
    const copyOrder = [
      'Contract No.',
      'Booking Number',
      'Customer',
      'Pick-up Branch',
      'Plate No.',
      'Model',
      'Plate No.',
      'Model',
      'Pick-up Date',
      'Phone Number'
    ];
    const filtered = data.filter(row => isInvygo(row['Booking Number']));
    if (!filtered.length) {
      setCopyToast('No Invygo rows to copy!');
      setTimeout(() => setCopyToast(''), 1500);
      return;
    }
    const rows = filtered.map(row =>
      copyOrder.map(colKey => {
        if (colKey === 'Booking Number') {
          const val = row['Booking Number'];
          if (val && String(val).trim().toLowerCase().startsWith('c')) {
            return 'Leasing';
          }
          return val || 'Monthly';
        }
        if (colKey === 'Pick-up Date') {
          return formatToDDMMYYYY(row['Pick-up Date']);
        }
        return row[colKey] ?? '';
      }).join('\t')
    );
    const text = rows.join('\n');
    navigator.clipboard.writeText(text);
    setCopyToast('Copied!');
    setTimeout(() => setCopyToast(''), 1500);
  };

  const handleCopyNonInvygoOnly = () => {
    const data = activeTab === 'opened' ? openedContracts : closedContracts;
    if (!data.length) return;
    const copyOrder = [
      'Contract No.',
      'Booking Number',
      'Customer',
      'Pick-up Branch',
      'Plate No.',
      'Model',
      'Plate No.',
      'Model',
      'Pick-up Date',
      'Phone Number'
    ];
    const filtered = data.filter(row => !isInvygo(row['Booking Number']));
    if (!filtered.length) {
      setCopyToast('No non-Invygo rows to copy!');
      setTimeout(() => setCopyToast(''), 1500);
      return;
    }
    const rows = filtered.map(row =>
      copyOrder.map(colKey => {
        if (colKey === 'Booking Number') {
          const val = row['Booking Number'];
          if (val && String(val).trim().toLowerCase().startsWith('c')) {
            return 'Leasing';
          }
          return val || 'Monthly';
        }
        if (colKey === 'Pick-up Date') {
          return formatToDDMMYYYY(row['Pick-up Date']);
        }
        return row[colKey] ?? '';
      }).join('\t')
    );
    const text = rows.join('\n');
    navigator.clipboard.writeText(text);
    setCopyToast('Copied!');
    setTimeout(() => setCopyToast(''), 1500);
  };

  // 2. أضف حالة توست (تنبيه مؤقت)
  const [copyToast, setCopyToast] = useState('');

  useEffect(() => {
    const table = tableRef.current;
    if (!table) return;

    const handleKeyDown = (e) => {
      if (
        (e.ctrlKey && (e.key === 'c' || e.key === 'C' || e.key === 'ج')) ||
        (e.ctrlKey && e.code === 'KeyC') ||
        (e.ctrlKey && e.key === 'Insert')
      ) {
        if (selectedColumns.length > 0) {
          e.preventDefault();
          handleCopySelectedColumns();
        }
      }
    };

    table.addEventListener('keydown', handleKeyDown);

    return () => {
      table.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedColumns, activeTab, openedContracts, closedContracts]);

  const toggleColumn = (key) => {
    setSelectedColumns((prev) => {
      if (prev.includes(key)) {
        return prev.filter((k) => k !== key);
      } else {
        return [...prev, key];
      }
    });
  };

  const columns = [
    { label: '#', key: 'index' },
    { label: 'Contract No.', key: 'Contract No.' },
    { label: 'Booking Number', key: 'Booking Number' },
    { label: 'Customer', key: 'Customer' },
    { label: 'Pick-up Branch', key: 'Pick-up Branch' },
    { label: 'Plate No.', key: 'Plate No.' },
    { label: 'Model', key: 'Model' },
    { label: 'Pick-up Date', key: 'Pick-up Date' },
    { label: 'Phone Number', key: 'Phone Number' }
  ];

  const yellow = '#FFD600';
  const yellowDark = '#FFC300';
  const purple = '#6A1B9A';
  const purpleDark = '#4A148C';
  const white = '#fff';

  const th = {
    padding: '12px',
    textAlign: 'center',
    border: `1px solid ${purple}`,
    backgroundColor: yellow,
    color: purple,
    fontWeight: 'bold',
    fontSize: '15px',
    letterSpacing: '0.5px'
  };

  const td = {
    padding: '10px',
    textAlign: 'center',
    border: `1px solid ${purple}`,
    color: purpleDark,
    fontSize: '14px'
  };

  const buttonStyle = {
    padding: '10px 22px',
    borderRadius: '8px',
    border: `2px solid ${purple}`,
    backgroundColor: yellow,
    color: purpleDark,
    fontWeight: 'bold',
    fontSize: '15px',
    boxShadow: '0 2px 8px #ffd60044',
    cursor: 'pointer',
    transition: 'all 0.2s'
  };

  const buttonActive = {
    ...buttonStyle,
    backgroundColor: purple,
    color: yellow,
    border: `2px solid ${yellow}`,
    boxShadow: '0 2px 12px #6a1b9a33'
  };

  const inputStyle = {
    padding: '10px',
    borderRadius: 8,
    border: `1.5px solid ${purple}`,
    fontSize: '14px',
    marginTop: '4px',
    marginBottom: '4px'
  };

  const handleReset = () => {
    setFileData([]);
    setOpenedContracts([]);
    setClosedContracts([]);
    setError(null);
    setInvygoFileName('');
    setSelectedColumns([]);
    setContractCheckResults([]);
    setCheckFilter('');
    localStorage.removeItem('contracts_file_data');
  };

  // دالة لتحويل yyyy-mm-dd إلى dd/mm/yyyy
  const formatToDDMMYYYY = (value) => {
    if (!value || typeof value !== 'string') return value;

    const [datePart, timePart] = value.split(' ');
    const sep = datePart.includes('/') ? '/' : datePart.includes('-') ? '-' : null;
    if (!sep) return value;

    const parts = datePart.split(sep);
    if (parts.length !== 3) return value;

    let [a, b, c] = parts;

    // a/b/c: افترض إنه mm/dd/yyyy وعايز نحوله لـ dd/mm/yyyy
    if (parseInt(a) > 12) {
      // ده فعلاً يوم
      return `${a}/${b}/${c}${timePart ? ' ' + timePart : ''}`;
    } else {
      // افترض إن a=month و b=day ← نعكسهم
      return `${a}/${b}/${c}${timePart ? ' ' + timePart : ''}`;
    }
  };

  const renderTable = (data) => (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <button
          style={{ ...buttonStyle, background: '#6A1B9A', color: '#FFD600', fontWeight: 'bold', fontSize: 15 }}
          onClick={handleCopyAllTable}
          disabled={data.length === 0}
        >
          📋 Copy All Table
        </button>
        <button
          style={{ ...buttonStyle, background: '#1976d2', color: '#fff', fontWeight: 'bold', fontSize: 15 }}
          onClick={handleCopyInvygoOnly}
          disabled={data.length === 0}
        >
          📋 Copy Invygo Only
        </button>
        <button
          style={{ ...buttonStyle, background: '#388e3c', color: '#fff', fontWeight: 'bold', fontSize: 15 }}
          onClick={handleCopyNonInvygoOnly}
          disabled={data.length === 0}
        >
          📋 Copy Non-Invygo Only
        </button>
      </div>
      <div
        ref={tableRef}
        tabIndex={0}
        style={{
          overflowX: 'auto',
          borderRadius: '12px',
          boxShadow: '0 0 10px #6a1b9a',
          outline: 'none'
        }}
        onClick={() => tableRef.current && tableRef.current.focus()}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', border: '2px solid black', borderRadius: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: '#ffd600', color: '#6a1b9a' }}>
              {columns.map((col, idx) => (
                <th
                  key={col.label}
                  style={{
                    ...th,
                    cursor: col.key ? 'pointer' : 'default',
                    background: col.key && selectedColumns.includes(col.key) ? yellowDark : yellow,
                    borderBottom: col.key && selectedColumns.includes(col.key) ? `4px solid ${purpleDark}` : th.border
                  }}
                  onClick={() => col.key && toggleColumn(col.key)}
                  title={col.key ? 'اضغط لتحديد/إلغاء تحديد العمود' : ''}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr key={index}>
                <td style={td}>{index + 1}</td>
                {/* عدل هنا: عند الضغط على رقم العقد يتم نسخه */}
                <td
                  style={{ ...td, cursor: 'pointer', color: '#1976d2', textDecoration: 'underline' }}
                  onClick={() => {
                    if (item['Contract No.']) {
                      navigator.clipboard.writeText(item['Contract No.'].toString());
                      setCopyToast('تم نسخ رقم العقد!');
                      setTimeout(() => setCopyToast(''), 1200);
                    }
                  }}
                  title="اضغط لنسخ رقم العقد"
                >
                  {item['Contract No.']}
                </td>
                <td style={td}>
                  {item['Booking Number'] && item['Booking Number'].toString().trim().toLowerCase().startsWith('c')
                    ? 'Leasing'
                    : (item['Booking Number'] || 'Monthly')}
                </td>
                <td style={td}>{item['Customer']}</td>
                <td style={td}>{item['Pick-up Branch']}</td>
                <td style={td}>{item['Plate No.']}</td>
                <td style={td}>{item['Model']}</td>
                <td style={td}>{formatToDDMMYYYY(item['Pick-up Date'])}</td>
                <td style={td}>{item['Phone Number']}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{fontSize:12, color:purpleDark, marginTop:4}}>
          {selectedColumns.length > 0 && "اضغط Ctrl+C لنسخ الأعمدة المحددة"}
        </div>
      </div>
      {/* توست النسخ */}
      {copyToast && (
        <div style={{
          position: 'fixed',
          top: 30,
          right: 30,
          background: '#6A1B9A',
          color: '#FFD600',
          padding: '12px 24px',
          borderRadius: 8,
          fontWeight: 'bold',
          fontSize: 16,
          zIndex: 9999,
          boxShadow: '0 2px 12px #6a1b9a33',
          transition: 'opacity 0.3s'
        }}>
          {copyToast}
        </div>
      )}
    </div>
  );

  const toggleDateOrder = () => {
    setDateOrder((prev) => (prev === 'DMY' ? 'MDY' : 'DMY'));
    if (fileData.length > 0) {
      analyzeData(fileData, parseDateGoogleSheet);
    }
  };

  const exportColumns = [
    'Contract No.',
    'Booking Number',
    'Customer',
    'Pick-up Branch',
    'Plate No.',
    'Model', 
    'Pick-up Date',
    'Phone Number'
  ];

  const handleExportAll = () => {
    const pickColumns = (row) => {
      const result = {};
      exportColumns.forEach(col => {
        if (col === 'Model') {
          result['Model ( Ejar )'] = row['Model'] ?? '';
        } else if (col === 'Booking Number') {
          result[col] = row[col] || 'Monthly';
        } else {
          result[col] = row[col] ?? '';
        }
      });
      return result;
    };

    const sortMonthlyLast = (a, b) => {
      const aIsMonthly = !a['Booking Number'];
      const bIsMonthly = !b['Booking Number'];
      if (aIsMonthly === bIsMonthly) return 0;
      return aIsMonthly ? 1 : -1;
    };

    const opened = openedContracts
      .slice()
      .sort(sortMonthlyLast)
      .map(row => ({
        ...pickColumns(row),
        Type: 'Opened'
      }));

    const closed = closedContracts
      .slice()
      .sort(sortMonthlyLast)
      .map(row => ({
        ...pickColumns(row),
        Type: 'Closed',
        'Exported Date':
          row['Drop-off Date'] instanceof Date
            ? toDateOnlyString(row['Drop-off Date'])
            : row['Drop-off Date'] || ''
      }));

    const wsOpened = utils.json_to_sheet(opened);
    const wsClosed = utils.json_to_sheet(closed);

    const wb = utils.book_new();
    utils.book_append_sheet(wb, wsOpened, 'Opened Contracts');
    utils.book_append_sheet(wb, wsClosed, 'Closed Contracts');

    writeFile(wb, `Contracts_Report_${startDate}_to_${endDate}.xlsx`);
  };

  const filterData = (data) => {
    if (!search.trim()) return data;
    const s = search.trim().toLowerCase();
    return data.filter(row =>
      Object.values(row).some(
        v => v && v.toString().toLowerCase().includes(s)
      )
    );
  };

  return (
    <div style={{ padding: 24, fontFamily: 'Cairo, Arial, sans-serif', background: '#fffbe7', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
        <button
          onClick={onBack || (() => window.history.back())}
          style={{
            ...buttonStyle,
            backgroundColor: yellow,
            color: purpleDark,
            border: `2.5px solid ${purple}`,
            marginRight: 16
          }}
          onMouseOver={e => e.currentTarget.style.backgroundColor = yellowDark}
          onMouseOut={e => e.currentTarget.style.backgroundColor = yellow}
        >
          ← Back
        </button>
        <div style={{
          backgroundColor: yellow,
          color: purpleDark,
          border: `2.5px solid ${purple}`,
          borderRadius: 16,
          padding: '12px 32px',
          fontWeight: 'bold',
          fontSize: '24px',
          marginLeft: 'auto',
          marginRight: 'auto',
          textAlign: 'center',
          boxShadow: '0 2px 12px #ffd60044'
        }}>
          🚗 Yelo Contracts Report
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '32px', marginBottom: 32 }}>
        <div>
          <label style={{ fontSize: '15px', fontWeight: '600', color: purpleDark }}>Start Date</label><br />
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle} required />
          <label style={{ fontSize: '15px', fontWeight: '600', color: purpleDark, marginLeft: 8 }}>End Date</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={inputStyle} required />
          {/* حذف زر تغيير ترتيب التاريخ */}
        </div>
        <div>
          <label style={{ fontSize: '15px', fontWeight: '600', color: purpleDark }}>Upload EJAR File</label><br />
          <input type="file" accept=".xlsx" onChange={handleFileChange} style={inputStyle} />
          {/* حذف زر + */}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '18px' }}>
  <div>
    <label style={{ fontSize: '15px', fontWeight: '600', color: purpleDark }}>Upload INVYGO File</label><br />
    <input type="file" accept=".xlsx,.csv" onChange={handleInvygoUpload} style={inputStyle} />
    {/* حذف زر + */}
  </div>

  <div>
    <label style={{ fontSize: '15px', fontWeight: '600', color: purpleDark }}></label><br />
    <button
      style={{ ...buttonStyle, marginTop: 8, marginLeft: 4, padding: '8px 16px', fontSize: '14px' }}
      onClick={handleReset}
    >
      🗑️ Reset
    </button>
  </div>

  <div>
    <label style={{ fontSize: '15px', fontWeight: '600', color: purpleDark }}></label><br />
    <button
      style={{ ...buttonStyle, marginTop: 8, marginLeft: 4, padding: '8px 16px', fontSize: '14px' }}
      onClick={runContractCheck}
      title="Check contracts status"
    >
      🕵️ Check Contracts
    </button>
  </div>
</div>

      </div>

      {error && <p style={{ color: '#d32f2f', marginBottom: '16px', fontWeight: 'bold' }}>{error}</p>}
      {loading && (
        <div style={{ color: purpleDark, fontWeight: 'bold', fontSize: 18, marginBottom: 16 }}>
          Loading data...
        </div>
      )}

      <div style={{ display: 'flex', gap: '18px', marginBottom: '24px' }}>
        <button
          onClick={() => setActiveTab('opened')}
          style={activeTab === 'opened' ? buttonActive : buttonStyle}
        >
          📂 Opened Contracts ({openedContracts.length})
        </button>
        <button
          onClick={() => setActiveTab('closed')}
          style={activeTab === 'closed' ? buttonActive : buttonStyle}
        >
          ✅ Closed Contracts ({closedContracts.length})
        </button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="🔍 Search ..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            ...inputStyle,
            width: 260,
            marginRight: 12,
            fontSize: 15,
            direction: ''
          }}
        />
        <button
          style={{ ...buttonStyle, background: '#4A148C', color: '#FFD600', fontWeight: 'bold', fontSize: 16 }}
          onClick={handleExportAll}
          disabled={openedContracts.length === 0 && closedContracts.length === 0}
        >
          ⬇️ Export All Results
        </button>
      </div>

      {activeTab === 'opened' && (
        <div>
          {filterData(openedContracts).length === 0 ? (
            <p style={{ fontSize: '15px', color: purpleDark }}>No contracts opened on this date.</p>
          ) : (
            renderTable(filterData(openedContracts))
          )}
        </div>
      )}

      {activeTab === 'closed' && (
        <div>
          {filterData(closedContracts).length === 0 ? (
            <p style={{ fontSize: '15px', color: purpleDark }}>No contracts closed on this date.</p>
          ) : (
            renderTable(filterData(closedContracts))
          )}
        </div>
      )}
{contractCheckResults.length > 0 && (
  <div style={{ marginTop: 40 }}>
    <h3 style={{ color: purpleDark }}>📋 Contract Check Results</h3>

    <input
      type="text"
      placeholder="🔍 Search results..."
      value={checkFilter}
      onChange={(e) => setCheckFilter(e.target.value)}
      style={{
        padding: '8px',
        width: '20%',
        marginBottom: '16px',
        fontSize: '14px',
        border: '1px solid #ccc',
        borderRadius: '4px',
      }}
    />

    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', marginTop: 12 }}>
      <thead>
        <tr style={{ background: yellow, color: purpleDark }}>
          <th style={th}>#</th>
          <th style={th}>Contract</th>
          <th style={th}>Status</th>
          <th style={th}>Location</th>
          <th style={th}>Result</th>
        </tr>
      </thead>
      <tbody>
        {contractCheckResults
  .filter((r) =>
    r.contract.toLowerCase().includes(checkFilter.toLowerCase()) ||
    r.status.toLowerCase().includes(checkFilter.toLowerCase()) ||
    r.location.toLowerCase().includes(checkFilter.toLowerCase()) ||
    r.result.toLowerCase().includes(checkFilter.toLowerCase())
  )
  .map((r, i) => (
  <tr
    key={i}
    style={{
      cursor: '',
      backgroundColor:
        r.result.trim() === '❌ Error' ? '#ffcdd2' :
        r.result.includes('❌') ? '#fbe9e7' :
        'white'
    }}
  >
    <td style={td}>{i + 1}</td>

    <td
      style={{ ...td, cursor: 'pointer', textDecoration: '' }}
      onClick={() => navigator.clipboard.writeText(r.contract)}
      title="Click to copy"
    >
      {r.contract}
    </td>

    <td
      style={{ ...td, cursor: 'pointer', textDecoration: 'underline' }}
      onClick={(e) => {
        e.stopPropagation(); // تمنع تأثير الضغط على الصف كله
        const fullData = fileData.find(f =>
          (f['Contract No.'] || f['Agreement'])?.toString().trim().toLowerCase() === r.contract
        );
        setSelectedContract({ ...r, ...fullData });
        setShowModal(true);
      }}
      title="عرض تفاصيل العقد"
    >
      {r.status}
    </td>

    <td style={td}>{r.location}</td>

    <td style={{ ...td, fontWeight: 'bold', color: r.result.includes('✅') ? 'green' : 'red' }}>
      {r.result}
    </td>
  </tr>

  ))}

      </tbody>
    </table>
  </div>
)}

{showModal && selectedContract && (
    <div
      onClick={() => setShowModal(false)}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100%',
        width: '100%',
        background: 'rgba(0,0,0,0.3)',
        zIndex: 9998
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          margin: '5% auto',
          background: '#fff',
          border: '2px solid #6A1B9A',
          borderRadius: '12px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          padding: '24px',
          zIndex: 9999,
          width: '80%',
          maxWidth: '600px'
        }}
      >
        <h3 style={{ color: '#6A1B9A', marginBottom: '16px' }}>📄 تفاصيل العقد</h3>
        <table style={{ width: '100%', marginBottom: '16px' }}>
          <tbody>
            {Object.entries(selectedContract)
              .filter(([key, value]) =>
                value !== undefined &&
                value !== null &&
                value.toString().trim() !== '' &&
                !['status', 'Updated By', 'Type'].includes(key.trim())
              )
              .map(([key, value]) => (
                <tr key={key}>
                  <td style={{ padding: '6px 10px', fontWeight: 'bold', color: '#6A1B9A', width: '35%' }}>{key}</td>
                  <td style={{ padding: '6px 10px' }}>{value.toString()}</td>
                </tr>
              ))}
          </tbody>
        </table>
        <button
          onClick={() => setShowModal(false)}
          style={{
            padding: '10px 20px',
            backgroundColor: '#6A1B9A',
            color: '#FFD600',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          إغلاق
        </button>
      </div>
    </div>
  )}

    </div>
  );
  
}
