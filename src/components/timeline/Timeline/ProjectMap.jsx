import React, { useState, useEffect } from 'react';
import { db } from '@/firebaseConfig';
import { getWeekId, formatDateForInput } from '@/utils/dateUtils';

// --- Color Mapping ---
const axisColorMap = {
    "Physical":           { light: '#FDC1B4', medium: '#f59284', dark: '#e7514c' },
    "Financial":          { light: '#e9def4', medium: '#beaccf', dark: '#927aaa' },
    "Gear":               { light: '#c9ebf4', medium: '#7ebde0', dark: '#3280a7' },
    "On Track N+1":       { light: '#BCDDDC', medium: '#618882', dark: '#053229' },
    "Environment":        { light: '#efe5c3', medium: '#e3d295', dark: '#d8bf67' },
    "Misdirect":          { light: '#b0e8d7', medium: '#78bfa1', dark: '#409c7c' },
    "Rest and preparation": { light: '#eaf1fa', medium: '#cbdbe7', dark: '#aec6de' },
    "default":            { light: '#F1F5F9', medium: '#abb5c2', dark: '#64748B' }
};

function calculatePosition(itemDate, timeSpan) {
    if (!itemDate || !timeSpan || (timeSpan.start === undefined) || (timeSpan.end === undefined)) return null;

    let spanStartDate, spanEndDate;

    if (timeSpan.start instanceof Date && timeSpan.end instanceof Date) {
        spanStartDate = timeSpan.start;
        spanEndDate = timeSpan.end;
    } else {
        console.warn("ProjectMap: Invalid timeSpan format provided to calculatePosition:", timeSpan);
        return null;
    }

    const startTime = spanStartDate.getTime();
    const endTime = spanEndDate.getTime();
    const totalDuration = endTime - startTime;

    if (totalDuration <= 0) {
        return 50;
    }

    const eventTime = itemDate.toDate ? itemDate.toDate().getTime() : new Date(itemDate).getTime();

    const position = ((eventTime - startTime) / totalDuration) * 100;
    return Math.max(0, Math.min(100, position));
}

