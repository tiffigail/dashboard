// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Link } from 'react-router-dom';
import styles from './App.module.css';

// Import providers and components
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { TimerProvider } from './context/TimerContext.jsx';
import { signOut } from 'firebase/auth';
import { auth } from './firebaseConfig';

import Welcome from './components/Welcome/Welcome.jsx';
import Showcase from './components/Showcase/Showcase.jsx';
import NowViewDemo from './components/NowView/NowViewDemo.jsx';
import Contact from './components/Contact/Contact.jsx';
import NowView from './components/NowView/NowView';
import WeeklyView from './components/WeeklyView/WeeklyView';
import DailyView from './components/DailyView/DailyView';
import MonthlyView from './components/MonthlyView/MonthlyView';
import YearlyView from './components/YearlyView/YearlyView';
import ParetoView from './components/ParetoView/ParetoView';
import LifeMapView from './components/LifeMapView/LifeMapView';
import LoginPage from './components/LoginPage/LoginPage';
import ParetoViewDemo from './components/ParetoView/ParetoViewDemo.jsx';
import AIAdvisor from './components/AIAdvisor/AIAdvisor';

function AppLayout() {
    const { currentUser } = useAuth();
    const buttonStyle = { margin: '0.5rem', padding: '0.5rem 1rem', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#e7e7e7', transition: 'background-color 0.2s ease', fontSize: '0.9em', textDecoration: 'none', color: 'black' };
    const activeButtonStyle = { ...buttonStyle, backgroundColor: '#a0a0a0', fontWeight: 'bold', borderColor: '#888' };

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    return (
        <div className={styles.appContainer}>
            {currentUser && (
                 <div style={{ marginBottom: '1rem', flexWrap: 'wrap', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <NavLink to="/life" style={({ isActive }) => isActive ? activeButtonStyle : buttonStyle}>Life Map</NavLink>
                    <NavLink to="/pareto" style={({ isActive }) => isActive ? activeButtonStyle : buttonStyle}>Pareto</NavLink>
                    <NavLink to="/yearly" style={({ isActive }) => isActive ? activeButtonStyle : buttonStyle}>Yearly</NavLink>
                    <NavLink to="/monthly" style={({ isActive }) => isActive ? activeButtonStyle : buttonStyle}>Monthly</NavLink>
                    <NavLink to="/weekly" style={({ isActive }) => isActive ? activeButtonStyle : buttonStyle}>Weekly</NavLink>
                    <NavLink to="/daily" style={({ isActive }) => isActive ? activeButtonStyle : buttonStyle}>Daily</NavLink>
                    <NavLink to="/now" end style={({ isActive }) => isActive ? activeButtonStyle : buttonStyle}>Now</NavLink>
                    {currentUser ? (
                        <button onClick={handleLogout} style={buttonStyle}>Logout</button>
                    ) : (
                        <Link to="/login" style={buttonStyle}>Login</Link>
                    )}
                </div>
            )}
           
            <div className={styles.contentArea}>
                <Routes>
                    <Route path="/" element={<Welcome />} />
                    <Route path="/concepts" element={<ParetoViewDemo />} />
                    <Route path="/showcase" element={<Showcase />} />
                    <Route path="/demo" element={<NowViewDemo />} />
                    <Route path="/contact" element={<Contact />} />
                    {/* Routes for the logged-in personal app */}
                    <Route path="/now" element={<NowView />} />
                    <Route path="/daily" element={<DailyView />} />
                    <Route path="/weekly" element={<WeeklyView />} />
                    <Route path="/monthly" element={<MonthlyView />} />
                    <Route path="/yearly" element={<YearlyView />} />
                    <Route path="/pareto" element={<ParetoView />} />
                    <Route path="/life" element={<LifeMapView />} />
                    <Route path="/login" element={<LoginPage />} />
                </Routes>
            </div>
            {currentUser && <AIAdvisor />}
        </div>
    );
}

function App() {
  return (
    <AuthProvider>
        <TimerProvider>
            <Router>
                <AppLayout />
            </Router>
        </TimerProvider>
    </AuthProvider>
  );
}

export default App;