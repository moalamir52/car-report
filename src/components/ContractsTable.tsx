import React from 'react';
import { th, td, buttonStyle, yellow, yellowDark, purple, purpleDark } from '../styles.ts';
import { formatToDDMMYYYY, isDailyContract } from '../utils/dateUtils.ts';

// Define a more specific type for a contract row
interface ContractRow {
  [key: string]: any; // Allow any string keys
  'Contract No.': string;
  'Booking Number'?: string;
  'Customer': string;
  'Pick-up Date': string;
  'Drop-off Date': string;
}

interface ContractsTableProps {
  data: ContractRow[];
  columns: { label: string; key: string }[];
  selectedColumns: string[];
  toggleColumn: (key: string) => void;
  handleCopyAllTable: () => void;
  handleCopyInvygoOnly: () => void;
  handleCopyNonInvygoOnly: () => void;
  handleCopyMonthlyOnly: () => void;
  setSelectedContract: (contract: ContractRow) => void;
  setShowModal: (show: boolean) => void;
  copiedContractNo: string | null;
  setCopiedContractNo: (contractNo: string | null) => void;
  setCopyToast: (message: string) => void;
  tableRef: React.RefObject<HTMLDivElement>;
}

export function ContractsTable({
  data,
  columns,
  selectedColumns,
  toggleColumn,
  handleCopyAllTable,
  handleCopyInvygoOnly,
  handleCopyNonInvygoOnly,
  setSelectedContract,
  setShowModal,
  copiedContractNo,
  setCopiedContractNo,
  setCopyToast,
  tableRef,
}: ContractsTableProps) {

  const renderCellContent = (item: ContractRow, colKey: string, index: number) => {
    if (colKey === 'index') {
      return index + 1;
    }

    if (colKey === 'Pick-up Date' || colKey === 'Drop-off Date') {
      return formatToDDMMYYYY(item[colKey]);
    }

    if (colKey === 'Booking Number') {
        const bookingNumber = item[colKey];
        if (bookingNumber && String(bookingNumber).trim().toLowerCase().startsWith('c')) {
            return 'Leasing';
        }
        if (bookingNumber === undefined || bookingNumber === null || String(bookingNumber).trim() === '') {
            return item['Drop-off Date']
                ? (isDailyContract(item['Pick-up Date'], item['Drop-off Date']) ? 'Daily' : 'Monthly')
                : 'Open';
        }
        return bookingNumber;
    }

    return item[colKey];
  };

  const getCellStyle = (item: ContractRow, colKey: string) => {
    const baseStyle = { ...td };
    if (colKey === 'Contract No.') {
      baseStyle.cursor = 'pointer';
      baseStyle.textDecoration = 'underline';
      baseStyle.color = copiedContractNo === item['Contract No.'] ? '#388e3c' : '#1976d2';
      baseStyle.background = copiedContractNo === item['Contract No.'] ? '#c8e6c9' : 'inherit';
    } else if (colKey === 'Customer') {
      baseStyle.cursor = 'pointer';
      baseStyle.textDecoration = 'underline';
      baseStyle.color = '#1976d2';
    }
    return baseStyle;
  };

  const handleCellClick = (item: ContractRow, colKey: string) => {
    if (colKey === 'Contract No.' && item['Contract No.']) {
      navigator.clipboard.writeText(item['Contract No.'].toString());
      setCopiedContractNo(item['Contract No.']);
      setCopyToast('Contract Number Copied!');
      setTimeout(() => setCopyToast(''), 1200);
    } else if (colKey === 'Customer') {
      setSelectedContract(item);
      setShowModal(true);
    }
  };

  return (
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
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    ...th,
                    cursor: col.key ? 'pointer' : 'default',
                    background: col.key && selectedColumns.includes(col.key) ? yellowDark : yellow,
                    borderBottom: col.key && selectedColumns.includes(col.key) ? `4px solid ${purpleDark}` : th.border
                  }}
                  onClick={() => col.key && toggleColumn(col.key)}
                  title={col.key ? 'Click to select/deselect column' : ''}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr key={index}>
                {columns.map((col) => (
                  <td 
                    key={col.key} 
                    style={getCellStyle(item, col.key)}
                    onClick={() => handleCellClick(item, col.key)}
                    title={col.key === 'Contract No.' ? 'Click to copy contract number' : col.key === 'Customer' ? 'Show contract details' : ''}
                  >
                    {renderCellContent(item, col.key, index)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{fontSize:12, color:purpleDark, marginTop:4}}>
          {selectedColumns.length > 0 && "Press Ctrl+C to copy selected columns"}
        </div>
      </div>
    </div>
  );
}