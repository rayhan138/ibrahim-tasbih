import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set } from "firebase/database";
import './index.css';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCDSeIw3JBbyG2qbNtgn1U72EleLEni1R0",
  authDomain: "ibrahim-tasbih.firebaseapp.com",
  projectId: "ibrahim-tasbih",
  storageBucket: "ibrahim-tasbih.firebasestorage.app",
  messagingSenderId: "872413533942",
  appId: "1:872413533942:web:e6cd097fadb1cf15ca3ed7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const DHIKR_LIST = [
  { id: 'none', title: 'Free Count', arabic: '', transliteration: '', meaning: '' },
  { id: 'subhanallah', title: 'Subhanallah', arabic: 'سُبْحَانَ اللَّهِ', transliteration: 'Subhanallah', meaning: 'Allah is free from imperfection.' },
  { id: 'subhanallahiwabihamdih', title: 'Subhan-Allahi wa bihamdih', arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ', transliteration: 'Subhan-Allahi wa bihamdih', meaning: 'Allah is free from imperfection.' },
  { id: 'alhamdulillah', title: 'Alhamdulillah', arabic: 'ٱلْحَمْدُ لِلَّٰهِ', transliteration: 'Alhamdulillah', meaning: 'All praise is due to Allah.' },
  { id: 'allahuakbar', title: 'Allahu Akbar', arabic: 'اللَّهُ أَكْبَرُ', transliteration: 'Allahu Akbar', meaning: 'Allah is Greatest.' },
  { id: 'lailahaillallah', title: 'La ilaha illallah', arabic: 'لَا إِلَٰهَ إِلَّا اللَّٰهُ', transliteration: 'La ilaha illallah', meaning: 'There is none worthy of worship except Allah.' },
  { id: 'bismillah', title: 'Bismillah', arabic: 'بِسْمِ اللَّهِ', transliteration: 'Bismillah', meaning: 'In the name of Allah.' }
];

const THEMES = [
  { id: 'blue', bodyPrimary: '#2563eb', bodySecondary: '#1d4ed8', logo: '#1e3a8a', swatch: '#2563eb' },
  { id: 'red', bodyPrimary: '#ef4444', bodySecondary: '#dc2626', logo: '#7f1d1d', swatch: '#ef4444' },
  { id: 'black', bodyPrimary: '#3f3f46', bodySecondary: '#27272a', logo: '#000000', swatch: '#27272a' },
  { id: 'white', bodyPrimary: '#f8fafc', bodySecondary: '#e2e8f0', logo: '#94a3b8', swatch: '#f8fafc' },
  { id: 'green', bodyPrimary: '#22c55e', bodySecondary: '#16a34a', logo: '#14532d', swatch: '#22c55e' }
];

