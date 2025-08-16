import React, { useState, useEffect, useRef, useMemo } from 'react';
import { utils, writeFile } from 'xlsx';
import { formatToDDMMYYYY, isDailyContract, toDateOnlyString } from './utils/dateUtils.ts';
import { buttonStyle, buttonActive, yellow, purpleDark, yellowDark } from './styles.ts';
import { useContractsData } from './hooks/useContractsData.ts';
import { useContractCheck } from './hooks/useContractCheck.ts';
import { Controls } from './components/Controls.tsx';
import { SearchBar } from './components/SearchBar.tsx';
import { ContractsTable } from './components/ContractsTable.tsx';
import { ContractDetailsModal } from './components/ContractDetailsModal.tsx';
import { ContractCheckResults } from './components/ContractCheckResults.tsx';
import { getContractId } from './utils/contractUtils.ts';

const columns = [
  { label: '#', key: 'index' },
  { label: 'Contract No.', key: 'Contract No.' },
  { label: 'Booking Number', key: 'Booking Number' },
  { label: 'Customer', key: 'Customer' },
  { label: 'Pick-up Branch', key: 'Pick-up Branch' },
  { label: 'Plate No.', key: 'Plate No.' },
  { label: 'Model', key: 'Model' },
  { label: 'Pick-up Date', key: 'Pick-up Date' },
  { label: 'Phone Number', key: 'Phone Number' },
  { label: 'Drop-off Date', key: 'Drop-off Date' }
];

const searchColumns = [
  ...columns,
  { label: 'Status', key: 'DisplayStatus' },
];

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

