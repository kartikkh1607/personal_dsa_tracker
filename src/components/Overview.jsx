import { DIFFICULTIES, DIFFICULTY_BAR, DIFFICULTY_TEXT, topicName } from '../constants.js'
import { formatDate, hasNote } from '../progress.js'
import { isLapsed, REVIEW_INTERVALS, struggleCount } from '../review.js'
import Heatmap from './Heatmap.jsx'
import { ProblemRow } from './ProblemList.jsx'
import { DifficultyPill, NOTE_ACCENT, NoteMark, PhaseBadge, ProblemLink, ProgressBar } from './QuestionControls.jsx'
import Credit from './Credit.jsx'
import { ArrowRightIcon, BookmarkIcon, CalendarIcon, CheckIcon, FlameIcon } from './icons.jsx'

const CARD = 'rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgb(0_0_0/0.04)] sm:p-6'
const REVIEW_PREVIEW_COUNT = 5

// The two review outcomes sit side by side, so they read as one question -
// "how did that go?" - rather than one button and an escape hatch. On a phone
// they take their own full-width row below the problem, which keeps the name
// readable and gives both a proper touch target.
function ReviewActions({ onGotIt, onStruggled, problem, stacked = false }) {
  const shape = stacked ? 'h-11 flex-1 text-sm' : 'h-8 px-2.5 text-xs sm:px-3'
  return (
    <div className={stacked ? 'flex gap-2' : 'flex shrink-0 items-center gap-1.5'}>
      <button
        type="button"
        onClick={onGotIt}
        aria-label={`Got it: ${problem}`}
        className={`rounded-lg border border-line font-semibold text-ink transition-colors hover:border-brand hover:bg-brand-soft hover:text-brand-strong ${shape}`}
      >
        Got it
      </button>
      <button
        type="button"
        onClick={onStruggled}
        aria-label={`Struggled with: ${problem}`}
        title="Back in 3 days, and saved for revision"
        className={`rounded-lg border border-line font-semibold text-ink-2 transition-colors hover:border-medium hover:bg-medium/10 hover:text-medium ${shape}`}
      >
        Struggled
      </button>
    </div>
  )
}

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

// Nothing due. Worth a card of its own rather than an absent one: having
// cleared the schedule is the good outcome, and a section that quietly
// disappears reads as something broken rather than something finished.
function CaughtUpCard({ backlogCount }) {
  return (
    <section className={`${CARD} border-brand/30`} aria-labelledby="review-heading">
      <CardHeader
        id="review-heading"
        title="You’re caught up"
        subtitle={
          backlogCount === 0
            ? 'Nothing is due for review today. Solve something new, or come back when the schedule brings these round again.'
            : 'Nothing left for today. The rest come round on their own schedule.'
        }
      />
    </section>
  )
}

