const { useState, useCallback } = React;

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORIES = ['Goals', 'Evidence', 'Risks', 'Timeline', 'Next Actions'];

const PARTICIPANT_COLORS = {
  Alex:   { bg: 'bg-violet-900/40', border: 'border-violet-500/40', accent: '#8b5cf6', badge: 'bg-violet-500' },
  Mira:   { bg: 'bg-emerald-900/40', border: 'border-emerald-500/40', accent: '#10b981', badge: 'bg-emerald-500' },
  Jordan: { bg: 'bg-amber-900/40',  border: 'border-amber-500/40',  accent: '#f59e0b', badge: 'bg-amber-500'  },
};

// Initial private models — intentionally divergent to show disagreement
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Compute the shared model as a straight average of all participants
function computeSharedModel(models) {
  const names = Object.keys(models);
  const shared = {};
  CATEGORIES.forEach(cat => {
    shared[cat] = Math.round(names.reduce((sum, n) => sum + models[n][cat], 0) / names.length);
  });
  return shared;
}

// Shared understanding score: 100 minus average std deviation across categories
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
  return Math.max(0, Math.min(100, Math.round(100 - avgStd * 1.2)));
}

// Clamp a value between 0 and 100
const clamp = v => Math.max(0, Math.min(100, Math.round(v)));

// ─── Sub-components ──────────────────────────────────────────────────────────

function ModelBar({ label, value, accent, editable, onChange }) {
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1 text-slate-400">
        <span>{label}</span>
        <span className="font-mono text-slate-300">{value}</span>
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

function ParticipantCard({ name, model, editable, onCategoryChange, modeOn }) {
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
        {modeOn && (
          <span className="ml-auto text-xs text-slate-500 italic">adjustable</span>
        )}
      </div>
      {CATEGORIES.map(cat => (
        <ModelBar
          key={cat}
          label={cat}
          value={model[cat]}
          accent={c.accent}
          editable={editable && modeOn}
          onChange={v => onCategoryChange(name, cat, v)}
        />
      ))}
    </div>
  );
}

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