export default function App() {
  const [count, setCount] = useState(() => {
    const saved = localStorage.getItem('tasbih_count');
    return saved ? parseInt(saved, 10) : 0;
  });

  const [selectedDhikrId, setSelectedDhikrId] = useState(() => {
    const saved = localStorage.getItem('tasbih_dhikr');
    return saved ? saved : 'none';
  });

  const [selectedThemeId, setSelectedThemeId] = useState(() => {
    const saved = localStorage.getItem('tasbih_theme');
    return saved ? saved : 'blue';
  });

  const [keySequence, setKeySequence] = useState([]);
  const [tapSequence, setTapSequence] = useState([]);

  useEffect(() => {
    localStorage.setItem('tasbih_count', count.toString());
  }, [count]);

  useEffect(() => {
    localStorage.setItem('tasbih_dhikr', selectedDhikrId);
  }, [selectedDhikrId]);

  useEffect(() => {
    localStorage.setItem('tasbih_theme', selectedThemeId);
  }, [selectedThemeId]);

  // Live Sync with Firebase
  useEffect(() => {
    const stateRef = ref(db, 'tasbih_state');
    const unsubscribe = onValue(stateRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setCount(data.count ?? 0);
        setSelectedDhikrId(data.selectedDhikrId ?? 'none');
        setSelectedThemeId(data.selectedThemeId ?? 'blue');
      } else {
        // Initialize Firebase with local data if empty
        set(stateRef, {
          count: parseInt(localStorage.getItem('tasbih_count') || 0, 10),
          selectedDhikrId: localStorage.getItem('tasbih_dhikr') || 'none',
          selectedThemeId: localStorage.getItem('tasbih_theme') || 'blue'
        });
      }
    });
    return () => unsubscribe();
  }, []);

  const resetCounter = useCallback(() => {
    setCount(0);
    set(ref(db, 'tasbih_state/count'), 0);
    setKeySequence([]);
    setTapSequence([]);
  }, []);

  const handleDhikrChange = (e) => {
    const newId = e.target.value;
    setSelectedDhikrId(newId);
    set(ref(db, 'tasbih_state/selectedDhikrId'), newId);
  };

  const handleThemeChange = (newId) => {
    setSelectedThemeId(newId);
    set(ref(db, 'tasbih_state/selectedThemeId'), newId);
  };

  const activeDhikr = DHIKR_LIST.find(d => d.id === selectedDhikrId);
  const activeTheme = THEMES.find(t => t.id === selectedThemeId);

  // PC Reset Logic
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      setKeySequence(prev => {
        const newSeq = [...prev, key].slice(-5);
        if (newSeq.join('') === 'reset') {
          resetCounter();
          return [];
        }
        return newSeq;
      });
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [resetCounter]);

  // Mobile Reset Logic
  useEffect(() => {
    const handlePointerDown = (e) => {
      // Don't trigger mobile reset if clicking select or swatches
      const tag = e.target.tagName.toLowerCase();
      if (tag === 'select' || e.target.classList.contains('color-swatch')) return;

      const { innerWidth, innerHeight } = window;
      const clientX = e.clientX;
      const clientY = e.clientY;
      const w = innerWidth;
      const h = innerHeight;
      
      let zone = 0;
      if (clientX < w/3 && clientY < h/3) zone = 1;
      else if (clientX > 2*w/3 && clientY < h/3) zone = 2;
      else if (clientX > 2*w/3 && clientY > 2*h/3) zone = 3;
      else if (clientX < w/3 && clientY > 2*h/3) zone = 4;
      else if (clientX > w/3 && clientX < 2*w/3 && clientY > h/3 && clientY < 2*h/3) zone = 5;

      if (zone !== 0) {
        setTapSequence(prev => {
          const newSeq = [...prev, zone].slice(-5);
          if (newSeq.join(',') === '1,2,3,4,5') {
            resetCounter();
            return [];
          }
          return newSeq;
        });
      }
    };
    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [resetCounter]);

  const handleIncrement = (e) => {
    const newCount = count + 1;
    setCount(newCount);
    set(ref(db, 'tasbih_state/count'), newCount);
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(20);
    }
  };

  return (
    <div className="app-container">
      
      {/* Top Bar for Selection */}
      <div className="top-bar">
        <select 
          className="dhikr-select" 
          value={selectedDhikrId} 
          onChange={handleDhikrChange}
        >
          {DHIKR_LIST.map(dhikr => (
            <option key={dhikr.id} value={dhikr.id}>
              {dhikr.title}
            </option>
          ))}
        </select>
      </div>

      {/* Dhikr Information Display */}
      <div className="dhikr-info-container">
        <AnimatePresence mode="wait">
          {activeDhikr && activeDhikr.id !== 'none' && (
            <motion.div 
              key={activeDhikr.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="dhikr-card"
            >
              <div className="dhikr-arabic">{activeDhikr.arabic}</div>
              <div className="dhikr-transliteration">{activeDhikr.transliteration}</div>
              <div className="dhikr-meaning">{activeDhikr.meaning}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Tasbih Device */}
      <div 
        className="device-body" 
        style={{
          '--body-primary': activeTheme.bodyPrimary,
          '--body-secondary': activeTheme.bodySecondary,
          '--logo-color': activeTheme.logo
        }}
      >
        {/* Screen */}
        <div className="screen-bezel">
          <div className="screen-display">
            <span className="screen-text">
              {count}
            </span>
          </div>
        </div>
        
        {/* Personalization Logo */}
        <div className="device-logo">IBRAHIM'S TASBIH</div>

        {/* Main Button */}
        <div className="main-button-container">
          <motion.button 
            className="main-button"
            onPointerDown={handleIncrement}
            whileTap={{ scale: 0.95, y: 2 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <div style={{
              width: '70px',
              height: '70px',
              borderRadius: '50%',
              background: 'linear-gradient(145deg, #f1f5f9, #cbd5e1)',
              boxShadow: 'inset 2px 2px 5px rgba(255,255,255,1), inset -2px -2px 5px rgba(0,0,0,0.1)'
            }} />
          </motion.button>
        </div>
      </div>

      {/* Color Picker Swatches */}
      <div className="color-picker">
        {THEMES.map(theme => (
          <div 
            key={theme.id}
            onClick={() => handleThemeChange(theme.id)}
            className={`color-swatch ${selectedThemeId === theme.id ? 'active' : ''}`}
            style={{ backgroundColor: theme.swatch }}
          />
        ))}
      </div>

    </div>
  );
}
