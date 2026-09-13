import { DIFFICULTIES, DIFFICULTY_BAR, DIFFICULTY_TEXT, topicName } from '../constants.js'
import { formatDate } from '../progress.js'
import { REVIEW_INTERVALS } from '../review.js'
import Heatmap from './Heatmap.jsx'
import { ProblemRow } from './ProblemList.jsx'
import { DifficultyPill, PhaseBadge, ProblemLink, ProgressBar } from './QuestionControls.jsx'
import { ArrowRightIcon, BookmarkIcon, CalendarIcon, CheckIcon, FlameIcon } from './icons.jsx'

const CARD = 'rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgb(0_0_0/0.04)] sm:p-6'
const REVIEW_PREVIEW_COUNT = 5

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function CardHeader({ id, title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 id={id} className="text-base font-semibold text-ink">
          {title}
        </h2>
        {subtitle && <p className="mt-0.5 text-sm text-ink-3">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

function TextButton({ onClick, children }) {
  return (
    <button type="button" onClick={onClick} className="shrink-0 rounded-md text-sm font-medium text-brand-strong hover:underline">
      {children}
    </button>
  )
}

function Chip({ icon, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-subtle px-2.5 py-1 text-xs font-medium text-ink-2">
      {icon}
      {children}
    </span>
  )
}

function BackupBanner({ lastBackup, onBackupNow, onSnooze }) {
  return (
    <div role="status" className="mt-6 flex flex-col gap-3 rounded-2xl border border-medium/30 bg-medium/10 px-5 py-4 sm:flex-row sm:items-center sm:gap-6">
      <p className="flex-1 text-sm leading-6 text-ink-2">
        <span className="font-semibold text-ink">Back up your progress. </span>
        {lastBackup
          ? `Your last backup was on ${formatDate(lastBackup)}.`
          : 'It only lives in this browser, so clearing browser data would erase it.'}
      </p>
      <div className="flex shrink-0 gap-2">
        <button type="button" onClick={onBackupNow} className="h-9 rounded-lg bg-ink px-3.5 text-sm font-semibold text-canvas transition-opacity hover:opacity-85">
          Export backup
        </button>
        <button type="button" onClick={onSnooze} className="h-9 rounded-lg px-3 text-sm font-medium text-ink-2 transition-colors hover:bg-subtle hover:text-ink">
          Later
        </button>
      </div>
    </div>
  )
}

function ReviewCard({ reviewDue, progress, onReview, onOpenQuestion, onShowReview }) {
  const preview = reviewDue.slice(0, REVIEW_PREVIEW_COUNT)
  return (
    <section className={`${CARD} border-brand/30`} aria-labelledby="review-heading">
      <CardHeader
        id="review-heading"
        title={`Due for review · ${reviewDue.length}`}
        subtitle="Re-solve each one from scratch, then mark it revised."
        action={reviewDue.length > preview.length && <TextButton onClick={onShowReview}>See all</TextButton>}
      />
      <ul className="-mx-5 mt-4 divide-y divide-line/70 border-t border-line sm:-mx-6">
        {preview.map((question) => {
          const entry = progress[question.id]
          return (
            <li key={question.id} className="flex items-center gap-3 px-5 py-3 sm:gap-4 sm:px-6">
              <button type="button" onClick={() => onOpenQuestion(question.id)} className="group min-w-0 flex-1 text-left">
                <span className="block truncate text-sm font-medium text-ink group-hover:text-brand-strong">{question.problem}</span>
                <span className="block truncate text-xs text-ink-3">
                  {topicName(question.topic)} · review {(entry.reviews ?? 0) + 1} of {REVIEW_INTERVALS.length}
                </span>
              </button>
              <span className="hidden sm:inline-flex">
                <DifficultyPill difficulty={question.difficulty} />
              </span>
              <ProblemLink
                href={entry.link ?? question.link}
                verified={question.linkVerified || Boolean(entry.link)}
                platform={question.platform}
                problem={question.problem}
              />
              <button
                type="button"
                onClick={() => onReview(question.id)}
                className="h-8 shrink-0 rounded-lg border border-line px-3 text-xs font-semibold text-ink transition-colors hover:border-brand hover:bg-brand-soft hover:text-brand-strong"
              >
                Revised
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function UpNextCard({ upNext, progress, onSolve, onToggleBookmark, onOpenQuestion, onBrowse }) {
  return (
    <section className={CARD} aria-labelledby="up-next-heading">
      <CardHeader
        id="up-next-heading"
        title="Up next"
        subtitle="Core problems first, in study order. Tick each one when it’s done."
        action={<TextButton onClick={onBrowse}>All problems</TextButton>}
      />

      {upNext.length > 0 ? (
        <ul className="-mx-5 mt-4 divide-y divide-line/70 border-t border-line sm:-mx-6">
          {upNext.map((question) => (
            <ProblemRow
              key={question.id}
              question={question}
              solved={false}
              bookmarked={progress[question.id]?.bookmarked === true}
              due={false}
              link={progress[question.id]?.link ?? question.link}
              meta={`${topicName(question.topic)} · ${question.pattern}`}
              onToggleSolved={onSolve}
              onToggleBookmark={onToggleBookmark}
              onOpen={onOpenQuestion}
            />
          ))}
        </ul>
      ) : (
        <div className="mt-5 rounded-xl bg-brand-soft px-4 py-8 text-center">
          <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-brand text-brand-contrast">
            <CheckIcon className="h-5 w-5" />
          </span>
          <p className="mt-3 font-semibold text-ink">Every problem is solved</p>
          <p className="mt-1 text-sm text-ink-2">Keep up with your reviews to keep them fresh.</p>
        </div>
      )}
    </section>
  )
}

function ProgressCard({ stats, today }) {
  return (
    <section className={CARD} aria-labelledby="progress-heading">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="progress-heading" className="text-sm font-medium text-ink-2">
            Problems solved
          </h2>
          <p className="mt-1 flex items-baseline gap-1.5">
            <span className="text-4xl font-semibold tabular-nums tracking-tight text-ink">{stats.solved}</span>
            <span className="text-lg tabular-nums text-ink-3">/ {stats.total}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip icon={<FlameIcon className="h-3.5 w-3.5 text-medium" />}>
            {stats.streak > 0 ? `${stats.streak}-day streak` : 'Solve one today to start a streak'}
          </Chip>
          <Chip icon={<CalendarIcon className="h-3.5 w-3.5 text-ink-3" />}>{stats.thisWeek} this week</Chip>
        </div>
      </div>

      <ProgressBar value={stats.solved} total={stats.total} label="Overall progress" className="mt-5 h-2" />

      <dl className="mt-6 grid grid-cols-3 gap-4 sm:gap-6">
        {DIFFICULTIES.map((level) => {
          const counts = stats.difficulties[level]
          return (
            <div key={level}>
              <dt className={`text-xs font-semibold ${DIFFICULTY_TEXT[level]}`}>{level}</dt>
              <dd className="mt-1 text-sm tabular-nums text-ink-3">
                <span className="font-semibold text-ink">{counts.solved}</span> / {counts.total}
              </dd>
              <ProgressBar value={counts.solved} total={counts.total} className="mt-2 h-1" barClassName={DIFFICULTY_BAR[level]} />
            </div>
          )
        })}
      </dl>

      <div className="mt-6 border-t border-line pt-5">
        <Heatmap activity={stats.activity} today={today} />
      </div>
    </section>
  )
}

function StudyPlanCard({ phaseStats, currentPhase, onSelectPhase }) {
  return (
    <section className={CARD} aria-labelledby="plan-heading">
      <CardHeader id="plan-heading" title="Study plan" subtitle="Six phases, in order. Each builds on the last." />
      <ol className="-mx-2 mt-4 space-y-0.5">
        {phaseStats.map((phase) => {
          const current = phase.phase === currentPhase
          return (
            <li key={phase.phase}>
              <button
                type="button"
                onClick={() => onSelectPhase(phase.phase)}
                aria-current={current ? 'step' : undefined}
                className="group flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-subtle/70"
              >
                <PhaseBadge number={phase.phase} complete={phase.solved === phase.total} current={current} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className={`truncate text-sm group-hover:text-ink ${current ? 'font-semibold text-ink' : 'font-medium text-ink-2'}`}>
                      {phase.name}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-ink-3">
                      {phase.solved}/{phase.total}
                    </span>
                  </span>
                  <ProgressBar value={phase.solved} total={phase.total} className="mt-1.5 h-1" />
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function PatternCard({ patternStats, onShowPatterns }) {
  const started = patternStats.filter((pattern) => pattern.solved > 0).length
  const untouched = patternStats.filter((pattern) => pattern.solved === 0).slice(0, 3)

  return (
    <section className={CARD} aria-labelledby="pattern-heading">
      <CardHeader
        id="pattern-heading"
        title="Pattern coverage"
        subtitle={`${started} of ${patternStats.length} patterns started`}
        action={<TextButton onClick={onShowPatterns}>View all</TextButton>}
      />
      <ProgressBar value={started} total={patternStats.length} className="mt-4 h-1.5" />
      {untouched.length > 0 && (
        <p className="mt-3 text-xs leading-5 text-ink-3">
          Next untouched: <span className="text-ink-2">{untouched.map((pattern) => pattern.pattern).join(', ')}</span>
        </p>
      )}
    </section>
  )
}

function SavedCard({ savedPreview, savedCount, progress, onOpenQuestion, onShowSaved }) {
  return (
    <section className={CARD} aria-labelledby="saved-heading">
      <CardHeader
        id="saved-heading"
        title="Saved for revision"
        subtitle={savedCount > 0 ? `${savedCount} saved` : 'Nothing saved yet'}
        action={savedCount > 0 && <TextButton onClick={onShowSaved}>See all</TextButton>}
      />

      {savedPreview.length > 0 ? (
        <ul className="-mx-5 mt-4 divide-y divide-line/70 border-t border-line sm:-mx-6">
          {savedPreview.map((question) => (
            <li key={question.id}>
              <button
                type="button"
                onClick={() => onOpenQuestion(question.id)}
                className="group flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-subtle/50 sm:px-6"
              >
                <BookmarkIcon filled className="h-4 w-4 shrink-0 text-mark" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink group-hover:text-brand-strong">{question.problem}</span>
                  <span className="block truncate text-xs text-ink-3">{topicName(question.topic)}</span>
                </span>
                {progress[question.id]?.solved && <CheckIcon className="h-4 w-4 shrink-0 text-brand" />}
                <DifficultyPill difficulty={question.difficulty} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 rounded-xl border border-dashed border-line px-4 py-5 text-center text-sm leading-6 text-ink-3">
          Tap the <BookmarkIcon className="inline h-3.5 w-3.5 align-[-2px]" /> on a tricky problem and it will wait for you here.
        </p>
      )}
    </section>
  )
}

export default function Overview({
  stats,
  upNext,
  reviewDue,
  savedPreview,
  currentPhase,
  progress,
  today,
  showBackupReminder,
  lastBackup,
  onBackupNow,
  onSnoozeBackup,
  onSolve,
  onReview,
  onToggleBookmark,
  onOpenQuestion,
  onContinue,
  onSelectPhase,
  onShowSaved,
  onShowReview,
  onShowPatterns,
  onBrowse,
}) {
  const isNew = stats.solved === 0

  let headline = 'You finished the sheet'
  let subline = 'Every problem is solved. Keep your reviews up to date.'
  if (isNew) {
    headline = 'Let’s start your DSA sheet'
    subline = `${stats.total} problems in ${stats.phaseStats.length} phases. Begin with Phase 1 and tick problems off as you solve them.`
  } else if (currentPhase) {
    headline = `Phase ${currentPhase.phase}: ${currentPhase.name}`
    subline = `${currentPhase.solved} of ${currentPhase.total} solved in this phase. Keep going.`
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink-3">{greeting()}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{headline}</h1>
          <p className="mt-1.5 max-w-xl text-sm text-ink-2 sm:text-base">{subline}</p>
        </div>
        {upNext.length > 0 && (
          <button
            type="button"
            onClick={onContinue}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-brand-contrast shadow-sm transition-colors hover:bg-brand-strong"
          >
            {isNew ? 'Start practicing' : 'Continue practicing'}
            <ArrowRightIcon />
          </button>
        )}
      </header>

      {showBackupReminder && <BackupBanner lastBackup={lastBackup} onBackupNow={onBackupNow} onSnooze={onSnoozeBackup} />}

      <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-5 lg:col-span-2">
          {reviewDue.length > 0 && (
            <ReviewCard reviewDue={reviewDue} progress={progress} onReview={onReview} onOpenQuestion={onOpenQuestion} onShowReview={onShowReview} />
          )}
          <UpNextCard
            upNext={upNext}
            progress={progress}
            onSolve={onSolve}
            onToggleBookmark={onToggleBookmark}
            onOpenQuestion={onOpenQuestion}
            onBrowse={onBrowse}
          />
          <ProgressCard stats={stats} today={today} />
        </div>
        <div className="flex min-w-0 flex-col gap-5">
          <StudyPlanCard phaseStats={stats.phaseStats} currentPhase={currentPhase?.phase} onSelectPhase={onSelectPhase} />
          <PatternCard patternStats={stats.patternStats} onShowPatterns={onShowPatterns} />
          <SavedCard savedPreview={savedPreview} savedCount={stats.saved} progress={progress} onOpenQuestion={onOpenQuestion} onShowSaved={onShowSaved} />
        </div>
      </div>
    </div>
  )
}
