
import { Link } from 'react-router-dom';
import { FileText, ChevronRight } from 'lucide-react';

const Home = () => {
  return (
    <div>
      <header style={{ marginBottom: '3rem', textAlign: 'center' }}>
        <h1>My Personal Tools</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
          Welcome to your workspace. Select a tool to get started.
        </p>
      </header>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        
        {/* Tool 1: Invoice Summary */}
        <Link to="/invoice-summary" className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ 
              background: 'rgba(99, 102, 241, 0.2)', 
              padding: '0.75rem', 
              borderRadius: '12px',
              color: 'var(--primary-color)'
            }}>
              <FileText size={24} />
            </div>
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Invoice Summary</h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.5rem', flexGrow: 1 }}>
            Dashboard summarizing all AI service invoices from your Gmail.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', color: 'var(--primary-color)', fontSize: '0.9rem', fontWeight: 500 }}>
            Open Tool <ChevronRight size={16} style={{ marginLeft: '4px' }} />
          </div>
        </Link>

        {/* Add more tools here in the future */}

      </div>
    </div>
  );
};

export default Home;