function SharedModelPanel({ model, score, modeOn }) {
  if (!modeOn) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center p-10 min-h-64 text-center">
        <div className="text-4xl mb-3">🔒</div>
        <div className="text-slate-400 font-semibold">No Shared Object</div>
        <div className="text-slate-500 text-sm mt-2 max-w-xs">
          In Licklider & Taylor's framing, without a computer-mediated shared model, participants have no common surface to revise together.
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

// ─── Main App ─────────────────────────────────────────────────────────────────

function App() {
  const [models, setModels] = useState(structuredClone(INITIAL_MODELS));
  const [modeOn, setModeOn] = useState(false);
  const [log, setLog] = useState([]);

  const sharedModel = computeSharedModel(models);
  const score = computeScore(models);

  const addLog = useCallback((msg) => {
    setLog(prev => [...prev, msg]);
  }, []);

  // Update a single category for one participant
  const handleCategoryChange = useCallback((name, cat, val) => {
    setModels(prev => ({
      ...prev,
      [name]: { ...prev[name], [cat]: val }
    }));
  }, []);

  // Align: each participant's model moves 40% toward the current shared model
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
      return next;
    });
    addLog('Private models moved closer to a common structure.');
  }, [models, addLog]);

  // Add evidence: boost Evidence category for one random participant
  const handleAddEvidence = useCallback(() => {
    const names = Object.keys(models);
    const who = names[Math.floor(Math.random() * names.length)];
    setModels(prev => ({
      ...prev,
      [who]: { ...prev[who], Evidence: clamp(prev[who].Evidence + 12 + Math.floor(Math.random() * 8)) }
    }));
    addLog(`${who} contributed new evidence to the shared model.`);
  }, [models, addLog]);

  // Challenge assumption: deflate one participant's view on a random key category
  const handleChallenge = useCallback(() => {
    const names = Object.keys(models);
    const who = names[Math.floor(Math.random() * names.length)];
    const cat = ['Timeline', 'Goals', 'Risks'][Math.floor(Math.random() * 3)];
    setModels(prev => ({
      ...prev,
      [who]: { ...prev[who], [cat]: clamp(prev[who][cat] - 15 - Math.floor(Math.random() * 10)) }
    }));
    addLog(`${who} challenged the ${cat} assumption — view shifted.`);
  }, [models, addLog]);

  // Create insight: transforms the shared model in a new direction (not just averaging)
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
      return next;
    });
    addLog('A creative insight emerged — the shared model shifted beyond simple agreement.');
  }, [addLog]);

  // Reset to initial divergent state
  const handleReset = useCallback(() => {
    setModels(structuredClone(INITIAL_MODELS));
    setLog([]);
    addLog('Meeting reset. Participants returned to their initial private models.');
  }, [addLog]);

  const toggleMode = useCallback(() => {
    setModeOn(prev => {
      const next = !prev;
      if (next) {
        addLog('Computer-mediated mode activated. A shared model surface is now available.');
      } else {
        addLog('Returned to no-shared-computer mode. Shared surface removed.');
      }
      return next;
    });
  }, [addLog]);

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
          Cooperative Modeling Machine
        </h1>
        <p className="text-indigo-300 text-sm font-medium mb-3">
          Based on Licklider & Taylor, "The Computer as a Communication Device" (1968)
        </p>
        <p className="text-slate-400 text-sm leading-relaxed max-w-3xl bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          Licklider and Taylor argued that real communication is not mere message transmission — it is{' '}
          <strong className="text-slate-200">cooperative modeling</strong>: people construct, compare, and revise
          a <em>shared model</em> of a situation. Below, three participants each hold a private mental model
          of the same project. Without a computer, they can only talk past each other. With one, they gain
          a shared, moldable object they can all see and edit together.
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="flex items-center gap-4 mb-6 bg-slate-800/70 rounded-2xl p-4 border border-slate-700/50">
        <span className={`text-sm font-semibold ${!modeOn ? 'text-white' : 'text-slate-500'}`}>
          No Shared Computer
        </span>
        <button
          onClick={toggleMode}
          className={`relative w-14 h-7 rounded-full mode-btn focus:outline-none ${modeOn ? 'bg-indigo-600' : 'bg-slate-600'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform duration-300 ${modeOn ? 'translate-x-7' : 'translate-x-0'}`} />
        </button>
        <span className={`text-sm font-semibold ${modeOn ? 'text-indigo-300' : 'text-slate-500'}`}>
          Computer-Mediated Communication
        </span>
        {modeOn && <span className="ml-2 text-xs bg-indigo-600/40 text-indigo-200 px-2 py-0.5 rounded-full pulse">ACTIVE</span>}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">

        {/* Left participants */}
        <div className="space-y-4">
          <ParticipantCard name="Alex" model={models.Alex} editable modeOn={modeOn} onCategoryChange={handleCategoryChange} />
          <ParticipantCard name="Mira" model={models.Mira} editable modeOn={modeOn} onCategoryChange={handleCategoryChange} />
        </div>

        {/* Center: shared model + action buttons */}
        <div className="space-y-4">
          <SharedModelPanel model={sharedModel} score={score} modeOn={modeOn} />

          {/* Action buttons — only visible in mediated mode */}
          {modeOn && (
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: '+ Add Evidence',  fn: handleAddEvidence, color: 'bg-emerald-700 hover:bg-emerald-600' },
                { label: '⚡ Challenge',     fn: handleChallenge,   color: 'bg-amber-700 hover:bg-amber-600'   },
                { label: '⟳ Align Models',  fn: handleAlign,       color: 'bg-indigo-700 hover:bg-indigo-600' },
                { label: '✦ Create Insight',fn: handleInsight,     color: 'bg-violet-700 hover:bg-violet-600' },
              ].map(({ label, fn, color }) => (
                <button
                  key={label}
                  onClick={fn}
                  className={`${color} text-white text-xs font-semibold rounded-xl px-3 py-2.5 transition-all active:scale-95`}
                >
                  {label}
                </button>
              ))}
              <button
                onClick={handleReset}
                className="col-span-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold rounded-xl px-3 py-2.5 transition-all active:scale-95"
              >
                ↺ Reset Meeting
              </button>
            </div>
          )}

          {/* Score legend */}
          {modeOn && (
            <div className="text-xs text-slate-500 text-center">
              Score rises as participants' models converge.{' '}
              <span className="text-red-400">0–39</span> fragmented ·{' '}
              <span className="text-amber-400">40–69</span> partial ·{' '}
              <span className="text-emerald-400">70–100</span> aligned
            </div>
          )}
        </div>

        {/* Right participant + event log */}
        <div className="space-y-4">
          <ParticipantCard name="Jordan" model={models.Jordan} editable modeOn={modeOn} onCategoryChange={handleCategoryChange} />
          <EventLog entries={log} />
        </div>
      </div>

      {/* Divergence hint shown only in no-computer mode */}
      {!modeOn && (
        <div className="mb-4 rounded-xl bg-rose-950/40 border border-rose-800/40 p-4 text-rose-300 text-sm text-center">
          Notice how each participant's model differs — but there is no shared surface for them to edit or converge on.
          Toggle the switch above to introduce the computer as a cooperative medium.
        </div>
      )}

      {/* Reflection box */}
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
