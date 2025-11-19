import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

/**
 * StrictMode is disabled for this application because:
 * 1. WebRTC connections have real side effects (camera/mic access, network connections)
 * 2. StrictMode's double-mounting in development causes unnecessary connection churn
 * 3. The VideoCall cleanup function properly handles browser navigation
 *
 * Note: In production, StrictMode has no effect anyway.
 */
ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
