import React from 'react';
import { th, td, yellow, purpleDark } from '../styles.ts';
import { formatToDDMMYYYY } from '../utils/dateUtils.ts';

export const ContractCheckResults = ({
  contractCheckResults,
  fileData,
  checkFilter,
  setCheckFilter,
  setCopiedContractNo,
  setCopyToast,
  setSelectedContract,
  setShowModal,
  copiedContractNo,
}) => {
  if (contractCheckResults.length === 0) return null;

  const filteredResults = contractCheckResults
    .filter(r => r.result !== '✅ OK')
    .filter((r) =>
      r.contract.toLowerCase().includes(checkFilter.toLowerCase()) ||
      r.status.toLowerCase().includes(checkFilter.toLowerCase()) ||
      r.location.toLowerCase().includes(checkFilter.toLowerCase()) ||
      r.result.toLowerCase().includes(checkFilter.toLowerCase())
    );

  return (
    <div style={{ marginTop: 40 }}>
      <h3 style={{ color: purpleDark }}>📋 Contract Check Results ({filteredResults.length})</h3>
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
            <th style={th}>Contract No.</th>
            <th style={th}>Booking Number</th>
            <th style={th}>Customer</th>
            <th style={th}>Pick-up Branch</th>
            <th style={th}>Plate No.</th>
            <th style={th}>Model</th>
            <th style={th}>Pick-up Date</th>
            <th style={th}>Phone Number</th>
            <th style={th}>Drop-off Date</th>
            <th style={th}>Expected Action Date</th>
          </tr>
        </thead>
        <tbody>
          {filteredResults.map((r, i) => {
            const fullData = fileData.find(f =>
              (f['Contract No.'] || f['Agreement'])?.toString().trim().toLowerCase() === r.contract
            ) || {};
            let expectedAction = '';
            if (r.result.trim() === '❌ Error') {
              expectedAction = 'Should be removed from Open Contract';
            } else if (r.status.toLowerCase().includes('close') && r.result.includes('Missing')) {
              if (fullData['Drop-off Date']) {
                expectedAction = `Should be closed on ${formatToDDMMYYYY(fullData['Drop-off Date'])}`;
              }
            } else if (r.status.toLowerCase().includes('open') && r.result.includes('Missing')) {
              if (fullData['Pick-up Date']) {
                expectedAction = `Should be opened on ${formatToDDMMYYYY(fullData['Pick-up Date'])}`;
              }
            }
            const rowToCopy = [
              r.contract,
              fullData['Booking Number'] ?? '',
              fullData['Customer'] ?? '',
              fullData['Pick-up Branch'] ?? '',
              fullData['Plate No.'] ?? '',
              fullData['Model'] ?? '',
              fullData['Plate No.'] ?? '',
              fullData['Model'] ?? '',
              formatToDDMMYYYY(fullData['Pick-up Date']) ?? '',
              fullData['Phone Number'] ?? ''
            ].join('\t');
            return (
              <tr
                key={i}
                style={{
                  backgroundColor:
                    r.result.trim() === '❌ Error' ? '#ffcdd2' :
                    r.result.includes('❌') ? '#fbe9e7' :
                    'white'
                }}
              >
                <td style={{ ...td, cursor: 'pointer', color: '#1976d2', textDecoration: 'underline' }}
                  onClick={() => {
                    navigator.clipboard.writeText(rowToCopy);
                    setCopiedContractNo(r.contract);
                    setCopyToast('Row copied!');
                    setTimeout(() => setCopyToast(''), 1200);
                  }}
                  title="Click to copy row"
                >
                  {i + 1}
                </td>
                <td style={{ ...td, cursor: 'pointer', color: copiedContractNo === r.contract ? '#388e3c' : '#1976d2', background: copiedContractNo === r.contract ? '#c8e6c9' : 'inherit' }}
                  onClick={() => {
                    navigator.clipboard.writeText(r.contract);
                    setCopiedContractNo(r.contract);
                  }}
                  title="Click to copy contract number"
                >
                  {r.contract}
                </td>
                <td style={td}>{fullData['Booking Number']}</td>
                <td style={td}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedContract({ ...r, ...fullData });
                    setShowModal(true);
                  }}
                  title="Show contract details"
                >
                  {fullData['Customer']}
                </td>
                <td style={td}>{fullData['Pick-up Branch']}</td>
                <td style={td}>{fullData['Plate No.']}</td>
                <td style={td}>{fullData['Model']}</td>
                <td style={td}>{formatToDDMMYYYY(fullData['Pick-up Date'])}</td>
                <td style={td}>{fullData['Phone Number']}</td>
                <td style={td}>{formatToDDMMYYYY(fullData['Drop-off Date'])}</td>
                <td style={{ ...td, fontWeight: 'bold', color: '#d32f2f' }}>{expectedAction}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
