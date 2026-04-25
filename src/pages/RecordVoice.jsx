import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentJob, saveCurrentJob, startNewJob } from '../utils/jobStore';
import { DEMO_TRANSCRIPT } from '../data/demoData';

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const h = Math.floor(m / 60);
  return `${String(h).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatDuration(startISO, finishISO) {
  if (!startISO || !finishISO) return null;
  const ms = new Date(finishISO) - new Date(startISO);
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export default function RecordVoice() {
  const navigate = useNavigate();
  const [job, setJob] = useState(() => getCurrentJob() || startNewJob('42 Queen St, Ponsonby'));
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState(job.transcript || '');
  const [interimText, setInterimText] = useState('');
  const [speechSupported, setSpeechSupported] = useState(true);
  const [startTime, setStartTime] = useState(job.startTime || null);
  const [finishTime, setFinishTime] = useState(job.finishTime || null);

  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const transcriptEndRef = useRef(null);

  // Auto-scroll transcript area
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript, interimText]);

  // Set up Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-NZ';

    recognition.onresult = (event) => {
      let final = '';
      let interim = '';
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript + ' ';
        } else {
          interim += result[0].transcript;
        }
      }
      if (final) {
        setTranscript((prev) => prev + final);
        setInterimText(interim);
      } else {
        setInterimText(interim);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setSpeechSupported(false);
      }
    };

    recognition.onend = () => {
      // Restart if still recording (speech recognition auto-stops sometimes)
      if (recognitionRef.current?._shouldBeRunning) {
        try { recognition.start(); } catch (e) { /* already running */ }
      }
    };

    recognitionRef.current = recognition;
    return () => {
      recognition.abort();
      clearInterval(timerRef.current);
    };
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      // Stop — capture finish time
      const now = new Date().toISOString();
      setIsRecording(false);
      setFinishTime(now);
      clearInterval(timerRef.current);
      if (recognitionRef.current) {
        recognitionRef.current._shouldBeRunning = false;
        recognitionRef.current.stop();
      }
      // Persist timing to job
      const updated = { ...getCurrentJob(), finishTime: now };
      saveCurrentJob(updated);
      setJob(updated);
    } else {
      // Start — capture start time (only on first recording start)
      const now = new Date().toISOString();
      setIsRecording(true);
      setFinishTime(null);
      if (!startTime) {
        setStartTime(now);
        const updated = { ...getCurrentJob(), startTime: now };
        saveCurrentJob(updated);
        setJob(updated);
      }
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      if (recognitionRef.current && speechSupported) {
        recognitionRef.current._shouldBeRunning = true;
        try { recognitionRef.current.start(); } catch (e) { /* already running */ }
      }
    }
  }, [isRecording, speechSupported, startTime]);

  const useDemoTranscript = () => {
    setTranscript(DEMO_TRANSCRIPT);
    // Set realistic demo timing
    const demoStart = new Date(Date.now() - 9.25 * 3600000).toISOString();
    const demoFinish = new Date().toISOString();
    setStartTime(demoStart);
    setFinishTime(demoFinish);
    const updated = { ...getCurrentJob(), startTime: demoStart, finishTime: demoFinish };
    saveCurrentJob(updated);
    setJob(updated);
  };

  const handleContinue = () => {
    // If still recording, stop first and capture finish time
    let currentFinish = finishTime;
    if (isRecording) {
      const now = new Date().toISOString();
      currentFinish = now;
      setIsRecording(false);
      clearInterval(timerRef.current);
      if (recognitionRef.current) {
        recognitionRef.current._shouldBeRunning = false;
        recognitionRef.current.stop();
      }
    }

    const updatedJob = {
      ...getCurrentJob(),
      transcript: transcript.trim() || DEMO_TRANSCRIPT,
      finishTime: currentFinish || new Date().toISOString(),
    };
    saveCurrentJob(updatedJob);
    navigate('/photos');
  };

  const hasTranscript = transcript.trim().length > 0;
  const totalTime = formatDuration(startTime, finishTime);

  return (
    <div className="min-h-screen bg-offwhite flex flex-col">
      {/* Header */}
      <header className="px-5 pt-8 pb-4">
        <button
          onClick={() => navigate('/client')}
          className="font-mono text-xs uppercase tracking-widest text-charcoal/50 mb-4 block"
        >
          ← Back
        </button>

        {/* Job info bar */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="font-heading text-sm text-black">{job.address || 'New Job'}</p>
            {job.ref && (
              <p className="font-mono text-[10px] text-charcoal/40 mt-0.5">{job.ref}</p>
            )}
          </div>
          {totalTime && (
            <span className="font-mono text-[11px] uppercase tracking-widest text-yellow bg-black px-2 py-1">
              On site: {totalTime}
            </span>
          )}
        </div>
      </header>

      {/* Recording Area */}
      <main className="flex-1 flex flex-col items-center px-5 pb-28">
        {/* Status indicator */}
        <div className="flex items-center gap-2 mb-3 mt-4">
          {isRecording ? (
            <>
              <div className="recording-dot" />
              <span className="font-mono text-xs uppercase tracking-widest text-red-500">
                Recording
              </span>
            </>
          ) : (
            <span className="font-mono text-xs uppercase tracking-widest text-charcoal/40">
              {hasTranscript ? 'Paused' : 'Tap to record'}
            </span>
          )}
        </div>

        {/* Timer */}
        <p className="font-heading text-5xl text-black tabular-nums mb-8">
          {formatTime(seconds)}
        </p>

        {/* Mic Button */}
        <button
          onClick={toggleRecording}
          className={`w-24 h-24 rounded-full border-3 border-black flex items-center justify-center
                      transition-all shadow-[3px_3px_0_#0A0A0A] active:shadow-[1px_1px_0_#0A0A0A]
                      active:translate-x-[2px] active:translate-y-[2px]
                      ${isRecording ? 'bg-red-500' : 'bg-yellow'}`}
        >
          {isRecording ? (
            /* Stop icon (square) */
            <div className="w-8 h-8 bg-white rounded-sm" />
          ) : (
            /* Mic icon */
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="1" width="6" height="11" rx="3" />
              <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          )}
        </button>

        {/* Waveform Bars */}
        <div className="flex items-center gap-1.5 h-10 mt-6 mb-4">
          {[...Array(7)].map((_, i) => (
            <div
              key={i}
              className={`waveform-bar ${!isRecording ? 'waveform-bar-idle' : ''}`}
            />
          ))}
        </div>

        {/* Speech API not supported warning + demo button */}
        {!speechSupported && (
          <div className="bg-yellow/20 border-2 border-yellow px-4 py-3 mb-4 w-full">
            <p className="font-mono text-[11px] uppercase tracking-widest text-black mb-2">
              Speech-to-text not available in this browser
            </p>
            <button
              onClick={useDemoTranscript}
              className="btn btn-yellow text-xs py-2 px-4"
            >
              Use Demo Transcript
            </button>
          </div>
        )}

        {/* Transcript Area */}
        <div className="w-full flex-1 min-h-[120px] max-h-[240px] overflow-y-auto bg-white border-2 border-black p-4">
          {!hasTranscript && !interimText ? (
            <p className="font-mono text-xs uppercase tracking-widest text-charcoal/30 text-center mt-4">
              Your words will appear here...
            </p>
          ) : (
            <p className="font-body text-sm text-charcoal leading-relaxed">
              {transcript}
              {interimText && (
                <span className="text-charcoal/40">{interimText}</span>
              )}
              <span ref={transcriptEndRef} />
            </p>
          )}
        </div>

        {/* Demo transcript button (when speech IS supported but user wants quick demo) */}
        {speechSupported && !hasTranscript && (
          <button
            onClick={useDemoTranscript}
            className="font-mono text-[11px] uppercase tracking-widest text-charcoal/40 mt-3
                       underline underline-offset-4 decoration-dashed"
          >
            Use demo transcript instead
          </button>
        )}
      </main>

      {/* Bottom Button */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] p-5 bg-gradient-to-t from-offwhite via-offwhite to-transparent pt-8">
        <button
          onClick={handleContinue}
          disabled={!hasTranscript && !interimText}
          className={`btn w-full py-4 text-sm ${
            hasTranscript ? 'btn-black' : 'btn-black opacity-40 cursor-not-allowed'
          }`}
        >
          {isRecording ? 'Stop & Continue →' : 'Continue →'}
        </button>
      </div>
    </div>
  );
}
