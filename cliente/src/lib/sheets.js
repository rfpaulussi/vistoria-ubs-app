const SHEETS_URL =
  import.meta.env.VITE_SHEETS_URL ||
  'https://script.google.com/macros/s/AKfycbxDLjQ75Ice_nl7M0y6GuCJCv-_4FEk4Bw392mq3T74Kw5JKIi1zZAMOiZmhFT8JMMoLA/exec';

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
