import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged }
  from 'firebase/auth';
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc, onSnapshot,
  query, where, getDocs, deleteDoc, serverTimestamp
} from 'firebase/firestore';
import {
  LayoutDashboard, Target, Eye, FileText, Feather, BookOpen, Bot, User, Send, Edit3, Save, Trash2, PlusCircle, AlertTriangle
} from 'lucide-react';

// --- Firebase Configuration ---
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
  apiKey: "YOUR_API_KEY", // Replace with your actual config
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Global App ID ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'serama-farm-planner-default';

// --- Main App Component ---
export default function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [loading, setLoading] = useState(true); // For initial auth check

  // --- Firebase Authentication ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        try {
          if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            await signInWithCustomToken(auth, __initial_auth_token);
          } else {
            await signInAnonymously(auth);
          }
        } catch (error) {
          console.error("Error during sign-in:", error);
          // Fallback to anonymous if custom token fails or is not present
          if (auth.currentUser === null) { // ensure we don't call signInAnonymously if already signed in
            try {
                await signInAnonymously(auth);
            } catch (anonError) {
                console.error("Error during anonymous sign-in:", anonError);
            }
          }
        }
      }
      setIsAuthReady(true);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (auth.currentUser) {
        setUserId(auth.currentUser.uid);
    }
  }, [isAuthReady]);


  const renderView = () => {
    if (loading || !isAuthReady || !userId) {
      return <LoadingSpinner message="Initializing your farm planner..." />;
    }
    switch (currentView) {
      case 'dashboard':
        return <Dashboard userId={userId} setCurrentView={setCurrentView} />;
      case 'ourWhy':
        return <OurWhy userId={userId} />;
      case 'missionVision':
        return <MissionVision userId={userId} />;
      case 'businessPlan':
        return <BusinessPlan userId={userId} />;
      case 'chickenPasture':
        return <ChickenPasturePlan userId={userId} />;
      case 'progressLog':
        return <ProgressLog userId={userId} />;
      default:
        return <Dashboard userId={userId} setCurrentView={setCurrentView} />;
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen bg-green-50"><LoadingSpinner message="Warming up the coop..."/></div>;
  }
  
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-green-50 font-inter">
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} userId={userId} />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-white overflow-y-auto">
        {renderView()}
      </main>
    </div>
  );
}

// --- Reusable Components ---
const LoadingSpinner = ({ message = "Loading..." }) => (
  <div className="flex flex-col items-center justify-center h-full p-8 text-center">
    <svg className="animate-spin -ml-1 mr-3 h-10 w-10 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    <p className="mt-4 text-lg font-medium text-green-700">{message}</p>
  </div>
);

const EditableSection = ({ title, content, onSave, dbPath, fieldName, userId, placeholder = "Start typing here..." }) => {
  const [text, setText] = useState(content || "");
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const docRef = doc(db, `/artifacts/${appId}/users/${userId}/farmPlan/${dbPath}`);

  useEffect(() => {
    if (!userId) return;
    setIsLoading(true);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setText(data[fieldName] || "");
        setError(null);
      } else {
        setText(""); // No existing data, start fresh
      }
      setIsLoading(false);
    }, (err) => {
      console.error("Error fetching document:", err);
      setError("Failed to load data. Please try again.");
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [userId, dbPath, fieldName]);

  const handleSave = async () => {
    if (!userId) {
      setError("User not authenticated. Cannot save.");
      return;
    }
    setIsLoading(true);
    try {
      await setDoc(docRef, { [fieldName]: text, lastUpdated: serverTimestamp() }, { merge: true });
      setIsEditing(false);
      setError(null);
    } catch (err) {
      console.error("Error saving document:", err);
      setError("Failed to save data. Please check your connection and try again.");
    }
    setIsLoading(false);
  };

  if (isLoading && !isAuthReady) return <LoadingSpinner message={`Loading ${title}...`} />;
  if (error) return <div className="p-4 my-4 text-red-700 bg-red-100 border border-red-400 rounded-md"><AlertTriangle className="inline mr-2"/>{error}</div>;

  return (
    <div className="p-6 bg-white rounded-xl shadow-lg mb-6 border border-green-200">
      <h2 className="text-2xl font-semibold text-green-800 mb-4 flex items-center">
        {title}
      </h2>
      {isEditing ? (
        <>
          <textarea
            className="w-full h-48 p-3 border border-green-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent transition-shadow"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder}
          />
          <div className="mt-4 flex space-x-3">
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 flex items-center transition-colors disabled:opacity-50"
            >
              <Save size={18} className="mr-2" /> Save
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-colors"
            >
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          <div className={`prose max-w-none p-3 min-h-[50px] rounded-md bg-green-50 ${!text && 'text-gray-500'}`}>
            {text || placeholder}
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="mt-4 px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 flex items-center transition-colors"
          >
            <Edit3 size={18} className="mr-2" /> Edit
          </button>
        </>
      )}
    </div>
  );
};

