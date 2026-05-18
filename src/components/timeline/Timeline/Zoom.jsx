import React, { useState, useEffect } from 'react';
// --- FIX: Corrected import paths based on the new file location ---
import YearlyTimelineModal from '@/components/timeline/Timeline/YearlyTimelineModal/YearlyTimelineModal';
import MilestoneTimelineModal from '@/components/timeline/Timeline/MilestoneTimelineModal/MilestoneTimelineModal';

const zoomContainerStyle = {
    position: 'relative',
    width: '100%',
    height: '100%',
};

const getAnimatedStyle = (isActive, isZoomingIn) => {
    const baseStyle = {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        transition: 'transform 500ms ease-in-out, opacity 500ms ease-in-out',
        transformOrigin: 'center center',
    };

    if (isActive) {
        return {
            ...baseStyle,
            transform: 'scale(1)',
            opacity: 1,
            zIndex: 10,
        };
    }

    // Style for the component that is being zoomed FROM or TO
    if (isZoomingIn) {
        // This is the background component being zoomed FROM (e.g., Yearly view)
        // It scales up and fades out.
        return {
            ...baseStyle,
            transform: 'scale(5)',
            opacity: 0,
            zIndex: 1,
        };
    } else {
        // This is the background component being zoomed TO (e.g., Yearly view)
        // It scales down and fades out.
        return {
            ...baseStyle,
            transform: 'scale(0.2)',
            opacity: 0,
            zIndex: 1,
        };
    }
};


function Zoom() {
    const [view, setView] = useState('yearly'); // 'yearly', 'milestone'
    const [activeMilestoneId, setActiveMilestoneId] = useState(null);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isZoomingIn, setIsZoomingIn] = useState(true);

    const handleZoomIn = (milestoneId) => {
        if (isAnimating) return;

        setActiveMilestoneId(milestoneId);
        setIsZoomingIn(true);
        setIsAnimating(true);

        // Start the transition to the milestone view
        setView('milestone');

        // End the animation state after the transition completes
        setTimeout(() => {
            setIsAnimating(false);
        }, 500);
    };

    const handleZoomOut = () => {
        if (isAnimating) return;

        setIsZoomingIn(false);
        setIsAnimating(true);

        // Start the transition back to the yearly view
        setView('yearly');
        
        // End the animation state and clear the milestone ID after the transition
        setTimeout(() => {
            setIsAnimating(false);
            setActiveMilestoneId(null);
        }, 500);
    };

    const yearlyIsActive = view === 'yearly' || (isAnimating && !isZoomingIn);
    const milestoneIsActive = view === 'milestone' || (isAnimating && isZoomingIn);

    return (
        <div style={zoomContainerStyle}>
            {/* We render YearlyTimelineModal if it's the active view OR if we are animating away from it */}
            {yearlyIsActive && (
                <div style={getAnimatedStyle(view === 'yearly', isZoomingIn)}>
                    <YearlyTimelineModal 
                        isOpen={true} 
                        onClose={() => {}} // The manager handles closing
                        onZoomIntoMilestone={handleZoomIn}
                    />
                </div>
            )}

            {/* We render MilestoneTimelineModal if it has an active ID */}
            {activeMilestoneId && milestoneIsActive && (
                 <div style={getAnimatedStyle(view === 'milestone', isZoomingIn)}>
                    <MilestoneTimelineModal 
                        isOpen={true} 
                        onClose={handleZoomOut} // "onClose" now triggers the zoom out
                        milestoneId={activeMilestoneId}
                    />
                </div>
            )}
        </div>
    );
}

export default Zoom;