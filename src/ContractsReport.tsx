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
    fetchAllSheets();
    // eslint-disable-next-line
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
          (d['Agreement'] || '').toString().trim() === (item['Contract No.'] || '').toString().trim()
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

  // روابط Google Sheet
  const EJAR_JSON_URL = "https://gsx2json.com/api?id=1om1h9kRCm0fDMj6PCzZ1lXftr8q4Xq3HIWx-NxozIzw&sheet=Contracts";
  const INVYGO_JSON_URL = "https://gsx2json.com/api?id=1fBLbbEYsA6nkM-ghX4BKr-huFpjnJ_XAnvbBmrajV3Q&sheet=Bookings";

  // جلب بيانات الشيتين معًا
  const fetchAllSheets = async () => {
    setLoading(true);
    try {
      // Fetch Ejar
      const resEjar = await fetch(EJAR_JSON_URL);
      const dataEjar = await resEjar.json();
      const rowsEjar = dataEjar.rows || dataEjar.data || dataEjar || [];
      if (!Array.isArray(rowsEjar) || rowsEjar.length === 0) {
        setError("❌ No data found in Ejar sheet.");
        setLoading(false);
        return;
      }

      // Fetch Invygo
      const resInvygo = await fetch(INVYGO_JSON_URL);
      const dataInvygo = await resInvygo.json();
      const rowsInvygo = dataInvygo.rows || dataInvygo.data || dataInvygo || [];

      // Always try to merge Invygo data if available
      let mergedData = rowsEjar;
      if (Array.isArray(rowsInvygo) && rowsInvygo.length > 0) {
        mergedData = rowsEjar.map((item) => {
          const match = rowsInvygo.find((d) =>
            (d['Agreement'] || '').toString().trim() === (item['Contract No.'] || '').toString().trim()
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
      }

      setFileData(mergedData);
      lastParseDateFn.current = parseDateGoogleSheet;
      analyzeData(mergedData, parseDateGoogleSheet);
      setError(null);
      localStorage.setItem('contracts_file_data', JSON.stringify(mergedData));
    } catch (err) {
      setError("Kindly pick a date.✅");
    } finally {
      setLoading(false);
    }
  };

  // نسخ الأعمدة المحددة
  const handleCopySelectedColumns = () => {
    const data = activeTab === 'opened' ? openedContracts : closedContracts;
    if (selectedColumns.length === 0) return;
    const rows = data.map(row =>
      selectedColumns.map(col => row[col] ?? '').join('\t')
    );
    const text = rows.join('\n');
    navigator.clipboard.writeText(text);
    setSelectedColumns([]);
  };

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
    background: white,
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
      return `${b}/${a}/${c}${timePart ? ' ' + timePart : ''}`;
    }
  };

  const renderTable = (data) => (
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
              <td style={td}>{item['Contract No.']}</td>
              <td style={td}>{item['Booking Number'] || 'Monthly'}</td>
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
          <button
            style={{ ...buttonStyle, marginLeft: 8, padding: '6px 14px', fontSize: '13px' }}
            onClick={toggleDateOrder}
            title="Toggle day/month order"
          >
            {dateOrder === 'DMY' ? 'dd/mm/yyyy' : 'mm/dd/yyyy'}
          </button>
        </div>
        <div>
          <label style={{ fontSize: '15px', fontWeight: '600', color: purpleDark }}>Upload EJAR File</label><br />
          <input type="file" accept=".xlsx" onChange={handleFileChange} style={inputStyle} />
          <button
            style={{ ...buttonStyle, marginTop: 8, marginLeft: 4, padding: '6px 12px', fontSize: '13px' }}
            onClick={() => window.open('https://docs.google.com/spreadsheets/d/17wivu0_2Yu60ho5BJAOJHHXjT8_TKTtLmutT0tB0Or4/edit?gid=491169651#gid=491169651', '_blank')}
          >
            +
          </button>
        </div>
        <div>
          <label style={{ fontSize: '15px', fontWeight: '600', color: purpleDark }}>Upload INVYGO File</label><br />
          <input type="file" accept=".xlsx,.csv" onChange={handleInvygoUpload} style={inputStyle} />
          <button
            style={{ ...buttonStyle, marginTop: 8, marginLeft: 4, padding: '6px 12px', fontSize: '13px' }}
            onClick={() => window.open('https://docs.google.com/spreadsheets/d/1fBLbbEYsA6nkM-ghX4BKr-huFpjnJ_XAnvbBmrajV3Q/edit?gid=84385473#gid=84385473', '_blank')}
          >
           +
          </button>
        </div>
        <div>
          <label style={{ fontSize: '15px', fontWeight: '600', color: purpleDark }}></label><br />
          <button
            style={{ ...buttonStyle, marginTop: 8, marginLeft: 4, padding: '8px 16px', fontSize: '14px' }}
            onClick={fetchAllSheets}
            title="Refresh data from both Google Sheets"
          >
            🔄 Refresh
          </button>
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
          placeholder="🔍 بحث في النتائج..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            ...inputStyle,
            width: 260,
            marginRight: 12,
            fontSize: 15,
            direction: 'rtl'
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

      <div>
  <button
    style={{
      ...buttonStyle,
      marginTop: 8,
      marginLeft: 4,
      padding: '8px 16px',
      fontSize: '14px',
      background: '#6A1B9A',
      color: '#FFD600'
    }}
    onClick={async () => {
      try {
        await fetch('http://localhost:4000/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: fileData })
        });
        alert('✅ Data has been saved to the database');
      } catch {
        alert('❌ An error occurred while saving');
      }
    }}
  >
    💾 Save to Cloud
  </button>

  <button
    style={{
      ...buttonStyle,
      marginTop: 8,
      marginLeft: 4,
      padding: '8px 16px',
      fontSize: '14px',
      background: '#4A148C',
      color: '#FFD600'
    }}
    onClick={async () => {
      try {
        const res = await fetch('https://car-report-xu4v.onrender.com/');
        const data = await res.json();
        setFileData(data);
        alert('✅ Data has been loaded from the database');
      } catch {
        alert('❌ An error occurred while loading');
      }
    }}
  >
    ☁️ Load from Cloud
  </button>
</div>
    </div>
  );
}
