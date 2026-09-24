import { topicName } from '../constants.js'
import { formatDate, hasNote } from '../progress.js'
import { struggleCount } from '../review.js'
import Heatmap from './Heatmap.jsx'
import { Difficulty, NoteMark, SolvedCheck } from './QuestionControls.jsx'
import Credit from './Credit.jsx'
import { ArrowRightIcon } from './icons.jsx'
import DueBoard from './home/DueBoard.jsx'
import { Empty, ListHead } from './home/ListHead.jsx'
import PatternsPreview from './home/PatternsPreview.jsx'
import StudyPlan from './home/StudyPlan.jsx'

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

// "Thu 24.09 · good morning". The label style uppercases it.
function eyebrow(today) {
  const [, month, day] = today.split('-')
  const weekday = new Date(`${today}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short' })
  return `${weekday} ${day}.${month} · ${greeting()}`
}

function Figure({ value, label }) {
  return (
    <div className="min-w-[76px]">
      <dd className="fig">{value}</dd>
      <dt className="lbl mt-[5px]">{label}</dt>
    </div>
  )
}

function BackupBanner({ lastBackup, onBackupNow, onSnooze }) {
  return (
    <div role="status" className="mb-2 flex flex-col gap-3 rounded-2xl bg-warn px-4 py-3 text-onwarn sm:flex-row sm:items-center sm:gap-6">
      <p className="flex-1 text-[13px] leading-5">
        <span className="font-semibold">Back up your progress. </span>
        {lastBackup
          ? `Your last backup was on ${formatDate(lastBackup)}.`
          : 'It only lives in this browser, so clearing browser data would erase it.'}
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <button type="button" onClick={onBackupNow} className="btn-primary">
          Export backup
        </button>
        <button type="button" onClick={onSnooze} className="rounded-lg px-3 py-2 text-[13px] font-medium hover:underline">
          Later
        </button>
      </div>
    </div>
  )
}

// What the app expects of you, said once, on a tracker with nothing in it yet.
//
// The three things are the ones that aren't guessable from the interface: that
// ticking is the whole input, that a solved problem comes back on a schedule
// rather than being finished with, and that none of it needs an account. It
// dismisses for good, because an introduction that keeps introducing itself is
// just a banner.
function GettingStartedCard({ total, onDismiss }) {
  const steps = [
    [
      'Tick a problem when you solve it.',
      <> That is the only thing you have to do — all {total} are listed under Problems, in the order the sheet intends.</>,
    ],
    [
      'Solved problems come back.',
      ' Each returns after 7, 30 and 90 days to be re-solved from scratch. Say how it went and the schedule adjusts — a capped handful a day, so it stays finishable.',
    ],
    [
      'Your progress stays in this browser.',
      <>
        {' '}No account needed. Export a backup from the <span className="font-medium text-ink">⋯</span> menu, or sign in there to mirror it
        to your other devices.
      </>,
    ],
  ]
  return (
    <section className="mt-2 rounded-2xl border border-line bg-card p-5" aria-labelledby="getting-started-heading">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="getting-started-heading" className="lbl">
          How this works
        </h2>
        <button type="button" onClick={onDismiss} className="sech-link">
          Got it
        </button>
      </div>
      <ol className="mt-3 grid gap-4 md:grid-cols-3">
        {steps.map(([lead, rest], index) => (
          <li key={index} className="flex gap-3">
            <span aria-hidden="true" className="mono pt-px text-[11px] text-accent">
              {String(index + 1).padStart(2, '0')}
            </span>
            <p className="text-[13px] leading-5 text-muted">
              <span className="font-semibold text-ink">{lead}</span>
              {rest}
            </p>
          </li>
        ))}
      </ol>
    </section>
  )
}

// Nothing due at all. Said rather than left blank: having cleared the schedule
// is the good outcome, and a section that quietly disappears reads as
// something broken rather than something finished.
function CaughtUp({ currentPhase, onContinue }) {
  return (
    <>
      <div className="sech">
        <p className="lbl">Due today — 0</p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line py-4">
        <div>
          <h2 id="review-heading" className="text-[15px] font-semibold">
            You’re caught up
          </h2>
          <p className="mt-1 text-[13px] text-muted">
            Nothing is due for review today. Solve something new, or come back when the schedule brings these round again.
          </p>
        </div>
        {currentPhase && (
          <button type="button" onClick={onContinue} className="btn-primary">
            Continue with Phase {currentPhase.phase}
            <ArrowRightIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </>
  )
}

// The day's reviews are done but the backlog isn't empty. This is a stopping
// point, not a wall: the next batch is one button away, and asking for it is a
// deliberate act rather than the list quietly refilling itself.
function DoneForToday({ reviewedToday, remaining, onReviewMore }) {
  return (
    <>
      <div className="sech">
        <p className="lbl">Due today — {remaining} held</p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line py-4">
        <div>
          <h2 id="review-heading" className="text-[15px] font-semibold">
            Done for today — {remaining} still due
          </h2>
          <p className="mt-1 text-[13px] text-muted">
            {reviewedToday} reviewed today. {remaining} still due — they’ll keep until tomorrow.
          </p>
        </div>
        <button type="button" onClick={onReviewMore} className="btn-line">
          Review more
        </button>
      </div>
    </>
  )
}

function UpNext({ upNext, currentPhase, progress, onSolve, onOpenQuestion, onContinue }) {
  return (
    <section aria-labelledby="up-next-heading">
      <ListHead
        id="up-next-heading"
        action={
          upNext.length > 0 && (
            <button type="button" onClick={onContinue} className="sech-link ml-auto">
              Continue →
            </button>
          )
        }
      >
        Up next{currentPhase && ` · Ph.${currentPhase.phase} ${currentPhase.name}`}
      </ListHead>
      {upNext.length > 0 ? (
        <ul>
          {upNext.map((question) => (
            <li key={question.id} className="flex items-center gap-[11px] border-b border-line px-0.5 py-2 text-[13px] hover:bg-low">
              <SolvedCheck solved={false} problem={question.problem} onToggle={() => onSolve(question.id)} />
              <button type="button" onClick={() => onOpenQuestion(question.id)} className="flex min-w-0 flex-1 items-center gap-1.5 rounded text-left hover:text-accent">
                <span className="truncate">{question.problem}</span>
                {hasNote(progress[question.id]) && <NoteMark />}
              </button>
              <Difficulty difficulty={question.difficulty} />
            </li>
          ))}
        </ul>
      ) : (
        <Empty>Every problem is solved. Keep up with your reviews to keep them fresh.</Empty>
      )}
    </section>
  )
}

// Problems you've failed to re-solve twice or more. This is the one signal the
// tracker has that a pattern hasn't landed yet, so it says so plainly.
function WeakSpots({ weakProblems, weakCount, progress, onOpenQuestion }) {
  return (
    <section aria-labelledby="weak-heading">
      <ListHead id="weak-heading">Weak spots · {weakCount}</ListHead>
      {weakCount === 0 ? (
        <Empty>No weak spots. Anything you struggle with twice shows up here.</Empty>
      ) : (
        <ul>
          {weakProblems.map((question) => (
            <li key={question.id}>
              <button
                type="button"
                onClick={() => onOpenQuestion(question.id)}
                className="group flex w-full items-center gap-[11px] border-b border-line px-0.5 py-2 text-left text-[13px] hover:bg-low"
              >
                <span className="mono w-6 shrink-0 text-[11.5px] font-semibold text-accent" title="Times struggled">
                  {struggleCount(progress[question.id])}×
                </span>
                <span className="min-w-0 flex-1 truncate group-hover:text-accent">{question.problem}</span>
                <span className="step hidden max-w-[45%] truncate sm:inline">{question.pattern}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function Saved({ savedPreview, savedCount, onOpenQuestion, onShowSaved }) {
  return (
    <section aria-labelledby="saved-heading" className="mt-6">
      <ListHead
        id="saved-heading"
        action={
          savedCount > 0 && (
            <button type="button" onClick={onShowSaved} className="sech-link ml-auto">
              See all →
            </button>
          )
        }
      >
        Saved · {savedCount}
      </ListHead>
      {savedPreview.length > 0 ? (
        <ul>
          {savedPreview.map((question) => (
            <li key={question.id}>
              <button
                type="button"
                onClick={() => onOpenQuestion(question.id)}
                className="group flex w-full items-center gap-[11px] border-b border-line px-0.5 py-2 text-left text-[13px] hover:bg-low"
              >
                <span className="min-w-0 flex-1 truncate group-hover:text-accent">{question.problem}</span>
                <span className="step hidden max-w-[45%] truncate sm:inline">{topicName(question.topic)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <Empty>Nothing saved yet. Bookmark a tricky problem and it will wait here.</Empty>
      )}
    </section>
  )
}

export default function Overview({
  stats,
  upNext,
  reviewToday,
  reviewBacklog,
  reviewedToday,
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
  onOpenQuestion,
  onContinue,
  onSelectPhase,
  onShowSaved,
  onShowReview,
  onReviewMore,
  showGettingStarted,
  onDismissGettingStarted,
  onShowPatterns,
  onOpenPattern,
}) {
  const isNew = stats.solved === 0
  const backlogCount = reviewBacklog.length
  const held = backlogCount - reviewToday.length
  // The day's reviews are spent, but there is still a backlog waiting.
  const doneForToday = reviewToday.length === 0 && backlogCount > 0

  // Home is meant to answer "what am I doing today", so the headline is today's
  // work rather than a running total. The phase is still the context, but it is
  // the second thing said, not the first.
  let headline = 'You finished the sheet'
  let subline = 'Every problem is solved. Keep your reviews up to date.'
  const then = currentPhase ? `, then Phase ${currentPhase.phase}` : ''
  if (isNew) {
    headline = 'Let’s start your DSA sheet'
    subline = `${stats.total} problems in ${stats.phaseStats.length} phases. Begin with Phase 1 and tick problems off as you solve them.`
  } else if (doneForToday) {
    headline = (
      <>
        Today: <em>reviews done</em>
        {then}
      </>
    )
    subline = `${reviewedToday} reviewed today, ${backlogCount} still due. Carry on with the plan, or review more.`
  } else if (reviewToday.length > 0) {
    headline = (
      <>
        Today:{' '}
        <em>
          {reviewToday.length} {reviewToday.length === 1 ? 'review' : 'reviews'}
        </em>
        {then}
      </>
    )
    subline =
      held > 0
        ? `${held} more are due but held back so today stays finishable. Most overdue first.`
        : 'Re-solve each from scratch, then say how it went. Most overdue first.'
  } else if (currentPhase) {
    headline = (
      <>
        Today: <em>Phase {currentPhase.phase}</em>
      </>
    )
    subline = `Nothing due for review. ${currentPhase.solved} of ${currentPhase.total} solved in ${currentPhase.name}.`
  }

  return (
    <div className="shell">
      <header className="grid grid-cols-1 items-end gap-5 pb-5 pt-[30px] min-[760px]:grid-cols-[minmax(0,1fr)_auto] min-[760px]:gap-8">
        <div className="min-w-0">
          <p className="lbl">{eyebrow(today)}</p>
          <h1 className="headline mt-2">{headline}</h1>
          <p className="mt-[11px] max-w-[52ch] text-[13.5px] text-muted">{subline}</p>
          {isNew && upNext.length > 0 && (
            <button type="button" onClick={onContinue} className="btn-primary mt-4">
              Start practicing
              <ArrowRightIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <dl className="flex gap-[30px]">
          <Figure value={stats.solved} label={`Solved /${stats.total}`} />
          <Figure value={String(stats.streak).padStart(2, '0')} label="Day streak" />
          <Figure value={String(stats.thisWeek).padStart(2, '0')} label="This week" />
        </dl>
      </header>

      {showBackupReminder && <BackupBanner lastBackup={lastBackup} onBackupNow={onBackupNow} onSnooze={onSnoozeBackup} />}
      {showGettingStarted && <GettingStartedCard total={stats.total} onDismiss={onDismissGettingStarted} />}

      {!isNew && (
        <section className="sec" aria-labelledby="review-heading">
          {reviewToday.length > 0 ? (
            <DueBoard
              reviewToday={reviewToday}
              backlogCount={backlogCount}
              progress={progress}
              onReview={onReview}
              onOpenQuestion={onOpenQuestion}
              onShowReview={onShowReview}
            />
          ) : doneForToday ? (
            <DoneForToday reviewedToday={reviewedToday} remaining={backlogCount} onReviewMore={onReviewMore} />
          ) : (
            <CaughtUp currentPhase={currentPhase} onContinue={onContinue} />
          )}
        </section>
      )}

      <div className="sec grid grid-cols-1 gap-[30px] min-[701px]:grid-cols-2 min-[1001px]:grid-cols-[minmax(0,1.1fr)_minmax(0,1.1fr)_minmax(0,.8fr)]">
        <UpNext upNext={upNext} currentPhase={currentPhase} progress={progress} onSolve={onSolve} onOpenQuestion={onOpenQuestion} onContinue={onContinue} />
        <div>
          <WeakSpots weakProblems={weakProblems} weakCount={weakCount} progress={progress} onOpenQuestion={onOpenQuestion} />
          <Saved savedPreview={savedPreview} savedCount={stats.saved} onOpenQuestion={onOpenQuestion} onShowSaved={onShowSaved} />
        </div>
        <PatternsPreview patternStats={stats.patternStats} onShowPatterns={onShowPatterns} onOpenPattern={onOpenPattern} />
      </div>

      <section className="sec" aria-labelledby="plan-heading">
        <StudyPlan phaseStats={stats.phaseStats} difficulties={stats.difficulties} currentPhase={currentPhase?.phase} onSelectPhase={onSelectPhase} />
      </section>

      <section className="sec" aria-labelledby="activity-heading">
        <Heatmap activity={stats.activity} today={today} />
      </section>

      <Credit />
    </div>
  )
}
