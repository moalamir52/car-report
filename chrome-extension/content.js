// استعمال Google Apps Script بدلاً من API
window.addEventListener('message', async (event) => {
  if (event.data.type === 'WRITE_TO_SHEET') {
    try {
      const { rows } = event.data;
      const scriptUrl = 'https://script.google.com/macros/s/AKfycbxsLa7U0TipYUXBj2lB39I-nGdidry3gI9doGvockDVvjan2sl2ScpdGDq0Ajrkveif7Q/exec';
      
      // استعمال URLSearchParams بدلاً من FormData
      const params = new URLSearchParams();
      params.append('action', 'writeOpened');
      params.append('data', JSON.stringify(rows));
      
      const response = await fetch(scriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params
      });
      
      const result = await response.text();
      console.log('Apps Script response:', result);
      
      if (result.includes('success') || result.includes('written')) {
        window.postMessage({ type: 'SHEET_WRITE_SUCCESS', count: rows.length }, '*');
      } else {
        throw new Error(result);
      }
    } catch (error) {
      console.error('Extension error:', error);
      window.postMessage({ type: 'SHEET_WRITE_ERROR', error: error.message }, '*');
    }
  }
});