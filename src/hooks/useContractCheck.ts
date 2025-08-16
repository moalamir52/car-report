import { useState } from 'react';
import { parseDateEjarFile } from '../utils/dateUtils.ts';

const normalize = (val) => (val || '').toString().trim().toLowerCase();

export const useContractCheck = (fileData) => {
  const [contractCheckResults, setContractCheckResults] = useState([]);
  const [checkingContracts, setCheckingContracts] = useState(false);
  const [checkFilter, setCheckFilter] = useState('');

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

      const [resOpen, resInvygo, resMonthly] = await Promise.all([
        fetch(openListURL).then(r => r.json()),
        fetch(invygoClosedURL).then(r => r.json()),
        fetch(monthlyClosedURL).then(r => r.json())
      ]);

      const openList = new Set((resOpen.rows || []).map(r => normalize(r['Contract No.'])));
      const invygoList = new Set((resInvygo.rows || []).map(r => normalize(r['Contract No.'] || r['Agreement'])));
      const monthlyList = new Set((resMonthly.rows || []).map(r => normalize(r['Contract No.'] || r['Agreement'])));

      const output = fileData.map(row => {
        const contract = normalize(row['Contract No.'] || row['Agreement']);
        const status = (row['Status'] || '').toLowerCase();
        if (!contract) return null;

        if (status.includes('close') || status.includes('delivered')) {
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
            return null;
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
      alert("❌ An error occurred during the contract check. Please make sure you are connected to the internet and that the Google Sheets links are working.");
    } finally {
      setCheckingContracts(false);
    }
  };

  const resetContractCheck = () => {
    setContractCheckResults([]);
    setCheckFilter('');
  };

  return { contractCheckResults, checkingContracts, checkFilter, setCheckFilter, runContractCheck, resetContractCheck };
};