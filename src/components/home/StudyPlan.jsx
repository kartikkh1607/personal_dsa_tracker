import { DIFFICULTIES, DIFFICULTY_LETTER } from '../../constants.js'
import { ProgressBar } from '../QuestionControls.jsx'

// The six phases as one strip rather than six cards.
export default function StudyPlan({ phaseStats, difficulties, currentPhase, onSelectPhase }) {
  return (
    <>
      <div className="sech">
        <h2 id="plan-heading" className="lbl">
          Study plan · {phaseStats.length} phases
        </h2>
        <p className="lbl ml-auto">
          {DIFFICULTIES.map((level) => `${DIFFICULTY_LETTER[level]} ${difficulties[level].solved}/${difficulties[level].total}`).join(' · ')}
        </p>
      </div>
      <ol className="grid grid-cols-2 gap-4 pt-1 min-[521px]:grid-cols-3 min-[901px]:grid-cols-6" aria-labelledby="plan-heading">
        {phaseStats.map((phase) => {
          const current = phase.phase === currentPhase
          return (
            <li key={phase.phase}>
              <button
                type="button"
                onClick={() => onSelectPhase(phase.phase)}
                aria-current={current ? 'step' : undefined}
                className="group block w-full rounded text-left"
              >
                <span className="mono text-[10.5px] text-muted">{String(phase.phase).padStart(2, '0')}</span>
                <span className={`mb-[7px] mt-[3px] block truncate text-[12.5px] font-[550] group-hover:underline ${current ? 'text-accent' : ''}`}>
                  {phase.name}
                </span>
                <ProgressBar value={phase.solved} total={phase.total} label={`${phase.name}: ${phase.solved} of ${phase.total} solved`} />
                <span className="mono mt-1.5 block text-[11px] text-muted">
                  {phase.solved}/{phase.total}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </>
  )
}
