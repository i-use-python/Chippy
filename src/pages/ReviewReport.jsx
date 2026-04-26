import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentJob, saveCurrentJob, getBusinessProfile } from '../utils/jobStore';
import { generateReport } from '../utils/generateReport';

// ── Helpers ──

function formatDateLong(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-NZ', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function formatDateShort(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-NZ', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function formatTime12(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-NZ', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

function formatDuration(startISO, finishISO) {
  if (!startISO || !finishISO) return '—';
  const ms = new Date(finishISO) - new Date(startISO);
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

/** Parse "Material × qty" or "6x material" patterns into {item, qty} */
function parseMaterial(str) {
  // "Material name × 2" or "Material name x 2"
  const timesMatch = str.match(/^(.+?)\s*[×x]\s*(\d+.*)$/i);
  if (timesMatch) return { item: timesMatch[1].trim(), qty: timesMatch[2].trim() };
  // "6x kwila deck boards (140x25mm)" — leading quantity
  const leadMatch = str.match(/^(\d+)\s*x\s+(.+)$/i);
  if (leadMatch) return { item: leadMatch[2].trim(), qty: leadMatch[1] };
  return { item: str, qty: '—' };
}

// ── Signature Pad Component ──

function SignaturePad({ label, value, onChange }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    // Set canvas resolution to match display size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0A0A0A';
    ctx.lineWidth = 2;

    // Restore existing signature
    if (value) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
      img.src = value;
    }
  }, []);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  };

  const startDraw = (e) => {
    e.preventDefault();
    drawing.current = true;
    lastPos.current = getPos(e);
  };

  const draw = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const pos = getPos(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  };

  const endDraw = () => {
    if (!drawing.current) return;
    drawing.current = false;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    onChange(dataUrl);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    onChange(null);
  };

  return (
    <div className="flex-1">
      <div className="flex items-center justify-between mb-1">
        <span className="inline-block bg-yellow px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-black font-bold">
          {label}
        </span>
        <button
          onClick={clear}
          className="font-mono text-[9px] uppercase tracking-widest text-charcoal/40 underline"
        >
          Clear
        </button>
      </div>
      <canvas
        ref={canvasRef}
        className="w-full h-20 border border-black/20 bg-offwhite cursor-crosshair touch-none"
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={endDraw}
      />
      <div className="border-t border-black/30 mt-0" />
      <p className="font-mono text-[8px] uppercase tracking-widest text-charcoal/40 mt-1">
        Sign above
      </p>
    </div>
  );
}

// ── Section Header ──

function SectionHeader({ number, title, tag }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <span className="w-6 h-6 rounded-full bg-black text-yellow font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
          {number}
        </span>
        <h3 className="font-heading text-xs uppercase tracking-wider text-black">
          {title}
        </h3>
      </div>
      {tag && (
        <span className="inline-block bg-yellow px-2 py-0.5 font-mono text-[8px] uppercase tracking-widest text-black font-bold">
          {tag}
        </span>
      )}
    </div>
  );
}

// ── Edit Mode Components ──

function EditWorkPerformed({ value, onChange }) {
  return (
    <section className="mb-5">
      <SectionHeader number="1" title="Work Performed" />
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={5}
        className="w-full bg-offwhite border border-black/20 px-3 py-2 font-body text-sm text-charcoal leading-relaxed outline-none resize-y"
      />
    </section>
  );
}

function EditMaterials({ items, onChange }) {
  const update = (i, val) => {
    const next = [...items];
    next[i] = val;
    onChange(next);
  };
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i));
  const add = () => onChange([...items, '']);

  return (
    <section className="mb-5">
      <SectionHeader number="2" title="Materials Used" />
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2">
            <input
              value={item}
              onChange={(e) => update(i, e.target.value)}
              className="flex-1 bg-offwhite border border-black/20 px-3 py-2 font-body text-sm text-charcoal outline-none"
              placeholder="Material name"
            />
            <button
              onClick={() => remove(i)}
              className="px-2 text-red-500 font-mono text-xs font-bold shrink-0"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={add}
        className="font-mono text-[11px] uppercase tracking-widest text-charcoal/50 mt-2 underline underline-offset-4"
      >
        + Add material
      </button>
    </section>
  );
}

