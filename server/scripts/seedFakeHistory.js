const crypto = require('crypto');
const { _db } = require('../utils/db');

const users = _db.prepare('SELECT id, username FROM users ORDER BY createdAt ASC').all();

const deleteExistingStmt = _db.prepare(
  'DELETE FROM live_room_exports WHERE createdByUserId = ? AND roomCode = ?'
);
const insertExportStmt = _db.prepare(`
  INSERT INTO live_room_exports (
    id, roomCode, createdByUserId, createdByUsername, sourceLang, targetLang, model, createdAt, closedAt, transcriptCount
  ) VALUES (
    @id, @roomCode, @createdByUserId, @createdByUsername, @sourceLang, @targetLang, @model, @createdAt, @closedAt, @transcriptCount
  )
`);
const insertTranscriptStmt = _db.prepare(`
  INSERT INTO live_room_transcripts (
    id, exportId, roomCode, speakerId, speakerName, originalText, translatedText, sourceLang, targetLang, createdAt
  ) VALUES (
    @id, @exportId, @roomCode, @speakerId, @speakerName, @originalText, @translatedText, @sourceLang, @targetLang, @createdAt
  )
`);

function iso(minutesFromNow) {
  return new Date(Date.now() + minutesFromNow * 60 * 1000).toISOString();
}

function seedForUser(user, index) {
  const roomCode = `DEMO-${user.username.toUpperCase()}`;
  deleteExistingStmt.run(user.id, roomCode);

  const exportId = crypto.randomUUID();
  const createdAt = iso(-120 - index * 10);
  const closedAt = iso(-95 - index * 10);

  const room = {
    id: exportId,
    roomCode,
    createdByUserId: user.id,
    createdByUsername: user.username,
    sourceLang: 'en-US',
    targetLang: 'vi-VN',
    model: 'gemini-3.5-live-translate-preview',
    createdAt,
    closedAt,
    transcriptCount: 4,
  };

  insertExportStmt.run(room);

  const segments = [
    {
      speakerName: user.username,
      originalText: 'Good morning everyone. Can you hear me clearly?',
      translatedText: 'Chào buổi sáng mọi người. Nghe rõ mình không?',
    },
    {
      speakerName: 'Interpreter',
      originalText: 'Yes, the audio is clear.',
      translatedText: 'Vâng, âm thanh rất rõ.',
    },
    {
      speakerName: user.username,
      originalText: 'Let us review the product timeline and the launch checklist.',
      translatedText: 'Hãy cùng xem lại timeline sản phẩm và checklist ra mắt.',
    },
    {
      speakerName: 'Interpreter',
      originalText: 'We should finalize the UI mockups by Friday.',
      translatedText: 'Chúng ta nên chốt mockup UI trước thứ Sáu.',
    },
  ];

  const baseMinutes = -110 - index * 10;
  for (let i = 0; i < segments.length; i++) {
    insertTranscriptStmt.run({
      id: crypto.randomUUID(),
      exportId,
      roomCode,
      speakerId: null,
      speakerName: segments[i].speakerName,
      originalText: segments[i].originalText,
      translatedText: segments[i].translatedText,
      sourceLang: 'en-US',
      targetLang: 'vi-VN',
      createdAt: iso(baseMinutes + i * 3),
    });
  }
}

if (users.length === 0) {
  console.log('[seed-history] No user accounts found.');
  process.exit(0);
}

const tx = _db.transaction(() => {
  users.forEach(seedForUser);
});

tx();
console.log(`[seed-history] Seeded ${users.length} fake history room(s).`);
