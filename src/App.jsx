import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import PresentationPage from './pages/PresentationPage';
import PresentationList from './components/PresentationList';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />}/>
        <Route path="/presentation/:id" element={<PresentationPage />}/>
        <Route path="/presentations" element={<PresentationList />} />
      </Routes>
    </Router>
  );
}

export default App;

