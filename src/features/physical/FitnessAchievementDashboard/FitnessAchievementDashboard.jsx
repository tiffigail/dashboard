import React, { useState, useEffect, useCallback } from 'react';
import styles from '@/features/physical/FitnessAchievementDashboard/FitnessAchievementDashboard.module.css';
import { useAuth } from '@/context/AuthContext';
import * as physicalGoalsService from '@/services/physicalGoalsService';
import GoalCard from '@/features/planning/GoalCard/GoalCard';
import EnduranceGoalCard from '@/features/physical/EnduranceGoalCard/EnduranceGoalCard';
import CardioSessionLogger from '@/features/physical/CardioSessionLogger/CardioSessionLogger';
import { syncAllDistanceGoals } from '@/services/enduranceGoalsService';
import QuickWorkoutLogger from '@/features/physical/QuickWorkoutLogger/QuickWorkoutLogger';
import PeriodInsightsWidget from '@/features/physical/PeriodInsightsWidget/PeriodInsightsWidget';
import GoalCreationWizard from '@/features/planning/GoalCreationWizard/GoalCreationWizard';
import MuscleProgramCard from '@/features/physical/MuscleProgramCard/MuscleProgramCard';
import WorkoutSessionLogger from '@/features/physical/WorkoutSessionLogger/WorkoutSessionLogger';
import MeasurementLogger from '@/features/physical/MeasurementLogger/MeasurementLogger';
import MeasurementChart from '@/features/physical/MeasurementChart/MeasurementChart';
import StrengthProgramCard from '@/features/physical/StrengthProgramCard/StrengthProgramCard';
import StrengthWorkoutLogger from '@/features/physical/StrengthWorkoutLogger/StrengthWorkoutLogger';
import StrengthProgressChart from '@/features/physical/StrengthProgressChart/StrengthProgressChart';
import * as muscleBuildingService from '@/services/muscleBuildingService';
import * as skillBadgeService from '@/services/skillBadgeService';
import SkillBadgeCard from '@/features/gear/SkillBadgeCard/SkillBadgeCard';
import SkillPracticeLogger from '@/features/gear/SkillPracticeLogger/SkillPracticeLogger';
import SkillLevelView from '@/features/gear/SkillLevelView/SkillLevelView';
import Modal from '@/components/ui/Modal/Modal';

