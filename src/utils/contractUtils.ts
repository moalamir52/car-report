const normalize = (val: any): string => (val || '').toString().trim().toLowerCase();

export const getContractId = (row: any): string => {
    if (!row) return '';
    return normalize(row['Contract No.'] || row['Agreement']);
};