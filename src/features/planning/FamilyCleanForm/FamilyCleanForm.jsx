import React, { useState, useEffect, useRef } from 'react';
import styles from '@/features/planning/FamilyCleanForm/FamilyCleanForm.module.css';
import { db } from '@/firebaseConfig';
import { collection, addDoc, serverTimestamp, getDocs, query, where, Timestamp } from "firebase/firestore";

import "react-responsive-carousel/lib/styles/carousel.min.css"; 
import { Carousel } from 'react-responsive-carousel';
import AllowanceModal from '@/features/planning/FamilyCleanForm/AllowanceModal'; 

// --- CHORE SCHEDULE CONFIGURATION ---
const CHORE_CONFIG = {
    people: ["Abi", "Izi", "Tiffany"],
    daily: {
        roles: ["Kitchen Lead", "Living Area Lead", "Laundry Lead"],
        tasks: {
            "Kitchen Lead": ["Load/Unload Dishwasher", "Wipe Counters & Sink", "Quick Sweep Kitchen"],
            "Living Area Lead": ["Tidy Common Surfaces", "Fix Pillows/Blankets", "Manage Mail"],
            "Laundry Lead": ["One load start to finish"],
        },
        descriptions: {
            "Kitchen Lead": "Responsible for the daily reset of the kitchen.",
            "Living Area Lead": "Responsible for tidying the main common living spaces.",
            "Laundry Lead": "Responsible for keeping the laundry cycle moving."
        }
    },
    weekly: {
        zones: ["Zone 1: Bathrooms", "Zone 2: Floors", "Zone 3: Dusting & Surfaces"],
        tasks: {
            "Zone 1: Bathrooms": ["Clean Toilets", "Clean Sinks & Counters", "Clean Mirrors", "Empty Trash"],
            "Zone 2: Floors": ["Thoroughly Vacuum/Sweep All", "Mop Hard Floors"],
            "Zone 3: Dusting & Surfaces": ["Dust all common areas", "Clean windowsills", "Wipe appliance fronts"],
        },
        descriptions: {
            "Zone 1: Bathrooms": "A thorough clean of all bathrooms.",
            "Zone 2: Floors": "Vacuuming, sweeping, and mopping all main floors.",
            "Zone 3: Dusting & Surfaces": "Dusting surfaces and wiping down appliances."
        }
    },
    constant: {
        "Tiffany": ["Morning Dog Care: Feed & Fresh Water", "Morning Chicken Care: Feed, Water, & Collect Eggs"],
        "Abi": ["Evening Dog Care: Feed & Water Check", "Evening Chicken Care: Feed & Close Coop"],
    }
};

// Helper function to get the week number of the year
const getDayOfYear = (d) => {
    const start = new Date(d.getFullYear(), 0, 0);
    const diff = (d - start) + ((start.getTimezoneOffset() - d.getTimezoneOffset()) * 60 * 1000);
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
};

// --- COMPONENT FOR DISPLAYING CHORES ---
const TodaysChores = ({ cleanerName, currentDate, completedChores, onChoreCheck }) => {
    const dayOfYear = getDayOfYear(currentDate);
    
    const dayOfWeek = currentDate.getDay();
    const personIndex = CHORE_CONFIG.people.indexOf(cleanerName);

    const dailyRoleIndex = (dayOfYear + personIndex) % CHORE_CONFIG.daily.roles.length;    const dailyRole = CHORE_CONFIG.daily.roles[dailyRoleIndex];
    const dailyTasks = CHORE_CONFIG.daily.tasks[dailyRole];
    const dailyDescription = CHORE_CONFIG.daily.descriptions[dailyRole];

    const weeklyZoneIndex = (dayOfYear + personIndex) % CHORE_CONFIG.weekly.zones.length;    const weeklyZone = CHORE_CONFIG.weekly.zones[weeklyZoneIndex];
    const weeklyTasks = CHORE_CONFIG.weekly.tasks[weeklyZone];
    const weeklyDescription = CHORE_CONFIG.weekly.descriptions[weeklyZone];
    
    const constantTasks = CHORE_CONFIG.constant[cleanerName] || [];

    const ChoreItem = ({ task }) => (
        <li className={styles.choreItem}>
            <input 
                type="checkbox" 
                id={`${cleanerName}-${task}`}
                checked={completedChores.has(task)}
                onChange={(e) => onChoreCheck(task, e.target.checked, cleanerName)}
            />
            <label htmlFor={`${cleanerName}-${task}`}>{task}</label>
        </li>
    );

    return (
        <div className={styles.choreSection}>
            <h5 className={styles.choreTitle}>Today's Assignments</h5>
            <ul className={styles.choreList}>
                {constantTasks.map(task => <ChoreItem key={task} task={task} />)}
                {constantTasks.length > 0 && <li className={styles.choreDivider}></li>}
                <li className={styles.choreRole}>
                    <span><strong>Daily:</strong> {dailyRole}</span>
                    <span className={styles.tooltip} data-tooltip={dailyDescription}>ⓘ</span>
                </li>
                {dailyTasks.map(task => <ChoreItem key={task} task={task} />)}
                {(dayOfWeek === 6 || dayOfWeek === 0) && (
                    <>
                        <li className={styles.choreDivider}></li>
                        <li className={styles.choreRole}>
                            <span><strong>Weekend:</strong> {weeklyZone.split(':')[1]}</span>
                            <span className={styles.tooltip} data-tooltip={weeklyDescription}>ⓘ</span>
                        </li>
                        {weeklyTasks.map(task => <ChoreItem key={task} task={task} />)}
                    </>
                )}
            </ul>
        </div>
    );
};

