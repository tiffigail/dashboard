# ENDURANCE GOALS - COMPLETE SPECIFICATION

## 🏃 OVERVIEW

Endurance goals are virtual journeys from Austin, Texas to iconic destinations worldwide. Progress is tracked using the user's daily step count with a conversion formula: **Distance Traveled = Steps × 2 feet** (average step length).

This system includes a special "Runner's High" achievement based on scientific research about achieving exercise-induced euphoria.

---

## 📊 DISTANCE CALCULATIONS

### Formula:
```
Distance Traveled (miles) = (Total Steps × 2 feet) ÷ 5,280 feet/mile
Distance Traveled (miles) = Total Steps ÷ 2,640
```

### Starting Point:
**Austin, Texas** (30.2672° N, 97.7431° W)

---

## 🗺️ THE 6 ENDURANCE JOURNEYS

### 1. RUNNER'S HIGH ACHIEVEMENT 🌟

**Goal:** Achieve a scientifically-validated runner's high through sustained cardio exercise

**Category:** `endurance` (subcategory: `runners-high`)

**Template ID:** `runners-high-achievement`

**Description:** Experience exercise-induced euphoria through proper intensity and duration cardio training

**Complete Data Structure:**
```javascript
{
  templateId: "runners-high-achievement",
  category: "endurance",
  journeyType: "mental-achievement",
  
  title: "Achieve Runner's High",
  emoji: "🌟",
  description: "Experience the euphoric state caused by endocannabinoid release during sustained moderate-to-high intensity cardio exercise",
  
  // NOT distance-based
  totalDistance: null,
  isDistanceBased: false,
  
  // Achievement criteria (based on research)
  achievementCriteria: {
    minimumDuration: 45, // minutes - minimum duration per session
    targetDuration: 60, // minutes - optimal duration for endocannabinoid release
    intensityRange: {
      minimum: 60, // % of max heart rate
      optimal: 70, // % of max heart rate (sweet spot)
      maximum: 85 // % of max heart rate
    },
    requiredSessions: 3, // number of successful attempts to "unlock" achievement
    sessionFrequency: "at least 3x per week"
  },
  
  // The science behind it
  scientificBasis: {
    mechanism: "endocannabinoid",
    keyChemicals: ["anandamide", "2-AG"],
    effects: ["euphoria", "reduced anxiety", "pain relief", "sense of effortlessness"],
    notEndorphins: true // Recent research shows endorphins don't cross blood-brain barrier
  },
  
  // How to achieve it
  protocol: {
    // For stationary bike (user's equipment)
    stationaryBike: {
      warmup: {
        duration: 5, // minutes
        intensity: "light",
        rpm: "60-70",
        resistance: "low",
        instructions: "Pedal easily to warm up muscles and raise heart rate gradually"
      },
      mainWorkout: {
        duration: 45, // minutes minimum, 60 optimal
        intensity: "moderate-to-high",
        targetHeartRate: "70-85% of max",
        rpm: "80-100",
        resistance: "moderate",
        perceivedExertion: "6-7 out of 10",
        instructions: [
          "Maintain steady pace - hard enough to feel challenged but sustainable",
          "You should be able to speak in short sentences but not hold long conversation",
          "Focus on rhythmic breathing and pedaling motion",
          "Endocannabinoids typically peak around 45-60 minutes",
          "Signs you're in the zone: time seems to pass quickly, legs feel 'automatic', mild euphoria"
        ],
        whatToAvoid: [
          "DON'T go all-out sprint - too intense prevents endocannabinoid release",
          "DON'T go too easy - insufficient metabolic stress",
          "DON'T stop-and-go - need sustained effort",
          "DON'T watch clock obsessively - focus on the ride"
        ]
      },
      cooldown: {
        duration: 5, // minutes
        intensity: "light",
        instructions: "Gradually reduce pace and resistance to bring heart rate down"
      }
    },
    
    // Alternative: Running/Walking
    running: {
      warmup: {
        duration: 5,
        pace: "easy walk or light jog"
      },
      mainWorkout: {
        duration: 45-60, // minutes
        pace: "8:34-10:00 min/mile",
        perceivedExertion: "6-7 out of 10",
        instructions: "Tempo run - sustained moderate effort, not easy but not gut-busting"
      },
      cooldown: {
        duration: 5,
        pace: "easy walk"
      }
    }
  },
  
  // Progression milestones
  milestones: [
    {
      level: 1,
      name: "First 45-Minute Session",
      description: "Complete your first 45-minute moderate-intensity cardio session",
      completed: false
    },
    {
      level: 2,
      name: "The Zone",
      description: "Complete a 60-minute session where time seemed to fly by",
      completed: false
    },
    {
      level: 3,
      name: "Euphoria Unlocked",
      description: "Experience unmistakable euphoria during or after exercise",
      completed: false,
      badge: "🌟 Runner's High Achieved"
    }
  ],
  
  // Tracking
  trackingMethod: "manual-log", // User logs each attempt
  successIndicators: [
    "Session duration 45+ minutes",
    "Perceived exertion 6-7/10",
    "Sustained intensity (no stopping)",
    "Post-exercise mood: euphoric or deeply relaxed"
  ],
  
  // Tips for success (based on research)
  tips: [
    "Vary your routine - don't do exact same workout every time",
    "Music can help but isn't required",
    "Some people respond more strongly than others (genetics)",
    "May take 3-5 attempts before you feel it",
    "Morning sessions may be more effective for some people",
    "Stay hydrated but don't overdrink during workout",
    "Empty stomach or light meal 2 hours before works best"
  ],
  
  // Why it matters
  benefits: [
    "Natural mood enhancement",
    "Reduced anxiety",
    "Pain relief",
    "Improved motivation to exercise",
    "Better stress management",
    "Enhanced sense of well-being lasting hours after exercise"
  ]
}
```

