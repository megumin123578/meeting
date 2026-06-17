const crypto = require('crypto');
const WebSocket = require('ws');
const { URL } = require('url');

const { verifyToken } = require('../utils/auth');
const { findUserById } = require('../utils/db');
const { decrypt } = require('../utils/crypto');
const { buildSetupMessage } = require('./liveTranslate');

const DEFAULT_MODEL = 'gemini-3.5-live-translate-preview';
const rooms = new Map();

function send(client, payload) {
  if (client.readyState !== WebSocket.OPEN) return;
  try {
    client.send(JSON.stringify(payload));
  } catch {}
}

function broadcast(room, payload) {
  for (const participant of room.participants.values()) {
    send(participant.ws, payload);
  }
}

function makeRoomId() {
  for (let i = 0; i < 8; i++) {
    const id = crypto.randomBytes(4).toString('hex').slice(0, 6).toUpperCase();
    if (!rooms.has(id)) return id;
  }
  return crypto.randomUUID().slice(0, 6).toUpperCase();
}

function publicParticipant(participant) {
  return {
    id: participant.id,
    username: participant.username,
    language: participant.language || '',
    isSpeaker: participant.id === participant.room?.activeSpeakerId,
  };
}

function roomState(room) {
  return {
    type: 'room_state',
    roomId: room.id,
    sourceLang: room.sourceLang,
    targetLang: room.targetLang,
    model: room.model,
    activeSpeakerId: room.activeSpeakerId,
    participants: Array.from(room.participants.values()).map(publicParticipant),
  };
}

function joinRoom(client, user, room, apiKey) {
  const participant = {
    id: crypto.randomUUID(),
    userId: user.id,
    username: user.username,
    language: '',
    apiKey,
    ws: client,
    room,
  };

  client.teamParticipant = participant;
  room.participants.set(participant.id, participant);
  send(client, { type: 'connected', clientId: participant.id, username: user.username });
  broadcast(room, roomState(room));
}

function stopSpeaker(room, reason = 'speaker stopped') {
  if (room.upstream) {
    try {
      room.upstream.close();
    } catch {}
  }
  room.upstream = null;
  room.activeSpeakerId = null;
  broadcast(room, { type: 'speaker_stopped', reason });
  broadcast(room, roomState(room));
}

function startSpeaker(room, participant) {
  if (room.activeSpeakerId && room.activeSpeakerId !== participant.id) {
    send(participant.ws, { type: 'error', error: 'Một người khác đang nói trong phòng.' });
    return;
  }
  if (!participant.apiKey) {
    send(participant.ws, { type: 'error', error: 'API key chưa được cấu hình.' });
    return;
  }
  if (!participant.language) {
    send(participant.ws, { type: 'error', error: 'Hãy chọn ngôn ngữ bạn sẽ nói trước.' });
    return;
  }
  room.activeSpeakerId = participant.id;
  const upstreamUrl =
    `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${encodeURIComponent(participant.apiKey)}`;

  const sourceLang = participant.language;
  const targetLang = participant.language === room.sourceLang ? room.targetLang : room.sourceLang;
  const upstream = new WebSocket(upstreamUrl);
  room.upstream = upstream;

  upstream.on('open', () => {
    upstream.send(JSON.stringify(buildSetupMessage({
      model: room.model,
      targetLang,
      echo: true,
    })));
    broadcast(room, {
      type: 'speaker_started',
      speakerId: participant.id,
      speakerName: participant.username,
      sourceLang,
      targetLang,
    });
    send(participant.ws, { type: 'live_ready' });
    broadcast(room, roomState(room));
  });

  upstream.on('message', (data) => {
    const text = Buffer.isBuffer(data) ? data.toString('utf8') : String(data);
    broadcast(room, {
      type: 'live_message',
      speakerId: participant.id,
      speakerName: participant.username,
      sourceLang,
      targetLang,
      data: text,
    });
  });

  upstream.on('close', (code, reason) => {
    if (room.upstream !== upstream) return;
    room.upstream = null;
    room.activeSpeakerId = null;
    broadcast(room, {
      type: 'speaker_stopped',
      reason: `upstream closed (${code}): ${reason}`,
    });
    broadcast(room, roomState(room));
  });

  upstream.on('error', (err) => {
    console.error('[team-live] upstream error:', err.message);
    send(participant.ws, { type: 'error', error: `Live API: ${err.message}` });
    if (room.upstream === upstream) stopSpeaker(room, `upstream error: ${err.message}`);
  });
}

