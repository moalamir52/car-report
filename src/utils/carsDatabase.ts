const GOOGLE_SHEETS_URL = 'https://docs.google.com/spreadsheets/d/1sHvEQMtt3suuxuMA0zhcXk5TYGqZzit0JvGLk1CQ0LI/export?format=csv&gid=299083175';

let carsCache: Map<string, string> | null = null;

const normalize = (val: any): string => (val || '').toString().trim().toLowerCase();

export const fetchCarsDatabase = async (): Promise<Map<string, string>> => {
  if (carsCache) return carsCache;
  
  try {
    const response = await fetch(GOOGLE_SHEETS_URL);
    const csvText = await response.text();
    
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    // البحث عن الأعمدة المطلوبة
    const manufacturerIndex = headers.findIndex(h => normalize(h) === 'manufacturer');
    const modelIndex = headers.findIndex(h => normalize(h) === 'model');
    const yearIndex = headers.findIndex(h => normalize(h) === 'year model');
    const plateIndex = headers.findIndex(h => normalize(h) === 'plate no');
    
    if (manufacturerIndex === -1 || modelIndex === -1 || yearIndex === -1 || plateIndex === -1) {
      console.error('Could not find required columns');
      return new Map();
    }
    
    const carsMap = new Map<string, string>();
    
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',').map(cell => cell.trim().replace(/"/g, ''));
      if (row.length > Math.max(manufacturerIndex, modelIndex, yearIndex, plateIndex)) {
        const manufacturer = row[manufacturerIndex]?.trim() || '';
        const model = row[modelIndex]?.trim() || '';
        const year = row[yearIndex]?.trim() || '';
        const plateNumber = normalize(row[plateIndex]);
        
        if (plateNumber && (manufacturer || model || year)) {
          // دمج الثلاث أعمدة لتكوين اسم السيارة الكامل
          const formatWord = (word: string) => {
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
          };
          
          const formattedParts = [manufacturer, model, year]
            .filter(Boolean)
            .map(part => formatWord(part.trim()));
          
          const fullCarName = formattedParts.join(' ');
          carsMap.set(plateNumber, fullCarName);
        }
      }
    }
    
    carsCache = carsMap;
    console.log(`✅ Loaded ${carsMap.size} cars from database`);
    return carsMap;
    
  } catch (error) {
    console.error('❌ Error fetching cars database:', error);
    return new Map();
  }
};

export const getCarModel = async (plateNumber: string): Promise<string> => {
  const carsMap = await fetchCarsDatabase();
  const normalizedPlate = normalize(plateNumber);
  return carsMap.get(normalizedPlate) || '';
};

export const clearCarsCache = () => {
  carsCache = null;
};