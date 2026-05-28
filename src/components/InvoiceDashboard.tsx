import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import type { Invoice } from '../services/gmail';
import { parseAmountToTHB, formatTHB, USD_TO_THB_RATE } from '../utils/currency';
import { format, parse } from 'date-fns';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export const InvoiceDashboard = ({ invoices }: { invoices: Invoice[] }) => {
  const stats = useMemo(() => {
    let totalSpent = 0;
    const serviceTotals: Record<string, number> = {};
    const monthlyTotals: Record<string, Record<string, number>> = {};
    const uniqueServices = new Set<string>();

    invoices.forEach(inv => {
      const amountTHB = parseAmountToTHB(inv.amount);
      totalSpent += amountTHB;
      const service = inv.sender;
      uniqueServices.add(service);

      // Group by Service
      serviceTotals[service] = (serviceTotals[service] || 0) + amountTHB;

      // Group by Month
      try {
        let dateObj: Date;
        if (inv.date.includes('/')) {
          // Force dd/MM/yyyy parsing for slash-formatted dates
          dateObj = parse(inv.date, 'dd/MM/yyyy', new Date());
        } else {
          dateObj = new Date(inv.date);
        }
        
        if (!isNaN(dateObj.getTime())) {
          const monthKey = format(dateObj, 'MMM yyyy'); // e.g. "Apr 2026"
          if (!monthlyTotals[monthKey]) monthlyTotals[monthKey] = {};
          monthlyTotals[monthKey][service] = (monthlyTotals[monthKey][service] || 0) + amountTHB;
        }
      } catch (e) {
        // ignore invalid dates
      }
    });

    const pieData = Object.entries(serviceTotals).map(([name, value]) => ({ name, value }));
    const barData = Object.entries(monthlyTotals)
        .map(([month, services]) => ({ month, ...services }))
        // Sort by date correctly
        .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

    const topService = pieData.sort((a, b) => b.value - a.value)[0]?.name || 'N/A';
    const servicesList = Array.from(uniqueServices);

    // Create a stable color mapping for each service
    const colorMap: Record<string, string> = {};
    servicesList.sort().forEach((service, i) => {
      colorMap[service] = COLORS[i % COLORS.length];
    });

    return { totalSpent, pieData, barData, topService, servicesList, colorMap };
  }, [invoices]);

  if (invoices.length === 0) return null;

  return (
    <div style={{ marginBottom: '2.5rem' }}>
      {/* Summary Cards */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', marginBottom: '2rem' }}>
        <div className="stat-card">
          <span className="stat-title">Total Invoices</span>
          <span className="stat-value">{invoices.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-title">Total Spent (Estimated)</span>
          <span className="stat-value" style={{ color: 'var(--primary-hover)' }}>{formatTHB(stats.totalSpent)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-title">Top Service</span>
          <span className="stat-value">{stats.topService}</span>
        </div>
      </div>

      {/* Charts */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))' }}>
        <div className="glass-card" style={{ padding: '1.5rem', display: 'block' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Monthly Spending Trend</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
              *1 USD = {USD_TO_THB_RATE} THB
            </span>
          </div>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.barData}>
                <XAxis dataKey="month" stroke="var(--text-secondary)" fontSize={12} />
                <YAxis stroke="var(--text-secondary)" fontSize={12} tickFormatter={(val) => `฿${val}`} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ background: '#1e293b', border: '1px solid var(--surface-border)', borderRadius: '8px' }}
                  formatter={(value: any) => formatTHB(Number(value))}
                />
                {stats.servicesList.map((service) => (
                  <Bar key={service} dataKey={service} stackId="a" fill={stats.colorMap[service]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem', display: 'block' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Expense by Service</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
              *1 USD = {USD_TO_THB_RATE} THB
            </span>
          </div>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="80%">
              <PieChart>
                <Pie
                  data={stats.pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.pieData.map((entry) => (
                    <Cell key={entry.name} fill={stats.colorMap[entry.name]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ background: '#1e293b', border: '1px solid var(--surface-border)', borderRadius: '8px' }}
                  formatter={(value: any) => formatTHB(Number(value))}
                />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap', height: '20%' }}>
              {stats.pieData.map((entry) => (
                <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: stats.colorMap[entry.name] }}></div>
                  {entry.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
