import React from 'react';
import { buttonStyle, purple, purpleDark, yellow, yellowDark, white } from '../styles.ts';
import { formatToDDMMYYYY } from '../utils/dateUtils.ts';

interface ContractDetailsModalProps {
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  selectedContract: any;
  handleCopyDetails: () => void;
}

export function ContractDetailsModal({
  showModal,
  setShowModal,
  selectedContract,
  handleCopyDetails,
}: ContractDetailsModalProps) {
  if (!showModal || !selectedContract) {
    return null;
  }

  return (
    <div
      onClick={() => setShowModal(false)}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100%',
        width: '100%',
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9998,
        backdropFilter: 'blur(3px)'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          background: '#fffbe7',
          border: `2.5px solid ${purple}`,
          borderRadius: '16px',
          boxShadow: '0 5px 25px rgba(0,0,0,0.25)',
          padding: '24px',
          zIndex: 9999,
          width: '90%',
          maxWidth: '650px',
          fontFamily: 'Cairo, Arial, sans-serif'
        }}
      >
        <div style={{
          backgroundColor: purple,
          color: yellow,
          fontWeight: 'bold',
          fontSize: '20px',
          padding: '10px 24px',
          borderRadius: '30px',
          display: 'inline-block',
          marginBottom: '24px',
          textAlign: 'center',
          position: 'relative',
          left: '50%',
          transform: 'translateX(-50%)'
        }}>
          📄 Contract Details
        </div>
        
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
          <tbody>
            {Object.entries(selectedContract)
              .filter(([key, value]) =>
                value !== undefined &&
                value !== null &&
                value.toString().trim() !== '' &&
                !['status', 'Updated By', 'Type', '_sortDate'].includes(key.trim())
              )
              .map(([key, value], index) => {
                let displayValue = value.toString();
                if ((key === 'Pick-up Date' || key === 'Drop-off Date') && value) {
                  displayValue = formatToDDMMYYYY(value as string);
                }
                return (
                  <tr key={key} style={{ background: index % 2 === 0 ? white : '#fffbe7' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 'bold', color: purpleDark, border: `1px solid ${yellowDark}`, width: '35%' }}>{key}</td>
                    <td style={{ padding: '10px 12px', border: `1px solid ${yellowDark}` }}>{displayValue}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '24px' }}>
          <button
            onClick={handleCopyDetails}
            style={{
              ...buttonStyle,
              backgroundColor: '#1976d2',
              color: '#fff',
            }}
            onMouseOver={e => (e.currentTarget.style.backgroundColor = '#1565c0')}
            onMouseOut={e => (e.currentTarget.style.backgroundColor = '#1976d2')}
          >
            📋 Copy Details
          </button>
          <button
            onClick={() => setShowModal(false)}
            style={{
              ...buttonStyle,
              backgroundColor: purple,
              color: yellow,
            }}
            onMouseOver={e => (e.currentTarget.style.backgroundColor = purpleDark)}
            onMouseOut={e => (e.currentTarget.style.backgroundColor = purple)}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