// --- DATA DEFINITIONS ---
export const cleaningAreasData = [
    { name: "Shrine", tasks: [ { id: "shrine_tidy", label: "Tidy space" }, { id: "shrine_dust", label: "Dust surfaces" }, { id: "shrine_altar_floor", label: "Altar floor" }, { id: "shrine_reorganize_shelves", label: "Reorganize shelves" } ]},
    { name: "Abis Office", tasks: [ { id: "abi_office_desk1", label: "Clear/Wipe Desk 1" }, { id: "abi_office_desk2", label: "Clear/Wipe Desk 2" }, { id: "abi_office_sweep", label: "Sweep Office Floor" }, { id: "abi_office_mop", label: "Wipe Office Floor" }, { id: "abi_office_turtle", label: "Clean Turtle Cage" }, { id: "abi_office_trash", label: "Empty Trash" } ]},
    { name: "Izis Bedroom", tasks: [ { id: "izi_bed", label: "Make Bed" }, { id: "izi_tidy_floor_toys", label: "Tidy Floor/Toys" }, { id: "izi_surfaces_dust", label: "Dust Surfaces" }, { id: "izi_clothes", label: "Put away clothes" }, { id: "izi_sweep_floor", label: "Sweep floor" } ]},
    { name: "Guest Bathroom", tasks: [ { id: "guest_bath_sink", label: "Clean Sink & Counter" }, { id: "guest_bath_mirror", label: "Clean Mirror" }, { id: "guest_bath_toilet", label: "Clean Toilet" }, { id: "guest_bath_floor", label: "Sweep/Mop Floor" }, { id: "guest_bath_restock", label: "Restock towels/soap"} ]},
    { name: "Hallway", tasks: [ { id: "hallway_sweep_mop_floors", label: "Sweep and mop floors" }, { id: "hallway_clean_mirrors", label: "Clean mirrors" } ]},
    { name: "Tiffany's Office", tasks: [{ id: "tiffany_office_desk", label: "Clear/Wipe Desk" }, { id: "tiffany_office_organize_supplies", label: "Organize supplies" }, { id: "tiffany_office_trash", label: "Empty Trash" }] },
    { name: "Master Bedroom", tasks: [ { id: "master_bed_clean_under", label: "Clean under Bed" }, { id: "master_bed_trash", label: "Empty and reline trashcans" }, { id: "master_bed_abi_side", label: "Abi's side of bed" }, { id: "master_bed_dresser_top", label: "Dresser Top" }, { id: "master_bed_tv_stand", label: "Tv Stand" }, { id: "master_bed_sweep", label: "Sweep Floor" }, { id: "master_bed_mop", label: "Mop Floor" } ]},
    { name: "Master Closet", tasks: [{ id: "master_closet_organize_clothes", label: "Organize Clothes" }, { id: "master_closet_organize_shoes", label: "Organize Shoes" }, { id: "master_closet_organize_storage", label: "Organize Storage" }, { id: "master_closet_floor_vacuum", label: "Vacuum Floor" }, { id: "master_closet_dust_shelves", label: "Dust Shelves" }] },
    { name: "Master Bath Outer", tasks: [{ id: "master_bath_outer_sinks_counters", label: "Clean Sinks/Counters" }, { id: "master_bath_outer_mirrors_clean", label: "Clean Mirrors" }, { id: "master_bath_outer_tidy_countertops", label: "Tidy Counter Tops" }, { id: "master_bath_outer_sweep", label: "Sweep Floor" }, { id: "master_bath_outer_mop", label: "Mop Floor" }, { id: "master_bath_outer_organize_supplies", label: "Organize Supplies" }] },
    { name: "Master Bath Inner", tasks: [{ id: "master_bath_inner_shower_clean", label: "Clean Shower/Tub" }, { id: "master_bath_inner_toilet_clean", label: "Clean Toilet" }, {id: "master_bath_inner_floor_mop", label: "Sweep/Mop Floor"}] },
    { name: "Dining Room", tasks: [{ id: "dining_table_clear", label: "Clear Table" }, { id: "dining_table_wipe", label: "Wipe Table" }, { id: "dining_chairs_tidy", label: "Tidy Chairs" }, { id: "dining_floor_sweep", label: "Sweep Floor" }, { id: "dining_floor_mop", label: "Mop Floor" }, { id: "dining_dust_surfaces", label: "Dust Surfaces" }, { id: "dining_wall_shelf", label: "Wall Shelf" }, { id: "dining_outdoor_shelves", label: "Outdoors Shelves" }, { id: "dining_shoes_coats", label: "Shoes & Coats" }, { id: "dining_treadmill", label: "Treadmill" }] },
    { name: "Living Room", tasks: [{ id: "living_electronics_away", label: "Electronics Away" }, { id: "living_personal_items", label: "Personal Items Away" }, { id: "living_dust_surfaces", label: "Dust Surfaces" }, { id: "living_couch", label: "Couch" }, { id: "living_loveseat", label: "Love Seat" }, { id: "living_table", label: "Table" }, { id: "living_shelves", label: "Shelves" }, { id: "living_windowsills", label: "Dust Windowsills" }, { id: "living_sweep_floor", label: "Sweep Floor" }, { id: "living_vacuum_floor", label: "Vacuum Floor" }, { id: "living_mop_floor", label: "Mop Floor" }] },
    { name: "Kitchen", tasks: [{ id: "kitchen_unload_dishes", label: "Unload Dishes" }, { id: "kitchen_reload_dishes", label: "Reload Dishes" }, { id: "kitchen_wipe_sink", label: "Wipe Sink" }, { id: "kitchen_wipe_counters", label: "Wipe Counters" }, { id: "kitchen_stovetop_clean", label: "Clean Stovetop" }, { id: "kitchen_microwave_clean", label: "Clean Microwave" }, { id: "kitchen_cabinets", label: "Cabinets" }, { id: "kitchen_fridge", label: "Fridge" }, { id: "kitchen_sweep_floor", label: "Sweep Floor" }, { id: "kitchen_mop_floor", label: "Mop Floor" }] },
    { name: "Dog Area", tasks: [{ id: "dog_food_bowls", label: "Clean Food Bowls" }, { id: "dog_water_bowls", label: "Clean Water Bowls" }, { id: "dog_tidy_beds", label: "Tidy Dog Beds" }, { id: "dog_tidy_toys", label: "Tidy Toys" }, { id: "dog_sweep_area", label: "Sweep Area" }, { id: "dog_mop_area", label: "Mop Area" }, { id: "dog_recycling", label: "Recycling" }, { id: "dog_trash", label: "Trash" }, { id: "dog_windowsill", label: "Window Sill" }] },
    { name: "Laundry Room", tasks: [{ id: "laundry_machines_wipe", label: "Wipe Machines (inside/out)" }, { id: "laundry_lint_trap_empty", label: "Empty Lint Trap" }, {id: "laundry_tidy_supplies", label: "Tidy supplies"}, { id: "laundry_floor_sweep_mop", label: "Sweep/Mop Floor" }] },
    { name: "Front Hall", tasks: [{ id: "front_hall_wipe_door", label: "Wipe Door" }, { id: "front_hall_sweep_floor", label: "Sweep Floor" }, { id: "front_hall_mop_floor", label: "Mop Floor" }, { id: "front_hall_baseboards", label: "Wipe Baseboards" }] },
    { name: "Garage", tasks: [{ id: "garage_sweep_area", label: "Sweep Designated Area" }, { id: "garage_organize_section", label: "Organize One Section/Shelf" }, {id: "garage_trash_cobwebs", label: "Take out trash/Clear cobwebs"} ] },
    { name: "Front Porch and Yard", tasks: [{ id: "front_porch_clean", label: "Clean Porch" }, { id: "front_porch_sweep", label: "Sweep Porch" }, { id: "front_walkway_sweep", label: "Sweep Walkway" }, { id: "front_chicken_dishes", label: "Chicken Dishes" }, { id: "front_cabinet", label: "Cabinet" }, { id: "front_water_plants", label: "Water Plants" }, { id: "front_yard_trash", label: "Trash in Yard" }, { id: "front_yard_sticks", label: "Tidy Sticks" }, { id: "front_yard_stones", label: "Tidy Stones" }] },
    { name: "Back Porch and Yard", tasks: [{ id: "back_porch_sweep", label: "Sweep Porch" }, { id: "back_yard_tidy_debris", label: "Tidy Yard Debris" }, { id: "back_coop_clean", label: "Clean Coop" }] }
];
const people = ["Abi", "Izi", "Tiffany"];

