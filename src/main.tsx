import React from 'react';
import ReactDOM from 'react-dom/client';
import './fonts.css';
import App from './App';
import IntroGate from './components/IntroGate';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><IntroGate><App /></IntroGate></React.StrictMode>,
);
