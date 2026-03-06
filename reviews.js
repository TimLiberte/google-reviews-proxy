// api/reviews.js — Vercel Serverless Function
// Проксирует запросы к Google Places API, скрывает API-ключ от браузера

export default async function handler(req, res) {

  // Разрешаем CORS — можно сузить до конкретного домена клиента
  // Например: 'https://corporatee.ru' вместо '*'
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Preflight-запрос браузера
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Принимаем только GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { place_id } = req.query;

  if (!place_id) {
    return res.status(400).json({ error: 'place_id is required' });
  }

  // API-ключ хранится в переменных окружения Vercel — не в коде!
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
  url.searchParams.set('place_id', place_id);
  url.searchParams.set('fields', 'name,rating,user_ratings_total,reviews');
  url.searchParams.set('language', 'ru');
  url.searchParams.set('key', apiKey);

  try {
    const response = await fetch(url.toString());

    if (!response.ok) {
      return res.status(502).json({ error: 'Google API error', status: response.status });
    }

    const data = await response.json();

    // Кешируем ответ на 1 час — снижает количество запросов к Google API
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');

    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({ error: 'Fetch failed', message: err.message });
  }
}