---

### 2. WALK TO ABINGTON, INDIANA 🏡

**Distance from Austin, TX:** 1,045 miles

**Template ID:** `walk-to-abington`

**Complete Data Structure:**
```javascript
{
  templateId: "walk-to-abington",
  category: "endurance",
  journeyType: "walking",
  
  title: "Walk to Abington, Indiana",
  emoji: "🏡",
  description: "Virtual walking journey from Austin, TX to Abington, Indiana",
  
  // Distance & Progress
  totalDistance: 1045, // miles
  isDistanceBased: true,
  startLocation: {
    name: "Austin, Texas",
    coordinates: { lat: 30.2672, lng: -97.7431 }
  },
  endLocation: {
    name: "Abington, Indiana",
    coordinates: { lat: 40.7545, lng: -86.6908 }
  },
  
  // Milestones along the way
  milestonesAlongWay: [
    {
      mile: 200,
      location: "Dallas, TX",
      emoji: "🤠",
      description: "Howdy partner! You've crossed Texas!"
    },
    {
      mile: 400,
      location: "Little Rock, AR",
      emoji: "🏞️",
      description: "Into the Ozarks - beautiful scenery!"
    },
    {
      mile: 650,
      location: "St. Louis, MO",
      emoji: "🎡",
      description: "Gateway Arch! Halfway there!"
    },
    {
      mile: 850,
      location: "Indianapolis, IN",
      emoji: "🏁",
      description: "Indy 500 territory - home stretch!"
    },
    {
      mile: 1045,
      location: "Abington, Indiana",
      emoji: "🎉",
      description: "You made it! Welcome to Abington!"
    }
  ],
  
  // Recommended pace
  recommendedPace: {
    stepsPerDay: 8000, // average
    milesPerWeek: 21, // (8000 steps × 7 days) ÷ 2640
    daysPerWeek: 7,
    estimatedCompletionWeeks: 50 // 1045 miles ÷ 21 miles/week
  },
  
  // Tracking
  progressCalculation: "sum of (daily_steps × 2 feet) ÷ 5280 feet/mile",
  
  // Achievement tiers
  achievementTiers: [
    { miles: 100, badge: "bronze", title: "First Century" },
    { miles: 500, badge: "silver", title: "Halfway Hero" },
    { miles: 1000, badge: "gold", title: "Almost There" },
    { miles: 1045, badge: "platinum", title: "Abington Arrival" }
  ]
}
```

---

### 3. WALK THE GREAT WALL OF CHINA 🏯