function FitnessAchievementDashboard() {
  const [activeGoals, setActiveGoals] = useState([]);
  const [recentWorkouts, setRecentWorkouts] = useState([]);
  const [latestMeasurements, setLatestMeasurements] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorkoutLoggerOpen, setIsWorkoutLoggerOpen] = useState(false);
  const [isGoalWizardOpen, setIsGoalWizardOpen] = useState(false);
  const [isCardioLoggerOpen, setIsCardioLoggerOpen] = useState(false);
  const [selectedEnduranceGoal, setSelectedEnduranceGoal] = useState(null);
  const [musclePrograms, setMusclePrograms] = useState([]);
  const [isMuscleWorkoutOpen, setIsMuscleWorkoutOpen] = useState(false);
  const [selectedMuscleProgram, setSelectedMuscleProgram] = useState(null);
  const [isMeasurementLoggerOpen, setIsMeasurementLoggerOpen] = useState(false);
  const [isStrengthWorkoutOpen, setIsStrengthWorkoutOpen] = useState(false);
  const [selectedStrengthProgram, setSelectedStrengthProgram] = useState(null);
  const [skillBadges, setSkillBadges] = useState([]);
  const [isSkillPracticeOpen, setIsSkillPracticeOpen] = useState(false);
  const [isSkillLevelViewOpen, setIsSkillLevelViewOpen] = useState(false);
  const [selectedSkillBadge, setSelectedSkillBadge] = useState(null);
  const [expandedWorkouts, setExpandedWorkouts] = useState(new Set());

  const { currentUser } = useAuth();
  const userId = currentUser?.uid;

  const fetchData = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const [goals, workouts, measurements, mPrograms, badges] = await Promise.all([
        physicalGoalsService.getActiveFitnessGoals(userId),
        physicalGoalsService.getRecentWorkouts(userId, 5),
        physicalGoalsService.getLatestMeasurements(userId),
        muscleBuildingService.getCurrentPrograms(userId),
        skillBadgeService.getActiveSkillBadges(userId)
      ]);
      setMusclePrograms(mPrograms);
      setSkillBadges(badges);

      // Sync distance endurance goals from daily step logs, then re-fetch
      const distanceGoals = goals.filter(g => g.category === 'endurance' && g.journeyType === 'distance');
      if (distanceGoals.length > 0) {
        await syncAllDistanceGoals(goals);
        const updatedGoals = await physicalGoalsService.getActiveFitnessGoals(userId);
        setActiveGoals(updatedGoals);
      } else {
        setActiveGoals(goals);
      }
      setRecentWorkouts(workouts);
      setLatestMeasurements(measurements);
    } catch (error) {
      console.error("Error fetching physical dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Seed historical measurements on first load — isolated so it can't break fetchData
  useEffect(() => {
    if (!userId) return;
    muscleBuildingService.seedHistoricalMeasurementsIfEmpty(userId).catch(err =>
      console.warn('Historical seed skipped:', err.message)
    );
  }, [userId]);

  const handleWorkoutLogged = () => {
    setIsWorkoutLoggerOpen(false);
    fetchData();
  };

  const handleGoalCreated = () => {
    setIsGoalWizardOpen(false);
    fetchData();
  };

  if (!userId) {
    return <div className={styles.loading}>Please log in to view your physical dashboard.</div>;
  }

  if (isLoading) {
    return <div className={styles.loading}>Loading your physical dashboard...</div>;
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1 className={styles.title}>Physical Dashboard</h1>
        <div className={styles.headerActions}>
          <button
            onClick={() => setIsGoalWizardOpen(true)}
            className={styles.createGoalButton}
          >
            Create New Goal
          </button>
          <button
            onClick={() => setIsWorkoutLoggerOpen(true)}
            className={styles.logWorkoutButton}
          >
            Log Workout
          </button>
          <button
            onClick={() => setIsMeasurementLoggerOpen(true)}
            className={styles.logMeasurementButton}
          >
            Log Measurements
          </button>
        </div>
      </div>

      {/* Active Goals Section */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Active Goals</h2>
        {activeGoals.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No active goals yet!</p>
            <button
              onClick={() => setIsGoalWizardOpen(true)}
              className={styles.createFirstGoalButton}
            >
              Create Your First Goal
            </button>
          </div>
        ) : (
          <div className={styles.goalsGrid}>
            {activeGoals.map(goal => (
              goal.category === 'endurance' ? (
                <EnduranceGoalCard
                  key={goal.id}
                  goal={goal}
                  onLogSession={() => { setSelectedEnduranceGoal(goal); setIsCardioLoggerOpen(true); }}
                />
              ) : (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onQuickLog={() => setIsWorkoutLoggerOpen(true)}
                />
              )
            ))}
          </div>
        )}
      </section>

      {/* Muscle Building Programs */}
      {musclePrograms.filter(p => p.category !== 'strength').length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Muscle Building Programs</h2>
          <div className={styles.goalsGrid}>
            {musclePrograms.filter(p => p.category !== 'strength').map(prog => (
              <MuscleProgramCard
                key={prog.id}
                program={prog}
                onLogWorkout={() => { setSelectedMuscleProgram(prog); setIsMuscleWorkoutOpen(true); }}
                onLogMeasurement={() => setIsMeasurementLoggerOpen(true)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Strength Programs */}
      {musclePrograms.filter(p => p.category === 'strength').length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Strength Programs</h2>
          <div className={styles.goalsGrid}>
            {musclePrograms.filter(p => p.category === 'strength').map(prog => (
              <StrengthProgramCard
                key={prog.id}
                program={prog}
                onStartWorkout={() => { setSelectedStrengthProgram(prog); setIsStrengthWorkoutOpen(true); }}
              />
            ))}
          </div>
        </section>
      )}

      {/* Skill Badges */}
      {skillBadges.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Skill Badges</h2>
          <div className={styles.goalsGrid}>
            {skillBadges.map(badge => (
              <SkillBadgeCard
                key={badge.id}
                badge={badge}
                onLogPractice={() => { setSelectedSkillBadge(badge); setIsSkillPracticeOpen(true); }}
                onViewProgress={() => { setSelectedSkillBadge(badge); setIsSkillLevelViewOpen(true); }}
              />
            ))}
          </div>
        </section>
      )}

      {/* Strength Progress Chart */}
      {musclePrograms.filter(p => p.category === 'strength').length > 0 && (
        <StrengthProgressChart userId={userId} />
      )}

      {/* Latest Measurements snapshot + chart together */}
      {latestMeasurements && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Latest Measurements</h2>
          <p className={styles.measurementsDate}>Last measured: {latestMeasurements.date}</p>
          <div className={styles.measurementsGrid}>
            {latestMeasurements.thighs_left     != null && <div><span className={styles.measureLabel}>Thigh (L)</span> <strong>{latestMeasurements.thighs_left} cm</strong></div>}
            {latestMeasurements.thighs_right    != null && <div><span className={styles.measureLabel}>Thigh (R)</span> <strong>{latestMeasurements.thighs_right} cm</strong></div>}
            {latestMeasurements.calves_left     != null && <div><span className={styles.measureLabel}>Calf (L)</span> <strong>{latestMeasurements.calves_left} cm</strong></div>}
            {latestMeasurements.calves_right    != null && <div><span className={styles.measureLabel}>Calf (R)</span> <strong>{latestMeasurements.calves_right} cm</strong></div>}
            {latestMeasurements.hips            != null && <div><span className={styles.measureLabel}>Hips</span> <strong>{latestMeasurements.hips} cm</strong></div>}
            {latestMeasurements.waist           != null && <div><span className={styles.measureLabel}>Waist</span> <strong>{latestMeasurements.waist} cm</strong></div>}
            {latestMeasurements.upperArms_left  != null && <div><span className={styles.measureLabel}>Arm (L)</span> <strong>{latestMeasurements.upperArms_left} cm</strong></div>}
            {latestMeasurements.upperArms_right != null && <div><span className={styles.measureLabel}>Arm (R)</span> <strong>{latestMeasurements.upperArms_right} cm</strong></div>}
            {latestMeasurements.forearms_left   != null && <div><span className={styles.measureLabel}>Forearm (L)</span> <strong>{latestMeasurements.forearms_left} cm</strong></div>}
            {latestMeasurements.forearms_right  != null && <div><span className={styles.measureLabel}>Forearm (R)</span> <strong>{latestMeasurements.forearms_right} cm</strong></div>}
            {latestMeasurements.weight          != null && <div><span className={styles.measureLabel}>Weight</span> <strong>{latestMeasurements.weight} kg</strong></div>}
            {latestMeasurements.bodyFatPercent  != null && <div><span className={styles.measureLabel}>Body Fat</span> <strong>{latestMeasurements.bodyFatPercent}%</strong></div>}
          </div>
        </section>
      )}
      <MeasurementChart userId={userId} />

      {/* Period Insights Widget */}
      <PeriodInsightsWidget userId={userId} />

      {/* Recent Workouts Section */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Recent Workouts</h2>
        {recentWorkouts.length === 0 ? (
          <p className={styles.emptyState}>No workouts logged yet</p>
        ) : (
          <div className={styles.workoutsList}>
            {recentWorkouts.map(workout => {
              const isExpanded = expandedWorkouts.has(workout.id);
              const hasExercises = workout.exercises?.length > 0;
              const toggle = () => setExpandedWorkouts(prev => {
                const next = new Set(prev);
                isExpanded ? next.delete(workout.id) : next.add(workout.id);
                return next;
              });

              return (
                <div key={workout.id} className={styles.workoutCard}>
                  {/* Header row — always visible, clickable if has exercises */}
                  <div
                    className={`${styles.workoutHeader} ${hasExercises ? styles.workoutHeaderClickable : ''}`}
                    onClick={hasExercises ? toggle : undefined}
                  >
                    <div className={styles.workoutTitleRow}>
                      <h3>{workout.workoutName || 'Workout'}</h3>
                      {hasExercises && (
                        <span className={styles.expandChevron}>{isExpanded ? '▲' : '▼'}</span>
                      )}
                    </div>
                    <span className={styles.workoutDate}>{workout.date}</span>
                  </div>

                  {/* Summary stats */}
                  <div className={styles.workoutStats}>
                    {workout.duration > 0 && <span>{workout.duration} min</span>}
                    {hasExercises && (
                      <span>{workout.exercises.length} exercise{workout.exercises.length !== 1 ? 's' : ''}</span>
                    )}
                    {workout.totalVolume > 0 && (
                      <span className={styles.volumeStat}>{workout.totalVolume.toLocaleString()} lbs total</span>
                    )}
                    {workout.source === 'cardio' && workout.peakHR && <span>Peak HR: {workout.peakHR} bpm</span>}
                    {workout.volumePR && <span className={styles.prBadge}>PR!</span>}
                  </div>

                  {/* Expanded exercise detail */}
                  {isExpanded && hasExercises && (
                    <div className={styles.exerciseDetails}>
                      {workout.exercises.map((ex, i) => {
                        const completedSets = ex.sets?.filter(s => s.reps > 0) ?? [];
                        const exVolume = completedSets.reduce((sum, s) => sum + (s.reps * s.weight), 0);
                        return (
                          <div key={i} className={styles.exerciseRow}>
                            <div className={styles.exerciseRowHeader}>
                              <span className={styles.exerciseRowName}>
                                {ex.exerciseName || ex.exerciseId || `Exercise ${i + 1}`}
                              </span>
                              {exVolume > 0 && (
                                <span className={styles.exerciseRowVolume}>{exVolume.toLocaleString()} lbs</span>
                              )}
                            </div>
                            {completedSets.length > 0 && (
                              <div className={styles.setsRow}>
                                {completedSets.map((s, si) => (
                                  <span key={si} className={styles.setChip}>
                                    {s.weight > 0 ? `${s.weight}×${s.reps}` : `${s.reps} reps`}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Modals */}
      <Modal
        isOpen={isWorkoutLoggerOpen}
        onClose={() => setIsWorkoutLoggerOpen(false)}
        zIndex={1100}
      >
        <QuickWorkoutLogger
          userId={userId}
          goals={activeGoals}
          onClose={() => setIsWorkoutLoggerOpen(false)}
          onSave={handleWorkoutLogged}
        />
      </Modal>

      <Modal
        isOpen={isGoalWizardOpen}
        onClose={() => setIsGoalWizardOpen(false)}
        zIndex={1100}
      >
        <GoalCreationWizard
          userId={userId}
          onClose={() => setIsGoalWizardOpen(false)}
          onSave={handleGoalCreated}
        />
      </Modal>

      {selectedMuscleProgram && (
        <Modal
          isOpen={isMuscleWorkoutOpen}
          onClose={() => { setIsMuscleWorkoutOpen(false); setSelectedMuscleProgram(null); }}
          zIndex={1100}
        >
          <WorkoutSessionLogger
            program={selectedMuscleProgram}
            userId={userId}
            onClose={() => { setIsMuscleWorkoutOpen(false); setSelectedMuscleProgram(null); }}
            onSave={() => { setIsMuscleWorkoutOpen(false); setSelectedMuscleProgram(null); fetchData(); }}
          />
        </Modal>
      )}

      {selectedStrengthProgram && (
        <Modal
          isOpen={isStrengthWorkoutOpen}
          onClose={() => { setIsStrengthWorkoutOpen(false); setSelectedStrengthProgram(null); }}
          zIndex={1100}
        >
          <StrengthWorkoutLogger
            program={selectedStrengthProgram}
            userId={userId}
            onClose={() => { setIsStrengthWorkoutOpen(false); setSelectedStrengthProgram(null); }}
            onSave={() => { setIsStrengthWorkoutOpen(false); setSelectedStrengthProgram(null); fetchData(); }}
          />
        </Modal>
      )}

      <Modal
        isOpen={isMeasurementLoggerOpen}
        onClose={() => setIsMeasurementLoggerOpen(false)}
        zIndex={1100}
      >
        <MeasurementLogger
          userId={userId}
          onClose={() => setIsMeasurementLoggerOpen(false)}
          onSave={() => { setIsMeasurementLoggerOpen(false); fetchData(); }}
        />
      </Modal>

      {selectedEnduranceGoal && (
        <Modal
          isOpen={isCardioLoggerOpen}
          onClose={() => { setIsCardioLoggerOpen(false); setSelectedEnduranceGoal(null); }}
          zIndex={1100}
        >
          <CardioSessionLogger
            goal={selectedEnduranceGoal}
            userId={userId}
            onClose={() => { setIsCardioLoggerOpen(false); setSelectedEnduranceGoal(null); }}
            onSave={() => { setIsCardioLoggerOpen(false); setSelectedEnduranceGoal(null); fetchData(); }}
          />
        </Modal>
      )}

      {selectedSkillBadge && (
        <Modal
          isOpen={isSkillPracticeOpen}
          onClose={() => { setIsSkillPracticeOpen(false); setSelectedSkillBadge(null); }}
          zIndex={1100}
        >
          <SkillPracticeLogger
            badge={selectedSkillBadge}
            userId={userId}
            onClose={() => { setIsSkillPracticeOpen(false); setSelectedSkillBadge(null); }}
            onSave={() => { setIsSkillPracticeOpen(false); setSelectedSkillBadge(null); fetchData(); }}
          />
        </Modal>
      )}

      {selectedSkillBadge && (
        <Modal
          isOpen={isSkillLevelViewOpen}
          onClose={() => { setIsSkillLevelViewOpen(false); setSelectedSkillBadge(null); }}
          zIndex={1100}
        >
          <SkillLevelView
            badge={selectedSkillBadge}
            userId={userId}
            onClose={() => { setIsSkillLevelViewOpen(false); setSelectedSkillBadge(null); }}
            onRefresh={() => fetchData()}
          />
        </Modal>
      )}
    </div>
  );
}

export default FitnessAchievementDashboard;
