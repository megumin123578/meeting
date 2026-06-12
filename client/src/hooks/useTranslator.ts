import { useState, useEffect, useCallback } from 'react';

export interface TranscriptItem {
  id: string;
  timestamp: string;
  originalText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
}

interface UseTranslatorProps {
  onShowToast: (message: string) => void;
}

export const useTranslator = ({ onShowToast }: UseTranslatorProps) => {
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('gemini_api_key') || '';
  });
  const [isKeyValid, setIsKeyValid] = useState<'valid' | 'invalid' | 'unchecked' | 'checking'>('unchecked');
  const [keyError, setKeyError] = useState<string>('');
  const [ttsStatus, setTtsStatus] = useState<'ready' | 'error' | 'checking' | 'unconfigured'>('unconfigured');
  const [isTranslating, setIsTranslating] = useState(false);
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>(() => {
    const saved = localStorage.getItem('translator_transcripts');
    return saved ? JSON.parse(saved) : [];
  });
  const [model, setModel] = useState<string>(() => {
    return localStorage.getItem('gemini_model') || import.meta.env.VITE_DEFAULT_MODEL || 'gemini-2.5-flash';
  });

  const saveModel = (selectedModel: string) => {
    const cleanModel = selectedModel.trim();
    localStorage.setItem('gemini_model', cleanModel);
    setModel(cleanModel);
  };



  const saveApiKey = (key: string) => {
    const cleanKey = key.trim();
    localStorage.setItem('gemini_api_key', cleanKey);
    setApiKey(cleanKey);
    // Removed duplicate checkApiKey call from here to make saving instant
    setIsKeyValid('unchecked');
  };

  const checkApiKey = useCallback(async (keyToCheck?: string, modelToCheck?: string) => {
    const key = keyToCheck !== undefined ? keyToCheck : apiKey;
    const selectedModel = (modelToCheck !== undefined ? modelToCheck : model).trim();
    if (!key) {
      setKeyError('Chưa nhập API Key.');
      setIsKeyValid('invalid');
      return false;
    }

    setKeyError('');
    setIsKeyValid('checking');
    try {
      const response = await fetch(`/api/test-key?model=${encodeURIComponent(selectedModel)}`, {
        method: 'GET',
        headers: {
          'x-gemini-api-key': key,
        },
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.ok) {
        setKeyError('');
        setIsKeyValid('valid');
        return true;
      }

      setKeyError(data.message || data.error || `Key validation failed (HTTP ${response.status}).`);
      setIsKeyValid('invalid');
      return false;
    } catch (err: any) {
      console.error('API key check failed:', err);
      setKeyError(err?.message || 'Không kết nối được tới server.');
      setIsKeyValid('invalid');
      return false;
    }
  }, [apiKey, model, onShowToast]);

  const checkEdgeTTS = useCallback(async () => {
    setTtsStatus('checking');
    try {
      // Call with a small test string
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: 'Status check', language: 'en-US' }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && !data.error && data.audioBase64) {
        setTtsStatus('ready');
      } else {
        setTtsStatus('error');
      }
    } catch (err) {
      console.error('Edge TTS check failed:', err);
      setTtsStatus('error');
    }
  }, []);

  // Persist transcripts
  useEffect(() => {
    localStorage.setItem('translator_transcripts', JSON.stringify(transcripts));
  }, [transcripts]);

  const translateAudio = async (
    audioBase64: string,
    mimeType: string,
    sourceLang: string,
    targetLang: string
  ) => {
    if (!apiKey) {
      onShowToast('⚠️ Vui lòng cấu hình OpenRouter API Key trước khi thực hiện dịch.');
      setIsKeyValid('invalid');
      return;
    }

    setIsTranslating(true);
    try {
      const response = await fetch('/api/translate-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-api-key': apiKey,
        },
        body: JSON.stringify({
          audioBase64,
          mimeType,
          sourceLang,
          targetLang,
          model,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Dịch thuật thất bại.');
      }

      const data = await response.json();
      
      const newTranscript: TranscriptItem = {
        id: `card_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        originalText: data.originalText,
        translatedText: data.translatedText,
        sourceLang,
        targetLang,
      };

      setTranscripts((prev) => [newTranscript, ...prev]);
    } catch (err: any) {
      console.error('Translation process error:', err);
      onShowToast(`❌ Lỗi: ${err.message || 'Không kết nối được tới server'}`);
    } finally {
      setIsTranslating(false);
    }
  };

  const translateText = async (
    text: string,
    sourceLang: string,
    targetLang: string
  ): Promise<string> => {
    if (!apiKey) {
      onShowToast('⚠️ Vui lòng cấu hình OpenRouter API Key trước khi thực hiện dịch.');
      setIsKeyValid('invalid');
      throw new Error('API Key missing');
    }

    try {
      const response = await fetch('/api/translate-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-api-key': apiKey,
        },
        body: JSON.stringify({
          text,
          sourceLang,
          targetLang,
          model,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Dịch thuật thất bại.');
      }

      const data = await response.json();
      return data.translatedText;
    } catch (err: any) {
      console.error('Translation process error:', err);
      onShowToast(`❌ Lỗi: ${err.message || 'Không kết nối được tới server'}`);
      throw err;
    }
  };

  const addTranscriptItem = (
    originalText: string,
    translatedText: string,
    sourceLang: string,
    targetLang: string
  ) => {
    const newTranscript: TranscriptItem = {
      id: `card_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      originalText,
      translatedText,
      sourceLang,
      targetLang,
    };
    setTranscripts((prev) => [newTranscript, ...prev]);
  };

  const deleteTranscript = (id: string) => {
    setTranscripts((prev) => prev.filter((item) => item.id !== id));
  };

  const clearTranscripts = () => {
    setTranscripts([]);
  };

  return {
    apiKey,
    saveApiKey,
    isKeyValid,
    keyError,
    checkApiKey,
    ttsStatus,
    checkEdgeTTS,
    isTranslating,
    transcripts,
    translateAudio,
    deleteTranscript,
    clearTranscripts,
    translateText,
    addTranscriptItem,
    model,
    saveModel,
  };
};
