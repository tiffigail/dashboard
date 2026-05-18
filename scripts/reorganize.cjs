#!/usr/bin/env node
// Phase 1: Update all @/ import paths across every source file.
// Phase 2: Move the folders (safe — imports are already updated).
const fs = require('fs');
const path = require('path');

const SRC = '/home/aharr/gearshift-dashboard/src';
const COMP = `${SRC}/components`;

const moves = [
  // PAGES
  ['NowView',                 'pages/NowView'],
  ['DailyView',               'pages/DailyView'],
  ['WeeklyView',              'pages/WeeklyView'],
  ['MonthlyView',             'pages/MonthlyView'],
  ['YearlyView',              'pages/YearlyView'],
  ['ParetoView',              'pages/ParetoView'],
  ['LifeMapView',             'pages/LifeMapView'],
  ['Welcome',                 'pages/Welcome'],
  ['Showcase',                'pages/Showcase'],
  ['Contact',                 'pages/Contact'],
  ['LoginPage',               'pages/LoginPage'],

  // FEATURES — physical
  ['PhysicalDashboard',           'features/physical/PhysicalDashboard'],
  ['PhysicalGoalsTracker',        'features/physical/PhysicalGoalsTracker'],
  ['PhysicalMetricsChart',        'features/physical/PhysicalMetricsChart'],
  ['CardioSessionLogger',         'features/physical/CardioSessionLogger'],
  ['WorkoutSessionLogger',        'features/physical/WorkoutSessionLogger'],
  ['QuickWorkoutLogger',          'features/physical/QuickWorkoutLogger'],
  ['StepLogger',                  'features/physical/StepLogger'],
  ['MeasurementChart',            'features/physical/MeasurementChart'],
  ['MeasurementLogger',           'features/physical/MeasurementLogger'],
  ['StrengthProgramCard',         'features/physical/StrengthProgramCard'],
  ['StrengthProgramSelector',     'features/physical/StrengthProgramSelector'],
  ['StrengthProgressChart',       'features/physical/StrengthProgressChart'],
  ['StrengthWorkoutLogger',       'features/physical/StrengthWorkoutLogger'],
  ['MuscleProgramCard',           'features/physical/MuscleProgramCard'],
  ['MuscleProgramSelector',       'features/physical/MuscleProgramSelector'],
  ['EnduranceGoalCard',           'features/physical/EnduranceGoalCard'],
  ['EnduranceGoalSelector',       'features/physical/EnduranceGoalSelector'],
  ['FitnessAchievementDashboard', 'features/physical/FitnessAchievementDashboard'],
  ['BreakAnalysisChart',          'features/physical/BreakAnalysisChart'],
  ['BreakReviewForm',             'features/physical/BreakReviewForm'],
  ['PersonalStats',               'features/physical/PersonalStats'],
  ['PeriodInsightsWidget',        'features/physical/PeriodInsightsWidget'],
  ['PeriodQuickLog',              'features/physical/PeriodQuickLog'],

  // FEATURES — financial
  ['FinancialDashboard',    'features/financial/FinancialDashboard'],
  ['FinancialOverview',     'features/financial/FinancialOverview'],
  ['FinancialPlanner',      'features/financial/FinancialPlanner'],
  ['BudgetForm',            'features/financial/BudgetForm'],

  // FEATURES — gear
  ['GearDashboard',           'features/gear/GearDashboard'],
  ['GearOverview',            'features/gear/GearOverview'],
  ['StudyFlashcardsModal',    'features/gear/StudyFlashcardsModal'],
  ['StudyForm',               'features/gear/StudyForm'],
  ['StudyTracker',            'features/gear/StudyTracker'],
  ['SkillBadgeCard',          'features/gear/SkillBadgeCard'],
  ['SkillBadgeSelector',      'features/gear/SkillBadgeSelector'],
  ['SkillDrillLibrary',       'features/gear/SkillDrillLibrary'],
  ['SkillLevelView',          'features/gear/SkillLevelView'],
  ['SkillPerformanceTracker', 'features/gear/SkillPerformanceTracker'],
  ['SkillPersonalRecords',    'features/gear/SkillPersonalRecords'],
  ['SkillPracticeLogger',     'features/gear/SkillPracticeLogger'],

  // FEATURES — environment
  ['EnvironmentDashboard',    'features/environment/EnvironmentDashboard'],

  // FEATURES — misdirect
  ['MisdirectDashboard',      'features/misdirect/MisdirectDashboard'],

  // FEATURES — on track
  ['OnTrackDashboard',        'features/ontrack/OnTrackDashboard'],

  // FEATURES — rest
  ['RestPreparationDashboard', 'features/rest/RestPreparationDashboard'],
  ['RestandPrepareOverview',   'features/rest/RestandPrepareOverview'],
  ['RestTimer',                'features/rest/RestTimer'],

  // FEATURES — planning
  ['GoalCreationWizard',    'features/planning/GoalCreationWizard'],
  ['GoalCard',              'features/planning/GoalCard'],
  ['SprintSnapshot',        'features/planning/SprintSnapshot'],
  ['DynamicSprintDashboard','features/planning/DynamicSprintDashboard'],
  ['KanbanBoard',           'features/planning/KanbanBoard'],
  ['KanbanProgressWidget',  'features/planning/KanbanProgressWidget'],
  ['WeeklyPlanner',         'features/planning/WeeklyPlanner'],
  ['HabitChainView',        'features/planning/HabitChainView'],
  ['YearlyAxisOverview',    'features/planning/YearlyAxisOverview'],
  ['YearlyReviewModal',     'features/planning/YearlyReviewModal'],
  ['YearlyTimelinePlanner', 'features/planning/YearlyTimelinePlanner'],
  ['SixMonthCheckinModal',  'features/planning/SixMonthCheckinModal'],
  ['MonthlyThemeModal',     'features/planning/MonthlyThemeModal'],
  ['PrepareModal',          'features/planning/PrepareModal'],
  ['AmRoutineForm',         'features/planning/AmRoutineForm'],
  ['PmRoutineForm',         'features/planning/PmRoutineForm'],
  ['FamilyCleanForm',       'features/planning/FamilyCleanForm'],
  ['ReadyForWorkForm',      'features/planning/ReadyForWorkForm'],

  // FEATURES — life map
  ['ContextMap',      'features/lifemap/ContextMap'],
  ['ActivityLog',     'features/lifemap/ActivityLog'],
  ['LeaveWorkAtWork', 'features/lifemap/LeaveWorkAtWork'],

  // FEATURES — advisor
  ['AIAdvisor', 'features/advisor/AIAdvisor'],

  // SHARED UI
  ['Modal',         'components/ui/Modal'],
  ['Tooltip',       'components/ui/Tooltip'],
  ['ErrorBoundary', 'components/ui/ErrorBoundary'],
  ['StarRating',    'components/ui/StarRating'],
  ['ImageUploader', 'components/ui/ImageUploader'],
  ['DearAbiMarquee','components/ui/DearAbiMarquee'],

  // SHARED — cross-feature
  ['AxisEditor',      'components/shared/AxisEditor'],
  ['AxisOverview',    'components/shared/AxisOverview'],
  ['ThemedChartView', 'components/shared/ThemedChartView'],

  // SHARED — timeline
  ['Timeline', 'components/timeline/Timeline'],
];