const AIAssistWidget = ({ sectionTitle, existingContent = "", onContentGenerated, userId }) => {
  const [prompt, setPrompt] = useState("");
  const [generatedText, setGeneratedText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Please enter a prompt for the AI.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedText("");

    let chatHistory = [];
    // Add existing content to context if available
    if (existingContent.trim()) {
        chatHistory.push({ role: "user", parts: [{ text: `Here's some existing content for context related to ${sectionTitle}: ${existingContent}` }] });
        chatHistory.push({ role: "model", parts: [{ text: "Okay, I have the context." }] });
    }
    chatHistory.push({ role: "user", parts: [{ text: `For the section "${sectionTitle}", ${prompt}` }] });

    const payload = { contents: chatHistory };
    const apiKey = ""; // Provided by Canvas environment
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
      }
      const result = await response.json();

      if (result.candidates && result.candidates.length > 0 &&
          result.candidates[0].content && result.candidates[0].content.parts &&
          result.candidates[0].content.parts.length > 0) {
        const text = result.candidates[0].content.parts[0].text;
        setGeneratedText(text);
        if(onContentGenerated) onContentGenerated(text); // Pass to parent if needed
      } else {
        console.error("Unexpected API response structure:", result);
        setError("AI could not generate a response. The response structure was unexpected.");
      }
    } catch (err) {
      console.error("Error calling Gemini API:", err);
      setError(`AI assistance failed: ${err.message}. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 bg-green-100 rounded-lg shadow-md my-6 border border-green-300">
      <h3 className="text-lg font-semibold text-green-700 mb-3 flex items-center">
        <Bot size={20} className="mr-2 text-green-600" /> AI Assistant for {sectionTitle}
      </h3>
      <textarea
        className="w-full p-2 border border-green-300 rounded-md mb-3 focus:ring-2 focus:ring-green-500"
        rows="3"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder={`Ask AI to help draft or refine your ${sectionTitle.toLowerCase()}... e.g., "Generate three ideas for a mission statement based on symbiotic relationships and high-quality eggs."`}
      />
      <button
        onClick={handleGenerate}
        disabled={isLoading}
        className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 flex items-center transition-colors disabled:opacity-50"
      >
        {isLoading ? (
          <> <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg> Generating...</>
        ) : (
          <><Send size={18} className="mr-2" /> Generate with AI</>
        )}
      </button>
      {error && <p className="text-red-600 mt-3 bg-red-100 p-2 rounded-md border border-red-300"><AlertTriangle className="inline mr-1"/> {error}</p>}
      {generatedText && (
        <div className="mt-4 p-3 bg-white rounded-md border border-green-200">
          <h4 className="text-md font-semibold text-green-700 mb-2">AI Suggestion:</h4>
          <div className="prose prose-sm max-w-none">{generatedText}</div>
           <button
            onClick={() => {
              if(onContentGenerated) onContentGenerated(generatedText);
              setGeneratedText(""); // Clear after applying
            }}
            className="mt-3 px-3 py-1.5 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1"
          >
            Use this suggestion
          </button>
        </div>
      )}
    </div>
  );
};


// --- Sidebar Navigation ---
const Sidebar = ({ currentView, setCurrentView, userId }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'ourWhy', label: 'Our "Why" & Values', icon: Target },
    { id: 'missionVision', label: 'Mission & Vision', icon: Eye },
    { id: 'businessPlan', label: 'Business Plan', icon: FileText },
    { id: 'chickenPasture', label: 'Chickens & Pasture', icon: Feather },
    { id: 'progressLog', label: 'Progress Log', icon: BookOpen },
  ];

  return (
    <nav className="w-full md:w-64 bg-green-700 text-white p-4 md:p-6 space-y-2 md:min-h-screen shadow-xl">
      <h1 className="text-2xl font-bold mb-6 text-yellow-400">Serama Farm Planner</h1>
      {navItems.map(item => (
        <button
          key={item.id}
          onClick={() => setCurrentView(item.id)}
          className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-colors
            ${currentView === item.id ? 'bg-green-800 text-yellow-300 shadow-inner' : 'hover:bg-green-600 hover:text-yellow-200'}`}
        >
          <item.icon size={20} />
          <span>{item.label}</span>
        </button>
      ))}
      {userId && (
        <div className="pt-6 mt-6 border-t border-green-600">
            <p className="text-xs text-green-300">User ID:</p>
            <p className="text-xs text-green-200 break-all">{userId}</p>
        </div>
      )}
    </nav>
  );
};

