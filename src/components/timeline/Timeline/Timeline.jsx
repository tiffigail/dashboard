import React, { useState, useEffect, useMemo } from 'react';
import { formatDateForInput } from '@/utils/dateUtils';

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

    if (typeof timeSpan.start === 'number' && typeof timeSpan.end === 'number') {
        spanStartDate = new Date(timeSpan.start, 0, 1);
        spanEndDate = new Date(timeSpan.end, 11, 31);
    } else if (timeSpan.start instanceof Date && timeSpan.end instanceof Date) {
        spanStartDate = timeSpan.start;
        spanEndDate = timeSpan.end;
    } else {
        return null;
    }

    const startTime = spanStartDate.getTime();
    const endTime = spanEndDate.getTime();
    const totalDuration = endTime - startTime;

    if (totalDuration <= 0) return 50;

    const eventTime = itemDate.toDate ? itemDate.toDate().getTime() : new Date(itemDate).getTime();
    const position = ((eventTime - startTime) / totalDuration) * 100;
    return Math.max(0, Math.min(100, position));
}

// --- Sub-Component for a single item ---
const TimelineItem = ({ item, axisColors, onUpdate, timeSpan, currentlyEditing, setCurrentlyEditing, itemLevel, isZoomable, onItemZoomClick, isBonus }) => {
    const isEditing = currentlyEditing === item.id;
    const [isHovered, setIsHovered] = useState(false);
    const [title, setTitle] = useState(item.title);
    const [dueDate, setDueDate] = useState(formatDateForInput(item.dueDate));
    const [completionDate, setCompletionDate] = useState(formatDateForInput(item.completionDate));
    
    const handleSave = () => {
        const updatedData = {};
        if (title.trim() && title.trim() !== item.title) {
            updatedData.title = title.trim();
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
            setTitle(item.title);
            setDueDate(formatDateForInput(item.dueDate));
            setCompletionDate(formatDateForInput(item.completionDate));
            setTimeout(() => {
                document.getElementById(`edit-input-${item.id}`)?.focus();
            }, 0);
        }
    }, [isEditing, item.title, item.dueDate, item.completionDate]);

    let leftPercentage = 0;
    const effectiveDate = item.completionDate || item.dueDate;

    if (effectiveDate) {
        leftPercentage = calculatePosition(effectiveDate, timeSpan);
    } else if (item.year !== undefined) {
        if (typeof timeSpan.start === 'number' && typeof timeSpan.end === 'number') {
            const startYear = timeSpan.start;
            const endYear = timeSpan.end;
            const totalYears = endYear - startYear;
            const yearIndex = item.year - startYear;
            leftPercentage = totalYears > 0 ? ((yearIndex + 0.5) / (totalYears + 1)) * 100 : 50;
        } else if (timeSpan.start instanceof Date && item.year) {
            const startOfYearDate = new Date(item.year, 0, 1);
            leftPercentage = calculatePosition(startOfYearDate, timeSpan);
        }
    }

    if (typeof leftPercentage !== 'number' || isNaN(leftPercentage)) {
        leftPercentage = 0;
    }

    // --- STYLING LOGIC ---
    let nodeStyleProps = {
        width: '1rem',
        height: '1rem',
        backgroundColor: item.status === 'completed' ? axisColors.dark : axisColors.light,
        border: `3px solid ${axisColors.dark}`,
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
    };
    let nodeInnerContent = null;

    if (isBonus) {
        nodeStyleProps = {
            width: '1.75rem',
            height: '1.75rem',
            backgroundColor: 'transparent',
            border: 'none',
            boxShadow: 'none',
        };
        const starFill = item.status === 'completed' ? axisColors.dark : axisColors.light;
        const starStroke = item.status === 'completed' ? axisColors.medium : axisColors.dark;
        nodeInnerContent = (
            <svg viewBox="0 0 24 24" style={{ width: '100%', height: '100%', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}>
                <path 
                    d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
                    fill={starFill}
                    stroke={starStroke}
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                />
            </svg>
        );
    } else if (itemLevel === 1) {
        nodeStyleProps.width = '1.75rem';
        nodeStyleProps.height = '1.75rem';
        
        if (item.status === 'completed') {
            nodeStyleProps.backgroundColor = axisColors.dark;
            nodeStyleProps.border = `3px solid ${axisColors.medium}`;
            nodeInnerContent = (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: '1.1em', height: '1.1em', color: axisColors.light }}>
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.052-.143z" clipRule="evenodd" />
                </svg>
            );
        } else {
            nodeStyleProps.border = `3px dashed ${axisColors.dark}`;
            nodeInnerContent = <span style={{color: 'white', fontSize: '0.9rem', fontWeight: 'bold'}}>!</span>;
        }

    } else if (itemLevel === 2) {
        nodeStyleProps.width = '1.25rem';
        nodeStyleProps.height = '1.25rem';
        if (item.status === 'completed') {
            nodeStyleProps.backgroundColor = axisColors.dark;
            nodeStyleProps.border = `3px solid ${axisColors.medium}`;
            nodeInnerContent = (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: '0.9em', height: '0.9em', color: axisColors.light }}>
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.052-.143z" clipRule="evenodd" />
                </svg>
            );
        } else {
            nodeStyleProps.backgroundColor = axisColors.light;
            nodeStyleProps.border = `3px solid ${axisColors.medium}`;
            nodeStyleProps.boxShadow = `0 0 0 2px ${axisColors.dark}, 0 1px 3px rgba(0,0,0,0.2)`;
        }
    }

    const itemContainerStyle = {
        position: 'absolute',
        left: `${leftPercentage}%`,
        top: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        zIndex: isEditing ? 30 : 5,
    };

    const nodeStyle = {
        ...nodeStyleProps,
        borderRadius: isBonus ? '0' : '50%',
        cursor: 'pointer',
        transform: 'translateY(-50%)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        zIndex: 2,
    };

    const labelStyle = {
        marginTop: itemLevel === 1 || isBonus ? '1.8rem' : '0.75rem',
        width: '140px',
        color: '#4A5563',
        textAlign: 'center',
        lineHeight: '1.3',
        cursor: 'pointer',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        fontSize: itemLevel === 1 || isBonus ? '0.825rem' : '0.75rem',
        fontWeight: itemLevel === 1 || isBonus ? '700' : '500',
    };
    
    const zoomIconStyle = {
        marginLeft: '0.5rem',
        fontSize: '1.2em',
        cursor: 'pointer',
        padding: '0.2em',
        borderRadius: '4px',
        backgroundColor: 'rgba(0,0,0,0.05)',
        transition: 'background-color 0.2s ease-in-out',
        flexShrink: 0,
    };

    const editFormStyle = {
        position: 'absolute',
        top: '2rem',
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

    const canEdit = (item.type !== undefined) || (item.goalId !== undefined && item.parentId === undefined);

    return (
        <div style={itemContainerStyle} onDoubleClick={() => canEdit && !isEditing && setCurrentlyEditing(item.id)} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
            <div style={nodeStyle}>{nodeInnerContent}</div>
            <p style={labelStyle} title={item.title}>
                {item.title}
            </p>
            {isZoomable && isHovered && (
                <span style={zoomIconStyle} onClick={(e) => { e.stopPropagation(); if (onItemZoomClick) onItemZoomClick(item.id); }} title="Zoom In" onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.1)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)'}>
                    &#128269;
                </span>
            )}
            {canEdit && isEditing && (
                <div style={editFormStyle} onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
                    <label style={{fontSize: '0.75rem', fontWeight: '600'}}>Title</label>
                    <input id={`edit-input-${item.id}`} type="text" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={handleKeyDown} style={{padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px'}} />
                    <label style={{fontSize: '0.75rem', fontWeight: '600'}}>Due Date</label>
                    <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} onKeyDown={handleKeyDown} style={{padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px'}}/>
                    <label style={{fontSize: '0.75rem', fontWeight: '600'}}>Completion Date</label>
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

// --- Main Timeline Component ---
function Timeline({ data, timeSpan, onUpdateItem, onRulerClick, onZoomIntoMilestone, itemType }) {
    const [currentlyEditing, setCurrentlyEditing] = useState(null);
    const [hoveredRulerItem, setHoveredRulerItem] = useState(null);

    const processedAxes = useMemo(() => {
        if (!data) return [];
        
        return data.map((axis) => {
            const items = axis.items || [];
            const stretchGoals = items.filter(i => i.type === 'stretch');
            const yearlyGoals = items.filter(i => i.type === 'yearly');
            const milestones = items.filter(i => i.type !== 'stretch' && i.type !== 'yearly');

            const goalsByYear = yearlyGoals.reduce((acc, goal) => {
                const year = goal.year;
                if (!acc[year]) acc[year] = [];
                acc[year].push(goal);
                return acc;
            }, {});

            const processedYearlyGoals = Object.values(goalsByYear).flatMap(yearGroup => {
                yearGroup.sort((a, b) => (a.dueDate?.toDate() || 0) - (b.dueDate?.toDate() || 0));
                return yearGroup.map((goal, index) => ({
                    ...goal,
                    isBonus: index > 0,
                }));
            });
            
            const itemsToRender = [...stretchGoals, ...processedYearlyGoals, ...milestones];
            return { ...axis, itemsToRender };
        });
    }, [data]);

    if (!data) return null;

    const nowPosition = calculatePosition(new Date(), timeSpan);

    let rulerLabels = [];
    const isMonthlyView = timeSpan && timeSpan.start instanceof Date;

    if (isMonthlyView) {
        rulerLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    } else if (timeSpan && typeof timeSpan.start === 'number') {
        for (let i = timeSpan.start; i <= timeSpan.end; i++) {
            rulerLabels.push(i);
        }
    }

    return (
        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '130px 1fr', gap: '3.5rem 1rem', paddingBottom: '2rem' }}>
            {/* --- Timeline Ruler --- */}
            <div /> 
            <div style={{ position: 'relative', height: '1.5rem', padding: '0 40px' }}>
                {nowPosition !== null && (
                    <div style={{
                        position: 'absolute',
                        left: `${nowPosition}%`,
                        top: 0,
                        bottom: '-100vh',
                        width: '2px',
                        backgroundColor: '#ef4444',
                        zIndex: 25,
                        pointerEvents: 'none',
                    }}>
                        <span style={{
                            position: 'absolute',
                            top: '0.5rem',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            background: '#ef4444',
                            color: 'white',
                            padding: '0.1rem 0.4rem',
                            borderRadius: '0.25rem',
                            fontSize: '0.7rem',
                            fontWeight: 'bold'
                        }}>
                            Now
                        </span>
                    </div>
                )}
                <div style={{ position: 'relative', height: '100%' }}>
                    {rulerLabels.map((label, index) => {
                        const position = (100 / rulerLabels.length) * (index + 0.5);
                        return (
                            <div 
                                key={label} 
                                style={{ 
                                    position: 'absolute', 
                                    left: `${position}%`, 
                                    transform: 'translateX(-50%)', 
                                    color: '#9ca3af', 
                                    fontWeight: '500', 
                                    fontSize: '0.875rem', 
                                    cursor: onRulerClick && !isMonthlyView ? 'pointer' : 'default' 
                                }} 
                                onMouseEnter={() => setHoveredRulerItem(label)} 
                                onMouseLeave={() => setHoveredRulerItem(null)} 
                                onClick={() => { onRulerClick && !isMonthlyView && onRulerClick(label); }} 
                                title={onRulerClick && !isMonthlyView ? `Zoom into ${label}` : ''}
                            >
                                <span style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', transition: 'background-color 0.2s', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }} onMouseOver={e => e.currentTarget.style.backgroundColor=(onRulerClick && !isMonthlyView) ? '#e2e8f0' : 'transparent'} onMouseOut={e => e.currentTarget.style.backgroundColor='transparent'}>
                                    {onRulerClick && !isMonthlyView && hoveredRulerItem === label && <span style={{ fontSize: '1.2em' }}>🔍</span>}
                                    {label}
                                </span>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* --- Axis Tracks --- */}
            {processedAxes.map((axis) => {
                const displayColors = axisColorMap[axis.axisName] || axisColorMap.default;
                return (
                    <React.Fragment key={axis.id}>
                        <div style={{ textAlign: 'right', fontWeight: 'bold', color: displayColors.dark, paddingRight: '1rem', alignSelf: 'center' }}>
                            {axis.axisName}
                        </div>
                        <div style={{ position: 'relative' }}>
                            <div style={{ width: '100%', height: '2px', backgroundColor: '#e5e7eb', position: 'absolute', top: '50%', transform: 'translateY(-50%)' }}></div>
                            <div style={{ position: 'relative', height: '100%', minHeight: '60px', padding: '0 40px' }}>
                                {axis.itemsToRender.map(item => {
                                    let itemLevel;
                                    
                                    // **MODIFIED**: This logic now correctly determines if an item is zoomable
                                    // based on the `itemType` prop passed to the whole timeline.
                                    const isActuallyMilestone = item.type !== 'stretch' && item.type !== 'yearly';
                                    const isZoomable = itemType === 'milestone' && isActuallyMilestone && !!onZoomIntoMilestone;

                                    if(item.type === 'stretch') {
                                        itemLevel = 1;
                                    } else {
                                        itemLevel = 2;
                                    }

                                    return (
                                        <TimelineItem 
                                            key={item.id} 
                                            item={item} 
                                            axisColors={displayColors}
                                            onUpdate={onUpdateItem}
                                            timeSpan={timeSpan}
                                            currentlyEditing={currentlyEditing}
                                            setCurrentlyEditing={setCurrentlyEditing}
                                            itemLevel={itemLevel}
                                            isZoomable={isZoomable}
                                            onItemZoomClick={onZoomIntoMilestone}
                                            isBonus={item.isBonus || false}
                                        />
                                    );
                                })}
                                {axis.endpoint && (
                                    <TimelineItem 
                                        key={axis.endpoint.id} 
                                        item={axis.endpoint} 
                                        axisColors={displayColors}
                                        onUpdate={onUpdateItem} 
                                        timeSpan={timeSpan}
                                        currentlyEditing={currentlyEditing}
                                        setCurrentlyEditing={setCurrentlyEditing}
                                        itemLevel={1}
                                        isItemZoomable={false}
                                        onItemZoomClick={null}
                                        isBonus={false}
                                    />
                                )}
                            </div>
                        </div>
                    </React.Fragment>
                );
            })}
        </div>
    );
}

export default Timeline;
