const { useState, useCallback, useMemo } = React;

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORIES = ['Goals', 'Evidence', 'Risks', 'Timeline', 'Next Actions'];

const PARTICIPANT_COLORS = {
  Alex:   { bg: 'bg-violet-900/40', border: 'border-violet-500/40', accent: '#8b5cf6', badge: 'bg-violet-500' },
  Mira:   { bg: 'bg-emerald-900/40', border: 'border-emerald-500/40', accent: '#10b981', badge: 'bg-emerald-500' },
  Jordan: { bg: 'bg-amber-900/40',  border: 'border-amber-500/40',  accent: '#f59e0b', badge: 'bg-amber-500'  },
};

const INITIAL_MODELS = {
  Alex:   { Goals: 82, Evidence: 55, Risks: 30, Timeline: 70, 'Next Actions': 60 },
  Mira:   { Goals: 45, Evidence: 80, Risks: 75, Timeline: 35, 'Next Actions': 50 },
  Jordan: { Goals: 65, Evidence: 40, Risks: 55, Timeline: 80, 'Next Actions': 85 },
};

const PARTICIPANT_ROLES = {
  Alex:   'Product Lead',
  Mira:   'Research Lead',
  Jordan: 'Engineering Lead',
};

const PICKER_ACCENT = { Alex: '#8b5cf6', Mira: '#10b981', Jordan: '#f59e0b' };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeSharedModel(models) {
  const names = Object.keys(models);
  const shared = {};
  CATEGORIES.forEach(cat => {
    shared[cat] = Math.round(names.reduce((sum, n) => sum + models[n][cat], 0) / names.length);
  });
  return shared;
}

function computeScore(models) {
  const names = Object.keys(models);
  let totalVariance = 0;
  CATEGORIES.forEach(cat => {
    const vals = names.map(n => models[n][cat]);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance = vals.reduce((sum, v) => sum + (v - mean) ** 2, 0) / vals.length;
    totalVariance += Math.sqrt(variance);
  });
  const avgStd = totalVariance / CATEGORIES.length;
  // 2.8 multiplier: divergent start ~52, partial alignment 60–75, full convergence needed for 90+
  return Math.max(0, Math.min(100, Math.round(100 - avgStd * 2.8)));
}

const clamp = v => Math.max(0, Math.min(100, Math.round(v)));

// ─── DeltaBadge ──────────────────────────────────────────────────────────────

function DeltaBadge({ delta, animKey }) {
  if (!delta || delta === 0) return null;
  const up = delta > 0;
  return (
    <span
      key={animKey}
      className={`delta-pop inline-flex items-center gap-0.5 font-mono font-bold text-xs px-1 rounded ml-1 ${up ? 'text-emerald-300' : 'text-rose-300'}`}
    >
      {up ? '▲' : '▼'}{Math.abs(delta)}
    </span>
  );
}

// ─── ModelBar ────────────────────────────────────────────────────────────────

function ModelBar({ label, value, accent, editable, onChange, delta, animKey }) {
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1 text-slate-400">
        <span>{label}</span>
        <span className="flex items-center font-mono text-slate-300">
          {value}
          <DeltaBadge delta={delta} animKey={`${animKey}-${label}`} />
        </span>
      </div>
      <div className="relative h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className="bar-fill h-full rounded-full"
          style={{ width: `${value}%`, background: accent }}
        />
      </div>
      {editable && (
        <input
          type="range" min="0" max="100" value={value}
          onChange={e => onChange(parseInt(e.target.value))}
          className="w-full mt-1 cursor-pointer"
          style={{ accentColor: accent }}
        />
      )}
    </div>
  );
}

// ─── ParticipantCard ─────────────────────────────────────────────────────────

