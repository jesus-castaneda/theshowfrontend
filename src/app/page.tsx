'use client';

import React, { useState, useMemo } from 'react';
import SearchForm from '@/components/SearchForm';
import './home.css';

interface ListingItem {
  uuid: string;
  name: string;
}

interface Listing {
  listing_name: string;
  best_sell_price: number;
  best_buy_price: number;
  item: ListingItem;
}

interface ListingsResponse {
  page: number;
  per_page: number;
  total_pages: number;
  listings: Listing[];
}

function calculateProfit(sellPrice: number, buyPrice: number) {
  if (sellPrice === 0 || buyPrice === 0) return 0;
  const tax = Math.floor(sellPrice * 0.10);
  return sellPrice - tax - buyPrice;
}

export default function Home() {
  const [listingsData, setListingsData] = useState<ListingsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentParams, setCurrentParams] = useState<Record<string, string>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'profit', direction: 'desc' });

  const fetchListings = async (params: Record<string, string>, page = 1) => {
    setLoading(true);
    setError('');
    
    try {
      const qs = new URLSearchParams({ ...params, page: page.toString() }).toString();
      const res = await fetch(`/api/listings?${qs}`);
      
      if (!res.ok) throw new Error('Failed to fetch listings');
      
      const data = await res.json();
      setListingsData(data);
      setCurrentParams(params);
      setSortConfig({ key: 'profit', direction: 'desc' }); // Sort by profit by default
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (params: Record<string, string>) => {
    fetchListings(params, 1);
  };

  const loadPage = (page: number) => {
    fetchListings(currentParams, page);
  };

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedListings = useMemo(() => {
    if (!listingsData) return [];
    
    let sortableItems = [...listingsData.listings];
    
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        const aBuy = Number(a.best_buy_price) || 0;
        const aSell = Number(a.best_sell_price) || 0;
        const bBuy = Number(b.best_buy_price) || 0;
        const bSell = Number(b.best_sell_price) || 0;

        if (sortConfig.key === 'name') {
          aValue = (a.item.name || a.listing_name).toLowerCase();
          bValue = (b.item.name || b.listing_name).toLowerCase();
        } else if (sortConfig.key === 'buy') {
          aValue = aBuy;
          bValue = bBuy;
        } else if (sortConfig.key === 'sell') {
          aValue = aSell;
          bValue = bSell;
        } else if (sortConfig.key === 'profit') {
          aValue = calculateProfit(aSell, aBuy);
          bValue = calculateProfit(bSell, bBuy);
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
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
      <header className="page-header">
        <h1 className="outfit">MLB The Show 26 Market Finder</h1>
        <p>Analyze real-time marketplace data to maximize your Stubs.</p>
      </header>
      
      <div className="container">
        <SearchForm onSearch={handleSearch} />
        
        {loading && (
          <div className="loader-container">
            <div className="spinner"></div>
            <p>Scanning marketplace...</p>
          </div>
        )}

        {error && <div className="error-message glass">{error}</div>}

        {!loading && listingsData && (
          <div className="results-section">
            <div className="results-header">
              <h2>Found {listingsData.listings.length > 0 ? 'Listings' : 'No Listings'}</h2>
              <p>Page {listingsData.page} of {listingsData.total_pages}</p>
            </div>

            {listingsData.listings.length > 0 && (
              <div className="table-container glass transition-all">
                <table className="results-table">
                  <thead>
                    <tr>
                      <th className="text-left cursor-pointer transition-all" onClick={() => requestSort('name')}>
                        Player Name {getSortIcon('name')}
                      </th>
                      <th className="text-right cursor-pointer transition-all" onClick={() => requestSort('buy')}>
                        {getSortIcon('buy')} Best Buy Price
                      </th>
                      <th className="text-right cursor-pointer transition-all" onClick={() => requestSort('sell')}>
                        {getSortIcon('sell')} Best Sell Price
                      </th>
                      <th className="text-right cursor-pointer transition-all" onClick={() => requestSort('profit')}>
                        {getSortIcon('profit')} Profit (After Tax)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedListings.map((listing, idx) => {
                      const buyPrice = Number(listing.best_buy_price) || 0;
                      const sellPrice = Number(listing.best_sell_price) || 0;
                      const profit = calculateProfit(sellPrice, buyPrice);
                      const isProfitable = profit > 0;
                      const isLoss = profit < 0;

                      return (
                        <tr key={listing.item.uuid || listing.listing_name + idx}>
                          <td className="text-left player-name-cell">
                            <a 
                              href={`https://mlb26.theshow.com/items/${listing.item.uuid || listing.listing_name}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="player-link"
                            >
                              {listing.item.name || listing.listing_name}
                            </a>
                          </td>
                          <td className="text-right">{buyPrice.toLocaleString()}</td>
                          <td className="text-right">{sellPrice.toLocaleString()}</td>
                          <td className={`text-right profit-cell ${isProfitable ? 'profitable' : isLoss ? 'loss' : ''}`}>
                            {profit > 0 ? '+' : ''}{profit.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {listingsData.total_pages > 1 && (
              <div className="pagination">
                <button 
                  disabled={listingsData.page <= 1} 
                  onClick={() => loadPage(listingsData.page - 1)}
                  className="transition-all"
                >
                  Previous
                </button>
                <span className="page-indicator outfit">
                  {listingsData.page} / {listingsData.total_pages}
                </span>
                <button 
                  disabled={listingsData.page >= listingsData.total_pages} 
                  onClick={() => loadPage(listingsData.page + 1)}
                  className="transition-all"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