const getInitialPersonState = (personName) => {
    const savedState = localStorage.getItem(`familyClean_state_${personName}`);
    if (savedState) {
        try {
            const parsedState = JSON.parse(savedState);
            if (parsedState.selectedRoomName) {
                const area = cleaningAreasData.find(a => a.name === parsedState.selectedRoomName);
                parsedState.currentRoomTasks = area ? area.tasks : [];
            } else {
                parsedState.currentRoomTasks = [];
            }
            parsedState.imageUrls = [];
            return parsedState;
        } catch (e) {
            console.error(`Error parsing saved state for ${personName}:`, e);
        }
    }
    return { selectedRoomName: '', currentRoomTasks: [], imageUrls: [], preRating: '', postRating: '', checkedTasks: {}, isSubmitting: false, submitError: null, submitSuccess: false };
};

function FamilyCleanForm({ onClose, onNavigate }) {
    const [isAllowanceModalOpen, setAllowanceModalOpen] = useState(() => localStorage.getItem('isAllowanceModalOpen') === 'true');
    const [completedChores, setCompletedChores] = useState(new Set());
    const modalOpenTimeRef = useRef(Date.now());
    const [roomImages, setRoomImages] = useState([]);
    const [personStates, setPersonStates] = useState(() => {
        const initialState = {};
        people.forEach(person => { initialState[person] = getInitialPersonState(person); });
        return initialState;
    });

    useEffect(() => {
        if (isAllowanceModalOpen) {
            document.body.style.overflow = 'hidden';
            localStorage.setItem('isAllowanceModalOpen', 'true');
        } else {
            document.body.style.overflow = 'unset';
            localStorage.setItem('isAllowanceModalOpen', 'false');
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isAllowanceModalOpen]);

    useEffect(() => {
        const handleWheel = (e) => {
            if (document.activeElement.type === "number") { e.preventDefault(); }
        };
        window.addEventListener("wheel", handleWheel, { passive: false });
        return () => { window.removeEventListener("wheel", handleWheel); };
    }, []);

    useEffect(() => {
        const fetchInitialData = async () => {
            const imageCollectionRef = collection(db, "images");
            const today = new Date();
            const startOfDay = new Date(today.setHours(0, 0, 0, 0));
            const endOfDay = new Date(today.setHours(23, 59, 59, 999));
            const choreLogsQuery = query(
                collection(db, "choreLogs"), 
                where('completedAt', '>=', Timestamp.fromDate(startOfDay)),
                where('completedAt', '<=', Timestamp.fromDate(endOfDay))
            );
            
            try {
                const [imageSnapshot, choreLogsSnapshot] = await Promise.all([
                    getDocs(imageCollectionRef),
                    getDocs(choreLogsQuery)
                ]);

                const imageData = imageSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setRoomImages(imageData);

                const chores = new Set(choreLogsSnapshot.docs.map(doc => doc.data().chore));
                setCompletedChores(chores);
            } catch (error) {
                console.error("Error fetching initial data:", error);
            }
        };
        fetchInitialData();
    }, []);

    useEffect(() => {
        people.forEach(personName => {
            const stateToSave = personStates[personName];
            const { currentRoomTasks, imageUrls, ...savableState } = stateToSave;
            localStorage.setItem(`familyClean_state_${personName}`, JSON.stringify(savableState));
        });
    }, [personStates]);

    const handleChoreCheck = async (chore, isChecked, cleanerName) => {
        const todayStr = new Date().toISOString().split('T')[0];
        if (isChecked) {
            setCompletedChores(prev => new Set(prev).add(chore));
            try {
                await addDoc(collection(db, "choreLogs"), {
                    chore: chore,
                    cleanerName: cleanerName,
                    completedAt: serverTimestamp(),
                    date: todayStr,
                });
            } catch (error) {
                console.error("Error logging chore:", error);
                setCompletedChores(prev => { const newSet = new Set(prev); newSet.delete(chore); return newSet; });
            }
        } else {
            setCompletedChores(prev => { const newSet = new Set(prev); newSet.delete(chore); return newSet; });
        }
    };
    
    const handleRoomChange = (personName, event) => {
        const roomName = event.target.value;
        let tasksForRoom = [];
        let imageUrls = [];
        if (roomName) {
            const area = cleaningAreasData.find(a => a.name === roomName);
            tasksForRoom = area ? area.tasks : [];
            const matchingImages = roomImages.filter(img => img.associatedRoom === roomName);
            if (matchingImages.length > 0) {
                imageUrls = matchingImages.map(img => img.imageUrl);
            }
        }
        setPersonStates(prev => ({
            ...prev,
            [personName]: { ...prev[personName], selectedRoomName: roomName, currentRoomTasks: tasksForRoom, imageUrls: imageUrls, preRating: '', postRating: '', checkedTasks: {}, submitSuccess: false, submitError: null, }
        }));
    };
    
    const handleRatingChange = (personName, field, event) => {
        const value = Math.max(1, Math.min(10, Number(event.target.value)));
        setPersonStates(prev => ({ ...prev, [personName]: { ...prev[personName], [field]: event.target.value === '' ? '' : value.toString() } }));
    };

    const handleCheckboxChange = (personName, taskId, isChecked) => {
        setPersonStates(prev => ({ ...prev, [personName]: { ...prev[personName], checkedTasks: { ...prev[personName].checkedTasks, [taskId]: isChecked } } }));
    };

    const handleSubmit = async (personName) => {
        const currentPersonState = personStates[personName];
        if (!currentPersonState.selectedRoomName) { setPersonStates(prev => ({ ...prev, [personName]: { ...prev[personName], submitError: "Please select a room." } })); return; }
        if (!currentPersonState.preRating || !currentPersonState.postRating) { setPersonStates(prev => ({ ...prev, [personName]: { ...prev[personName], submitError: "Please provide pre and post cleaning ratings." } })); return; }
        setPersonStates(prev => ({ ...prev, [personName]: { ...prev[personName], isSubmitting: true, submitError: null, submitSuccess: false } }));
        const completedTaskLabels = currentPersonState.currentRoomTasks.filter(task => currentPersonState.checkedTasks[task.id]).map(task => task.label);
        const endTime = Date.now();
        const durationMinutes = Math.round((endTime - modalOpenTimeRef.current) / (1000 * 60));
        const formData = { cleanerName: personName, roomName: currentPersonState.selectedRoomName, preCleaningRating: Number(currentPersonState.preRating), postCleaningRating: Number(currentPersonState.postRating), completedTasks: completedTaskLabels, durationMinutes: durationMinutes, completedAt: serverTimestamp() };
        try {
            await addDoc(collection(db, "familyCleanLogs"), formData);
            localStorage.removeItem(`familyClean_state_${personName}`);
            setPersonStates(prev => ({ ...prev, [personName]: { ...getInitialPersonState(personName), selectedRoomName: '', currentRoomTasks: [], submitSuccess: true, isSubmitting: false } }));
        } catch (e) {
            console.error(`Error adding document for ${personName}: `, e);
            setPersonStates(prev => ({ ...prev, [personName]: { ...prev[personName], submitError: `Failed to save entry. Please try again.`, isSubmitting: false } }));
        }
    };

    return (
        <>
            <div className={styles.formContainerV2} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h3 className={styles.formTitleV2}>Family Cleaning Log</h3>
                    <button onClick={() => setAllowanceModalOpen(true)} className={styles.allowanceButton}>💰 Allowance Tracker</button>
                    <button onClick={onClose} className={styles.closeButtonV2}>×</button>
                </div>
                <div className={styles.sectionsWrapper}>
                    {people.map(personName => {
                        const state = personStates[personName];
                        if (!state) return null;
                        return (
                            <div key={personName} className={styles.personSection}>
                                <h4 className={styles.personNameTitle}>{personName}'s Cleaning Log</h4>
                                <TodaysChores
                                    cleanerName={personName} 
                                    currentDate={new Date()}
                                    completedChores={completedChores}
                                    onChoreCheck={handleChoreCheck}
                                />
                                <div className={styles.inputField}>
                                    <label htmlFor={`${personName}-room-select`}>Choose Room (for logging):</label>
                                    <select id={`${personName}-room-select`} value={state.selectedRoomName} onChange={(e) => handleRoomChange(personName, e)} disabled={state.isSubmitting} className={styles.roomDropdown}>
                                        <option value="">-- Choose Room --</option>
                                        {cleaningAreasData.map(area => (<option key={area.name} value={area.name}>{area.name}</option>))}
                                    </select>
                                </div>
                                {state.imageUrls.length > 0 && (
                                    <div className={styles.carouselContainer}>
                                        <Carousel showThumbs={false} showStatus={false} useKeyboardArrows infiniteLoop={true}>
                                            {state.imageUrls.map((url, index) => (<div key={index}><img src={url} alt={`${state.selectedRoomName} image ${index + 1}`} className={styles.carouselImage} /></div>))}
                                        </Carousel>
                                    </div>
                                )}
                                {state.selectedRoomName && (
                                    <>
                                        <div className={styles.inputField}><label htmlFor={`${personName}-pre-rating`}>Pre-Cleaning Rating (1-10) for {state.selectedRoomName}:</label><input type="number" id={`${personName}-pre-rating`} value={state.preRating} onChange={(e) => handleRatingChange(personName, 'preRating', e)} min="1" max="10" disabled={state.isSubmitting} className={`${styles.ratingInput} ${styles.noSpinners}`}/></div>
                                        <div className={styles.checklistSection}>
                                            <h5>Tasks for {state.selectedRoomName}:</h5>
                                            {state.currentRoomTasks.length > 0 ? state.currentRoomTasks.map(task => (<div key={task.id} className={styles.checkItem}><input type="checkbox" id={`${personName}-${state.selectedRoomName}-${task.id}`} checked={!!state.checkedTasks[task.id]} onChange={(e) => handleCheckboxChange(personName, task.id, e.target.checked)} disabled={state.isSubmitting} className={styles.checkbox}/><label htmlFor={`${personName}-${state.selectedRoomName}-${task.id}`}>{task.label}</label></div>)) : <p>No tasks defined for this room.</p>}
                                        </div>
                                        <div className={styles.inputField}><label htmlFor={`${personName}-post-rating`}>Post-Cleaning Rating (1-10) for {state.selectedRoomName}:</label><input type="number" id={`${personName}-post-rating`} value={state.postRating} onChange={(e) => handleRatingChange(personName, 'postRating', e)} min="1" max="10" disabled={state.isSubmitting} className={`${styles.ratingInput} ${styles.noSpinners}`}/></div>
                                        <button type="button" onClick={() => handleSubmit(personName)} disabled={state.isSubmitting} className={styles.submitButtonPerson}>{state.isSubmitting ? `Saving ${personName}'s Entry...` : `Submit ${personName}'s Entry for ${state.selectedRoomName}`}</button>
                                        {state.submitError && <p className={styles.errorText}>{state.submitError}</p>}
                                        {state.submitSuccess && <p className={styles.successText}>{personName}'s entry for {state.selectedRoomName} saved successfully!</p>}
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
            {isAllowanceModalOpen && (<AllowanceModal people={people} onClose={() => setAllowanceModalOpen(false)} cleaningAreas={cleaningAreasData} onNavigate={onNavigate}/>)}
        </>
    );
}

export default FamilyCleanForm;