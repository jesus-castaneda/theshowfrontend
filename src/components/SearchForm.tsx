'use client';

import { useState, useEffect } from 'react';
import './SearchForm.css';

interface MetaData {
  series: { series_id: number; name: string }[];
  teams: { team_id: number; name: string; short_name: string }[];
}

const initialState = {
  name: '',
  min_best_buy_price: '',
  max_best_buy_price: '',
  min_best_sell_price: '',
  max_best_sell_price: '',
  series_id: '',
  team: '',
  display_position: '',
};

export default function SearchForm({ onSearch }: { onSearch: (params: Record<string, string>) => void }) {
  const [meta, setMeta] = useState<MetaData | null>(null);
  const [formData, setFormData] = useState(initialState);

  useEffect(() => {
    fetch('/api/meta')
      .then(res => res.json())
      .then(data => setMeta(data))
      .catch(console.error);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleReset = () => {
    setFormData(initialState);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanParams: Record<string, string> = {};
    Object.entries(formData).forEach(([key, value]) => {
      if (value) cleanParams[key] = value;
    });
    onSearch(cleanParams);
  };

  const positions = ['SP', 'RP', 'CP', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];

  return (
    <form className="search-form glass" onSubmit={handleSubmit}>
      <div className="form-header">
        <h2 className="outfit">Find Profitable Players</h2>
        <p>Set minimums and maximums to narrow down the best flips.</p>
      </div>

      <div className="form-grid">
        <div className="form-group full-width">
          <label htmlFor="name">Player Name</label>
          <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Mike Trout" />
        </div>

        <div className="form-group">
          <label htmlFor="min_best_buy_price">Min Buy Price</label>
          <input type="number" id="min_best_buy_price" name="min_best_buy_price" value={formData.min_best_buy_price} onChange={handleChange} placeholder="0" />
        </div>

        <div className="form-group">
          <label htmlFor="max_best_buy_price">Max Buy Price</label>
          <input type="number" id="max_best_buy_price" name="max_best_buy_price" value={formData.max_best_buy_price} onChange={handleChange} placeholder="500000" />
        </div>

        <div className="form-group">
          <label htmlFor="min_best_sell_price">Min Sell Price</label>
          <input type="number" id="min_best_sell_price" name="min_best_sell_price" value={formData.min_best_sell_price} onChange={handleChange} placeholder="0" />
        </div>

        <div className="form-group">
          <label htmlFor="max_best_sell_price">Max Sell Price</label>
          <input type="number" id="max_best_sell_price" name="max_best_sell_price" value={formData.max_best_sell_price} onChange={handleChange} placeholder="500000" />
        </div>

        <div className="form-group">
          <label htmlFor="series_id">Series</label>
          <select id="series_id" name="series_id" value={formData.series_id} onChange={handleChange}>
            <option value="">Any Series</option>
            {meta?.series?.map(s => (
              <option key={s.series_id} value={s.series_id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="team">Team</label>
          <select id="team" name="team" value={formData.team} onChange={handleChange}>
            <option value="">Any Team</option>
            <option value="FA">Free Agents</option>
            <option value="BAL">Baltimore Orioles</option>
            <option value="BOS">Boston Red Sox</option>
            <option value="NYY">New York Yankees</option>
            <option value="TB">Tampa Bay Rays</option>
            <option value="TOR">Toronto Blue Jays</option>
            <option value="CWS">Chicago White Sox</option>
            <option value="CLE">Cleveland Guardians</option>
            <option value="DET">Detroit Tigers</option>
            <option value="KC">Kansas City Royals</option>
            <option value="MIN">Minnesota Twins</option>
            <option value="HOU">Houston Astros</option>
            <option value="LAA">Los Angeles Angels</option>
            <option value="OAK">Oakland Athletics</option>
            <option value="SEA">Seattle Mariners</option>
            <option value="TEX">Texas Rangers</option>
            <option value="ATL">Atlanta Braves</option>
            <option value="MIA">Miami Marlins</option>
            <option value="NYM">New York Mets</option>
            <option value="PHI">Philadelphia Phillies</option>
            <option value="WAS">Washington Nationals</option>
            <option value="CHC">Chicago Cubs</option>
            <option value="CIN">Cincinnati Reds</option>
            <option value="MIL">Milwaukee Brewers</option>
            <option value="PIT">Pittsburgh Pirates</option>
            <option value="STL">St. Louis Cardinals</option>
            <option value="ARI">Arizona Diamondbacks</option>
            <option value="COL">Colorado Rockies</option>
            <option value="LAD">Los Angeles Dodgers</option>
            <option value="SD">San Diego Padres</option>
            <option value="SF">San Francisco Giants</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="display_position">Position</label>
          <select id="display_position" name="display_position" value={formData.display_position} onChange={handleChange}>
            <option value="">Any Position</option>
            {positions.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="button-group">
        <button type="submit" className="submit-btn transition-all">
          Search Marketplace
        </button>
        <button type="button" onClick={handleReset} className="reset-btn transition-all">
          Clear Filters
        </button>
      </div>
    </form>
  );
}