// ── Walk src/ for all JS/JSX files ──────────────────────────────────────────
function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    try {
      if (fs.statSync(full).isDirectory()) out.push(...walk(full));
      else if (/\.(jsx?|tsx?)$/.test(item)) out.push(full);
    } catch (_) {}
  }
  return out;
}

// ── Phase 1: update all imports BEFORE any moves ─────────────────────────────
console.log('Phase 1: updating import paths...');
const allFiles = walk(SRC);

// Build the full replacement map
const replacements = moves.map(([folder, newRel]) => ({
  from: `@/components/${folder}`,
  to:   `@/${newRel}`,
}));

let filesUpdated = 0;
for (const file of allFiles) {
  let src = fs.readFileSync(file, 'utf8');
  let changed = false;
  for (const { from, to } of replacements) {
    if (src.includes(from)) {
      src = src.split(from).join(to);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(file, src, 'utf8');
    filesUpdated++;
  }
}
console.log(`  ${filesUpdated} files updated.\n`);

// ── Phase 2: move the folders ────────────────────────────────────────────────
console.log('Phase 2: moving folders...');
let moved = 0, skipped = 0;

for (const [folder, newRel] of moves) {
  const oldPath = `${COMP}/${folder}`;
  const newPath = `${SRC}/${newRel}`;

  if (!fs.existsSync(oldPath)) {
    console.warn(`  SKIP (not found): components/${folder}`);
    skipped++;
    continue;
  }

  fs.mkdirSync(path.dirname(newPath), { recursive: true });
  fs.renameSync(oldPath, newPath);
  console.log(`  ${folder} → ${newRel}`);
  moved++;
}

console.log(`\nDone — ${moved} folders moved, ${skipped} skipped.`);