function ReviewCard({ reviewToday, backlogCount, progress, onReview, onOpenQuestion, onShowReview }) {
  const preview = reviewToday.slice(0, REVIEW_PREVIEW_COUNT)
  const held = backlogCount - reviewToday.length
  return (
    <section className={`${CARD} border-brand/30`} aria-labelledby="review-heading">
      <CardHeader
        id="review-heading"
        title={`Today’s reviews · ${reviewToday.length}`}
        subtitle={
          held > 0
            ? `${reviewToday.length} of ${backlogCount} — the most overdue first. The rest are held back so today stays finishable.`
            : 'Re-solve each one from scratch, then say how it went.'
        }
        action={backlogCount > preview.length && <TextButton onClick={onShowReview}>See all</TextButton>}
      />
      <ul className="-mx-5 mt-4 divide-y divide-line/70 border-t border-line sm:-mx-6">
        {preview.map((question) => {
          const entry = progress[question.id]
          return (
            <li key={question.id} data-review-row className={`px-5 py-3 sm:px-6 ${hasNote(entry) ? NOTE_ACCENT : ''}`}>
              <div className="flex items-center gap-3 sm:gap-4">
              <button type="button" onClick={() => onOpenQuestion(question.id)} className="group min-w-0 flex-1 text-left">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-medium text-ink group-hover:text-brand-strong">{question.problem}</span>
                  {hasNote(entry) && <NoteMark />}
                </span>
                <span className="block truncate text-xs text-ink-3">
                  {isLapsed(entry) ? (
                    <span className="font-medium text-medium">Relearn · struggled last time</span>
                  ) : (
                    `${topicName(question.topic)} · review ${(entry.reviews ?? 0) + 1} of ${REVIEW_INTERVALS.length}`
                  )}
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
              <span className="hidden sm:inline-flex">
                <ReviewActions
                  problem={question.problem}
                  onGotIt={() => onReview(question.id, 'got')}
                  onStruggled={() => onReview(question.id, 'struggled')}
                />
              </span>
              </div>
              <div className="mt-2.5 sm:hidden">
                <ReviewActions
                  stacked
                  problem={question.problem}
                  onGotIt={() => onReview(question.id, 'got')}
                  onStruggled={() => onReview(question.id, 'struggled')}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

// Problems you've failed to re-solve twice or more. This is the one signal the
// tracker has that a pattern hasn't landed yet, so it says so plainly rather
// than hiding it in a count.
function WeakCard({ weakProblems, weakCount, progress, onOpenQuestion }) {
  // No weak spots is a result, not an empty list, so it says so rather than
  // leaving a gap where a card used to be.
  if (weakCount === 0) {
    return (
      <section className={CARD} aria-labelledby="weak-heading">
        <CardHeader
          id="weak-heading"
          title="No weak spots"
          subtitle="Nothing has tripped you up twice. Anything you struggle with twice shows up here."
        />
      </section>
    )
  }

  return (
    <section className={`${CARD} border-medium/30`} aria-labelledby="weak-heading">
      <CardHeader
        id="weak-heading"
        title={`Weak spots · ${weakCount}`}
        subtitle="Struggled with these twice or more. Worth extra reps."
      />
      <ul className="-mx-5 mt-4 divide-y divide-line/70 border-t border-line sm:-mx-6">
        {weakProblems.map((question) => {
          const entry = progress[question.id]
          const struggles = struggleCount(entry)
          return (
            <li key={question.id} className={hasNote(entry) ? NOTE_ACCENT : ''}>
              <button
                type="button"
                onClick={() => onOpenQuestion(question.id)}
                className="group flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-subtle/50 sm:px-6"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium text-ink group-hover:text-brand-strong">{question.problem}</span>
                    {hasNote(entry) && <NoteMark />}
                  </span>
                  <span className="block truncate text-xs text-ink-3">
                    {topicName(question.topic)} · {question.pattern}
                  </span>
                </span>
                <span className="shrink-0 rounded-md bg-medium/10 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-medium">
                  {struggles}×
                </span>
                <DifficultyPill difficulty={question.difficulty} />
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
        subtitle="The sheet’s study path, step by step. Tick each one when it’s done."
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
              noted={hasNote(progress[question.id])}
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
            {stats.streak > 0 ? `${stats.streak}-day streak` : 'Solve or review one today to start a streak'}
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
                className={`group flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-subtle/50 sm:px-6 ${
                  hasNote(progress[question.id]) ? NOTE_ACCENT : ''
                }`}
              >
                <BookmarkIcon filled className="h-4 w-4 shrink-0 text-mark" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium text-ink group-hover:text-brand-strong">{question.problem}</span>
                    {hasNote(progress[question.id]) && <NoteMark />}
                  </span>
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
  reviewToday,
  reviewBacklog,
  savedPreview,
  weakProblems,
  weakCount,
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
  const backlogCount = reviewBacklog.length
  const held = backlogCount - reviewToday.length

  // Home is meant to answer "what am I doing today", so the headline is today's
  // work rather than a running total. The phase is still the context, but it is
  // the second thing said, not the first.
  let headline = 'You finished the sheet'
  let subline = 'Every problem is solved. Keep your reviews up to date.'
  if (isNew) {
    headline = 'Let’s start your DSA sheet'
    subline = `${stats.total} problems in ${stats.phaseStats.length} phases. Begin with Phase 1 and tick problems off as you solve them.`
  } else if (reviewToday.length > 0) {
    headline = `Today: ${reviewToday.length} ${reviewToday.length === 1 ? 'review' : 'reviews'}`
    const tail = currentPhase ? `, then carry on with Phase ${currentPhase.phase}.` : '.'
    subline = held > 0 ? `${held} more are due but held back for later${tail}` : `Re-solve each from scratch${tail}`
  } else if (currentPhase) {
    headline = `Today: Phase ${currentPhase.phase}`
    subline = `Nothing due for review. ${currentPhase.solved} of ${currentPhase.total} solved in ${currentPhase.name}.`
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
          {reviewToday.length > 0 ? (
            <ReviewCard
              reviewToday={reviewToday}
              backlogCount={backlogCount}
              progress={progress}
              onReview={onReview}
              onOpenQuestion={onOpenQuestion}
              onShowReview={onShowReview}
            />
          ) : (
            !isNew && <CaughtUpCard backlogCount={backlogCount} />
          )}
          {!isNew && <WeakCard weakProblems={weakProblems} weakCount={weakCount} progress={progress} onOpenQuestion={onOpenQuestion} />}
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

      <Credit />
    </div>
  )
}
