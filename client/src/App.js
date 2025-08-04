import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import ReservationForm from './components/ReservationForm';
import ApiTest from './components/ApiTest';
import SimpleTest from './components/SimpleTest';
import DebugSchedule from './components/DebugSchedule';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Header />
        <div className="container">
          <Routes>
            <Route path="/" element={<ReservationForm />} />
            <Route path="/test" element={<ApiTest />} />
            <Route path="/simple" element={<SimpleTest />} />
            <Route path="/debug" element={<DebugSchedule />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App; 