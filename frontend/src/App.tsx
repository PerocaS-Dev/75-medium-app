export default function App() {
  return (
    <div className="min-h-screen bg-clay-50 flex flex-col items-center justify-center px-gutter gap-6">
      <div className="text-center animate-rise">
        <p className="font-sans text-sm text-clay-500 tracking-widest uppercase mb-3">
          the 75-day challenge
        </p>
        <h1 className="font-display text-display text-clay-950">
          75 Medium
        </h1>
        <p className="font-sans text-lg text-clay-500 mt-4 max-w-xs mx-auto">
          Accountability-first. Custom rules. Real friends watching.
        </p>
      </div>

      <div className="flex gap-2 flex-wrap justify-center mt-2">
        {[
          { label: 'streak',      bg: 'bg-blush-200',  text: 'text-clay-700' },
          { label: 'friends',     bg: 'bg-lilac-200',  text: 'text-clay-700' },
          { label: 'daily tasks', bg: 'bg-sage-100',   text: 'text-clay-700' },
          { label: 'journals',    bg: 'bg-peach-100',  text: 'text-clay-700' },
        ].map(({ label, bg, text }) => (
          <span
            key={label}
            className={`px-3 py-1 rounded-pill ${bg} ${text} font-sans text-sm`}
          >
            {label}
          </span>
        ))}
      </div>

      <p className="font-sans text-caption text-clay-400 mt-6">
        Scaffold complete — Chunk 0 ✓
      </p>
    </div>
  )
}