// --- Inline Add Form Sub-Component ---
const AddGoalForm = ({ onSave, onCancel, dueDate }) => {
    const [title, setTitle] = useState('');

    const handleSave = () => {
        if (title.trim()) {
            onSave(title, dueDate);
        } else {
            onCancel();
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSave();
        }
        if (e.key === 'Escape') {
            onCancel();
        }
    };

    return (
        <div style={{
            position: 'absolute', top: '2rem', width: '200px', background: 'white',
            padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 20, display: 'flex', flexDirection: 'column', gap: '0.75rem', border: `1px solid #e2e8f0`
        }} onClick={e => e.stopPropagation()}>
            <label style={{fontSize: '0.75rem', fontWeight: '600'}}>New Goal for {dueDate.toLocaleDateString()}</label>
            <input
                autoFocus
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter goal title..."
                style={{padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px'}}
            />
            <div style={{display: 'flex', gap: '0.5rem', marginTop: '0.5rem'}}>
                <button onClick={handleSave} style={{flex: 1, padding: '0.5rem', background: '#4A90E2', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'}}>Save</button>
                <button onClick={() => onCancel()} style={{flex: 1, padding: '0.5rem', background: '#e2e8f0', color: '#4a5563', border: 'none', borderRadius: '4px', cursor: 'pointer'}}>Cancel</button>
            </div>
        </div>
    );
};


// --- Sub-Component for a single item in ProjectMap ---
const ProjectMapItem = ({ item, axisColors, onUpdate, currentlyEditing, setCurrentlyEditing, itemLevel, onZoomClick, timeSpanForPositioning }) => {
    const isEditing = currentlyEditing === item.id;
    const [isHovered, setIsHovered] = useState(false);

    const [title, setTitle] = useState(item.title || item.goal);
    const [dueDate, setDueDate] = useState(formatDateForInput(item.dueDate));
    const [completionDate, setCompletionDate] = useState(formatDateForInput(item.completionDate));

    const handleSave = () => {
        const updatedData = {};
        if (title.trim() && title.trim() !== (item.title || item.goal)) {
            if (item.weeklyPlanDocId && item.axisKey) {
                updatedData.goal = title.trim();
            } else {
                updatedData.title = title.trim();
            }
        }
        if (dueDate !== formatDateForInput(item.dueDate)) {
            updatedData.dueDate = dueDate ? new Date(dueDate) : null;
        }
        if (completionDate !== formatDateForInput(item.completionDate)) {
            updatedData.completionDate = completionDate ? new Date(completionDate) : null;
        }
        
        if (Object.keys(updatedData).length > 0) {
            onUpdate(item.id, updatedData); 
        }
        setCurrentlyEditing(null);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSave();
        } else if (e.key === 'Escape') {
            setCurrentlyEditing(null);
        }
    };
    
    useEffect(() => {
        if (isEditing) {
            setTitle(item.title || item.goal);
            setDueDate(formatDateForInput(item.dueDate));
            setCompletionDate(formatDateForInput(item.completionDate));
            setTimeout(() => {
                document.getElementById(`edit-input-${item.id}`)?.focus();
            }, 0);
        }
    }, [isEditing, item.id, item.title, item.goal, item.dueDate, item.completionDate]);


    let leftPosition = '0%'; 
    const itemDateForPositioning = item.completionDate || item.dueDate;

    if (itemDateForPositioning && timeSpanForPositioning) {
        const calculatedPosition = calculatePosition(itemDateForPositioning, timeSpanForPositioning);
        if (calculatedPosition !== null) {
            leftPosition = `${calculatedPosition}%`;
        }
    }

    const isCompleted = item.status === 'completed' && item.completionDate;
    let nodeStyleProps = {};
    let nodeInnerContent = null;

    if (itemLevel === 1) {
        nodeStyleProps.width = '2.5rem';
        nodeStyleProps.height = '2.5rem';
        nodeStyleProps.boxShadow = '0 0 0 2px black';
        
        if (isCompleted) {
            nodeStyleProps.backgroundColor = axisColors.dark;
            nodeStyleProps.border = `3px solid ${axisColors.medium}`;
            nodeInnerContent = (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: '1.5em', height: '1.5em', color: axisColors.light }}>
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.052-.143z" clipRule="evenodd" />
                </svg>
            );
        } else {
            nodeStyleProps.backgroundColor = axisColors.light;
            nodeStyleProps.border = `4px dashed ${axisColors.dark}`;
            nodeInnerContent = <span style={{color: axisColors.dark, fontSize: '1.2rem', fontWeight: 'bold'}}>!</span>;
        }

    } else if (itemLevel === 2) {
        nodeStyleProps.width = '1.75rem';
        nodeStyleProps.height = '1.75rem';
        
        if (isCompleted) {
            nodeStyleProps.backgroundColor = axisColors.dark;
            nodeStyleProps.border = `3px solid ${axisColors.medium}`;
            nodeStyleProps.boxShadow = '0 0 0 2px black';
            nodeInnerContent = (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: '1.1em', height: '1.1em', color: axisColors.light }}>
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.052-.143z" clipRule="evenodd" />
                </svg>
            );
        } else {
            nodeStyleProps.backgroundColor = axisColors.light;
            nodeStyleProps.border = `3px solid ${axisColors.medium}`;
            nodeStyleProps.boxShadow = `0 0 0 2px ${axisColors.dark}, 0 0 0 4px black`;
        }
    }

    const itemContainerStyle = {
        position: 'absolute',
        left: leftPosition,
        top: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        zIndex: isEditing ? 30 : 5,
    };

    const nodeStyle = {
        ...nodeStyleProps,
        borderRadius: '50%',
        cursor: 'pointer',
        transform: 'translateY(-50%)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
    };

    const labelStyle = {
        marginTop: itemLevel === 1 ? '1.75rem' : '1.25rem',
        width: '150px',
        fontSize: '0.85rem',
        fontWeight: '600',
        color: '#2d3748',
        textAlign: 'center',
        lineHeight: '1.3',
        whiteSpace: 'normal',
        wordWrap: 'break-word',
    };

    const editFormStyle = {
        position: 'absolute',
        top: '2.5rem',
        width: '200px',
        background: 'white',
        padding: '1rem',
        borderRadius: '0.5rem',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        border: `1px solid #e2e8f0`
    };

    const canEdit = true;

    return (
        <div 
            style={itemContainerStyle} 
            onDoubleClick={() => canEdit && !isEditing && setCurrentlyEditing(item.id)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div style={nodeStyle}>
                {nodeInnerContent}
            </div>
            <p style={labelStyle} title={(item.title || item.goal)}>
                {item.title || item.goal}
                {onZoomClick && isHovered && (
                    <span 
                        style={{ marginLeft: '0.25rem', cursor: 'pointer', fontSize: '0.8em' }} 
                        onClick={(e) => {
                            e.stopPropagation();
                            onZoomClick(item.id);
                        }}
                        title="Zoom In"
                    >
                        &#128269;
                    </span>
                )}
            </p>
            
            {canEdit && isEditing && (
                <div style={editFormStyle} onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
                    <label style={{fontSize: '0.75rem', fontWeight: '600'}}>Title</label>
                    <input id={`edit-input-${item.id}`} type="text" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={handleKeyDown} style={{padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px'}} />
                    
                    <label style={{fontWeight: '600', fontSize: '0.875rem'}}>Due Date</label>
                    <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} onKeyDown={handleKeyDown} style={{padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px'}}/>
                    
                    <label style={{fontWeight: '600', fontSize: '0.875rem'}}>Completion Date</label>
                    <input type="date" value={completionDate} onChange={(e) => setCompletionDate(e.target.value)} onKeyDown={handleKeyDown} style={{padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px'}}/>

                    <div style={{display: 'flex', gap: '0.5rem', marginTop: '0.5rem'}}>
                        <button onClick={handleSave} style={{flex: 1, padding: '0.5rem', background: '#4A90E2', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'}}>Save</button>
                        <button onClick={() => setCurrentlyEditing(null)} style={{flex: 1, padding: '0.5rem', background: '#e2e8f0', color: '#4a5563', border: 'none', borderRadius: '4px', cursor: 'pointer'}}>Cancel</button>
                    </div>
                </div>
            )}
        </div>
    );
};


// --- Main ProjectMap Component ---
function ProjectMap({ data, timeSpan, onUpdateItem, onZoomIntoWeeklyGoal, onAddGoalClick, addingToDate, onSaveNewGoal, onCancelAdd }) {
    const [currentlyEditing, setCurrentlyEditing] = useState(null);

    if (!data || data.length === 0 || !timeSpan) return null;

    // --- FIX: Logic to generate the two-tiered ruler labels ---
    const monthLabels = [];
    const dayLabels = [];
    if (timeSpan.start && timeSpan.end) {
        let lastMonth = -1;
        let currentDate = new Date(timeSpan.start);
        while (currentDate <= timeSpan.end) {
            const currentMonth = currentDate.getMonth();
            if (currentMonth !== lastMonth) {
                monthLabels.push({
                    name: currentDate.toLocaleString('default', { month: 'short' }),
                    date: new Date(currentDate.getFullYear(), currentMonth, 1),
                });
                lastMonth = currentMonth;
            }
            dayLabels.push({
                name: currentDate.getDate(),
                date: new Date(currentDate),
            });
            currentDate.setDate(currentDate.getDate() + 1);
        }
    }

    const saturdays = [];
    if (timeSpan.start && timeSpan.end) {
        let satDate = new Date(timeSpan.start);
        while (satDate <= timeSpan.end) {
            if (satDate.getDay() === 6) {
                saturdays.push(new Date(satDate));
            }
            satDate.setDate(satDate.getDate() + 1);
        }
    }

    const now = new Date();
    const nowLinePosition = calculatePosition(now, timeSpan);

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: '130px 1fr', 
            gap: '3.5rem 1rem',
            paddingBottom: '2rem'
        }}>
            {/* --- FIX: Restored the Timeline Ruler with two tiers --- */}
            <div></div> 
            <div style={{ position: 'relative', height: '2.5rem', padding: '0 40px' }}>
                {/* Month Ruler */}
                <div style={{ position: 'relative', height: '50%' }}>
                    {monthLabels.map((label) => {
                        const position = calculatePosition(label.date, timeSpan);
                        if (position === null) return null;
                        return (
                            <div key={label.name + label.date.getFullYear()} style={{ position: 'absolute', left: `${position}%`, transform: 'translateX(-50%)', color: '#374151', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                                {label.name}
                            </div>
                        );
                    })}
                </div>
                {/* Day Ruler */}
                <div style={{ position: 'relative', height: '50%' }}>
                     {dayLabels.map((label) => {
                        const position = calculatePosition(label.date, timeSpan);
                        if (position === null) return null;
                        return (
                            <div key={label.date.toISOString()} style={{ position: 'absolute', left: `${position}%`, transform: 'translateX(-50%)', color: '#9ca3af', fontSize: '0.75rem' }}>
                                {label.name}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Axis Tracks */}
            {data.map(axis => {
                const displayColors = axisColorMap[axis.axisName] || axisColorMap.default;
                const existingWeekIds = new Set(axis.items.map(item => getWeekId(item.dueDate.toDate())));

                return (
                    <React.Fragment key={axis.id}>
                        <div style={{ textAlign: 'right', fontWeight: 'bold', color: displayColors.dark, paddingRight: '1rem', alignSelf: 'center' }}>
                            {axis.axisName}
                        </div>
                        <div style={{ position: 'relative' }}>
                            <div style={{ width: '100%', height: '2px', backgroundColor: '#e5e7eb', position: 'absolute', top: '50%', transform: 'translateY(-50%)' }}></div>
                            
                            {nowLinePosition !== null && (
                                <>
                                    <div style={{ position: 'absolute', left: `${nowLinePosition}%`, top: 0, bottom: 0, width: '2px', backgroundColor: '#EF4444', zIndex: 10 }}></div>
                                    <span style={{ position: 'absolute', left: `${nowLinePosition}%`, top: '-1.5rem', transform: 'translateX(-50%)', fontSize: '0.75rem', fontWeight: 'bold', color: '#EF4444', whiteSpace: 'nowrap', zIndex: 10 }}>
                                        NOW
                                    </span>
                                </>
                            )}
                            
                            <div style={{ position: 'relative', height: '100%', minHeight: '60px', padding: '0 40px' }}>
                                {saturdays.map(saturday => {
                                    const weekIdForSaturday = getWeekId(saturday);
                                    const goalExists = existingWeekIds.has(weekIdForSaturday);
                                    const isFuture = saturday.getTime() > now.getTime();

                                    if (!isFuture || goalExists) {
                                        return null;
                                    }

                                    const position = calculatePosition(saturday, timeSpan);
                                    if (position === null) return null;
                                    const isAddingHere = addingToDate && addingToDate.getTime() === saturday.getTime();

                                    return (
                                        <div key={saturday.toISOString()} style={{ position: 'absolute', top: '50%', left: `${position}%`, transform: 'translate(-50%, -50%)', zIndex: 15 }}>
                                            {isAddingHere ? (
                                                <AddGoalForm onSave={onSaveNewGoal} onCancel={onCancelAdd} dueDate={saturday} />
                                            ) : (
                                                <>
                                                    <div style={{ width: '1px', height: '10px', backgroundColor: '#cbd5e0', position: 'absolute', top: '-5px', left: '50%' }}></div>
                                                    <button
                                                        onClick={() => onAddGoalClick(saturday)}
                                                        title={`Add goal for week ending ${saturday.toLocaleDateString()}`}
                                                        style={{ background: '#fff', border: '1px solid #cbd5e0', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#64748b' }}
                                                    >
                                                        +
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    );
                                })}

                                {axis.startpoint && <ProjectMapItem key={axis.startpoint.id} item={axis.startpoint} axisColors={displayColors} onUpdate={onUpdateItem} currentlyEditing={currentlyEditing} setCurrentlyEditing={setCurrentlyEditing} itemLevel={1} timeSpanForPositioning={timeSpan} />}
                                {axis.items.map(item => <ProjectMapItem key={item.id} item={item} axisColors={displayColors} onUpdate={onUpdateItem} currentlyEditing={currentlyEditing} setCurrentlyEditing={setCurrentlyEditing} itemLevel={2} onZoomClick={onZoomIntoWeeklyGoal} timeSpanForPositioning={timeSpan} />)}
                                {axis.endpoint && <ProjectMapItem key={axis.endpoint.id} item={axis.endpoint} axisColors={displayColors} onUpdate={onUpdateItem} currentlyEditing={currentlyEditing} setCurrentlyEditing={setCurrentlyEditing} itemLevel={1} timeSpanForPositioning={timeSpan} />}
                            </div>
                        </div>
                    </React.Fragment>
                );
            })}
        </div>
    );
}

export default ProjectMap;