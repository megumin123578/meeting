const express = require('express');
const router = express.Router();

router.get('/test-key', async (req, res) => {
  const apiKey = req.headers['x-gemini-api-key'];
  const model = 'gemini-2.5-flash';

  if (!apiKey) {
    return res.status(400).json({ ok: false, message: 'Missing API Key in request headers.' });
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Respond with "ok".' }] }],
      }),
    });

    if (response.ok) {
      return res.json({ ok: true, message: 'Gemini API Key is valid and active.' });
    }

    const errData = await response.json().catch(() => ({}));
    return res.json({
      ok: false,
      message: errData.error?.message || `Gemini API returned status ${response.status}`,
    });
  } catch (error) {
    console.error('Gemini Key Verification Error:', error);
    return res.json({
      ok: false,
      message: error.message || 'Connection issue with Gemini API.',
    });
  }
});

module.exports = router;
