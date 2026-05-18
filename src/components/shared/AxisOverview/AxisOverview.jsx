// src/components/AxisOverview/AxisOverview.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { db } from '@/firebaseConfig';
import { collection, query, where, getDocs, addDoc, serverTimestamp, orderBy } from "firebase/firestore";

// Helper function to format title
const formatTitle = (id) => {
    if (!id) return '';
    return id.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

// ❌ REMOVED: Redundant getAxisColor function is no longer needed

const AxisOverview = ({ isOpen, onClose, axisData, axisColor }) => { // ✅ Use axisColor prop
    const [newInsight, setNewInsight] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [insights, setInsights] = useState([]);

    const fetchInsights = useCallback(async () => {
        if (!axisData?.id) return;
        try {
            const insightsQuery = query(collection(db, "insights"), where("axisId", "==", axisData.id), orderBy("createdAt", "desc"));
            const insightsSnapshot = await getDocs(insightsQuery);
            setInsights(insightsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error("Error fetching axis details:", error);
        }
    }, [axisData]);

    useEffect(() => {
        if (isOpen) {
            fetchInsights();
        }
    }, [isOpen, fetchInsights]);

    const handleSaveInsight = async () => {
        if (!newInsight.trim() || !axisData?.id) return;
        setIsSaving(true);
        try {
            await addDoc(collection(db, 'insights'), {
                text: newInsight,
                axisId: axisData.id,
                createdAt: serverTimestamp()
            });
            setNewInsight('');
            fetchInsights();
        } catch (error) {
            console.error("Error adding insight:", error);
            alert("Failed to save insight.");
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen || !axisData) return null;

    const infographicSrc = `/overview/${axisData.id}`;

    // ✅ Using the passed-in axisColor prop for the CSS variable
    const styles = `
      .axis-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(17, 24, 39, 0.8); backdrop-filter: blur(8px); display: flex; justify-content: center; align-items: center; z-index: 1000; padding: 1rem; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; --accent-color: ${axisColor}; }
      .axis-modal-content { background-color: #f3f4f6; border-radius: 1rem; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4); width: 100%; max-width: 80rem; max-height: 90vh; overflow-y: auto; position: relative; display: flex; flex-direction: column; }
      .axis-modal-close-button { position: absolute; top: 0.75rem; right: 0.75rem; background: #e5e7eb; border: none; border-radius: 9999px; width: 2.25rem; height: 2.25rem; font-size: 1.5rem; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background-color 0.2s, transform 0.2s; z-index: 20; }
      .axis-modal-close-button:hover { background: #d1d5db; transform: rotate(90deg); }
      .axis-modal-header { padding: 2rem 2.5rem; background: white; border-bottom: 1px solid #e5e7eb; border-top-left-radius: 1rem; border-top-right-radius: 1rem; text-align: left; }
      .axis-modal-title { font-size: 2.5rem; font-weight: 800; color: var(--accent-color); line-height: 1.1; }
      .header-info { margin-top: 1rem; color: #4b5563; font-size: 1rem; }
      .header-info p { margin-bottom: 0.25rem; }
      .axis-modal-body { padding: 2.5rem; background-color: #f3f4f6; flex-grow: 1; }
      .top-section { display: grid; grid-template-columns: repeat(1, 1fr); gap: 2.5rem; }
      @media (min-width: 1024px) { .top-section { grid-template-columns: repeat(5, 1fr); } }
      .overview-container { grid-column: span 1 / span 1; }
      @media (min-width: 1024px) { .overview-container { grid-column: span 3 / span 3; } }
      .values-container { grid-column: span 1 / span 1; }
      @media (min-width: 1024px) { .values-container { grid-column: span 2 / span 2; } }
      .card { background: white; padding: 1.5rem; border-radius: 0.75rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1); height: 100%; }
      .card-title { font-size: 1.25rem; font-weight: 700; color: #1f2937; margin-bottom: 1rem; }
      .values-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.75rem; }
      .value-item { display: flex; align-items: flex-start; font-size: 0.9rem; color: #374151; }
      .value-check { color: var(--accent-color); font-weight: bold; margin-right: 0.75rem; font-size: 1rem; line-height: 1.5; }
      .bottom-section { display: grid; grid-template-columns: repeat(1, 1fr); gap: 2.5rem; }
      @media (min-width: 1024px) { .bottom-section { grid-template-columns: repeat(2, 1fr); } }
      .insights-log-container { max-height: 250px; overflow-y: auto; padding-right: 0.5rem; display: flex; flex-direction: column; gap: 1rem; }
      .insight-card { background: #f9fafb; border-left: 4px solid var(--accent-color); padding: 1rem; border-radius: 0.5rem; }
      .insight-text { font-style: italic; color: #374151; }
      .insight-date { font-size: 0.75rem; text-align: right; color: #6b7280; margin-top: 0.5rem; }
      .insight-textarea { width: 100%; box-sizing: border-box; padding: 0.75rem; font-size: 1rem; border-radius: 0.5rem; border: 1px solid #d1d5db; min-height: 120px; margin-top: 1rem; }
      .insight-save-button { display: block; width: 100%; padding: 0.75rem; margin-top: 0.75rem; background-color: var(--accent-color); color: white; font-weight: bold; border: none; border-radius: 0.5rem; cursor: pointer; transition: background-color 0.2s; }
      .insight-save-button:hover { filter: brightness(1.1); }
      .insight-save-button:disabled { background-color: #9ca3af; cursor: not-allowed; }
      .infographic-frame-container { background-color: #1f2937; border-radius: 0.75rem; padding: 0.5rem; margin-top: 2.5rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1); }
      .infographic-iframe { width: 100%; height: 60vh; border: none; border-radius: 0.5rem; }
    `;

    return (
        <div className="axis-modal-overlay" onClick={onClose}>
            <style>{styles}</style>
            <div className="axis-modal-content" onClick={e => e.stopPropagation()}>
                <button className="axis-modal-close-button" onClick={onClose}>&times;</button>
                <header className="axis-modal-header">
                    <h2 className="axis-modal-title">{formatTitle(axisData.id)}</h2>
                    <div className="header-info">
                        <p><strong>Mentor:</strong> {axisData.mentor}</p>
                        <p><strong>Guiding Question:</strong> <em>{axisData.question}</em></p>
                    </div>
                </header>
                <div className="axis-modal-body">
                    <div className="top-section">
                        <div className="overview-container card"><h3 className="card-title">Overview</h3><p>{axisData.overview}</p></div>
                        <div className="values-container card"><h3 className="card-title">Core Values</h3><ul className="values-list">{axisData.values?.map((val, i) => (<li key={i} className="value-item"><span className="value-check">✓</span> {val}</li>))}</ul></div>
                    </div>

                    <div className="infographic-frame-container">
                       <iframe 
                         className="infographic-iframe"
                         src={infographicSrc}
                         title={`${formatTitle(axisData.id)} Overview`}
                       />
                    </div>

                    <div className="bottom-section" style={{marginTop: '2.5rem'}}>
                       <div className="card">
                            <h3 className="card-title">Insights Log</h3>
                            <div className="insights-log-container">
                                {insights.length > 0 ? (
                                    insights.map((insight) => (<div key={insight.id} className="insight-card"><p className="insight-text">"{insight.text}"</p><p className="insight-date">{insight.createdAt?.toDate ? insight.createdAt.toDate().toLocaleDateString() : 'Saving...'}</p></div>))
                                ) : (<p style={{textAlign: 'center', color: '#6b7280'}}>No insights yet. Add one!</p>)}
                            </div>
                        </div>
                        <div className="card">
                            <h3 className="card-title">Add a New Insight</h3>
                            <textarea className="insight-textarea" placeholder="What did you realize?" value={newInsight} onChange={(e) => setNewInsight(e.target.value)} />
                            <button className="insight-save-button" onClick={handleSaveInsight} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Insight'}</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AxisOverview;