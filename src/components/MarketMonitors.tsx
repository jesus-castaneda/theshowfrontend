'use client';

import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import './MarketMonitors.css';

interface Monitor {
  id: number;
  player_uuid: string;
  player_name: string;
  interval_minutes: number;
  profit_threshold: number;
  drop_threshold_pct: number;
  current_buy: number;
  current_sell: number;
  last_checked_at: string;
}

interface HistoryPoint {
  id: number;
  buy_price: number;
  sell_price: number;
  profit: number;
  timestamp: string;
}

export default function MarketMonitors() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [selectedChart, setSelectedChart] = useState<string | null>(null);
  const [chartData, setChartData] = useState<HistoryPoint[]>([]);
  const [chartLoading, setChartLoading] = useState(false);

  useEffect(() => {
    fetchMonitors();
  }, []);

  const fetchMonitors = async () => {
    try {
      const res = await fetch('/api/monitors');
      if (!res.ok) throw new Error('Failed to fetch monitors');
      const data = await res.json();
      setMonitors(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const removeMonitor = async (uuid: string) => {
    try {
      const res = await fetch(`/api/monitors/${uuid}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setMonitors(prev => prev.filter(m => m.player_uuid !== uuid));
      if (selectedChart === uuid) setSelectedChart(null);
    } catch (err) {
      alert('Error removing monitor');
    }
  };

  const viewChart = async (uuid: string) => {
    if (selectedChart === uuid) {
      setSelectedChart(null);
      return;
    }
    setChartLoading(true);
    setSelectedChart(uuid);
    try {
      const res = await fetch(`/api/history/${uuid}`);
      if (!res.ok) throw new Error('Failed to fetch history');
      const data = await res.json();
      
      // Format timestamps for Recharts
      const formatted = data.map((d: any) => ({
        ...d,
        timeLabel: new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }));
      setChartData(formatted);
    } catch (err) {
      console.error(err);
    } finally {
      setChartLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
        <p>Loading active monitors...</p>
      </div>
    );
  }

  return (
    <div className="monitors-view">
      {error && <div className="error-message glass">{error}</div>}
      
      <div className="monitors-header glass">
        <h2>Active Market Monitors</h2>
        <p>Automatically tracking {monitors.length} players in the background.</p>
        <p className="sub-text">Add players directly from the Market Search tab!</p>
      </div>

      <div className="monitors-grid">
        {monitors.length === 0 && (
          <div className="empty-state glass">
            No players are currently being monitored. Go to Market Search and click "Track" on any player to begin capturing 30-day history!
          </div>
        )}

        {monitors.map(m => (
          <div key={m.player_uuid} className="monitor-card glass">
            <div className="m-header">
              <h3>{m.player_name}</h3>
              <button className="delete-btn" onClick={() => removeMonitor(m.player_uuid)}>Untrack</button>
            </div>
            
            <div className="m-stats">
              <div className="stat">
                <span className="label">Check Interval</span>
                <span className="value">{m.interval_minutes}m</span>
              </div>
              <div className="stat">
                <span className="label">Profit Target</span>
                <span className="value alert-val">{m.profit_threshold > 0 ? m.profit_threshold.toLocaleString() : 'None'}</span>
              </div>
              <div className="stat">
                <span className="label">Drop Alert</span>
                <span className="value alert-val">{m.drop_threshold_pct > 0 ? m.drop_threshold_pct.toString() + '%' : 'None'}</span>
              </div>
              <div className="stat">
                <span className="label">Latest Buy</span>
                <span className="value buy">{m.current_buy ? m.current_buy.toLocaleString() : '---'}</span>
              </div>
              <div className="stat">
                <span className="label">Latest Sell</span>
                <span className="value sell">{m.current_sell ? m.current_sell.toLocaleString() : '---'}</span>
              </div>
            </div>

            <button 
              className={`view-chart-btn transition-all ${selectedChart === m.player_uuid ? 'active' : ''}`}
              onClick={() => viewChart(m.player_uuid)}
            >
              {selectedChart === m.player_uuid ? 'Hide Analytics' : 'View Trailing Analytics'}
            </button>

            {selectedChart === m.player_uuid && (
              <div className="chart-container">
                {chartLoading ? (
                  <p className="chart-loader">Loading historical dataset...</p>
                ) : chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                      <XAxis dataKey="timeLabel" stroke="#a1a1aa" />
                      <YAxis yAxisId="left" stroke="#a1a1aa" domain={['auto', 'auto']} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '8px' }}
                        itemStyle={{ color: '#e4e4e7' }}
                      />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="sell_price" name="Sell Price" stroke="#3b82f6" activeDot={{ r: 8 }} strokeWidth={2} />
                      <Line yAxisId="left" type="monotone" dataKey="buy_price" name="Buy Price" stroke="#f87171" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="chart-loader">No data gathered yet. The background worker is running.</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