// --- Page Components ---
const Dashboard = ({ userId, setCurrentView }) => {
  const [userName, setUserName] = useState("Valued Farmer"); // Placeholder
  // In a real app, you might fetch user profile data.

  return (
    <div className="space-y-8">
      <header className="bg-green-600 p-6 rounded-xl shadow-lg text-white">
        <h1 className="text-4xl font-bold">Welcome to Your Farm Plan, {userName}!</h1>
        <p className="mt-2 text-lg text-green-100">Let's cultivate a thriving Serama chicken venture together.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { title: 'Define Your "Why"', description: 'Articulate your core values and philosophy.', icon: Target, view: 'ourWhy', color: 'bg-yellow-500' },
          { title: 'Craft Mission & Vision', description: 'Set the direction for your farm.', icon: Eye, view: 'missionVision', color: 'bg-blue-500' },
          { title: 'Develop Business Plan', description: 'Outline your strategy for success.', icon: FileText, view: 'businessPlan', color: 'bg-indigo-500' },
          { title: 'Plan Chickens & Pasture', description: 'Detail your unique approach to poultry.', icon: Feather, view: 'chickenPasture', color: 'bg-pink-500' },
          { title: 'Log Your Progress', description: 'Keep notes and track your journey.', icon: BookOpen, view: 'progressLog', color: 'bg-teal-500' },
        ].map(card => (
          <button
            key={card.view}
            onClick={() => setCurrentView(card.view)}
            className={`p-6 rounded-xl shadow-lg text-white text-left hover:scale-105 transform transition-transform duration-200 ${card.color} focus:outline-none focus:ring-4 focus:ring-opacity-50 focus:ring-white`}
          >
            <card.icon size={32} className="mb-3" />
            <h2 className="text-xl font-semibold mb-1">{card.title}</h2>
            <p className="text-sm opacity-90">{card.description}</p>
          </button>
        ))}
      </div>

      <div className="p-6 bg-white rounded-xl shadow-lg border border-green-200">
        <h2 className="text-2xl font-semibold text-green-800 mb-4">Quick Start Guide</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li>Begin with <strong>Our "Why" & Values</strong> to lay the foundation of your farm's philosophy.</li>
          <li>Use the <strong>AI Assistant</strong> in each section to brainstorm and draft content.</li>
          <li>Regularly save your thoughts and decisions in the <strong>Progress Log</strong>.</li>
          <li>All your data is saved automatically as you edit each section.</li>
        </ul>
      </div>
       {userId && (
        <div className="mt-4 p-4 bg-gray-100 rounded-lg text-sm text-gray-600">
          Your App ID: <span className="font-semibold text-gray-800">{appId}</span>
        </div>
      )}
    </div>
  );
};

