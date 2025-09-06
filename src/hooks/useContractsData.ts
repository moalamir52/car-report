import { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { getTodayDate, parseDateEjarFile, toDateOnlyString } from '../utils/dateUtils.ts';
import { fetchCarsDatabase, getCarModel } from '../utils/carsDatabase.ts';

const normalize = (val) => (val || '').toString().trim().toLowerCase();

const COLUMN_MAP = {
  'Booking Number': 'Booking ID',
  'Customer': 'Customer Name',
  'Phone Number': 'Customer Phone Number'
};

export const useContractsData = () => {
  const [startDate, setStartDate] = useState(getTodayDate());
  const [endDate, setEndDate] = useState(getTodayDate());
  const [fileData, setFileData] = useState([]);
  const [error, setError] = useState(null);
  const lastParseDateFn = useRef(parseDateEjarFile);

  useEffect(() => {
    const saved = localStorage.getItem('contracts_file_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFileData(parsed);
        setError(null);
      } catch {
        setFileData([]);
        setError(null);
      }
    }
  }, []);

  useEffect(() => {
    if (fileData && fileData.length > 0) {
      localStorage.setItem('contracts_file_data', JSON.stringify(fileData));
    } else {
      localStorage.removeItem('contracts_file_data');
    }
  }, [fileData]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      
      // جلب قاعدة بيانات السيارات وتحديث الموديلات
      const carsMap = await fetchCarsDatabase();
      const updatedJson = json.map(row => {
        const plateNo = row['Plate No.'];
        if (plateNo) {
          const normalizedPlate = (plateNo || '').toString().trim().toLowerCase();
          const carModel = carsMap.get(normalizedPlate);
          if (carModel) {
            row['Model'] = carModel;
          }
        }
        return row;
      });
      
      setFileData(updatedJson);
      lastParseDateFn.current = parseDateEjarFile;
    } catch (err) {
      console.error('Error reading file:', err);
      setError('❌ Failed to read Excel file. Please check the format.');
    }
  };

  const handleInvygoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('❌ Please upload a CSV file.');
      return;
    }

    try {
      const text = await file.text();
      const workbook = XLSX.read(text, { type: 'string' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const invygoData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      const invygoMap = new Map();
      invygoData.forEach(d => {
        const contractNo = normalize(d['Agreement']);
        if (contractNo) {
          invygoMap.set(contractNo, d);
        }
      });

      const updated = fileData.map((item) => {
        const contractNo = normalize(item['Contract No.']);
        const match = invygoMap.get(contractNo);

        if (match) {
          const merged = { ...item };
          Object.entries(COLUMN_MAP).forEach(([ejarKey, invygoKey]) => {
            if (match[invygoKey]) merged[ejarKey] = match[invygoKey];
          });
          return merged;
        }
        return item;
      });

      setFileData(updated);
    } catch (err) {
      console.error('Error processing INVYGO file:', err);
      setError('❌ Failed to process INVYGO CSV file.');
    }
  };

  const isInRange = (dateStr) => {
    if (!dateStr || !startDate || !endDate) return false;
    return dateStr >= startDate && dateStr <= endDate;
  };

  const { openedContracts, closedContracts } = useMemo(() => {
    if (!fileData || fileData.length === 0) {
      return { openedContracts: [], closedContracts: [] };
    }

    const opened = [];
    const closed = [];
    const parseDateFn = lastParseDateFn.current;

    fileData.forEach((row) => {
      const pickupDate = parseDateFn(row['Pick-up Date'], row, 'Pick-up Date');
      const dropoffDate = parseDateFn(row['Drop-off Date'], row, 'Drop-off Date');
      const status = row['Status']?.toString();

      const pickupStr = pickupDate instanceof Date && !isNaN(pickupDate) ? toDateOnlyString(pickupDate) : null;
      const dropoffStr = dropoffDate instanceof Date && !isNaN(dropoffDate) ? toDateOnlyString(dropoffDate) : null;

      if (isInRange(pickupStr)) opened.push({ ...row, _sortDate: pickupStr });
      if (isInRange(dropoffStr) && status?.startsWith('Delivered')) closed.push({ ...row, _sortDate: dropoffStr });
    });

    const sortByDateAsc = (a, b) => (a._sortDate || '').localeCompare(b._sortDate || '');
    const sortByDateDesc = (a, b) => (b._sortDate || '').localeCompare(a._sortDate || '');

    const finalOpened = opened.sort(sortByDateDesc).map(r => {
      const { _sortDate, ...rest } = r;
      return rest;
    });

    const finalClosed = closed.sort(sortByDateAsc).map(r => {
      const { _sortDate, ...rest } = r;
      return rest;
    });

    return { openedContracts: finalOpened, closedContracts: finalClosed };
  }, [fileData, startDate, endDate]);

  const handleReset = () => {
    setFileData([]);
    setError(null);
  };

  return {
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
    handleReset,
  };
};