const SHEETS_URL =
  import.meta.env.VITE_SHEETS_URL ||
  'https://script.google.com/macros/s/AKfycbxcWgZYPth-jCXpkRxicBEGr2JKj21rdU-uuSYQNfBdCva1vqj1iH8qPdbbVxcZhKfcEQ/exec';

export async function salvarVistoria(dados) {
  try {
    await fetch(SHEETS_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    });
  } catch (err) {
    console.error('Sheets POST error:', err);
  }
}

export async function buscarVistorias() {
  try {
    const res = await fetch(SHEETS_URL);
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error('Sheets GET error:', err);
    return [];
  }
}
