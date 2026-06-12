const express = require('express');
const router = express.Router();

router.post('/translate-audio', async (req, res) => {
  const apiKey = req.headers['x-gemini-api-key'];
  const { audioBase64, mimeType, sourceLang, targetLang, model = 'gemini-2.5-flash' } = req.body;

  if (!apiKey) {
    return res.status(400).json({ error: 'Missing API Key in request headers.' });
  }

  if (!audioBase64 || !mimeType || !sourceLang || !targetLang) {
    return res.status(400).json({ error: 'Missing required fields in request body.' });
  }

  try {
    const prompt = `Transcribe the audio exactly as spoken in ${sourceLang}, then translate to ${targetLang}. Return ONLY valid JSON: { "originalText": "...", "translatedText": "..." }`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: audioBase64,
              },
            },
          ],
        }],
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Gemini API returned status ${response.status}`);
    }

    const responseData = await response.json();
    if (!responseData.candidates || !responseData.candidates[0] || !responseData.candidates[0].content) {
      throw new Error('Invalid response structure from Gemini API.');
    }

    let text = responseData.candidates[0].content.parts[0].text.trim();

    console.log('Gemini raw response:', text);

    let parsedJson = null;

    try {
      parsedJson = JSON.parse(text);
    } catch (e) {
      let cleaned = text;
      if (cleaned.includes('```')) {
        const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (match && match[1]) {
          cleaned = match[1].trim();
        }
      }

      try {
        parsedJson = JSON.parse(cleaned);
      } catch (e2) {
        const start = cleaned.indexOf('{');
        const end = cleaned.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end > start) {
          const jsonStr = cleaned.substring(start, end + 1);
          try {
            parsedJson = JSON.parse(jsonStr);
          } catch (e3) {
            console.error('All JSON parsing attempts failed:', e3);
          }
        }
      }
    }

    if (parsedJson) {
      const originalText = parsedJson.originalText || parsedJson.original_text || parsedJson.original || parsedJson.transcription || parsedJson.transcribed || '';
      const translatedText = parsedJson.translatedText || parsedJson.translated_text || parsedJson.translated || parsedJson.translation || '';

      if (originalText && translatedText) {
        return res.json({
          originalText: String(originalText).trim(),
          translatedText: String(translatedText).trim(),
        });
      }
    }

    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    let rescuedOriginal = '';
    let rescuedTranslated = '';

    for (const line of lines) {
      if (line.toLowerCase().startsWith('originaltext:') || line.toLowerCase().startsWith('original:')) {
        rescuedOriginal = line.replace(/^(originaltext|original):\s*/i, '').trim();
      } else if (line.toLowerCase().startsWith('translatedtext:') || line.toLowerCase().startsWith('translated:') || line.toLowerCase().startsWith('translation:')) {
        rescuedTranslated = line.replace(/^(translatedtext|translated|translation):\s*/i, '').trim();
      }
    }

    if (!rescuedOriginal || !rescuedTranslated) {
      const separators = [' - ', ' | ', ' / ', '\n'];
      for (const sep of separators) {
        const parts = text.split(sep).map(p => p.trim()).filter(Boolean);
        if (parts.length === 2) {
          rescuedOriginal = parts[0];
          rescuedTranslated = parts[1];
          break;
        }
      }
    }

    const stripQuotes = (str) => str.replace(/^["']|["']$/g, '').trim();

    if (rescuedOriginal && rescuedTranslated) {
      return res.json({
        originalText: stripQuotes(rescuedOriginal),
        translatedText: stripQuotes(rescuedTranslated),
      });
    }

    console.error('Failed to parse or extract translation from Gemini response:', text);
    return res.status(500).json({
      error: 'API returned an invalid format. Please try again.',
      rawResponse: text,
    });
  } catch (error) {
    console.error('Gemini Translation Error:', error);
    return res.status(500).json({ error: error.message || 'Translation failed.' });
  }
});

module.exports = router;
