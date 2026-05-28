
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { LayoutDashboard, FileText } from 'lucide-react';

import Home from './pages/Home';
import InvoiceSummary from './pages/InvoiceSummary';

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID_HERE';

function App() {
  return (
    <GoogleOAuthProvider clientId={clientId}>
      <Router>
        <div className="dashboard-layout">
          <aside className="sidebar">
            <div className="nav-brand" style={{ marginBottom: '1rem' }}>
              <span>Menu</span>
            </div>
            <nav style={{ padding: 0, margin: 0, border: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <NavLink to="/" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"} end>
                <LayoutDashboard size={20} />
                Tools
              </NavLink>
              <NavLink to="/invoice-summary" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                <FileText size={20} />
                Invoice Summary
              </NavLink>
            </nav>
          </aside>
          
          <main className="main-content animate-fade-in">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/invoice-summary" element={<InvoiceSummary />} />
            </Routes>
          </main>
        </div>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;