const OurWhy = ({ userId }) => {
  const [content, setContent] = useState("");

  const handleContentUpdate = (newContent) => {
    setContent(newContent); // Update local state for AI widget
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-green-800 mb-6">Our "Why" & Values</h1>
      <p className="mb-6 text-gray-600">
        This is where you define the heart of your Serama farm. Focus on your values like symbiotic inter-special relationships,
        quality of life for chickens and humans, and the unique nutritional aspects of your eggs.
      </p>
      <EditableSection
        title="Core Values & Philosophy"
        dbPath="ourWhy"
        fieldName="content"
        userId={userId}
        onSave={(newText) => handleContentUpdate(newText)} // This will trigger when EditableSection saves
        content={content} // Pass current content
        placeholder="Describe your farm's core principles, focusing on symbiotic relationships, quality of life, and the unique value you aim to provide..."
      />
      <AIAssistWidget
        sectionTitle="Our 'Why' & Values"
        existingContent={content}
        onContentGenerated={(generatedText) => {
            // This is a bit tricky with EditableSection. We want to update its internal state.
            // For now, this AI widget's output is for guidance or copy-pasting.
            // A more integrated solution would directly set EditableSection's text.
            // The user can copy the generated text and paste it into the editable section.
            // Or, we can have the "Use this suggestion" button update the Firestore doc directly.
            // Let's try updating Firestore directly.
            const docRef = doc(db, `/artifacts/${appId}/users/${userId}/farmPlan/ourWhy`);
            setDoc(docRef, { content: generatedText, lastUpdated: serverTimestamp() }, { merge: true })
              .then(() => setContent(generatedText)) // Update local state to reflect change
              .catch(err => console.error("AI failed to update Our Why:", err));
        }}
        userId={userId}
      />
    </div>
  );
};

const MissionVision = ({ userId }) => {
  const [mission, setMission] = useState("");
  const [vision, setVision] = useState("");

  return (
    <div>
      <h1 className="text-3xl font-bold text-green-800 mb-6">Mission & Vision Statements</h1>
      <p className="mb-6 text-gray-600">
        Develop clear and inspiring mission and vision statements that will guide your farm's journey.
        Use the AI assistant to help you draft these based on your core values.
      </p>
      <EditableSection
        title="Mission Statement"
        dbPath="missionStatement"
        fieldName="content"
        userId={userId}
        onSave={setMission}
        content={mission}
        placeholder="What is your farm's purpose? How will you achieve it? e.g., To ethically raise Serama chickens, fostering a symbiotic bond with nature, to produce exceptionally nutritious eggs that enhance well-being..."
      />
      <AIAssistWidget
        sectionTitle="Mission Statement"
        existingContent={mission}
        onContentGenerated={(generatedText) => {
            const docRef = doc(db, `/artifacts/${appId}/users/${userId}/farmPlan/missionStatement`);
            setDoc(docRef, { content: generatedText, lastUpdated: serverTimestamp() }, { merge: true })
              .then(() => setMission(generatedText))
              .catch(err => console.error("AI failed to update Mission:", err));
        }}
        userId={userId}
      />

      <EditableSection
        title="Vision Statement"
        dbPath="visionStatement"
        fieldName="content"
        userId={userId}
        onSave={setVision}
        content={vision}
        placeholder="What is the desired future state for your farm? What impact do you want to make? e.g., To be a leading model of sustainable, small-scale poultry farming, recognized for our commitment to animal welfare, ecological harmony, and the superior quality of our Serama eggs..."
      />
      <AIAssistWidget
        sectionTitle="Vision Statement"
        existingContent={vision}
        onContentGenerated={(generatedText) => {
            const docRef = doc(db, `/artifacts/${appId}/users/${userId}/farmPlan/visionStatement`);
            setDoc(docRef, { content: generatedText, lastUpdated: serverTimestamp() }, { merge: true })
              .then(() => setVision(generatedText))
              .catch(err => console.error("AI failed to update Vision:", err));
        }}
        userId={userId}
      />
    </div>
  );
};