function leaveCurrentRoom(client) {
  const participant = client.teamParticipant;
  if (!participant?.room) return;

  const room = participant.room;
  if (room.activeSpeakerId === participant.id) {
    stopSpeaker(room, 'speaker left');
  }

  room.participants.delete(participant.id);
  client.teamParticipant = null;

  if (room.participants.size === 0) {
    if (room.upstream) {
      try {
        room.upstream.close();
      } catch {}
    }
    rooms.delete(room.id);
    return;
  }

  broadcast(room, roomState(room));
}

function attachTeamLive(server) {
  const wss = new WebSocket.Server({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    const { pathname } = new URL(req.url, `http://${req.headers.host}`);
    if (pathname !== '/ws/team-live') return;

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });

  wss.on('connection', (client, req) => {
    const reqUrl = new URL(req.url, `http://${req.headers.host}`);
    const token = reqUrl.searchParams.get('token');

    if (!token) {
      send(client, { type: 'error', error: 'Missing auth token' });
      client.close(4401, 'Missing auth token');
      return;
    }

    let user;
    try {
      const payload = verifyToken(token);
      user = findUserById(payload.sub);
    } catch {}

    if (!user) {
      send(client, { type: 'error', error: 'Invalid token' });
      client.close(4401, 'Invalid token');
      return;
    }

    let apiKey = '';
    try {
      apiKey = decrypt(user.apiKeyEnc || '');
    } catch {}

    client.on('message', (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString('utf8'));
      } catch {
        send(client, { type: 'error', error: 'Invalid message JSON' });
        return;
      }

      if (msg.type === 'create_room') {
        leaveCurrentRoom(client);
        const sourceLang = msg.sourceLang || 'en-US';
        const targetLang = msg.targetLang || 'vi-VN';
        if (sourceLang === targetLang) {
          send(client, { type: 'error', error: 'Hãy chọn hai ngôn ngữ khác nhau cho phòng.' });
          return;
        }
        const room = {
          id: makeRoomId(),
          sourceLang,
          targetLang,
          model: msg.model || DEFAULT_MODEL,
          participants: new Map(),
          activeSpeakerId: null,
          upstream: null,
        };
        rooms.set(room.id, room);
        joinRoom(client, user, room, apiKey);
        return;
      }

      if (msg.type === 'join_room') {
        const roomId = String(msg.roomId || '').trim().toUpperCase();
        const room = rooms.get(roomId);
        if (!room) {
          send(client, { type: 'error', error: 'Không tìm thấy phòng.' });
          return;
        }
        leaveCurrentRoom(client);
        joinRoom(client, user, room, apiKey);
        return;
      }

      const participant = client.teamParticipant;
      const room = participant?.room;
      if (!participant || !room) {
        send(client, { type: 'error', error: 'Bạn chưa ở trong phòng.' });
        return;
      }

      if (msg.type === 'speaker_start') {
        startSpeaker(room, participant);
        return;
      }

      if (msg.type === 'set_language') {
        const language = String(msg.language || '');
        if (language !== room.sourceLang && language !== room.targetLang) {
          send(client, { type: 'error', error: 'Ngôn ngữ không thuộc phòng này.' });
          return;
        }
        participant.language = language;
        broadcast(room, roomState(room));
        return;
      }

      if (msg.type === 'speaker_stop') {
        if (room.activeSpeakerId === participant.id) stopSpeaker(room);
        return;
      }

      if (msg.type === 'audio') {
        if (room.activeSpeakerId !== participant.id) return;
        const payload = JSON.stringify({
          realtimeInput: {
            audio: {
              data: msg.data,
              mimeType: msg.mimeType || 'audio/pcm;rate=16000',
            },
          },
        });
        if (!room.upstream || room.upstream.readyState !== WebSocket.OPEN) return;
        room.upstream.send(payload);
      }
    });

    client.on('close', () => leaveCurrentRoom(client));
    client.on('error', (err) => {
      console.warn('[team-live] client error:', err.message);
      leaveCurrentRoom(client);
    });
  });

  return wss;
}

module.exports = { attachTeamLive };
