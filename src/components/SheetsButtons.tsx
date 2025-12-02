import React, { useState, useEffect } from 'react';
import { buttonStyle, yellow, purpleDark, yellowDark } from '../styles.ts';
import { isDailyContract } from '../utils/dateUtils.ts';

interface SheetsButtonsProps {
  openedContracts: any[];
  closedContracts: any[];
  onResult: (message: string) => void;
}

export const SheetsButtons: React.FC<SheetsButtonsProps> = ({
  openedContracts,
  closedContracts,
  onResult
}) => {
  const [loading, setLoading] = useState(false);
  const [extensionInstalled, setExtensionInstalled] = useState(true);

  useEffect(() => {
    // التحقق من وجود الـ extension
    const checkExtension = () => {
      window.postMessage({ type: 'CHECK_EXTENSION' }, '*');
      setTimeout(() => setExtensionInstalled(true), 100);
    };
    checkExtension();

    // استمع للردود من الـ extension
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'SHEET_WRITE_SUCCESS') {
        setLoading(false);
        onResult(`Successfully wrote ${event.data.count} contracts to sheet!`);
      } else if (event.data.type === 'SHEET_WRITE_ERROR') {
        setLoading(false);
        onResult(`Error: ${event.data.error}`);
      } else if (event.data.type === 'SHEET_REMOVE_SUCCESS') {
        setLoading(false);
        onResult(`Successfully removed ${event.data.count} contracts from sheet`);
      } else if (event.data.type === 'SHEET_REMOVE_ERROR') {
        setLoading(false);
        onResult(`Error: ${event.data.error}`);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onResult]);

  const handleWriteToSheet = async () => {
    if (!openedContracts.length) {
      onResult('No opened contracts to write');
      return;
    }

    setLoading(true);
    writeContractsToSheet(openedContracts);
  };
  
  const writeContractsToSheet = async (contractsToWrite: any[]) => {
    const rows = contractsToWrite.map(row => {
      const bookingNumber = (() => {
        const val = row['Booking Number'];
        if (val && String(val).trim().toLowerCase().startsWith('c')) return 'Leasing';
        if (!val) {
          if (row['Drop-off Date'] && isDailyContract(row['Pick-up Date'], row['Drop-off Date'])) {
            return 'Daily';
          }
          return 'Monthly';
        }
        return val;
      })();

      return [
        row['Contract No.'] || '',
        bookingNumber,
        row['Customer'] || '',
        row['Pick-up Branch'] || '',
        row['Plate No.'] || '', // EJAR column - رقم السيارة
        row['Model'] || '',
        row['Plate No.'] || '', // INVYGO column - رقم السيارة مكرر
        row['Model'] || '',
        formatDateForArchive(row['Pick-up Date']),
        row['Phone Number'] || '',
        formatDateForArchive(row['Drop-off Date'])
      ];
    });

    // كتابة البيانات باستعمال POST form
    const postForm = document.createElement('form');
    postForm.method = 'POST';
    postForm.action = 'https://script.google.com/macros/s/AKfycbxp8ynxFkiXUJglRTZBg_G_3iUYygb6ZUGM6b9_a39nrxFe7CtiUFf9BP9q0mWzNK0mxQ/exec';
    postForm.target = 'hidden_iframe_' + Date.now();
    postForm.style.display = 'none';
    
    const actionInput = document.createElement('input');
    actionInput.name = 'action';
    actionInput.value = 'writeOpened';
    postForm.appendChild(actionInput);
    
    const dataInput = document.createElement('input');
    dataInput.name = 'data';
    dataInput.value = JSON.stringify(rows);
    postForm.appendChild(dataInput);
    
    const iframe = document.createElement('iframe');
    iframe.name = postForm.target;
    iframe.style.display = 'none';
    
    iframe.onload = () => {
      setTimeout(() => {
        document.body.removeChild(postForm);
        document.body.removeChild(iframe);
        setLoading(false);
        onResult(`Successfully wrote ${rows.length} contracts to sheet!`);
      }, 3000);
    };
    
    document.body.appendChild(iframe);
    document.body.appendChild(postForm);
    postForm.submit();
  };

  function isInvygo(val: any): boolean {
    if (!val) return false;
    const str = String(val).trim();
    return str.toLowerCase().includes('vrd') || /^\d{6,}$/.test(str) || str.toLowerCase().includes('invygo');
  }

  const formatDateForArchive = (dateStr: string | undefined): string => {
    if (!dateStr) return '';
    const str = String(dateStr).trim();
    
    if (str.includes(' ')) {
      const [datePart, timePart] = str.split(' ');
      return `${datePart.replace(/-/g, '/')} ${timePart}`;
    }
    
    if (str.length >= 14) {
      let datepart = str.substring(0, 10).replace(/-/g, '/');
      let timepart = str.substring(10);
      
      if (timepart.length === 4 && !timepart.includes(':')) {
        timepart = timepart.substring(0, 2) + ':' + timepart.substring(2);
      }
      
      return `${datepart} ${timepart}`;
    }
    
    return str.replace(/-/g, '/');
  };

  const prepareContractsByDate = (contracts: any[]): any[][] => {
    const contractsByDate: { [key: string]: any[] } = {};
    contracts.forEach(contract => {
      const dropOffDate = contract['Drop-off Date'];
      if (dropOffDate) {
        const dateOnly = dropOffDate.split(' ')[0];
        if (!contractsByDate[dateOnly]) {
          contractsByDate[dateOnly] = [];
        }
        contractsByDate[dateOnly].push(contract);
      }
    });

    const sortedDates = Object.keys(contractsByDate).sort();
    const rows: any[][] = [];
    
    sortedDates.forEach(date => {
      rows.push([date, '', '', '', '', '', '', '', '', '', '']);
      
      contractsByDate[date].forEach(row => {
        const bookingNumber = (() => {
          const val = row['Booking Number'];
          if (val && String(val).trim().toLowerCase().startsWith('c')) return 'Leasing';
          if (!val) {
            if (row['Drop-off Date'] && isDailyContract(row['Pick-up Date'], row['Drop-off Date'])) {
              return 'Daily';
            }
            return 'Monthly';
          }
          return val;
        })();

        rows.push([
          row['Contract No.'] || '',
          bookingNumber,
          row['Customer'] || '',
          row['Pick-up Branch'] || '',
          row['Plate No.'] || '',
          row['Model'] || '',
          row['Plate No.'] || '',
          row['Model'] || '',
          formatDateForArchive(row['Pick-up Date']),
          row['Phone Number'] || '',
          formatDateForArchive(row['Drop-off Date'])
        ]);
      });
    });
    
    return rows;
  };

  const handleRemoveFromSheet = async () => {
    if (!closedContracts.length) {
      onResult('No closed contracts to remove');
      return;
    }

    setLoading(true);
    const contractNos = closedContracts.map(c => c['Contract No.']).filter(Boolean);
    
    // Separate Invygo and Monthly/Daily contracts
    const invygoContracts = closedContracts.filter(row => isInvygo(row['Booking Number']));
    const monthlyContracts = closedContracts.filter(row => !isInvygo(row['Booking Number']));
    
    // Prepare data for both sheets
    const invygoRows = prepareContractsByDate(invygoContracts);
    const monthlyRows = prepareContractsByDate(monthlyContracts);
    
    // Send all data to Google Apps Script
    const postForm = document.createElement('form');
    postForm.method = 'POST';
    postForm.action = 'https://script.google.com/macros/s/AKfycbxp8ynxFkiXUJglRTZBg_G_3iUYygb6ZUGM6b9_a39nrxFe7CtiUFf9BP9q0mWzNK0mxQ/exec';
    postForm.target = 'hidden_iframe_remove_' + Date.now();
    postForm.style.display = 'none';
    
    const actionInput = document.createElement('input');
    actionInput.name = 'action';
    actionInput.value = 'removeAndArchive';
    postForm.appendChild(actionInput);
    
    const dataInput = document.createElement('input');
    dataInput.name = 'contractsToRemove';
    dataInput.value = JSON.stringify(contractNos);
    postForm.appendChild(dataInput);
    
    const invygoInput = document.createElement('input');
    invygoInput.name = 'invygoData';
    invygoInput.value = JSON.stringify(invygoRows);
    postForm.appendChild(invygoInput);
    
    const monthlyInput = document.createElement('input');
    monthlyInput.name = 'monthlyData';
    monthlyInput.value = JSON.stringify(monthlyRows);
    postForm.appendChild(monthlyInput);
    
    const iframe = document.createElement('iframe');
    iframe.name = postForm.target;
    iframe.style.display = 'none';
    
    iframe.onload = () => {
      setTimeout(() => {
        document.body.removeChild(postForm);
        document.body.removeChild(iframe);
        setLoading(false);
        onResult(`Successfully removed ${contractNos.length} contracts and archived ${invygoContracts.length} Invygo + ${monthlyContracts.length} Monthly/Daily contracts!`);
      }, 3000);
    };
    
    document.body.appendChild(iframe);
    document.body.appendChild(postForm);
    postForm.submit();
  };

  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexDirection: 'column' }}>
      {!extensionInstalled && (
        <div style={{ 
          backgroundColor: '#fff3cd', 
          border: '1px solid #ffeaa7', 
          borderRadius: 8, 
          padding: 12,
          fontSize: 14,
          color: '#856404'
        }}>
          📥 To enable automatic writing, install Chrome Extension from folder: chrome-extension
        </div>
      )}
      
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={handleWriteToSheet}
          disabled={loading || !openedContracts.length}
          style={{
            ...buttonStyle,
            backgroundColor: yellow,
            color: purpleDark,
            border: `2px solid ${purpleDark}`,
            opacity: loading || !openedContracts.length ? 0.6 : 1
          }}
          onMouseOver={e => !loading && openedContracts.length && (e.currentTarget.style.backgroundColor = yellowDark)}
          onMouseOut={e => !loading && openedContracts.length && (e.currentTarget.style.backgroundColor = yellow)}
        >
          {loading ? '⏳ Writing...' : `📊 Write to Sheet (${openedContracts.length})`}
        </button>

        <button
          onClick={handleRemoveFromSheet}
          disabled={loading || !closedContracts.length}
          style={{
            ...buttonStyle,
            backgroundColor: '#ff4444',
            color: 'white',
            border: '2px solid #cc0000',
            opacity: loading || !closedContracts.length ? 0.6 : 1
          }}
          onMouseOver={e => !loading && closedContracts.length && (e.currentTarget.style.backgroundColor = '#cc0000')}
          onMouseOut={e => !loading && closedContracts.length && (e.currentTarget.style.backgroundColor = '#ff4444')}
        >
          {loading ? '⏳ Removing...' : `🗑️ Remove Closed (${closedContracts.length})`}
        </button>
      </div>
    </div>
  );
};