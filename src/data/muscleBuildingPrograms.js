// Muscle Building Program Templates
// Progressive overload hypertrophy programs

export const MUSCLE_BUILDING_PROGRAMS = [
  {
    id: 'bigger-calves-program',
    title: 'Bigger Calves',
    emoji: '🦵',
    category: 'muscleBuilding',
    bodyPart: 'calves',
    description: '8-week progressive overload program targeting gastrocnemius and soleus muscles',
    duration: 8,
    sessionsPerWeek: 3,
    difficultyLevel: 'beginner-intermediate',
    available: true,

    measurementTracking: {
      bodyPart: 'calves',
      sides: ['left', 'right'],
      unit: 'cm',
      targetGain: 1.5,
      measurementFrequency: 'weekly',
    },

    exercises: [
      {
        exerciseId: 'standing-calf-raise',
        exerciseName: 'Standing Calf Raises',
        targetMuscle: 'gastrocnemius',
        equipment: 'calf raise machine or smith machine',
        weeklyProgression: {
          1: { sets: 3, reps: '12-15', weight: 'start light', restSeconds: 60, notes: 'Focus on form, full ROM' },
          2: { sets: 3, reps: '12-15', weight: '+5 lbs', restSeconds: 60, notes: '2 second pause at top' },
          3: { sets: 4, reps: '10-12', weight: '+5 lbs', restSeconds: 60, notes: 'Add 4th set' },
          4: { sets: 4, reps: '10-12', weight: 'deload -10%', restSeconds: 60, notes: 'Deload week' },
          5: { sets: 4, reps: '12-15', weight: 'week 3 weight', restSeconds: 60, notes: 'Build back up' },
          6: { sets: 4, reps: '12-15', weight: '+5 lbs', restSeconds: 45, notes: 'Reduce rest time' },
          7: { sets: 5, reps: '10-12', weight: '+5 lbs', restSeconds: 45, notes: 'Peak week - add 5th set' },
          8: { sets: 5, reps: '12-15', weight: '+5 lbs', restSeconds: 45, notes: 'Final push' },
        },
        formCues: [
          'Start with heels below toes on platform (deep stretch)',
          'Rise up as high as possible onto balls of feet',
          '2-second pause at top (squeeze calves hard)',
          'Slow 3-second descent back to stretch position',
          'Keep knees locked straight throughout',
          'Toes pointing straight ahead for balanced development',
        ],
      },
      {
        exerciseId: 'seated-calf-raise',
        exerciseName: 'Seated Calf Raises',
        targetMuscle: 'soleus',
        equipment: 'seated calf raise machine or bench + barbell',
        weeklyProgression: {
          1: { sets: 3, reps: '15-20', weight: 'start light', restSeconds: 60, notes: 'Higher reps for soleus' },
          2: { sets: 3, reps: '15-20', weight: '+5 lbs', restSeconds: 60, notes: 'Focus on stretch' },
          3: { sets: 4, reps: '12-15', weight: '+5 lbs', restSeconds: 60, notes: 'Add weight, drop reps' },
          4: { sets: 4, reps: '12-15', weight: 'deload -10%', restSeconds: 60, notes: 'Deload week' },
          5: { sets: 4, reps: '15-20', weight: 'week 3 weight', restSeconds: 60, notes: 'Back to higher reps' },
          6: { sets: 4, reps: '15-20', weight: '+5 lbs', restSeconds: 45, notes: 'Reduce rest' },
          7: { sets: 5, reps: '12-15', weight: '+5 lbs', restSeconds: 45, notes: 'Add 5th set' },
          8: { sets: 5, reps: '15-20', weight: '+5 lbs', restSeconds: 45, notes: 'Final week' },
        },
        formCues: [
          'Sit with forearms resting on thighs or machine pad on knees',
          'Weight should be on ball of foot, heels hanging off',
          'Lower heels as far down as possible (deep stretch)',
          'Push through balls of feet to raise weight',
          '2-second pause at top contraction',
          'Slow 3-second eccentric back to stretch',
        ],
      },
      {
        exerciseId: 'calf-raise-on-leg-press',
        exerciseName: 'Calf Raises on Leg Press',
        targetMuscle: 'gastrocnemius + soleus',
        equipment: 'leg press machine',
        weeklyProgression: {
          1: { sets: 3, reps: '20-25', weight: 'light', restSeconds: 60, notes: 'Finisher exercise' },
          2: { sets: 3, reps: '20-25', weight: '+1 plate', restSeconds: 60, notes: 'Add weight slowly' },
          3: { sets: 3, reps: '20-25', weight: '+1 plate', restSeconds: 45, notes: 'Pump work' },
          4: { sets: 3, reps: '20-25', weight: 'same', restSeconds: 60, notes: 'Deload' },
          5: { sets: 4, reps: '20-25', weight: '+1 plate', restSeconds: 45, notes: 'Add set' },
          6: { sets: 4, reps: '25-30', weight: 'same', restSeconds: 45, notes: 'More reps' },
          7: { sets: 4, reps: '25-30', weight: '+1 plate', restSeconds: 30, notes: 'Intense burn' },
          8: { sets: 4, reps: '25-30', weight: '+1 plate', restSeconds: 30, notes: 'Maximum pump' },
        },
        formCues: [
          'Legs fully extended (but not locked)',
          'Only balls of feet on bottom of platform',
          'Push sled away by extending ankles',
          'Full ROM - deep stretch to full contraction',
        ],
      },
    ],

    weeklySchedule: {
      1: { name: 'Volume Day', exercises: ['standing-calf-raise', 'seated-calf-raise'], focus: 'Higher volume, moderate intensity' },
      2: { name: 'Strength Day', exercises: ['seated-calf-raise', 'calf-raise-on-leg-press'], focus: 'Heavier weight, lower reps' },
      3: { name: 'Pump Day', exercises: ['standing-calf-raise', 'calf-raise-on-leg-press'], focus: 'Maximum blood flow and pump' },
    },

    deloadWeek: 4,

    progressIndicators: [
      'Weekly measurement increases (even 1-2mm counts)',
      'Strength increases (more weight or reps each week)',
      'Visual changes (more defined diamond shape)',
      'Better ankle stability',
    ],
  },

  {
    id: 'bigger-upper-arms-program',
    title: 'Bigger Upper Arms',
    emoji: '💪',
    category: 'muscleBuilding',
    bodyPart: 'upperArms',
    description: '8-week program targeting biceps (2 heads), triceps (3 heads), and brachialis',
    duration: 8,
    sessionsPerWeek: 2,
    difficultyLevel: 'beginner-intermediate',
    available: true,

    measurementTracking: {
      bodyPart: 'upperArms',
      sides: ['left', 'right'],
      unit: 'cm',
      targetGain: 2.0,
      measurementFrequency: 'weekly',
    },

    exercises: [
      {
        exerciseId: 'close-grip-bench-press', exerciseName: 'Close-Grip Bench Press',
        targetMuscle: 'all 3 tricep heads', equipment: 'barbell, bench',
        weeklyProgression: {
          1: { sets: 4, reps: '8-10', weight: '60% 1RM', restSeconds: 90 },
          2: { sets: 4, reps: '8-10', weight: '+5 lbs', restSeconds: 90 },
          3: { sets: 4, reps: '10-12', weight: '+5 lbs', restSeconds: 75 },
          4: { sets: 4, reps: '10-12', weight: 'deload -10%', restSeconds: 90 },
          5: { sets: 5, reps: '8-10', weight: 'week 3 + 5 lbs', restSeconds: 75 },
          6: { sets: 5, reps: '10-12', weight: '+5 lbs', restSeconds: 60 },
          7: { sets: 5, reps: '10-12', weight: '+5 lbs', restSeconds: 60 },
          8: { sets: 5, reps: '12-15', weight: 'same', restSeconds: 60 },
        },
        formCues: ['Grip width: hands shoulder-width or slightly narrower', 'Elbows tucked close to body', 'Lower bar to lower chest/upper abs', 'Press up explosively, squeeze triceps at top'],
      },
      {
        exerciseId: 'overhead-tricep-extension', exerciseName: 'Overhead Tricep Extension',
        targetMuscle: 'long head of triceps', equipment: 'dumbbell or EZ-bar',
        weeklyProgression: {
          1: { sets: 3, reps: '12-15', weight: 'light', restSeconds: 60 },
          2: { sets: 3, reps: '12-15', weight: '+2.5-5 lbs', restSeconds: 60 },
          3: { sets: 4, reps: '10-12', weight: '+2.5-5 lbs', restSeconds: 60 },
          4: { sets: 3, reps: '12-15', weight: 'deload -10%', restSeconds: 60 },
          5: { sets: 4, reps: '12-15', weight: 'week 3 weight', restSeconds: 60 },
          6: { sets: 4, reps: '12-15', weight: '+2.5-5 lbs', restSeconds: 45 },
          7: { sets: 4, reps: '12-15', weight: '+2.5-5 lbs', restSeconds: 45 },
          8: { sets: 4, reps: '15-20', weight: 'same', restSeconds: 45 },
        },
        formCues: ['Hold dumbbell overhead with both hands', 'Lower weight behind head by bending elbows', 'Keep upper arms vertical', 'Feel deep stretch in long head of triceps'],
      },
      {
        exerciseId: 'tricep-pushdown', exerciseName: 'Tricep Pushdowns (Cable)',
        targetMuscle: 'lateral head of triceps', equipment: 'cable machine',
        weeklyProgression: {
          1: { sets: 3, reps: '15-20', weight: 'light-moderate', restSeconds: 45 },
          2: { sets: 3, reps: '15-20', weight: '+1 plate', restSeconds: 45 },
          3: { sets: 4, reps: '12-15', weight: '+1 plate', restSeconds: 45 },
          4: { sets: 3, reps: '15-20', weight: 'deload -10%', restSeconds: 45 },
          5: { sets: 4, reps: '15-20', weight: 'week 3 + 1 plate', restSeconds: 30 },
          6: { sets: 4, reps: '15-20', weight: '+1 plate', restSeconds: 30 },
          7: { sets: 4, reps: '20-25', weight: 'same', restSeconds: 30 },
          8: { sets: 5, reps: '20-25', weight: 'same', restSeconds: 30 },
        },
        formCues: ['Stand upright, core braced', 'Upper arms pinned to sides', 'Push down using only triceps', '2-second squeeze at bottom'],
      },
      {
        exerciseId: 'tricep-dips', exerciseName: 'Tricep Dips',
        targetMuscle: 'all 3 tricep heads + chest', equipment: 'dip station or bench',
        weeklyProgression: {
          1: { sets: 3, reps: 'max (8-12)', weight: 'bodyweight', restSeconds: 90 },
          2: { sets: 3, reps: 'max + 2', weight: 'bodyweight', restSeconds: 90 },
          3: { sets: 4, reps: 'max', weight: 'bodyweight', restSeconds: 75 },
          4: { sets: 3, reps: 'comfortable', weight: 'bodyweight', restSeconds: 90 },
          5: { sets: 4, reps: 'max', weight: '+10-25 lbs', restSeconds: 90 },
          6: { sets: 4, reps: 'max', weight: '+10-25 lbs', restSeconds: 75 },
          7: { sets: 4, reps: 'max', weight: '+25 lbs', restSeconds: 75 },
          8: { sets: 5, reps: 'max', weight: '+25 lbs', restSeconds: 60 },
        },
        formCues: ['Lean slightly forward', 'Lower until upper arms parallel to ground', 'Elbows track backward', 'Full lockout at top'],
      },
      {
        exerciseId: 'barbell-curl', exerciseName: 'Standing Barbell Curl',
        targetMuscle: 'biceps brachii (both heads)', equipment: 'barbell or EZ-bar',
        weeklyProgression: {
          1: { sets: 4, reps: '8-12', weight: 'moderate', restSeconds: 75 },
          2: { sets: 4, reps: '8-12', weight: '+5 lbs', restSeconds: 75 },
          3: { sets: 4, reps: '10-12', weight: '+5 lbs', restSeconds: 60 },
          4: { sets: 4, reps: '10-12', weight: 'deload -10%', restSeconds: 75 },
          5: { sets: 5, reps: '8-12', weight: 'week 3 + 5 lbs', restSeconds: 60 },
          6: { sets: 5, reps: '10-12', weight: '+5 lbs', restSeconds: 60 },
          7: { sets: 5, reps: '10-12', weight: '+5 lbs', restSeconds: 45 },
          8: { sets: 5, reps: '12-15', weight: 'same', restSeconds: 45 },
        },
        formCues: ['Grip bar shoulder-width, underhand', 'Elbows pinned at sides', 'Curl to chest level', '2-second squeeze at top', 'Slow 3-second negative', 'NO SWINGING'],
      },
      {
        exerciseId: 'incline-dumbbell-curl', exerciseName: 'Incline Dumbbell Curls',
        targetMuscle: 'biceps long head', equipment: 'incline bench (45°), dumbbells',
        weeklyProgression: {
          1: { sets: 3, reps: '10-12', weight: 'light-moderate', restSeconds: 60 },
          2: { sets: 3, reps: '10-12', weight: '+2.5-5 lbs', restSeconds: 60 },
          3: { sets: 4, reps: '10-12', weight: '+2.5-5 lbs', restSeconds: 60 },
          4: { sets: 3, reps: '10-12', weight: 'deload -10%', restSeconds: 60 },
          5: { sets: 4, reps: '12-15', weight: 'week 3 weight', restSeconds: 45 },
          6: { sets: 4, reps: '12-15', weight: '+2.5-5 lbs', restSeconds: 45 },
          7: { sets: 4, reps: '12-15', weight: '+2.5-5 lbs', restSeconds: 45 },
          8: { sets: 4, reps: '15-20', weight: 'same', restSeconds: 45 },
        },
        formCues: ['Lie back on 45-degree incline bench', 'Arms hang straight down', 'Curl dumbbells up, keeping upper arms still', 'Supinate wrists at top'],
      },
      {
        exerciseId: 'hammer-curl', exerciseName: 'Hammer Curls',
        targetMuscle: 'brachialis + biceps', equipment: 'dumbbells',
        weeklyProgression: {
          1: { sets: 3, reps: '12-15', weight: 'moderate', restSeconds: 60 },
          2: { sets: 3, reps: '12-15', weight: '+2.5-5 lbs', restSeconds: 60 },
          3: { sets: 4, reps: '10-12', weight: '+2.5-5 lbs', restSeconds: 60 },
          4: { sets: 3, reps: '12-15', weight: 'deload -10%', restSeconds: 60 },
          5: { sets: 4, reps: '12-15', weight: 'week 3 weight', restSeconds: 45 },
          6: { sets: 4, reps: '12-15', weight: '+2.5-5 lbs', restSeconds: 45 },
          7: { sets: 4, reps: '15-20', weight: 'same', restSeconds: 45 },
          8: { sets: 4, reps: '15-20', weight: '+2.5-5 lbs', restSeconds: 30 },
        },
        formCues: ['Hold dumbbells at sides, palms facing inward (neutral grip)', 'Curl toward shoulders', 'Keep palms neutral throughout', 'Elbows stay pinned at sides'],
      },
      {
        exerciseId: 'preacher-curl', exerciseName: 'Preacher Curls (EZ-Bar)',
        targetMuscle: 'biceps short head', equipment: 'preacher bench, EZ-bar',
        weeklyProgression: {
          1: { sets: 3, reps: '12-15', weight: 'light', restSeconds: 60 },
          2: { sets: 3, reps: '12-15', weight: '+5 lbs', restSeconds: 60 },
          3: { sets: 3, reps: '12-15', weight: '+5 lbs', restSeconds: 60 },
          4: { sets: 3, reps: '12-15', weight: 'deload -10%', restSeconds: 60 },
          5: { sets: 4, reps: '12-15', weight: 'week 3 weight', restSeconds: 45 },
          6: { sets: 4, reps: '12-15', weight: '+5 lbs', restSeconds: 45 },
          7: { sets: 4, reps: '15-20', weight: 'same', restSeconds: 45 },
          8: { sets: 4, reps: '15-20', weight: '+2.5 lbs', restSeconds: 30 },
        },
        formCues: ['Sit at preacher bench, armpits on top pad', 'Curl bar to chin level', 'Squeeze hard at top for 2 seconds', 'Slow negative - keep tension'],
      },
    ],

    weeklySchedule: {
      1: { name: 'Arm Day - Heavy', exercises: ['close-grip-bench-press', 'overhead-tricep-extension', 'barbell-curl', 'hammer-curl'], focus: 'Heavier weight, 8-12 reps' },
      2: { name: 'Arm Day - Volume', exercises: ['incline-dumbbell-curl', 'preacher-curl', 'tricep-pushdown', 'tricep-dips'], focus: 'Higher reps 12-20, max pump' },
    },

    deloadWeek: 4,
    progressIndicators: ['Arm measurement increases', 'Shirts tighter in sleeves', 'Visible vein development', 'Strength increases on compounds'],
  },

  {
    id: 'bigger-forearms-program',
    title: 'Bigger Forearms',
    emoji: '🤜',
    category: 'muscleBuilding',
    bodyPart: 'forearms',
    description: '8-week program targeting flexors, extensors, and brachioradialis for forearm size and grip strength',
    duration: 8,
    sessionsPerWeek: 3,
    difficultyLevel: 'beginner',
    available: true,

    measurementTracking: {
      bodyPart: 'forearms',
      sides: ['left', 'right'],
      unit: 'cm',
      targetGain: 1.0,
      measurementFrequency: 'bi-weekly',
    },

    exercises: [
      {
        exerciseId: 'wrist-curl-palms-up', exerciseName: 'Barbell Wrist Curls (Palms Up)',
        targetMuscle: 'forearm flexors', equipment: 'barbell, bench',
        weeklyProgression: {
          1: { sets: 3, reps: '15-20', weight: 'light', restSeconds: 60 },
          2: { sets: 3, reps: '15-20', weight: '+5-10 lbs', restSeconds: 60 },
          3: { sets: 4, reps: '12-15', weight: '+5-10 lbs', restSeconds: 60 },
          4: { sets: 3, reps: '15-20', weight: 'deload -10%', restSeconds: 60 },
          5: { sets: 4, reps: '15-20', weight: 'week 3 weight', restSeconds: 45 },
          6: { sets: 4, reps: '15-20', weight: '+5 lbs', restSeconds: 45 },
          7: { sets: 4, reps: '20-25', weight: 'same', restSeconds: 45 },
          8: { sets: 5, reps: '20-25', weight: '+5 lbs', restSeconds: 45 },
        },
        formCues: ['Sit on bench, forearms resting on thighs', 'Wrists hanging off edge of knees', 'Palms facing up', 'Let bar roll down to fingertips (deep stretch)', 'Curl fingers and wrists up as high as possible'],
      },
      {
        exerciseId: 'wrist-curl-palms-down', exerciseName: 'Reverse Wrist Curls (Palms Down)',
        targetMuscle: 'forearm extensors', equipment: 'barbell or dumbbells',
        weeklyProgression: {
          1: { sets: 3, reps: '15-20', weight: 'very light', restSeconds: 60 },
          2: { sets: 3, reps: '15-20', weight: '+2.5-5 lbs', restSeconds: 60 },
          3: { sets: 3, reps: '15-20', weight: '+2.5-5 lbs', restSeconds: 60 },
          4: { sets: 3, reps: '15-20', weight: 'deload -10%', restSeconds: 60 },
          5: { sets: 4, reps: '15-20', weight: 'week 3 weight', restSeconds: 45 },
          6: { sets: 4, reps: '20-25', weight: 'same', restSeconds: 45 },
          7: { sets: 4, reps: '20-25', weight: '+2.5 lbs', restSeconds: 45 },
          8: { sets: 4, reps: '25-30', weight: '+2.5 lbs', restSeconds: 45 },
        },
        formCues: ['Same position as wrist curls', 'Palms facing down (pronated grip)', 'Extend wrists upward', 'Full range of motion', 'Slow tempo (2-1-2)'],
      },
      {
        exerciseId: 'reverse-curl', exerciseName: 'Reverse Curls (EZ-Bar)',
        targetMuscle: 'brachioradialis', equipment: 'barbell or EZ-bar',
        weeklyProgression: {
          1: { sets: 3, reps: '10-12', weight: '50% of curl weight', restSeconds: 75 },
          2: { sets: 3, reps: '10-12', weight: '+5 lbs', restSeconds: 75 },
          3: { sets: 4, reps: '10-12', weight: '+5 lbs', restSeconds: 60 },
          4: { sets: 3, reps: '10-12', weight: 'deload -10%', restSeconds: 75 },
          5: { sets: 4, reps: '12-15', weight: 'week 3 weight', restSeconds: 60 },
          6: { sets: 4, reps: '12-15', weight: '+5 lbs', restSeconds: 60 },
          7: { sets: 4, reps: '12-15', weight: '+5 lbs', restSeconds: 60 },
          8: { sets: 4, reps: '15-20', weight: 'same', restSeconds: 45 },
        },
        formCues: ['Stand with barbell at arms\' length', 'Overhand grip, shoulder-width', 'Curl bar toward shoulders', 'Keep elbows pinned at sides'],
      },
      {
        exerciseId: 'farmers-walk', exerciseName: 'Farmer\'s Walks',
        targetMuscle: 'grip + all forearm muscles', equipment: 'heavy dumbbells',
        weeklyProgression: {
          1: { sets: 3, reps: '40 ft', weight: 'heavy', restSeconds: 90 },
          2: { sets: 3, reps: '50 ft', weight: '+5-10 lbs/hand', restSeconds: 90 },
          3: { sets: 3, reps: '60 ft', weight: '+5-10 lbs/hand', restSeconds: 90 },
          4: { sets: 3, reps: '40 ft', weight: 'deload -10%', restSeconds: 90 },
          5: { sets: 4, reps: '60 ft', weight: 'week 3 + 5 lbs', restSeconds: 75 },
          6: { sets: 4, reps: '75 ft', weight: '+5-10 lbs', restSeconds: 75 },
          7: { sets: 4, reps: '75 ft', weight: '+10 lbs', restSeconds: 60 },
          8: { sets: 5, reps: '100 ft', weight: 'same', restSeconds: 60 },
        },
        formCues: ['Stand tall with chest up, shoulders back', 'Walk forward with controlled steps', 'Maintain strong grip throughout', 'Walk until grip starts to fail'],
      },
      {
        exerciseId: 'dead-hang', exerciseName: 'Dead Hangs',
        targetMuscle: 'grip endurance', equipment: 'pull-up bar',
        weeklyProgression: {
          1: { sets: 3, reps: '20-30 sec', weight: 'bodyweight', restSeconds: 60 },
          2: { sets: 3, reps: '30-40 sec', weight: 'bodyweight', restSeconds: 60 },
          3: { sets: 3, reps: '40-50 sec', weight: 'bodyweight', restSeconds: 60 },
          4: { sets: 3, reps: '30 sec', weight: 'bodyweight', restSeconds: 60 },
          5: { sets: 3, reps: '45-60 sec', weight: 'bodyweight', restSeconds: 60 },
          6: { sets: 3, reps: '60 sec', weight: '+10-25 lbs', restSeconds: 60 },
          7: { sets: 3, reps: '60 sec', weight: '+25 lbs', restSeconds: 60 },
          8: { sets: 4, reps: '60 sec', weight: '+25 lbs', restSeconds: 45 },
        },
        formCues: ['Grab bar with overhand grip', 'Hang with arms fully extended', 'Shoulders engaged (not passive hang)', 'Hold as long as possible'],
      },
    ],

    weeklySchedule: {
      1: { name: 'Flexors + Curls', exercises: ['wrist-curl-palms-up', 'reverse-curl'], focus: 'Flexor strength' },
      2: { name: 'Grip Work', exercises: ['farmers-walk', 'dead-hang'], focus: 'Grip endurance' },
      3: { name: 'Extensors + Curls', exercises: ['wrist-curl-palms-down', 'reverse-curl'], focus: 'Extensor balance' },
    },

    deloadWeek: 4,
    progressIndicators: ['Forearm measurement increases', 'Grip strength improvements', 'Better deadlift/row grip', 'Visible forearm vascularity'],
  },

  {
    id: 'fix-scapular-winging',
    title: 'Fix Scapular Winging',
    emoji: '🩹',
    category: 'correctiveExercise',
    bodyPart: 'shoulderBlade',
    description: '8-week corrective program to strengthen serratus anterior and fix winged scapula',
    duration: 8,
    sessionsPerWeek: 5,
    difficultyLevel: 'therapeutic',
    available: true,

    measurementTracking: {
      bodyPart: 'scapula',
      method: 'visual assessment',
      measurementFrequency: 'bi-weekly',
    },

    exercises: [
      {
        exerciseId: 'band-pull-apart', exerciseName: 'Band Pull-Apart',
        targetMuscle: 'rear deltoids, rhomboids, serratus anterior', equipment: 'resistance band',
        weeklyProgression: {
          1: { sets: 3, reps: '12', weight: 'light band', restSeconds: 60, notes: 'Learn the movement' },
          2: { sets: 3, reps: '15', weight: 'light band', restSeconds: 60, notes: 'Focus on squeezing shoulder blades' },
          3: { sets: 4, reps: '15', weight: 'light band', restSeconds: 45 },
          4: { sets: 4, reps: '20', weight: 'light band', restSeconds: 45 },
          5: { sets: 4, reps: '15', weight: 'medium band', restSeconds: 45 },
          6: { sets: 4, reps: '20', weight: 'medium band', restSeconds: 45 },
          7: { sets: 5, reps: '15', weight: 'medium band', restSeconds: 45 },
          8: { sets: 5, reps: '20', weight: 'medium band', restSeconds: 30 },
        },
        formCues: ['Hold band at shoulder height with arms extended', 'Pull band apart by driving elbows back', 'Squeeze shoulder blades together at end range', 'Slowly return to start — control the band'],
      },
      {
        exerciseId: 'serratus-punch', exerciseName: 'Serratus Punches (Lying)',
        targetMuscle: 'serratus anterior', equipment: 'light dumbbell',
        weeklyProgression: {
          1: { sets: 3, reps: '15', weight: 'bodyweight', restSeconds: 45 },
          2: { sets: 3, reps: '15', weight: '5 lbs', restSeconds: 45 },
          3: { sets: 4, reps: '15', weight: '5 lbs', restSeconds: 45 },
          4: { sets: 4, reps: '20', weight: '5 lbs', restSeconds: 45 },
          5: { sets: 4, reps: '20', weight: '8 lbs', restSeconds: 30 },
          6: { sets: 4, reps: '20', weight: '10 lbs', restSeconds: 30 },
          7: { sets: 5, reps: '20', weight: '10 lbs', restSeconds: 30 },
          8: { sets: 5, reps: '25', weight: '12 lbs', restSeconds: 30 },
        },
        formCues: ['Lie on back, arm extended toward ceiling', 'Punch toward ceiling by protracting shoulder', 'Feel shoulder blade lift off floor', 'Arm stays extended - only shoulder blade moves'],
      },
      {
        exerciseId: 'pushup-plus', exerciseName: 'Push-Up Plus',
        targetMuscle: 'serratus anterior + chest + triceps', equipment: 'bodyweight',
        weeklyProgression: {
          1: { sets: 3, reps: '5', weight: 'wall push-ups', restSeconds: 60 },
          2: { sets: 3, reps: '8', weight: 'wall push-ups', restSeconds: 60 },
          3: { sets: 3, reps: '10', weight: 'incline push-ups', restSeconds: 60 },
          4: { sets: 3, reps: '12', weight: 'incline push-ups', restSeconds: 60 },
          5: { sets: 3, reps: '8', weight: 'floor (knees)', restSeconds: 75 },
          6: { sets: 3, reps: '10', weight: 'floor (knees)', restSeconds: 75 },
          7: { sets: 3, reps: '8', weight: 'full push-ups', restSeconds: 90 },
          8: { sets: 4, reps: '10', weight: 'full push-ups', restSeconds: 90 },
        },
        formCues: ['Perform normal push-up', 'At top, PUSH even further up', 'This extra push protracts scapula', 'Feel shoulder blades spreading apart'],
      },
      {
        exerciseId: 'plank', exerciseName: 'Plank',
        targetMuscle: 'core, serratus anterior stability', equipment: 'bodyweight',
        weeklyProgression: {
          1: { sets: 3, reps: '20 sec', weight: 'bodyweight', restSeconds: 60 },
          2: { sets: 3, reps: '25 sec', weight: 'bodyweight', restSeconds: 60 },
          3: { sets: 3, reps: '30 sec', weight: 'bodyweight', restSeconds: 45 },
          4: { sets: 3, reps: '40 sec', weight: 'bodyweight', restSeconds: 45 },
          5: { sets: 4, reps: '40 sec', weight: 'bodyweight', restSeconds: 45 },
          6: { sets: 4, reps: '50 sec', weight: 'bodyweight', restSeconds: 30 },
          7: { sets: 4, reps: '60 sec', weight: 'bodyweight', restSeconds: 30 },
          8: { sets: 5, reps: '60 sec', weight: 'bodyweight', restSeconds: 30 },
        },
        formCues: ['Forearms and toes on floor, body in a straight line', 'Drive elbows into the floor and push floor away', 'Brace core — do not let hips sag or pike', 'Breathe steadily throughout the hold'],
      },
    ],

    weeklySchedule: {
      1: { name: 'Daily Session', exercises: ['band-pull-apart', 'serratus-punch', 'pushup-plus', 'plank'], focus: 'Activation and strengthening' },
    },

    deloadWeek: null,
    progressIndicators: ['Less visible winging', 'Better push-up form', 'Reduced shoulder pain', 'Improved posture'],
  },
];

export function getProgramById(id) {
  return MUSCLE_BUILDING_PROGRAMS.find(p => p.id === id);
}

export function getExerciseById(programId, exerciseId) {
  const program = getProgramById(programId);
  if (!program) return null;
  return program.exercises.find(e => e.exerciseId === exerciseId);
}

export function getWeeklyTarget(programId, exerciseId, week) {
  const exercise = getExerciseById(programId, exerciseId);
  if (!exercise) return null;
  return exercise.weeklyProgression[week] || null;
}

export function getScheduleForDay(programId, dayOfWeek) {
  const program = getProgramById(programId);
  if (!program) return null;
  const scheduleKeys = Object.keys(program.weeklySchedule);
  const dayIndex = ((dayOfWeek - 1) % scheduleKeys.length) + 1;
  return program.weeklySchedule[dayIndex] || null;
}