function EditNotes({ items, onChange }) {
  const update = (i, val) => {
    const next = [...items];
    next[i] = val;
    onChange(next);
  };
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i));
  const add = () => onChange([...items, '']);

  return (
    <section className="mb-5">
      <SectionHeader number="3" title="Notes & Findings" />
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2">
            <textarea
              value={item}
              onChange={(e) => update(i, e.target.value)}
              rows={2}
              className="flex-1 bg-offwhite border border-black/20 px-3 py-2 font-body text-sm text-charcoal outline-none resize-y"
            />
            <button
              onClick={() => remove(i)}
              className="px-2 text-red-500 font-mono text-xs font-bold shrink-0 self-start mt-2"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={add}
        className="font-mono text-[11px] uppercase tracking-widest text-charcoal/50 mt-2 underline underline-offset-4"
      >
        + Add note
      </button>
    </section>
  );
}

// ── Main Component ──

export default function ReviewReport() {
  const navigate = useNavigate();
  const [job, setJob] = useState(getCurrentJob);
  const [report, setReport] = useState(job?.report || null);
  const [loading, setLoading] = useState(!job?.report);
  const [elapsed, setElapsed] = useState(null);
  const [error, setError] = useState(null);
  const [usedFallback, setUsedFallback] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(null);
  const profile = getBusinessProfile() || {};

  useEffect(() => {
    if (report) return;
    if (!job) { navigate('/'); return; }

    let cancelled = false;

    async function generate() {
      setLoading(true);
      const result = await generateReport({
        address: job.address,
        date: new Date(job.date).toLocaleDateString('en-NZ'),
        transcript: job.transcript,
        photos: job.photos,
      });

      if (cancelled) return;

      setReport(result.report);
      setElapsed(result.elapsed || '2.1');
      setUsedFallback(result.usedFallback);
      if (result.error) setError(result.error);
      setLoading(false);

      const updated = { ...job, report: result.report };
      saveCurrentJob(updated);
      setJob(updated);
    }

    generate();
    return () => { cancelled = true; };
  }, []);

  // ── Edit mode handlers ──

  const startEditing = () => {
    setEditDraft({
      workPerformed: report?.workPerformed || '',
      materialsUsed: [...(report?.materialsUsed || [])],
      notes: [...(report?.notes || [])],
    });
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setEditDraft(null);
  };

  const saveEdits = () => {
    const updatedReport = { ...report, ...editDraft };
    setReport(updatedReport);
    const updatedJob = { ...job, report: updatedReport };
    saveCurrentJob(updatedJob);
    setJob(updatedJob);
    setEditing(false);
    setEditDraft(null);
  };

  // ── Signature handlers ──

  const handleSignature = useCallback((field, dataUrl) => {
    const updatedJob = { ...getCurrentJob(), [field]: dataUrl };
    saveCurrentJob(updatedJob);
    setJob(updatedJob);
  }, []);

  if (!job) return null;

  // Group photos by label
  const photoGroups = {};
  (job.photos || []).forEach((p) => {
    const label = p.label || 'untagged';
    if (!photoGroups[label]) photoGroups[label] = [];
    photoGroups[label].push(p);
  });
  const photoCount = (job.photos || []).length;
  const labelOrder = ['before', 'in-progress', 'completed', 'untagged'];
  const sortedLabels = Object.keys(photoGroups).sort(
    (a, b) => labelOrder.indexOf(a) - labelOrder.indexOf(b)
  );

  const voiceDateTag = `VOICE · ${formatDateShort(job.date)}`;

  return (
    <div className="min-h-screen bg-offwhite flex flex-col">
      {/* Header */}
      <header className="px-5 pt-8 pb-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate('/label')}
            className="font-mono text-xs uppercase tracking-widest text-charcoal/50 block"
          >
            ← Back
          </button>
          <img src="/logo.png" alt="Chippy" className="h-[40px]" />
        </div>
        {!loading && (
          <>
            <div className="flex items-center gap-2 mb-1">
              {job.ref && (
                <span className="font-mono text-[10px] uppercase tracking-widest text-charcoal/40">
                  {job.ref}
                </span>
              )}
              <span className="font-mono text-[10px] uppercase tracking-widest text-charcoal/40">
                {formatDateShort(job.date)}
              </span>
            </div>
            <h1 className="font-heading text-2xl text-black">
              {job.address || 'Job Report'}
            </h1>
            <p className="font-mono text-[11px] uppercase tracking-widest text-charcoal/50 mt-1">
              {usedFallback
                ? 'Using sample report (API unavailable)'
                : `Chippy created in ${elapsed}s`}
            </p>
          </>
        )}
      </header>

      <main className="flex-1 px-5 pt-5 pb-28">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <img src="/logo.png" alt="Chippy" className="h-[100px] mb-6" />
            <div className="spinner mb-6" />
            <p className="font-mono text-[11px] uppercase tracking-widest text-charcoal/50">
              Chippy is writing your report...
            </p>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-red-500/10 border border-red-400 px-4 py-2 mb-4">
                <p className="font-mono text-[10px] uppercase tracking-widest text-red-600">
                  API Error: {error}
                </p>
              </div>
            )}

            {/* ════════ REPORT CARD ════════ */}
            <div className="bg-white border-2 border-black relative overflow-hidden">
              {/* Hazard stripe accent on left edge */}
              <div className="hazard-stripe absolute left-0 top-0 bottom-0 w-[10px]" />

              <div className="pl-6 pr-4 py-5">

                {/* ── Business Header ── */}
                <div className="mb-4 pb-3 border-b border-black/10">
                  <p className="font-heading text-base text-black leading-tight">
                    {profile.businessName || 'Your Business'}
                  </p>
                  {profile.tagline && (
                    <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-charcoal/50 mt-0.5">
                      {profile.tagline}
                    </p>
                  )}
                  <p className="font-mono text-[9px] text-charcoal/50 mt-1">
                    {[profile.phone, profile.email].filter(Boolean).join(' · ')}
                  </p>
                  <p className="font-mono text-[9px] text-charcoal/40 mt-0.5">
                    {[
                      profile.lbpNumber ? `LBP ${profile.lbpNumber}` : null,
                      profile.nzbn ? `NZBN ${profile.nzbn}` : null,
                    ].filter(Boolean).join(' · ')}
                  </p>
                </div>

                {/* ── Job Record Header ── */}
                <div className="mb-4 pb-3 border-b border-black/10">
                  <div className="flex items-start justify-between">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-charcoal/50">
                      Job Record
                    </p>
                    {job.ref && (
                      <span className="font-mono text-[10px] uppercase tracking-widest text-charcoal/50">
                        Ref: {job.ref}
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-charcoal/40 mt-0.5">
                    {formatDateLong(job.date)}
                  </p>
                  <h2 className="font-heading text-lg text-black mt-2 leading-tight">
                    {job.jobTitle || 'Job Report'}
                  </h2>
                  <p className="font-mono text-[8px] uppercase tracking-[0.15em] text-charcoal/40 mt-1">
                    Job Completion Record · For Client Records
                  </p>
                </div>

                {/* ── Client + Job Details (two columns) ── */}
                <div className="grid grid-cols-2 gap-4 mb-4 pb-3 border-b border-black/10">
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-widest text-charcoal/40 mb-1">Client</p>
                    <p className="font-body text-sm text-black font-medium">{job.clientName || '—'}</p>
                    <p className="font-body text-[11px] text-charcoal mt-0.5">{job.clientAddress || job.address}</p>
                    <p className="font-body text-[11px] text-charcoal mt-0.5">{job.clientPhone || '—'}</p>
                  </div>
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-widest text-charcoal/40 mb-1">Job Details</p>
                    <p className="font-body text-[11px] text-charcoal">
                      <span className="text-charcoal/50">Location:</span> {job.jobLocation || '—'}
                    </p>
                    <p className="font-body text-[11px] text-charcoal mt-0.5">
                      <span className="text-charcoal/50">Date:</span> {formatDateShort(job.date)}
                    </p>
                    <p className="font-body text-[11px] text-charcoal mt-0.5">
                      <span className="text-charcoal/50">Start:</span> {formatTime12(job.startTime)}
                    </p>
                    <p className="font-body text-[11px] text-charcoal mt-0.5">
                      <span className="text-charcoal/50">Finish:</span> {formatTime12(job.finishTime)}
                    </p>
                    <p className="font-body text-[11px] text-black font-medium mt-0.5">
                      <span className="text-charcoal/50">Total:</span> {formatDuration(job.startTime, job.finishTime)}
                    </p>
                  </div>
                </div>

                {/* ── EDIT MODE ── */}
                {editing ? (
                  <div>
                    <EditWorkPerformed
                      value={editDraft.workPerformed}
                      onChange={(v) => setEditDraft((d) => ({ ...d, workPerformed: v }))}
                    />
                    <EditMaterials
                      items={editDraft.materialsUsed}
                      onChange={(v) => setEditDraft((d) => ({ ...d, materialsUsed: v }))}
                    />
                    <EditNotes
                      items={editDraft.notes}
                      onChange={(v) => setEditDraft((d) => ({ ...d, notes: v }))}
                    />
                  </div>
                ) : (
                  <>
                    {/* ── Section 1: Work Performed ── */}
                    <section className="mb-5">
                      <SectionHeader number="1" title="Work Performed" tag={`● ${voiceDateTag}`} />
                      <p className="font-body text-sm text-charcoal leading-relaxed">
                        {report?.workPerformed}
                      </p>
                    </section>

                    {/* ── Section 2: Materials Used (table) ── */}
                    {report?.materialsUsed?.length > 0 && (
                      <section className="mb-5">
                        <SectionHeader number="2" title="Materials Used" />
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-black">
                              <th className="text-left px-2 py-1.5 font-mono text-[9px] uppercase tracking-widest text-yellow font-bold">
                                Item
                              </th>
                              <th className="text-right px-2 py-1.5 font-mono text-[9px] uppercase tracking-widest text-yellow font-bold w-16">
                                Qty
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {report.materialsUsed.map((raw, i) => {
                              const { item, qty } = parseMaterial(raw);
                              return (
                                <tr key={i} className={i % 2 === 0 ? 'bg-offwhite' : 'bg-white'}>
                                  <td className="px-2 py-1.5 font-body text-[12px] text-charcoal">
                                    {item}
                                  </td>
                                  <td className="px-2 py-1.5 font-mono text-[11px] text-charcoal text-right">
                                    {qty}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </section>
                    )}

                    {/* ── Section 3: Notes & Findings ── */}
                    {report?.notes?.length > 0 && (
                      <section className="mb-5">
                        <SectionHeader number="3" title="Notes & Findings" />
                        <ul className="space-y-1.5">
                          {report.notes.map((note, i) => (
                            <li
                              key={i}
                              className="font-body text-sm text-charcoal flex items-start gap-2"
                            >
                              <span className="text-yellow font-bold mt-0.5 text-base leading-none">›</span>
                              <span className="leading-relaxed">{note}</span>
                            </li>
                          ))}
                        </ul>
                      </section>
                    )}

                    {/* ── Section 4: Photos ── */}
                    {photoCount > 0 && (
                      <section className="mb-5">
                        <SectionHeader
                          number="4"
                          title="Photos"
                          tag={`Tagged · ${photoCount} photo${photoCount !== 1 ? 's' : ''}`}
                        />
                        {sortedLabels.map((label) => (
                          <div key={label} className="mb-3">
                            <span className="inline-block bg-yellow px-2 py-0.5 font-mono text-[8px] uppercase tracking-widest text-black font-bold mb-1.5">
                              {label.replace('-', ' ')} ({photoGroups[label].length})
                            </span>
                            <div className="grid grid-cols-3 gap-1.5">
                              {photoGroups[label].map((photo) => (
                                <div
                                  key={photo.id}
                                  className="aspect-square border border-black/20 overflow-hidden bg-offwhite"
                                >
                                  {photo.dataUrl ? (
                                    <img src={photo.dataUrl} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <span className="font-mono text-[8px] text-charcoal/30 uppercase">No image</span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </section>
                    )}

                    {/* ── Sign-off Block ── */}
                    <section className="mb-4 pt-3 border-t border-black/10">
                      <div className="flex gap-4">
                        <SignaturePad
                          label="Tradie Sign-off"
                          value={job.tradieSignature}
                          onChange={(v) => handleSignature('tradieSignature', v)}
                        />
                        <SignaturePad
                          label="Client Confirmation"
                          value={job.clientSignature}
                          onChange={(v) => handleSignature('clientSignature', v)}
                        />
                      </div>
                    </section>
                  </>
                )}
              </div>

              {/* ── Black Footer Bar ── */}
              <div className="bg-black px-4 py-2 flex items-center justify-between">
                <p className="font-mono text-[8px] uppercase tracking-widest text-white/60">
                  ● Created with <span className="text-yellow">Chippy</span>
                </p>
                <p className="font-mono text-[8px] uppercase tracking-widest text-white/40">
                  {job.ref ? `Ref: ${job.ref} · ` : ''}Tamper-proof record
                </p>
              </div>
            </div>
          </>
        )}
      </main>

      {/* ── Bottom Buttons ── */}
      {!loading && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] p-5 bg-gradient-to-t from-offwhite via-offwhite to-transparent pt-8">
          <div className="flex gap-3">
            {editing ? (
              <>
                <button
                  onClick={cancelEditing}
                  className="btn btn-white flex-1 py-4 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdits}
                  className="btn btn-yellow flex-1 py-4 text-sm"
                >
                  Save Changes
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={startEditing}
                  className="btn btn-white flex-1 py-4 text-sm"
                >
                  Edit
                </button>
                <button
                  onClick={() => navigate('/send')}
                  className="btn btn-yellow flex-1 py-4 text-sm"
                >
                  Send →
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
