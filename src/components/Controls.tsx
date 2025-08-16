import React from 'react';
import { inputStyle, buttonStyle, purpleDark } from '../styles.ts';

export const Controls = ({
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  handleFileChange,
  handleInvygoUpload,
  handleReset,
  runContractCheck,
  checkingContracts,
}) => {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '32px', marginBottom: 32 }}>
      <div>
        <label style={{ fontSize: '15px', fontWeight: '600', color: purpleDark }}>Start Date</label><br />
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle} required />
        <label style={{ fontSize: '15px', fontWeight: '600', color: purpleDark, marginLeft: 8 }}>End Date</label>
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={inputStyle} required />
      </div>
      <div>
        <label style={{ fontSize: '15px', fontWeight: '600', color: purpleDark }}>Upload EJAR File</label><br />
        <input type="file" accept=".xlsx" onChange={handleFileChange} style={inputStyle} />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '18px' }}>
        <div>
          <label style={{ fontSize: '15px', fontWeight: '600', color: purpleDark }}>Upload INVYGO File</label><br />
          <input type="file" accept=".csv" onChange={handleInvygoUpload} style={inputStyle} />
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
            disabled={checkingContracts}
            title="Check contracts status"
          >
            {checkingContracts ? '🕵️ Checking...' : '🕵️ Check Contracts'}
          </button>
        </div>
      </div>
    </div>
  );
};