const BusinessPlan = ({ userId }) => {
  // For simplicity, we'll use one EditableSection for the whole business plan.
  // A real app might break this into sub-sections (Market Analysis, Operations, Financials).
  const [planContent, setPlanContent] = useState("");

  return (
    <div>
      <h1 className="text-3xl font-bold text-green-800 mb-6">Business Plan</h1>
      <p className="mb-6 text-gray-600">
        Outline the strategic, operational, and financial aspects of your Serama chicken farm.
        Consider sections like: Executive Summary, Company Description, Market Analysis, Organization & Management,
        Products & Services, Marketing & Sales Strategy, Operations Plan, and Financial Projections.
      </p>
      <EditableSection
        title="Overall Business Plan"
        dbPath="businessPlan"
        fieldName="content"
        userId={userId}
        onSave={setPlanContent}
        content={planContent}
        placeholder="Start drafting your business plan here. You can cover key areas like:
        - Executive Summary: Brief overview of your entire plan.
        - Company Description: Detail your farm, its legal structure, and your unique selling propositions.
        - Market Analysis: Research your target market, competition, and industry trends.
        - Products & Services: Describe your Serama eggs, their benefits, and any other offerings.
        - Marketing & Sales: How will you reach your customers and sell your eggs?
        - Operations Plan: Daily operations, chicken care, egg collection, pasture management.
        - Management Team: Who is involved and what are their roles?
        - Financial Plan: Startup costs, revenue projections, profitability analysis.
        Use the AI assistant below to help develop specific parts."
      />
      <AIAssistWidget
        sectionTitle="Business Plan"
        existingContent={planContent}
        onContentGenerated={(generatedText) => {
            const docRef = doc(db, `/artifacts/${appId}/users/${userId}/farmPlan/businessPlan`);
            // Append or replace? For now, let's make it append to existing content.
            // User can then edit.
            const newContent = planContent ? planContent + "\n\n---\nAI Suggestion:\n" + generatedText : generatedText;
            setDoc(docRef, { content: newContent, lastUpdated: serverTimestamp() }, { merge: true })
              .then(() => setPlanContent(newContent))
              .catch(err => console.error("AI failed to update Business Plan:", err));
        }}
        userId={userId}
      />
    </div>
  );
};

const ChickenPasturePlan = ({ userId }) => {
  const [planDetails, setPlanDetails] = useState("");
  return (
    <div>
      <h1 className="text-3xl font-bold text-green-800 mb-6">Chickens & Pasture Plan</h1>
      <p className="mb-6 text-gray-600">
        Detail your plans for raising Serama chickens and cultivating the pastures they will free-range on.
        Focus on the herbs and grasses that will enhance egg nutrition and the overall well-being of the flock.
      </p>
      <EditableSection
        title="Serama Chickens & Pasture Management"
        dbPath="chickenPasturePlan"
        fieldName="content"
        userId={userId}
        onSave={setPlanDetails}
        content={planDetails}
        placeholder="Describe your approach:
        - Serama Chicken Specifics: Breed characteristics, sourcing, housing, flock management.
        - Pasture Design: Size, layout, fencing, shelter.
        - Beneficial Plants: List of grasses, herbs, and other plants for nutritional and supplemental value (e.g., comfrey, dandelion, clover, oregano, alfalfa).
        - Rotational Grazing: Plans for pasture rotation to ensure sustainability and health.
        - Egg Quality Enhancement: How will the pasture and chicken care contribute to high-protein, nutrient-dense eggs?"
      />
      <AIAssistWidget
        sectionTitle="Chicken & Pasture Plan"
        existingContent={planDetails}
        onContentGenerated={(generatedText) => {
            const docRef = doc(db, `/artifacts/${appId}/users/${userId}/farmPlan/chickenPasturePlan`);
            const newContent = planDetails ? planDetails + "\n\n---\nAI Suggestion:\n" + generatedText : generatedText;
            setDoc(docRef, { content: newContent, lastUpdated: serverTimestamp() }, { merge: true })
              .then(() => setPlanDetails(newContent))
              .catch(err => console.error("AI failed to update Chicken & Pasture Plan:", err));
        }}
        userId={userId}
      />
    </div>
  );
};

