import * as XLSX from 'xlsx';

// دالة pad
const pad = (v) => v && v.toString().padStart(2, "0");

// دالة تعيد تاريخ اليوم بصيغة yyyy-mm-dd
export const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
};

// دالة لتحويل نص التاريخ إلى كائن Date بشكل صحيح
export function parseDateString(dateStr) {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return dateStr;
    // إزالة الوقت إذا موجود
    let [datePart] = dateStr.split(' ');
    // استبدال الفواصل
    datePart = datePart.replace(/\./g, '-').replace(/\//g, '-');
    const parts = datePart.split('-');
    if (parts.length === 3) {
        // dd-MM-yyyy أو yyyy-MM-dd
        if (parts[2].length === 4) {
            // dd-MM-yyyy
            return new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
        } else if (parts[0].length === 4) {
            // yyyy-MM-dd
            return new Date(`${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`);
        }
    }
    // fallback
    return new Date(dateStr);
}

// دالة للملفات المرفوعة من إيجار فقط (ترجع كائن Date)
export const parseDateEjarFile = (value) => {
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

export const parseDateGoogleSheet = (value, row: any = {}, referenceDate = null) => {
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

        const contract = row['Contract No.'] || row['Agreement'] || '';
        const contractMonthMatch = contract.match(/25(\d{2})/);
        const hintMonth = contractMonthMatch ? parseInt(contractMonthMatch[1]) : null;

        if (a <= 12 && b <= 12 && c > 1900) {
          if (hintMonth === a) { mm = a; dd = b; }
          else if (hintMonth === b) { mm = b; dd = a; }
          else if (a === currentMonth) { mm = a; dd = b; }
          else if (b === currentMonth) { mm = b; dd = a; }
          else { mm = a; dd = b; }
          yyyy = c;

          if (referenceDate) {
            const parsed = new Date(`${yyyy}-${pad(mm)}-${pad(dd)}`);
            const ref = new Date(referenceDate);
            if (parsed < ref) {
              const test = new Date(`${yyyy}-${pad(dd)}-${pad(mm)}`);
              if (!isNaN(test.getTime()) && test > ref) { [mm, dd] = [dd, mm]; }
            }
          }
        } else if (a > 1900) { yyyy = a; mm = b; dd = c; }
        else if (c > 1900) { yyyy = c; mm = a; dd = b; }
        else { return null; }

        const testDate = new Date(yyyy, mm - 1, dd);
        if (isNaN(testDate.getTime())) return null;

        return `${yyyy}-${pad(mm)}-${pad(dd)}`;
      }
    } catch (e) {
      console.warn("Invalid date format in Google Sheet:", value);
    }
    return null;
};

export const toDateOnlyString = (date) => {
    const offset = date.getTimezoneOffset();
    const adjusted = new Date(date.getTime() - offset * 60 * 1000);
    return adjusted.toISOString().slice(0, 10);
};

export const formatToDDMMYYYY = (value) => {
    if (!value) return '';
    const dateObj = parseDateString(value);
    if (!dateObj || isNaN(dateObj.getTime())) return value.toString();
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    return `${day}/${month}/${year}`;
};

export function isDailyContract(pickup, dropoff) {
    const start = parseDateString(pickup);
    const end = parseDateString(dropoff);
    if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) return false;
    const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays < 10 && diffDays >= 0;
}