export default function ContractsReport({ onBack }) {
  const {
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    fileData,
    error,
    handleFileChange,
    handleInvygoUpload,
    openedContracts,
    closedContracts,
    handleReset: resetData,
  } = useContractsData();

  const { contractCheckResults, checkingContracts, checkFilter, setCheckFilter, runContractCheck, resetContractCheck } = useContractCheck(fileData);

  const [activeTab, setActiveTab] = useState('opened');
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [search, setSearch] = useState('');
  const [searchColumn, setSearchColumn] = useState('All');
  const [selectedContract, setSelectedContract] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [copyToast, setCopyToast] = useState('');
  const [copiedContractNo, setCopiedContractNo] = useState(null);
  const tableRef = useRef(null);

  const handleFullReset = () => {
    resetData();
    resetContractCheck();
  };

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
  };

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
          if (!val) {
            if (row['Drop-off Date'] && isDailyContract(row['Pick-up Date'], row['Drop-off Date'])) {
              return 'Daily';
            }
            return 'Monthly';
          }
          return val;
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

  function isInvygo(val) {
    if (!val) return false;
    const str = String(val).trim();
    return /^Vrd{1,6}$/.test(str);
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
          if (!val) {
            if (row['Drop-off Date'] && isDailyContract(row['Pick-up Date'], row['Drop-off Date'])) {
              return 'Daily';
            }
            return 'Monthly';
          }
          return val;
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
    const filtered = data.filter(row => {
      const booking = row['Booking Number'];
      if (isInvygo(booking)) return false;
      const val = booking ? booking.toString().trim().toLowerCase() : '';
      if (val === 'leasing' || val === 'monthly' || val === 'daily') return false;
      return true;
    });
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
          if (!val) {
            if (row['Drop-off Date'] && isDailyContract(row['Pick-up Date'], row['Drop-off Date'])) {
              return 'Daily';
            }
            return 'Monthly';
          }
          return val;
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

  useEffect(() => {
    const table = tableRef.current;
    if (!table) return;

    const handleKeyDown = (e) => {
      if ((e.ctrlKey && (e.key === 'c' || e.key === 'C' || e.key === 'ج')) || (e.ctrlKey && e.code === 'KeyC') || (e.ctrlKey && e.key === 'Insert')) {
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

  const handleCopyDetails = () => {
    if (!selectedContract) return;
    const detailsToCopy = Object.entries(selectedContract)
      .filter(([key, value]) => value !== undefined && value !== null && value.toString().trim() !== '' && !['status', 'Updated By', 'Type', '_sortDate', 'DisplayStatus'].includes(key.trim()))
      .map(([key, value]) => {
        let displayValue = value.toString();
        if ((key === 'Pick-up Date' || key === 'Drop-off Date') && value) {
          displayValue = formatToDDMMYYYY(value);
        }
        return `${key}: ${displayValue}`;
      })
      .join('\n');
    navigator.clipboard.writeText(detailsToCopy);
    setCopyToast('Details Copied!');
    setTimeout(() => setCopyToast(''), 1500);
  };

  const searchedData = useMemo(() => {
    if (!search.trim()) return [];
    const s = search.trim().toLowerCase();

    return fileData
      .filter(row => {
        if (searchColumn === 'All') {
          return Object.values(row).some(v => v && v.toString().toLowerCase().includes(s));
        } else {
          const cellValue = row[searchColumn];
          return cellValue && cellValue.toString().toLowerCase().includes(s);
        }
      })
      .map(row => {
        const status = (row['Status'] || '').toLowerCase();
        let displayStatus = '-';
        if (status.includes('open')) {
          displayStatus = 'Opened';
        } else if (status.includes('close') || status.includes('delivered')) {
          displayStatus = 'Closed';
        }
        return { ...row, DisplayStatus: displayStatus };
      });
  }, [search, searchColumn, fileData]);

  const handleExportAll = () => {
    const isSearching = search.trim() !== '';
    if (isSearching) {
      if (searchedData.length === 0) {
        alert("No search results to export.");
        return;
      }
      const ws = utils.json_to_sheet(searchedData);
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, 'Search Results');
      writeFile(wb, `Contracts_Search_Results.xlsx`);
      return;
    }

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

    const opened = openedContracts.slice().sort(sortMonthlyLast).map(row => ({ ...pickColumns(row), Type: 'Opened' }));
    const closed = closedContracts.slice().sort(sortMonthlyLast).map(row => ({ ...pickColumns(row), Type: 'Closed', 'Exported Date': row['Drop-off Date'] instanceof Date ? toDateOnlyString(row['Drop-off Date']) : row['Drop-off Date'] || '' }));

    const wsOpened = utils.json_to_sheet(opened);
    const wsClosed = utils.json_to_sheet(closed);

    const wb = utils.book_new();
    utils.book_append_sheet(wb, wsOpened, 'Opened Contracts');
    utils.book_append_sheet(wb, wsClosed, 'Closed Contracts');

    writeFile(wb, `Contracts_Report_${startDate}_to_${endDate}.xlsx`);
  };

  const isSearching = search.trim() !== '';
  const dataToRender = isSearching ? searchedData : (activeTab === 'opened' ? openedContracts : closedContracts);
  const columnsToRender = isSearching ? searchColumns : columns;

  return (
    <div style={{ padding: 24, fontFamily: 'Cairo, Arial, sans-serif', background: '#fffbe7', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
        <button
          onClick={onBack || (() => window.history.back())}
          style={{ ...buttonStyle, backgroundColor: yellow, color: purpleDark, border: `2.5px solid ${purpleDark}`, marginRight: 16 }}
          onMouseOver={e => e.currentTarget.style.backgroundColor = yellowDark}
          onMouseOut={e => e.currentTarget.style.backgroundColor = yellow}
        >
          ← Back
        </button>
        <div style={{ backgroundColor: yellow, color: purpleDark, border: `2.5px solid ${purpleDark}`, borderRadius: 16, padding: '12px 32px', fontWeight: 'bold', fontSize: '24px', marginLeft: 'auto', marginRight: 'auto', textAlign: 'center', boxShadow: '0 2px 12px #ffd60044' }}>
          🚗 Yelo Contracts Report
        </div>
      </div>

      <Controls 
        startDate={startDate} 
        setStartDate={setStartDate} 
        endDate={endDate} 
        setEndDate={setEndDate} 
        handleFileChange={handleFileChange} 
        handleInvygoUpload={handleInvygoUpload} 
        handleReset={handleFullReset}
        runContractCheck={runContractCheck} 
        checkingContracts={checkingContracts} 
      />

      {error && <p style={{ color: '#d32f2f', marginBottom: '16px', fontWeight: 'bold' }}>{error}</p>}

      <SearchBar 
        searchColumn={searchColumn} 
        setSearchColumn={setSearchColumn} 
        search={search} 
        setSearch={setSearch} 
        isSearching={isSearching} 
        handleExportAll={handleExportAll} 
        openedContracts={openedContracts} 
        closedContracts={closedContracts}
      />

      {isSearching ? (
        <div>
          <h3 style={{ color: purpleDark, borderBottom: `2px solid ${yellow}`, paddingBottom: '8px', marginBottom: '16px' }}>
            🔎 Search Results ({dataToRender.length})
          </h3>
          {dataToRender.length === 0 ? (
            <p style={{ fontSize: '15px', color: purpleDark }}>No results found for "{search}".</p>
          ) : (
            <ContractsTable data={dataToRender} columns={columnsToRender} selectedColumns={selectedColumns} toggleColumn={toggleColumn} handleCopyAllTable={handleCopyAllTable} handleCopyInvygoOnly={handleCopyInvygoOnly} handleCopyNonInvygoOnly={handleCopyNonInvygoOnly} setSelectedContract={setSelectedContract} setShowModal={setShowModal} copiedContractNo={copiedContractNo} setCopiedContractNo={setCopiedContractNo} setCopyToast={setCopyToast} tableRef={tableRef} />
          )}
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '18px', marginBottom: '24px' }}>
            <button onClick={() => setActiveTab('opened')} style={activeTab === 'opened' ? buttonActive : buttonStyle}>
              📂 Opened Contracts ({openedContracts.length})
            </button>
            <button onClick={() => setActiveTab('closed')} style={activeTab === 'closed' ? buttonActive : buttonStyle}>
              ✅ Closed Contracts ({closedContracts.length})
            </button>
          </div>
          <div>
            {dataToRender.length === 0 ? (
              <p style={{ fontSize: '15px', color: purpleDark }}>No contracts {activeTab} on this date.</p>
            ) : (
              <ContractsTable data={dataToRender} columns={columnsToRender} selectedColumns={selectedColumns} toggleColumn={toggleColumn} handleCopyAllTable={handleCopyAllTable} handleCopyInvygoOnly={handleCopyInvygoOnly} handleCopyNonInvygoOnly={handleCopyNonInvygoOnly} setSelectedContract={setSelectedContract} setShowModal={setShowModal} copiedContractNo={copiedContractNo} setCopiedContractNo={setCopiedContractNo} setCopyToast={setCopyToast} tableRef={tableRef} />
            )}
          </div>
        </>
      )}

      <ContractCheckResults 
        contractCheckResults={contractCheckResults} 
        fileData={fileData} 
        checkFilter={checkFilter} 
        setCheckFilter={setCheckFilter} 
        setCopiedContractNo={setCopiedContractNo} 
        setCopyToast={setCopyToast} 
        setSelectedContract={setSelectedContract} 
        setShowModal={setShowModal} 
        copiedContractNo={copiedContractNo} 
      />

      <ContractDetailsModal 
        showModal={showModal} 
        setShowModal={setShowModal} 
        selectedContract={selectedContract} 
        handleCopyDetails={handleCopyDetails} 
      />

      {copyToast && (
        <div style={{ position: 'fixed', top: 30, right: 30, background: '#6A1B9A', color: '#FFD600', padding: '12px 24px', borderRadius: 8, fontWeight: 'bold', fontSize: 16, zIndex: 9999, boxShadow: '0 2px 12px #6a1b9a33', transition: 'opacity 0.3s' }}>
          {copyToast}
        </div>
      )}
    </div>
  );
}