**Distance from Austin, TX to Beijing:** 7,130 miles  
**Great Wall total length:** ~13,170 miles (but we're targeting the journey TO it, not walking its length)

**Template ID:** `walk-to-great-wall`

**Complete Data Structure:**
```javascript
{
  templateId: "walk-to-great-wall",
  category: "endurance",
  journeyType: "walking",
  
  title: "Journey to the Great Wall",
  emoji: "🏯",
  description: "Epic virtual trek from Austin, Texas to the Great Wall of China in Beijing",
  
  totalDistance: 7130, // miles (Austin to Beijing)
  isDistanceBased: true,
  
  startLocation: {
    name: "Austin, Texas",
    coordinates: { lat: 30.2672, lng: -97.7431 }
  },
  endLocation: {
    name: "Great Wall of China (Beijing)",
    coordinates: { lat: 40.4319, lng: 116.5704 }
  },
  
  // Epic milestones
  milestonesAlongWay: [
    {
      mile: 500,
      location: "Flagstaff, AZ",
      emoji: "🌵",
      description: "Desert crossed! Heading west!"
    },
    {
      mile: 1000,
      location: "San Francisco, CA",
      emoji: "🌉",
      description: "Golden Gate Bridge - Pacific Ocean ahead!"
    },
    {
      mile: 2500,
      location: "Pacific Ocean Crossing",
      emoji: "🌊",
      description: "Halfway across the Pacific - keep swimming!"
    },
    {
      mile: 4000,
      location: "Approaching Hawaii",
      emoji: "🏝️",
      description: "Aloha! Rest stop in paradise!"
    },
    {
      mile: 5500,
      location: "Tokyo, Japan",
      emoji: "🗼",
      description: "Konichiwa! Almost to China!"
    },
    {
      mile: 6500,
      location: "Shanghai, China",
      emoji: "🏙️",
      description: "Welcome to China! Beijing is close!"
    },
    {
      mile: 7130,
      location: "Great Wall of China",
      emoji: "🎉",
      description: "EPIC ACHIEVEMENT! You virtually walked to one of the 7 Wonders!"
    }
  ],
  
  recommendedPace: {
    stepsPerDay: 10000,
    milesPerWeek: 26.5, // (10000 steps × 7 days) ÷ 2640
    daysPerWeek: 7,
    estimatedCompletionWeeks: 269 // ~5.2 years - this is a LONG journey!
  },
  
  difficultyLevel: "legendary",
  
  achievementTiers: [
    { miles: 1000, badge: "bronze", title: "Pacific Coast" },
    { miles: 2500, badge: "silver", title: "Ocean Crosser" },
    { miles: 5000, badge: "gold", title: "Asia Bound" },
    { miles: 7130, badge: "platinum", title: "Great Wall Conqueror" }
  ]
}
```

---

### 4. PILGRIMAGE TO MECCA 🕌

**Distance from Austin, TX to Mecca:** 7,899 miles

**Template ID:** `walk-to-mecca`

**Complete Data Structure:**
```javascript
{
  templateId: "walk-to-mecca",
  category: "endurance",
  journeyType: "walking",
  
  title: "Pilgrimage to Mecca",
  emoji: "🕌",
  description: "Sacred virtual journey from Austin, Texas to Mecca, Saudi Arabia - following the path of millions of pilgrims",
  
  totalDistance: 7899, // miles
  isDistanceBased: true,
  
  startLocation: {
    name: "Austin, Texas",
    coordinates: { lat: 30.2672, lng: -97.7431 }
  },
  endLocation: {
    name: "Mecca, Saudi Arabia",
    coordinates: { lat: 21.4225, lng: 39.8262 }
  },
  
  // Spiritual/cultural milestones
  milestonesAlongWay: [
    {
      mile: 500,
      location: "Memphis, TN",
      emoji: "🎸",
      description: "Home of the blues - keep the rhythm going!"
    },
    {
      mile: 1200,
      location: "New York, NY",
      emoji: "🗽",
      description: "Lady Liberty sees you off to cross the Atlantic!"
    },
    {
      mile: 3000,
      location: "Atlantic Ocean Crossing",
      emoji: "🌊",
      description: "Across the Atlantic - halfway to Mecca!"
    },
    {
      mile: 4500,
      location: "Lisbon, Portugal",
      emoji: "🏰",
      description: "European landfall - Mediterranean ahead!"
    },
    {
      mile: 6000,
      location: "Cairo, Egypt",
      emoji: "🐪",
      description: "Land of the Pyramids - Arabian Peninsula close!"
    },
    {
      mile: 7500,
      location: "Medina, Saudi Arabia",
      emoji: "🕌",
      description: "The Prophet's City - Mecca is near!"
    },
    {
      mile: 7899,
      location: "Mecca, Saudi Arabia",
      emoji: "✨",
      description: "HAJJ COMPLETE! Sacred journey achieved!"
    }
  ],
  
  recommendedPace: {
    stepsPerDay: 10000,
    milesPerWeek: 26.5,
    daysPerWeek: 7,
    estimatedCompletionWeeks: 298 // ~5.7 years
  },
  
  culturalContext: {
    significance: "Mecca is Islam's holiest city and destination of the Hajj pilgrimage",
    realPilgrims: "Over 2 million Muslims make this journey annually",
    virtualRespect: "This virtual journey honors the spiritual significance while being accessible to all"
  },
  
  difficultyLevel: "legendary",
  
  achievementTiers: [
    { miles: 1000, badge: "bronze", title: "Atlantic Approach" },
    { miles: 3000, badge: "silver", title: "Ocean Crossed" },
    { miles: 6000, badge: "gold", title: "Arabian Approach" },
    { miles: 7899, badge: "platinum", title: "Hajj Completed" }
  ]
}
```

---

### 5. WALK TO NEW YORK CITY 🗽

**Distance from Austin, TX to New York:** 1,744 miles

**Template ID:** `walk-to-nyc`

**Complete Data Structure:**
```javascript
{
  templateId: "walk-to-nyc",
  category: "endurance",
  journeyType: "walking",
  
  title: "Walk to New York City",
  emoji: "🗽",
  description: "Cross-country trek from Austin to the Big Apple",
  
  totalDistance: 1744, // miles
  isDistanceBased: true,
  
  startLocation: {
    name: "Austin, Texas",
    coordinates: { lat: 30.2672, lng: -97.7431 }
  },
  endLocation: {
    name: "New York City, NY",
    coordinates: { lat: 40.7128, lng: -74.0060 }
  },
  
  milestonesAlongWay: [
    {
      mile: 200,
      location: "Shreveport, LA",
      emoji: "🎰",
      description: "Louisiana bound!"
    },
    {
      mile: 500,
      location: "Memphis, TN",
      emoji: "🎸",
      description: "Elvis territory - Graceland nearby!"
    },
    {
      mile: 900,
      location: "Nashville, TN",
      emoji: "🎵",
      description: "Music City USA!"
    },
    {
      mile: 1200,
      location: "Washington, DC",
      emoji: "🏛️",
      description: "Nation's capital - almost there!"
    },
    {
      mile: 1500,
      location: "Philadelphia, PA",
      emoji: "🔔",
      description: "Liberty Bell! Final stretch!"
    },
    {
      mile: 1744,
      location: "New York City",
      emoji: "🎉",
      description: "Welcome to NYC! The city that never sleeps!"
    }
  ],
  
  recommendedPace: {
    stepsPerDay: 8500,
    milesPerWeek: 22.5,
    daysPerWeek: 7,
    estimatedCompletionWeeks: 77 // ~1.5 years
  },
  
  difficultyLevel: "advanced",
  
  achievementTiers: [
    { miles: 200, badge: "bronze", title: "Out of Texas" },
    { miles: 900, badge: "silver", title: "Heartland Crosser" },
    { miles: 1500, badge: "gold", title: "East Coast Arrival" },
    { miles: 1744, badge: "platinum", title: "Big Apple Achieved" }
  ]
}
```

---

### 6. WALK TO LOS ANGELES 🌴

**Distance from Austin, TX to Los Angeles:** 1,377 miles

**Template ID:** `walk-to-la`

**Complete Data Structure:**
```javascript
{
  templateId: "walk-to-la",
  category: "endurance",
  journeyType: "walking",
  
  title: "Walk to Los Angeles",
  emoji: "🌴",
  description: "Journey west from Austin to the City of Angels",
  
  totalDistance: 1377, // miles
  isDistanceBased: true,
  
  startLocation: {
    name: "Austin, Texas",
    coordinates: { lat: 30.2672, lng: -97.7431 }
  },
  endLocation: {
    name: "Los Angeles, CA",
    coordinates: { lat: 34.0522, lng: -118.2437 }
  },
  
  milestonesAlongWay: [
    {
      mile: 250,
      location: "El Paso, TX",
      emoji: "🌮",
      description: "Texas-Mexico border! ¡Órale!"
    },
    {
      mile: 500,
      location: "Tucson, AZ",
      emoji: "🌵",
      description: "Desert beauty!"
    },
    {
      mile: 750,
      location: "Phoenix, AZ",
      emoji: "☀️",
      description: "Valley of the Sun!"
    },
    {
      mile: 1000,
      location: "Palm Springs, CA",
      emoji: "🏜️",
      description: "Oasis in the desert!"
    },
    {
      mile: 1200,
      location: "San Bernardino, CA",
      emoji: "⛰️",
      description: "Mountain crossing - LA close!"
    },
    {
      mile: 1377,
      location: "Los Angeles, CA",
      emoji: "🎬",
      description: "Hollywood! You're a star!"
    }
  ],
  
  recommendedPace: {
    stepsPerDay: 8000,
    milesPerWeek: 21,
    daysPerWeek: 7,
    estimatedCompletionWeeks: 66 // ~1.3 years
  },
  
  difficultyLevel: "intermediate",
  
  achievementTiers: [
    { miles: 250, badge: "bronze", title: "Desert Entry" },
    { miles: 750, badge: "silver", title: "Arizona Crossed" },
    { miles: 1200, badge: "gold", title: "California Dreaming" },
    { miles: 1377, badge: "platinum", title: "Hollywood Star" }
  ]
}
```

---

## 📊 FIRESTORE COLLECTION STRUCTURE

### Collection: `enduranceGoals` (user's active journey)

```javascript
{
  userId: "abc123",
  goalId: "walk-to-mecca-2026",
  templateId: "walk-to-mecca",
  
  // Basic info (copied from template)
  title: "Pilgrimage to Mecca",
  emoji: "🕌",
  category: "endurance",
  journeyType: "walking",
  
  // Progress tracking
  totalDistance: 7899, // miles
  currentDistance: 245.8, // miles traveled so far
  progress: 3.1, // percentage (245.8 ÷ 7899 × 100)
  
  // Steps tracking
  totalSteps: 649,152, // cumulative steps since starting
  startDate: "2025-06-01",
  lastUpdatedDate: "2026-01-28",
  
  // Milestones
  milestonesReached: [
    {
      mile: 200,
      location: "Memphis, TN",
      reachedOn: "2026-01-15",
      stepCount: 528000
    }
  ],
  nextMilestone: {
    mile: 1200,
    location: "New York, NY",
    milesRemaining: 954.2
  },
  
  // Status
  status: "active", // active, completed, paused
  badge: "bronze", // current achievement tier
  
  // Metadata
  createdAt: serverTimestamp(),
  lastUpdated: serverTimestamp()
}
```

### Collection: `enduranceProgress` (daily step logs)

```javascript
{
  userId: "abc123",
  date: "2026-01-28",
  
  // From physicalGoalsLogs
  steps: 11496,
  
  // Calculated
  milesThisDay: 4.35, // 11496 ÷ 2640
  cumulativeMiles: 245.8,
  
  // Which goal(s) this contributes to
  contributesToGoals: ["walk-to-mecca-2026"],
  
  createdAt: serverTimestamp()
}
```

---

## 🎮 UI COMPONENTS NEEDED

### 1. EnduranceGoalCard.jsx

Shows current progress on journey:

```
┌─────────────────────────────────────────┐
│  🕌 PILGRIMAGE TO MECCA        [85%]   │
├─────────────────────────────────────────┤
│  245.8 / 7,899 miles                    │
│  [████████░░░░░░░░░░░░░░░░░░░]         │
│                                          │
│  📍 Last Milestone: Memphis, TN (200mi) │
│  🎯 Next: New York, NY (1,200mi)        │
│     954.2 miles to go                   │
│                                          │
│  🏆 Bronze Badge Earned                 │
│  📊 649,152 total steps                 │
│                                          │
│  [View Journey Map] [View Stats]        │
└─────────────────────────────────────────┘
```

### 2. RunnerHighTrackerCard.jsx

For the runner's high achievement:

```
┌─────────────────────────────────────────┐
│  🌟 RUNNER'S HIGH ACHIEVEMENT           │
├─────────────────────────────────────────┤
│  Progress: 2/3 successful sessions      │
│                                          │
│  ✅ First 45-Minute Session              │
│     Jan 15, 2026                        │
│                                          │
│  ✅ The Zone                             │
│     Jan 22, 2026                        │
│                                          │
│  ⏳ Euphoria Unlocked                    │
│     Not yet achieved                    │
│                                          │
│  [Log Session] [View Protocol]          │
└─────────────────────────────────────────┘
```

### 3. EnduranceGoalSelector.jsx

When creating new goal:

```
┌─────────────────────────────────────────┐
│  🏃 CHOOSE YOUR JOURNEY                 │
├─────────────────────────────────────────┤
│                                          │
│  🌟 Achieve Runner's High               │
│     Mental achievement · Not distance   │
│     [START]                             │
│                                          │
│  🏡 Walk to Abington, IN                │
│     1,045 miles · ~1 year               │
│     [START]                             │
│                                          │
│  🗽 Walk to New York City               │
│     1,744 miles · ~1.5 years            │
│     [START]                             │
│                                          │
│  🌴 Walk to Los Angeles                 │
│     1,377 miles · ~1.3 years            │
│     [START]                             │
│                                          │
│  🏯 Journey to Great Wall               │
│     7,130 miles · ~5 years · LEGENDARY  │
│     [START]                             │
│                                          │
│  🕌 Pilgrimage to Mecca                 │
│     7,899 miles · ~5.7 years · LEGENDARY│
│     [START]                             │
│                                          │
└─────────────────────────────────────────┘
```

---

## ⚙️ BACKEND LOGIC

### Auto-Update Progress (Cloud Function or Service)

```javascript
/**
 * Called daily to update endurance goal progress
 * Triggered when physicalGoalsLogs are updated
 */
async function updateEnduranceProgress(userId, date, steps) {
  // 1. Calculate miles from steps
  const milesThisDay = steps / 2640;
  
  // 2. Get user's active endurance goals
  const activeGoals = await getActiveEnduranceGoals(userId);
  
  // 3. Update each goal
  for (const goal of activeGoals) {
    const newTotalMiles = goal.currentDistance + milesThisDay;
    const newProgress = (newTotalMiles / goal.totalDistance) * 100;
    
    // Check if crossed any milestones
    const newMilestones = goal.milestonesAlongWay.filter(
      m => m.mile <= newTotalMiles && !goal.milestonesReached.some(r => r.mile === m.mile)
    );
    
    // Update badge tier if applicable
    const newBadge = calculateBadgeTier(newProgress);
    
    await updateEnduranceGoal(goal.id, {
      currentDistance: newTotalMiles,
      progress: newProgress,
      totalSteps: goal.totalSteps + steps,
      milestonesReached: [...goal.milestonesReached, ...newMilestones],
      badge: newBadge,
      lastUpdatedDate: date
    });
    
    // Send celebration notification if milestone reached
    if (newMilestones.length > 0) {
      await sendMilestoneNotification(userId, newMilestones[0]);
    }
  }
}
```

---

## 🎯 SUCCESS CRITERIA

### For Distance-Based Journeys:
- User's steps are automatically tracked from `physicalGoalsLogs`
- Progress bar updates daily
- Milestone notifications when crossing locations
- Badge tier upgrades at 25%, 50%, 75%, 100%
- Completion celebration at 100%

### For Runner's High:
- User manually logs each cardio session
- System tracks: duration, intensity, perceived exertion
- Achievement unlocked after 3 qualifying sessions
- Protocol guidance provided before each session
- Success tips shown after each attempt

---

## 📝 NOTES FOR CLAUDE CODE

**Remember:**
1. Distance formula: `miles = steps / 2640`
2. All distances are from Austin, TX as starting point
3. Runner's High is NOT distance-based
4. Auto-update progress when `physicalGoalsLogs` updates
5. Celebrate milestones with notifications
6. Show journey map with current position
7. Provide detailed protocol for Runner's High attempts

**This is the complete endurance system!** 🏃‍♀️✨