const ProgressLog = ({ userId }) => {
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const notesCollectionPath = `/artifacts/${appId}/users/${userId}/farmPlan/progressLog`;

  useEffect(() => {
    if (!userId || !isAuthReady) return;
    setIsLoading(true);
    const q = query(collection(db, notesCollectionPath)); // Removed orderBy to avoid index issues
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedNotes = [];
      querySnapshot.forEach((doc) => {
        fetchedNotes.push({ id: doc.id, ...doc.data() });
      });
      // Sort manually after fetching
      fetchedNotes.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setNotes(fetchedNotes);
      setError(null);
      setIsLoading(false);
    }, (err) => {
      console.error("Error fetching notes:", err);
      setError("Failed to load progress notes. Please try again.");
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [userId, isAuthReady]); // Added isAuthReady

  const handleAddNote = async () => {
    if (!newNote.trim() || !userId) return;
    try {
      await addDoc(collection(db, notesCollectionPath), {
        text: newNote,
        createdAt: serverTimestamp()
      });
      setNewNote("");
    } catch (err) {
      console.error("Error adding note:", err);
      setError("Failed to add note. Please try again.");
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!userId) return;
    try {
      await deleteDoc(doc(db, notesCollectionPath, noteId));
    } catch (err) {
      console.error("Error deleting note:", err);
      setError("Failed to delete note. Please try again.");
    }
  };

  if (isLoading && !isAuthReady) return <LoadingSpinner message="Loading progress log..." />;
  
  return (
    <div>
      <h1 className="text-3xl font-bold text-green-800 mb-6">Progress Log & Notes</h1>
      <p className="mb-6 text-gray-600">
        Keep track of your ideas, decisions, research findings, and any AI-generated content snippets you want to save as you build your farm plan.
      </p>
      <div className="mb-6 p-4 bg-white rounded-xl shadow-lg border border-green-200">
        <textarea
          className="w-full p-3 border border-green-300 rounded-md focus:ring-2 focus:ring-green-500"
          rows="4"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Jot down a new thought, decision, or idea..."
        />
        <button
          onClick={handleAddNote}
          className="mt-3 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 flex items-center transition-colors"
        >
          <PlusCircle size={18} className="mr-2" /> Add Note
        </button>
        {error && <p className="text-red-600 mt-2 bg-red-100 p-2 rounded border border-red-300"><AlertTriangle className="inline mr-1"/> {error}</p>}
      </div>

      <div className="space-y-4">
        {notes.length === 0 && !isLoading && <p className="text-gray-500">No notes yet. Start adding your thoughts!</p>}
        {notes.map(note => (
          <div key={note.id} className="p-4 bg-yellow-50 rounded-lg shadow-md border border-yellow-200">
            <p className="text-gray-800 whitespace-pre-wrap">{note.text}</p>
            <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-gray-500">
                {note.createdAt?.toDate ? new Date(note.createdAt.toDate()).toLocaleString() : 'Date not available'}
                </p>
                <button
                    onClick={() => handleDeleteNote(note.id)}
                    className="text-red-500 hover:text-red-700 transition-colors"
                    aria-label="Delete note"
                >
                    <Trash2 size={16} />
                </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