function ParticipantCard({ name, model, editable, onCategoryChange, modeOn, deltas, animKey }) {
  const c = PARTICIPANT_COLORS[name];
  return (
    <div className={`rounded-2xl p-4 border card-glow ${c.bg} ${c.border}`}>
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-8 h-8 rounded-full ${c.badge} flex items-center justify-center text-white font-bold text-sm`}>
          {name[0]}
        </div>
        <div>
          <div className="font-semibold text-white text-sm">{name}</div>
          <div className="text-xs text-slate-400">{PARTICIPANT_ROLES[name]}</div>
        </div>
        {modeOn && <span className="ml-auto text-xs text-slate-500 italic">adjustable</span>}
      </div>
      {CATEGORIES.map(cat => (
        <ModelBar
          key={cat}
          label={cat}
          value={model[cat]}
          accent={c.accent}
          editable={editable && modeOn}
          onChange={v => onCategoryChange(name, cat, v)}
          delta={deltas?.[name]?.[cat]}
          animKey={animKey}
        />
      ))}
    </div>
  );
}

// ─── ScoreRing ───────────────────────────────────────────────────────────────

function ScoreRing({ score }) {
  const r = 40, cx = 52, cy = 52;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;
  const color = score < 40 ? '#ef4444' : score < 70 ? '#f59e0b' : '#10b981';
  return (
    <svg width="104" height="104" className="mx-auto">
      <circle cx={cx} cy={cy} r={r} stroke="#1e293b" strokeWidth="10" fill="none" />
      <circle
        cx={cx} cy={cy} r={r}
        stroke={color} strokeWidth="10" fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="score-ring"
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      <text x={cx} y={cy + 6} textAnchor="middle" fill="white" fontSize="20" fontWeight="bold">{score}</text>
    </svg>
  );
}

// ─── EventLog ────────────────────────────────────────────────────────────────

function EventLog({ entries }) {
  return (
    <div className="rounded-2xl bg-slate-800/60 border border-slate-700/50 p-4 h-52 overflow-y-auto">
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Event Log</div>
      {entries.length === 0 && (
        <div className="text-slate-500 text-sm italic">No events yet. Switch to computer-mediated mode to begin.</div>
      )}
      {[...entries].reverse().map((e, i) => (
        <div key={i} className="log-entry text-sm text-slate-300 py-1.5 border-b border-slate-700/40 last:border-0 flex gap-2">
          <span className="text-indigo-400 shrink-0">›</span>
          <span>{e}</span>
        </div>
      ))}
    </div>
  );
}

// ─── SharedModelPanel ────────────────────────────────────────────────────────

function SharedModelPanel({ model, score, modeOn }) {
  if (!modeOn) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center p-10 min-h-64 text-center">
        <div className="text-4xl mb-3">🔒</div>
        <div className="text-slate-400 font-semibold">No Shared Object</div>
        <div className="text-slate-500 text-sm mt-2 max-w-xs">
          Without a computer-mediated shared model, participants have no common surface to revise together.
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-2xl shared-glow bg-indigo-950/50 border border-indigo-500/40 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="font-bold text-white text-base">Shared Model</div>
          <div className="text-xs text-indigo-300">Live average of all participants</div>
        </div>
        <div className="text-center">
          <ScoreRing score={score} />
          <div className="text-xs text-slate-400 mt-1">Shared Understanding</div>
        </div>
      </div>
      {CATEGORIES.map(cat => (
        <ModelBar key={cat} label={cat} value={model[cat]} accent="#818cf8" editable={false} onChange={() => {}} />
      ))}
    </div>
  );
}

// ─── DiffPills ───────────────────────────────────────────────────────────────

function DiffPills({ diffs }) {
  const entries = Object.entries(diffs).filter(([, v]) => v !== 0);
  if (entries.length === 0) return <span className="text-slate-600 text-xs">no change</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {entries.map(([cat, d]) => (
        <span
          key={cat}
          className={`text-xs font-mono px-1 rounded ${d > 0 ? 'text-emerald-400' : 'text-rose-400'}`}
        >
          {cat.slice(0, 3)} {d > 0 ? '+' : ''}{d}
        </span>
      ))}
    </span>
  );
}

// ─── ActionCard ──────────────────────────────────────────────────────────────
// mode='targeted' — hover reveals per-person picker buttons with score preview
// mode='all'      — hover reveals per-person diff rows + score delta + Fire button

function ActionCard({
  label, labelColor, borderColor, bgColor,
  description,
  mode,
  currentScore, models,
  actionType, previewScore, onFire,
  getPreview, onFireAll,
}) {
  const [hovered, setHovered] = useState(false);
  const names = Object.keys(models);
  const allPreview = (mode === 'all' && hovered) ? getPreview() : null;

  return (
    <div
      className={`w-full ${bgColor} border ${borderColor} rounded-xl px-4 py-3 transition-all`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className={`${labelColor} font-semibold text-xs`}>{label}</span>
        <span className="ml-auto text-slate-600 text-xs">
          {mode === 'targeted' ? 'hover to target' : 'hover to preview'}
        </span>
      </div>

      <p className="text-slate-400 text-xs leading-relaxed mb-2">{description}</p>

      {/* Targeted: 3 clickable participant buttons */}
      {mode === 'targeted' && (
        <div className={`grid grid-cols-3 gap-2 transition-opacity duration-200 ${hovered ? 'opacity-100' : 'opacity-40'}`}>
          {names.map(name => {
            const preview = previewScore(actionType, name);
            const delta = preview - currentScore;
            const isUp = delta >= 0;
            return (
              <button
                key={name}
                onClick={() => onFire(name)}
                className="flex flex-col items-center gap-1 rounded-lg py-2 px-1 border border-slate-700/50 bg-slate-900/60 hover:bg-slate-800/80 active:scale-95 transition-all"
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs"
                  style={{ background: PICKER_ACCENT[name] }}
                >
                  {name[0]}
                </div>
                <span className="text-slate-300 text-xs font-medium">{name}</span>
                <span className={`text-xs font-mono font-bold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isUp ? '▲' : '▼'}{Math.abs(delta)} pts
                </span>
                <span className="text-slate-500 text-xs">→ {preview}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* All: per-participant diff rows + score delta + fire button */}
      {mode === 'all' && (
        <div className={`transition-opacity duration-200 ${hovered ? 'opacity-100' : 'opacity-40'}`}>
          <div className="space-y-1.5 mb-3">
            {names.map(name => {
              const diffs = allPreview ? allPreview.diffs[name] : {};
              return (
                <div key={name} className="flex items-start gap-2 text-xs">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 mt-0.5"
                    style={{ background: PICKER_ACCENT[name] }}
                  >
                    {name[0]}
                  </div>
                  <DiffPills diffs={allPreview ? diffs : {}} />
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-3">
            {allPreview && (() => {
              const delta = allPreview.nextScore - currentScore;
              const isUp = delta >= 0;
              return (
                <span className={`text-xs font-mono font-bold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                  Score: {currentScore} → {allPreview.nextScore} ({isUp ? '+' : ''}{delta})
                </span>
              );
            })()}
            <button
              onClick={onFireAll}
              className={`ml-auto text-xs font-semibold px-3 py-1.5 rounded-lg ${bgColor} border ${borderColor} ${labelColor} hover:brightness-125 active:scale-95 transition-all`}
            >
              Fire →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── IntroScreen ─────────────────────────────────────────────────────────────

function IntroScreen({ onStart }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">

        <div className="text-center mb-10">
          <div className="inline-block text-xs font-semibold tracking-widest uppercase text-indigo-400 bg-indigo-950/60 border border-indigo-500/30 rounded-full px-4 py-1.5 mb-5">
            Interactive Simulation
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 leading-tight">
            Cooperative Modeling<br />
            <span className="text-indigo-400">Machine</span>
          </h1>
          <p className="text-slate-400 text-sm">
            Based on J.C.R. Licklider &amp; Robert W. Taylor —{' '}
            <em>"The Computer as a Communication Device"</em> (1968)
          </p>
        </div>

        <div className="rounded-2xl bg-slate-800/60 border border-slate-700/50 p-6 mb-5">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">The Central Argument</div>
          <p className="text-slate-300 text-sm leading-relaxed mb-4">
            In 1968, Licklider and Taylor made a radical claim: the computer's greatest power was not
            computation — it was <strong className="text-white">communication</strong>. But not communication
            as simple message-passing. They argued that real communication is{' '}
            <strong className="text-indigo-300">cooperative modeling</strong>: two or more people
            building, comparing, and revising a <em>shared mental model</em> of a situation together.
          </p>
          <p className="text-slate-300 text-sm leading-relaxed">
            Without a shared object to point at and edit, people in a meeting talk <em>about</em> their
            private models but never actually merge them. Misalignment stays invisible. The computer,
            Licklider and Taylor argued, could change this by becoming a live, shared surface — something
            everyone in the room could see, push on, and reshape together.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { icon: '🧠', title: 'Private Models', desc: 'Each person enters with their own understanding — shaped by role, data, and bias.' },
            { icon: '🖥️', title: 'Shared Surface', desc: 'The computer externalizes those models into one visible, editable object.' },
            { icon: '✦',  title: 'New Understanding', desc: 'The result is not just consensus — it is insight no one held at the start.' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="rounded-xl bg-slate-900/70 border border-slate-700/40 p-4 text-center">
              <div className="text-2xl mb-2">{icon}</div>
              <div className="text-white text-xs font-semibold mb-1">{title}</div>
              <div className="text-slate-500 text-xs leading-relaxed">{desc}</div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl bg-indigo-950/40 border border-indigo-500/30 p-5 mb-8">
          <div className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-3">What You'll Do</div>
          <ul className="space-y-2 text-sm text-slate-300">
            {[
              'Observe three participants — Alex, Mira, and Jordan — each with a different private model of the same project.',
              'Toggle between "no shared computer" and "computer-mediated" modes to see what changes.',
              'Use actions like Add Evidence, Challenge, and Align Models to drive the simulation.',
              'Watch the Shared Understanding score climb as private models converge — or drop when assumptions are challenged.',
              'Trigger a creative insight to see that communication can produce understanding beyond simple agreement.',
            ].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="text-indigo-400 font-mono shrink-0">{i + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="text-center">
          <button
            onClick={onStart}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-semibold text-base px-10 py-3.5 rounded-2xl transition-all shadow-lg shadow-indigo-900/40"
          >
            Start Simulation
            <span className="text-lg">→</span>
          </button>
          <p className="text-slate-600 text-xs mt-3">No login required — runs entirely in your browser</p>
        </div>

      </div>
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────

function App() {
  const [screen, setScreen] = useState('intro');
  const [models, setModels] = useState(structuredClone(INITIAL_MODELS));
  const [modeOn, setModeOn] = useState(false);
  const [log, setLog] = useState([]);
  const [deltas, setDeltas] = useState({});
  const [animKey, setAnimKey] = useState(0);

  const sharedModel = computeSharedModel(models);
  const score = computeScore(models);

  const addLog = useCallback((msg) => setLog(prev => [...prev, msg]), []);

  const applyWithDeltas = useCallback((oldModels, newModels) => {
    const d = {};
    Object.keys(newModels).forEach(name => {
      d[name] = {};
      CATEGORIES.forEach(cat => {
        const diff = newModels[name][cat] - oldModels[name][cat];
        if (diff !== 0) d[name][cat] = diff;
      });
    });
    setDeltas(d);
    setAnimKey(k => k + 1);
  }, []);

  const handleCategoryChange = useCallback((name, cat, val) => {
    setModels(prev => ({ ...prev, [name]: { ...prev[name], [cat]: val } }));
  }, []);

  const handleAlign = useCallback(() => {
    const shared = computeSharedModel(models);
    setModels(prev => {
      const next = {};
      Object.keys(prev).forEach(name => {
        next[name] = {};
        CATEGORIES.forEach(cat => {
          next[name][cat] = clamp(prev[name][cat] + (shared[cat] - prev[name][cat]) * 0.4);
        });
      });
      applyWithDeltas(prev, next);
      return next;
    });
    addLog('Private models moved closer to a common structure.');
  }, [models, addLog, applyWithDeltas]);

  const handleAddEvidence = useCallback((who) => {
    setModels(prev => {
      const boost = 12 + Math.floor(Math.random() * 8);
      const next = { ...prev, [who]: { ...prev[who], Evidence: clamp(prev[who].Evidence + boost) } };
      applyWithDeltas(prev, next);
      return next;
    });
    addLog(`${who} contributed new evidence to the shared model.`);
  }, [addLog, applyWithDeltas]);

  const handleChallenge = useCallback((who) => {
    const cat = ['Timeline', 'Goals', 'Risks'][Math.floor(Math.random() * 3)];
    setModels(prev => {
      const next = { ...prev, [who]: { ...prev[who], [cat]: clamp(prev[who][cat] - 15 - Math.floor(Math.random() * 10)) } };
      applyWithDeltas(prev, next);
      return next;
    });
    addLog(`${who} challenged the ${cat} assumption — view shifted.`);
  }, [addLog, applyWithDeltas]);

  const previewScore = useCallback((actionType, who) => {
    const boost = 15;
    const simModels = {
      ...models,
      [who]: {
        ...models[who],
        ...(actionType === 'evidence'
          ? { Evidence: clamp(models[who].Evidence + boost) }
          : { Goals: clamp(models[who].Goals - boost) })
      }
    };
    return computeScore(simModels);
  }, [models]);

  const getAlignPreview = useCallback(() => {
    const shared = computeSharedModel(models);
    const next = {};
    Object.keys(models).forEach(name => {
      next[name] = {};
      CATEGORIES.forEach(cat => {
        next[name][cat] = clamp(models[name][cat] + (shared[cat] - models[name][cat]) * 0.4);
      });
    });
    const diffs = {};
    Object.keys(models).forEach(name => {
      diffs[name] = {};
      CATEGORIES.forEach(cat => { const d = next[name][cat] - models[name][cat]; if (d !== 0) diffs[name][cat] = d; });
    });
    return { nextScore: computeScore(next), diffs };
  }, [models]);

  const getInsightPreview = useCallback(() => {
    const bumps = { Goals: 8, Evidence: 5, Risks: -10, Timeline: 6, 'Next Actions': 15 };
    const next = {};
    Object.keys(models).forEach(name => {
      next[name] = {};
      CATEGORIES.forEach(cat => { next[name][cat] = clamp(models[name][cat] + bumps[cat]); });
    });
    const diffs = {};
    Object.keys(models).forEach(name => {
      diffs[name] = {};
      CATEGORIES.forEach(cat => { const d = next[name][cat] - models[name][cat]; if (d !== 0) diffs[name][cat] = d; });
    });
    return { nextScore: computeScore(next), diffs };
  }, [models]);

  const getResetPreview = useCallback(() => {
    const diffs = {};
    Object.keys(models).forEach(name => {
      diffs[name] = {};
      CATEGORIES.forEach(cat => { const d = INITIAL_MODELS[name][cat] - models[name][cat]; if (d !== 0) diffs[name][cat] = d; });
    });
    return { nextScore: computeScore(INITIAL_MODELS), diffs };
  }, [models]);

  const handleInsight = useCallback(() => {
    const bumps = { Goals: 8, Evidence: 5, Risks: -10, Timeline: 6, 'Next Actions': 15 };
    setModels(prev => {
      const next = {};
      Object.keys(prev).forEach(name => {
        next[name] = {};
        CATEGORIES.forEach(cat => {
          next[name][cat] = clamp(prev[name][cat] + bumps[cat] + Math.floor(Math.random() * 6) - 3);
        });
      });
      applyWithDeltas(prev, next);
      return next;
    });
    addLog('A creative insight emerged — the shared model shifted beyond simple agreement.');
  }, [addLog, applyWithDeltas]);

  const handleReset = useCallback(() => {
    setModels(structuredClone(INITIAL_MODELS));
    setDeltas({});
    setLog([]);
    addLog('Meeting reset. Participants returned to their initial private models.');
  }, [addLog]);

  const toggleMode = useCallback(() => {
    setModeOn(prev => {
      const next = !prev;
      addLog(next
        ? 'Computer-mediated mode activated. A shared model surface is now available.'
        : 'Returned to no-shared-computer mode. Shared surface removed.');
      return next;
    });
  }, [addLog]);

  if (screen === 'intro') return <IntroScreen onStart={() => setScreen('sim')} />;

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto">

      <div className="mb-6">
        <button
          onClick={() => setScreen('intro')}
          className="text-xs text-slate-500 hover:text-slate-300 mb-3 flex items-center gap-1 transition-colors"
        >
          ← Back to Introduction
        </button>
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Cooperative Modeling Machine</h1>
        <p className="text-indigo-300 text-sm font-medium mb-3">
          Based on Licklider &amp; Taylor, "The Computer as a Communication Device" (1968)
        </p>
        <p className="text-slate-400 text-sm leading-relaxed max-w-3xl bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          Licklider and Taylor argued that real communication is not mere message transmission — it is{' '}
          <strong className="text-slate-200">cooperative modeling</strong>: people construct, compare, and revise
          a <em>shared model</em> of a situation. Without a computer, participants can only talk past each other.
          With one, they gain a shared, moldable object they can all see and edit together.
        </p>
      </div>

      <div className="flex items-center gap-4 mb-6 bg-slate-800/70 rounded-2xl p-4 border border-slate-700/50">
        <span className={`text-sm font-semibold ${!modeOn ? 'text-white' : 'text-slate-500'}`}>No Shared Computer</span>
        <button
          onClick={toggleMode}
          className={`relative w-14 h-7 rounded-full mode-btn focus:outline-none ${modeOn ? 'bg-indigo-600' : 'bg-slate-600'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform duration-300 ${modeOn ? 'translate-x-7' : 'translate-x-0'}`} />
        </button>
        <span className={`text-sm font-semibold ${modeOn ? 'text-indigo-300' : 'text-slate-500'}`}>Computer-Mediated Communication</span>
        {modeOn && <span className="ml-2 text-xs bg-indigo-600/40 text-indigo-200 px-2 py-0.5 rounded-full pulse">ACTIVE</span>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">

        <div className="space-y-4">
          <ParticipantCard name="Alex"   model={models.Alex}   editable modeOn={modeOn} onCategoryChange={handleCategoryChange} deltas={deltas} animKey={animKey} />
          <ParticipantCard name="Mira"   model={models.Mira}   editable modeOn={modeOn} onCategoryChange={handleCategoryChange} deltas={deltas} animKey={animKey} />
        </div>

        <div className="space-y-4">
          <SharedModelPanel model={sharedModel} score={score} modeOn={modeOn} />

          {modeOn && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Actions</div>

              <ActionCard
                label="+ Add Evidence" labelColor="text-emerald-300"
                borderColor="border-emerald-700/40" bgColor="bg-emerald-900/50"
                description={<>Their <em>Evidence</em> bar rises, pulling the shared model upward. Represents someone bringing a fact the group hadn't fully accounted for.</>}
                mode="targeted" actionType="evidence"
                currentScore={score} models={models}
                previewScore={previewScore} onFire={handleAddEvidence}
              />

              <ActionCard
                label="⚡ Challenge Assumption" labelColor="text-amber-300"
                borderColor="border-amber-700/40" bgColor="bg-amber-900/40"
                description={<>Pushes back on <em>Goals</em>, <em>Timeline</em>, or <em>Risks</em> — dropping that bar. Shows how shared understanding can regress when assumptions are questioned.</>}
                mode="targeted" actionType="challenge"
                currentScore={score} models={models}
                previewScore={previewScore} onFire={handleChallenge}
              />

              <ActionCard
                label="⟳ Align Models" labelColor="text-indigo-300"
                borderColor="border-indigo-700/40" bgColor="bg-indigo-900/50"
                description={<>Each participant moves 40% closer to the shared average. Press multiple times to watch convergence compound.</>}
                mode="all"
                currentScore={score} models={models}
                getPreview={getAlignPreview} onFireAll={handleAlign}
              />

              <ActionCard
                label="✦ Create Insight" labelColor="text-violet-300"
                borderColor="border-violet-700/40" bgColor="bg-violet-900/50"
                description={<><em>Goals</em>, <em>Timeline</em>, and <em>Next Actions</em> rise while <em>Risks</em> falls — a creative shift no single participant held beforehand.</>}
                mode="all"
                currentScore={score} models={models}
                getPreview={getInsightPreview} onFireAll={handleInsight}
              />

              <ActionCard
                label="↺ Reset Meeting" labelColor="text-slate-300"
                borderColor="border-slate-700/40" bgColor="bg-slate-800/60"
                description={<>Restores all participants to their original divergent positions and clears the event log.</>}
                mode="all"
                currentScore={score} models={models}
                getPreview={getResetPreview} onFireAll={handleReset}
              />
            </div>
          )}

          {modeOn && (
            <div className="text-xs text-slate-500 text-center">
              Score rises as participants' models converge.{' '}
              <span className="text-red-400">0–39</span> fragmented ·{' '}
              <span className="text-amber-400">40–69</span> partial ·{' '}
              <span className="text-emerald-400">70–100</span> aligned
            </div>
          )}
        </div>

        <div className="space-y-4">
          <ParticipantCard name="Jordan" model={models.Jordan} editable modeOn={modeOn} onCategoryChange={handleCategoryChange} deltas={deltas} animKey={animKey} />
          <EventLog entries={log} />
        </div>

      </div>

      {!modeOn && (
        <div className="mb-4 rounded-xl bg-rose-950/40 border border-rose-800/40 p-4 text-rose-300 text-sm text-center">
          Notice how each participant's model differs — but there is no shared surface for them to edit or converge on.
          Toggle the switch above to introduce the computer as a cooperative medium.
        </div>
      )}

      <div className="rounded-2xl bg-slate-800/50 border border-slate-700/50 p-5 mt-2">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Reflection</div>
        <p className="text-slate-400 text-sm leading-relaxed">
          This artifact translates Licklider and Taylor's argument into a working simulation. The computer is not treated
          as a passive message channel, but as a <strong className="text-slate-200">shared, moldable medium</strong> where
          participants externalize and revise their mental models. The "Create Insight" action demonstrates that
          computer-mediated communication is not merely about reaching consensus — it can generate new understanding
          that no single participant held beforehand, which is the essay's deepest claim.
        </p>
      </div>

    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
