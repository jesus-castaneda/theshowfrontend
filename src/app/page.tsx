'use client';

import React, { useState, useMemo } from 'react';
import SearchForm from '@/components/SearchForm';
import LiveSeriesCollections from '@/components/LiveSeriesCollections';
import MarketMonitors from '@/components/MarketMonitors';
import { Listing, calculateProfit, getEffectivePrices } from '@/utils/pricing';
import './home.css';

export interface ListingsResponse {
  page: number;
  per_page: number;
  total_pages: number;
  listings: Listing[];
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<'search' | 'collections' | 'monitors'>('search');
  
  const [listingsData, setListingsData] = useState<ListingsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentParams, setCurrentParams] = useState<Record<string, string>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'profit', direction: 'desc' });

  const fetchListings = async (params: Record<string, string>) => {
    if (loading) return;
    setLoading(true);
    setError('');
    setListingsData(null);
    setSortConfig({ key: 'profit', direction: 'desc' });
    
    const newItems: Listing[] = [];
    
    try {
      let page = 1;
      let totalPages = 1;

      while (page <= totalPages) {
        const qs = new URLSearchParams({ ...params, page: page.toString() }).toString();
        const res = await fetch(`/api/listings?${qs}`);
        if (!res.ok) throw new Error(`API Error on page ${page}`);
        const data = await res.json();
        
        if (page === 1) {
          totalPages = Math.min(data.total_pages, 50);
        }
        
        newItems.push(...(data.listings || []));
        
        setListingsData({
          page: 1,
          per_page: newItems.length,
          total_pages: 1,
          listings: [...newItems]
        });

        if (page < totalPages) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        page++;
      }
      
      setCurrentParams(params);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (params: Record<string, string>) => fetchListings(params);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const trackPlayer = async (listing: Listing) => {
    try {
      const intervalIn = window.prompt("Check interval in minutes:", "5");
      if (!intervalIn) return;
      const profitIn = window.prompt("Profit target in Stubs (e.g. 5000):", "0");
      if (profitIn === null) return;
      const dropIn = window.prompt("Anomaly drop percentage (e.g. 20 for 20%):", "0");
      if (dropIn === null) return;

      const payload = {
        player_uuid: listing.item.uuid || listing.listing_name,
        player_name: listing.item.name || listing.listing_name,
        interval_minutes: parseInt(intervalIn, 10) || 5,
        profit_threshold: parseInt(profitIn, 10) || 0, 
        drop_threshold_pct: parseInt(dropIn, 10) || 0
      };
      const res = await fetch('/api/monitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert(`Successfully added ${payload.player_name} to Market Monitors (checking every 5m)!`);
      } else {
        alert('Failed to setup monitor.');
      }
    } catch (e) {
      alert('Error communicating with monitor API.');
    }
  };

  const sortedListings = useMemo(() => {
    if (!listingsData) return [];
    let sortableItems = [...listingsData.listings];
    
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue: any, bValue: any;
        const { buyPrice: aBuy, sellPrice: aSell } = getEffectivePrices(a);
        const { buyPrice: bBuy, sellPrice: bSell } = getEffectivePrices(b);

        if (sortConfig.key === 'name') {
          aValue = (a.item.name || a.listing_name).toLowerCase();
          bValue = (b.item.name || b.listing_name).toLowerCase();
        } else if (sortConfig.key === 'buy') {
          aValue = aBuy; bValue = bBuy;
        } else if (sortConfig.key === 'sell') {
          aValue = aSell; bValue = bSell;
        } else if (sortConfig.key === 'profit') {
          aValue = calculateProfit(aSell, aBuy);
          bValue = calculateProfit(bSell, bBuy);
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [listingsData, sortConfig]);

  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) return <span className="sort-icon-placeholder">↕</span>;
    return sortConfig.direction === 'asc' ? <span className="sort-icon">↑</span> : <span className="sort-icon">↓</span>;
  };

  return (
    <main className="main-container">
      <header className="page-header relative-container">
        <h1 className="outfit">MLB The Show 26 Market Finder</h1>
        <p>Analyze real-time marketplace data to maximize your Stubs.</p>
        
        <div className="view-toggle">
          <button className={`toggle-btn transition-all ${activeTab === 'search' ? 'active' : ''}`} onClick={() => setActiveTab('search')}>
            Market Search
          </button>
          <button className={`toggle-btn transition-all ${activeTab === 'collections' ? 'active' : ''}`} onClick={() => setActiveTab('collections')}>
            Live Series Collections
          </button>
          <button className={`toggle-btn transition-all ${activeTab === 'monitors' ? 'active' : ''}`} onClick={() => setActiveTab('monitors')}>
            Market Monitors
          </button>
        </div>
      </header>
      
      <div className="container">
        {activeTab === 'monitors' && <MarketMonitors />}
        {activeTab === 'collections' && <LiveSeriesCollections />}

        {activeTab === 'search' && (
          <>
            <SearchForm onSearch={handleSearch} />
            
            {loading && (
              <div className="loader-container">
                <div className="spinner"></div>
                <p>Scanning marketplace...</p>
              </div>
            )}
            {error && <div className="error-message glass">{error}</div>}

            {listingsData && (
              <div className="results-section">
                <div className="results-header">
                  <h2>Found {listingsData.listings.length > 0 ? `${listingsData.listings.length} Listings` : 'No Listings'}</h2>
                  <p>All data loaded</p>
                </div>

                {listingsData.listings.length > 0 && (
                  <>
                    <div className="metrics-bar glass">
                      <div className="metric">
                        <span className="metric-label">Cards</span><span className="metric-value">{sortedListings.length}</span>
                      </div>
                      <div className="metric">
                        <span className="metric-label">Total Buy Now</span><span className="metric-value">{sortedListings.reduce((sum, item) => sum + getEffectivePrices(item).buyPrice, 0).toLocaleString()}</span>
                      </div>
                      <div className="metric">
                        <span className="metric-label">Total Sell Now</span><span className="metric-value">{sortedListings.reduce((sum, item) => sum + getEffectivePrices(item).sellPrice, 0).toLocaleString()}</span>
                      </div>
                      <div className="metric mobile-hidden">
                        <span className="metric-label">Total Profit</span><span className="metric-value">{sortedListings.reduce((sum, item) => sum + calculateProfit(getEffectivePrices(item).sellPrice, getEffectivePrices(item).buyPrice), 0).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="table-container glass transition-all">
                      <table className="results-table">
                        <thead>
                          <tr>
                            <th className="text-left cursor-pointer transition-all" onClick={() => requestSort('name')}>Player {getSortIcon('name')}</th>
                            <th className="text-right cursor-pointer transition-all" onClick={() => requestSort('buy')}>{getSortIcon('buy')} Buy</th>
                            <th className="text-right cursor-pointer transition-all" onClick={() => requestSort('sell')}>{getSortIcon('sell')} Sell</th>
                            <th className="text-right cursor-pointer transition-all" onClick={() => requestSort('profit')}>{getSortIcon('profit')} Profit</th>
                            <th className="text-center">Action</th>
                          </tr>
                        </thead>
                      <tbody>
                        {sortedListings.map((listing, idx) => {
                          const { buyPrice, sellPrice } = getEffectivePrices(listing);
                          const profit = calculateProfit(sellPrice, buyPrice);
                          const isProfitable = profit > 0;
                          
                          return (
                            <tr key={listing.item.uuid || listing.listing_name + idx}>
                              <td className="text-left player-name-cell">
                                <a href={`https://mlb26.theshow.com/items/${listing.item.uuid || listing.listing_name}`} target="_blank" rel="noopener noreferrer" className="player-link">
                                  {listing.item.name || listing.listing_name}
                                </a>
                              </td>
                              <td className="text-right">{buyPrice.toLocaleString()}</td>
                              <td className="text-right">{sellPrice.toLocaleString()}</td>
                              <td className={`text-right profit-cell ${isProfitable ? 'profitable' : profit < 0 ? 'loss' : ''}`}>
                                {profit > 0 ? '+' : ''}{profit.toLocaleString()}
                              </td>
                              <td className="text-center">
                                <button className="submit-btn transition-all" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => trackPlayer(listing)}>
                                  Track
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
