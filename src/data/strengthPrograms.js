// Strength Training Program Templates
// Linear progression 5×5 programs for maximum strength

export const STRENGTH_PROGRAMS = [
  {
    id: 'strength-training-5x5',
    title: '5×5 Strength Program',
    emoji: '🏋️',
    category: 'strength',
    bodyPart: 'fullBody',
    description: '8-week linear progression strength program using 5 core machines. Heavy weights, low reps, long rest. Build maximum strength and muscle density.',
    duration: 8,
    sessionsPerWeek: 3,
    available: true,

    trainingParameters: {
      repsPerSet: 5,
      setsPerExercise: 5,
      intensityRange: '80-90% 1RM',
      restBetweenSets: '3-5 minutes',
      rpe: '8/10',
    },

    exercises: [
      {
        exerciseId: 'squat-machine',
        exerciseName: 'Squat Machine (Leg Press / Smith Squat)',
        primaryMuscle: 'quadriceps, glutes, hamstrings',
        movementPattern: 'leg-push',
        isLowerBody: true,
        weeklyProgression: {
          1: { sets: 5, reps: '5', weight: '70% 1RM', restSeconds: 180, notes: 'Establish baseline — perfect form' },
          2: { sets: 5, reps: '5', weight: '+10 lbs', restSeconds: 210, notes: 'First weight increase' },
          3: { sets: 5, reps: '5', weight: '+10 lbs', restSeconds: 240, notes: 'Should feel challenging' },
          4: { sets: 5, reps: '5', weight: '+10 lbs', restSeconds: 270, notes: 'Getting heavy — maintain form' },
          5: { sets: 5, reps: '5', weight: 'deload (Week 3)', restSeconds: 180, notes: 'DELOAD WEEK — active recovery' },
          6: { sets: 5, reps: '5', weight: 'Week 4 + 5 lbs', restSeconds: 270, notes: 'Back to work, slight PR' },
          7: { sets: 5, reps: '5', weight: '+10 lbs', restSeconds: 300, notes: 'Peak intensity' },
          8: { sets: 5, reps: '5', weight: '+5-10 lbs', restSeconds: 300, notes: 'Final push — test new 1RM after' },
        },
        formCues: [
          'SAFETY FIRST — set safety bars if using Smith Machine',
          'Feet shoulder-width apart',
          'Descend until thighs parallel to ground (90 degrees)',
          'Keep chest up, core braced throughout',
          'Drive through heels explosively on ascent',
          'DO NOT bounce at bottom — controlled movement',
          'Stop 1 rep before failure — leave 1 in tank',
        ],
      },
      {
        exerciseId: 'bench-press-machine',
        exerciseName: 'Bench Press (Barbell / Machine)',
        primaryMuscle: 'pectoralis major, anterior deltoids, triceps',
        movementPattern: 'upper-push',
        isLowerBody: false,
        weeklyProgression: {
          1: { sets: 5, reps: '5', weight: '70% 1RM', restSeconds: 180, notes: 'Perfect technique' },
          2: { sets: 5, reps: '5', weight: '+5 lbs', restSeconds: 210, notes: 'Small increase' },
          3: { sets: 5, reps: '5', weight: '+5 lbs', restSeconds: 240 },
          4: { sets: 5, reps: '5', weight: '+5 lbs', restSeconds: 270, notes: 'Getting challenging' },
          5: { sets: 5, reps: '5', weight: 'deload (Week 3)', restSeconds: 180, notes: 'DELOAD' },
          6: { sets: 5, reps: '5', weight: 'Week 4 + 5 lbs', restSeconds: 240 },
          7: { sets: 5, reps: '5', weight: '+5 lbs', restSeconds: 300, notes: 'Heavy' },
          8: { sets: 5, reps: '5', weight: '+5 lbs', restSeconds: 300, notes: 'Peak strength' },
        },
        formCues: [
          'ALWAYS use spotter or safety bars for barbell',
          'Grip slightly wider than shoulders',
          'Lower bar to mid-chest (nipple line)',
          'Elbows at 45-degree angle (not 90 degrees flared)',
          'Touch chest lightly, then press explosively',
          'Keep shoulder blades retracted (pinched together)',
          'Feet flat on floor, drive through legs',
        ],
      },
      {
        exerciseId: 'lat-pulldown-machine',
        exerciseName: 'Lat Pulldown (Back)',
        primaryMuscle: 'latissimus dorsi, rhomboids, biceps',
        movementPattern: 'upper-pull',
        isLowerBody: false,
        weeklyProgression: {
          1: { sets: 5, reps: '5', weight: '70% max', restSeconds: 180 },
          2: { sets: 5, reps: '5', weight: '+5 lbs', restSeconds: 180 },
          3: { sets: 5, reps: '5', weight: '+5 lbs', restSeconds: 240 },
          4: { sets: 5, reps: '5', weight: '+5 lbs', restSeconds: 240 },
          5: { sets: 5, reps: '5', weight: 'deload (Week 3)', restSeconds: 180, notes: 'DELOAD' },
          6: { sets: 5, reps: '5', weight: 'Week 4 + 5 lbs', restSeconds: 240 },
          7: { sets: 5, reps: '5', weight: '+5 lbs', restSeconds: 270 },
          8: { sets: 5, reps: '5', weight: '+5 lbs', restSeconds: 300 },
        },
        formCues: [
          'Grip slightly wider than shoulders (overhand)',
          'Pull bar to upper chest/collarbone',
          'Lean back slightly (15-20 degrees)',
          'Lead with elbows — pull elbows down and back',
          'Squeeze shoulder blades together at bottom',
          'Slow controlled release back to top',
          'Don\'t use momentum — strict form',
        ],
      },
      {
        exerciseId: 'overhead-press-machine',
        exerciseName: 'Shoulder Press Machine',
        primaryMuscle: 'deltoids, triceps, upper chest',
        movementPattern: 'overhead-press',
        isLowerBody: false,
        weeklyProgression: {
          1: { sets: 5, reps: '5', weight: '65% 1RM', restSeconds: 180, notes: 'Overhead press is HARD' },
          2: { sets: 5, reps: '5', weight: '+5 lbs', restSeconds: 210 },
          3: { sets: 5, reps: '5', weight: '+5 lbs', restSeconds: 240 },
          4: { sets: 5, reps: '5', weight: '+5 lbs', restSeconds: 270 },
          5: { sets: 5, reps: '5', weight: 'deload (Week 3)', restSeconds: 180, notes: 'DELOAD' },
          6: { sets: 5, reps: '5', weight: 'Week 4 + 5 lbs', restSeconds: 240 },
          7: { sets: 5, reps: '5', weight: '+5 lbs', restSeconds: 300 },
          8: { sets: 5, reps: '5', weight: '+5 lbs', restSeconds: 300 },
        },
        formCues: [
          'Seated or standing — core braced either way',
          'Grip slightly wider than shoulders',
          'Press straight up (not forward)',
          'Keep wrists straight, directly under bar',
          'Lockout arms at top without hyperextending elbows',
          'Control descent — don\'t drop weight',
        ],
      },
      {
        exerciseId: 'cable-crunch-abs',
        exerciseName: 'Cable Crunches (Abs)',
        primaryMuscle: 'rectus abdominis, obliques',
        movementPattern: 'core-flexion',
        isLowerBody: false,
        weeklyProgression: {
          1: { sets: 4, reps: '8', weight: '50-70 lbs', restSeconds: 120, notes: 'Core — higher reps OK' },
          2: { sets: 4, reps: '8', weight: '+5-10 lbs', restSeconds: 120 },
          3: { sets: 5, reps: '8', weight: '+5-10 lbs', restSeconds: 120 },
          4: { sets: 5, reps: '8', weight: '+5-10 lbs', restSeconds: 120 },
          5: { sets: 4, reps: '8', weight: 'deload (Week 3)', restSeconds: 120, notes: 'DELOAD' },
          6: { sets: 5, reps: '8', weight: 'Week 4 + 5-10 lbs', restSeconds: 120 },
          7: { sets: 5, reps: '8', weight: '+5-10 lbs', restSeconds: 120 },
          8: { sets: 5, reps: '8', weight: '+5-10 lbs', restSeconds: 120 },
        },
        formCues: [
          'Kneel facing away from cable machine',
          'Hold rope attachment behind head/neck',
          'Crunch down by flexing spine (not hips)',
          'Pull elbows toward knees',
          'Squeeze abs hard at bottom',
          'Slow controlled return to start',
        ],
      },
    ],

    weeklySchedule: {
      1: {
        name: 'Full Body A',
        exercises: ['squat-machine', 'bench-press-machine', 'cable-crunch-abs'],
        focus: 'Squat + Push + Core',
        estDuration: '60-75 min',
      },
      2: {
        name: 'Full Body B',
        exercises: ['squat-machine', 'lat-pulldown-machine', 'overhead-press-machine'],
        focus: 'Squat + Pull + Shoulders',
        estDuration: '60-75 min',
      },
      3: {
        name: 'Full Body C',
        exercises: ['squat-machine', 'bench-press-machine', 'lat-pulldown-machine', 'cable-crunch-abs'],
        focus: 'Full body — strongest session',
        estDuration: '75-90 min',
      },
    },

    deloadWeek: 5,

    criticalRules: [
      'ALWAYS rest 3-5 minutes between sets (strength requires full recovery)',
      'NEVER train to failure — stop 1 rep before (RPE 8/10)',
      'Add weight EVERY week except deload — linear progression is key',
      'Squat 3 times per week — frequency builds technique and strength',
      'Perfect form > Heavy weight — bad form = injury',
    ],

    progressIndicators: [
      'Working weight increases weekly',
      'Estimated 1RM going up',
      'Sets feel easier at same weight',
      'Better bar speed on lifts',
    ],
  },
];

export function getStrengthProgramById(id) {
  return STRENGTH_PROGRAMS.find(p => p.id === id);
}

export function getStrengthExerciseById(programId, exerciseId) {
  const program = getStrengthProgramById(programId);
  if (!program) return null;
  return program.exercises.find(e => e.exerciseId === exerciseId);
}

export function getStrengthWeeklyTarget(programId, exerciseId, week) {
  const exercise = getStrengthExerciseById(programId, exerciseId);
  if (!exercise) return null;
  return exercise.weeklyProgression[week] || null;
}

export function getStrengthScheduleForSession(programId, sessionNum) {
  const program = getStrengthProgramById(programId);
  if (!program) return null;
  const keys = Object.keys(program.weeklySchedule);
  const key = keys[((sessionNum - 1) % keys.length)];
  return program.weeklySchedule[key] || null;
}

export function estimateOneRepMax(fiveRepWeight) {
  return Math.round(fiveRepWeight / 0.85);
}
