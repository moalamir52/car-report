const API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;
const SHEET_ID = process.env.REACT_APP_SHEET_ID;
const SHEET_NAME = 'Open Contract';
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxsLa7U0TipYUXBj2lB39I-nGdidry3gI9doGvockDVvjan2sl2ScpdGDq0Ajrkveif7Q/exec';

// كتابة العقود المفتوحة في الشيت
export const writeOpenedToSheet = async (openedContracts: any[]) => {
  try {
    if (!openedContracts.length) return { success: false, error: 'لا توجد عقود مفتوحة' };

    // تحضير البيانات بنفس ترتيب النسخ
    const rows = openedContracts.map(row => [
      row['Contract No.'] || '',
      (() => {
        const val = row['Booking Number'];
        if (val && String(val).trim().toLowerCase().startsWith('c')) return 'Leasing';
        if (!val) return 'Monthly';
        return val;
      })(),
      row['Customer'] || '',
      row['Pick-up Branch'] || '',
      row['Plate No.'] || '',
      row['Model'] || '',
      row['Plate No.'] || '',
      row['Model'] || '',
      row['Pick-up Date'] || '',
      row['Phone Number'] || '',
      row['Drop-off Date'] || ''
    ]);

    const params = new URLSearchParams({
      action: 'writeOpened',
      data: JSON.stringify(rows)
    });
    
    const response = await fetch(`${APPS_SCRIPT_URL}?${params}`, {
      method: 'GET'
    });

    const result = await response.json();
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// حذف العقود المغلقة من الشيت
export const removeClosedFromSheet = async (closedContracts: any[]) => {
  try {
    if (!closedContracts.length) return { success: false, error: 'لا توجد عقود مغلقة' };

    const closedContractNos = closedContracts.map(c => c['Contract No.']).filter(Boolean);

    const params = new URLSearchParams({
      action: 'removeClosed',
      contractNos: JSON.stringify(closedContractNos)
    });
    
    const response = await fetch(`${APPS_SCRIPT_URL}?${params}`, {
      method: 'GET'
    });

    const result = await response.json();
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
};