'use client';

import React, { useState, useMemo } from 'react';
import SearchForm from '@/components/SearchForm';
import './home.css';

interface ListingItem {
  uuid: string;
  name: string;
  ovr?: number;
  series?: string;
  series_id?: number;
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

function getDefaultPrices(ovr: number, isLive: boolean) {
  let minBuy = 0;
  let maxSell = 0;

  if (ovr < 65) { minBuy = isLive ? 5 : 2; maxSell = 1000; }
  else if (ovr <= 74) { minBuy = isLive ? 25 : 12; maxSell = 1000; }
  else if (ovr === 75) { minBuy = isLive ? 50 : 25; maxSell = 5000; }
  else if (ovr === 76) { minBuy = isLive ? 75 : 37; maxSell = 5000; }
  else if (ovr === 77) { minBuy = isLive ? 100 : 50; maxSell = 5000; }
  else if (ovr === 78) { minBuy = isLive ? 125 : 62; maxSell = 5000; }
  else if (ovr === 79) { minBuy = isLive ? 150 : 75; maxSell = 5000; }
  else if (ovr === 80) { minBuy = isLive ? 400 : 200; maxSell = 25000; }
  else if (ovr === 81) { minBuy = isLive ? 600 : 300; maxSell = 25000; }
  else if (ovr === 82) { minBuy = isLive ? 900 : 450; maxSell = 25000; }
  else if (ovr === 83) { minBuy = isLive ? 1200 : 600; maxSell = 25000; }
  else if (ovr === 84) { minBuy = isLive ? 1500 : 750; maxSell = 25000; }
  else if (ovr === 85) { minBuy = isLive ? 3000 : 1500; maxSell = 250000; }
  else if (ovr === 86) { minBuy = isLive ? 3750 : 1875; maxSell = 250000; }
  else if (ovr === 87) { minBuy = isLive ? 4500 : 2250; maxSell = 250000; }
  else if (ovr === 88) { minBuy = isLive ? 5500 : 2750; maxSell = 250000; }
  else if (ovr === 89) { minBuy = isLive ? 7000 : 3500; maxSell = 250000; }
  else if (ovr === 90) { minBuy = isLive ? 8000 : 4000; maxSell = 750000; }
  else if (ovr === 91) { minBuy = isLive ? 9000 : 4500; maxSell = 750000; }
  else if (ovr <= 94) { minBuy = isLive ? 10000 : 5000; maxSell = 750000; }
  else { minBuy = isLive ? 10000 : 5000; maxSell = 1000000; }

  return { minBuy, maxSell };
}

function getEffectivePrices(listing: Listing) {
  let buyPrice = Number(listing.best_buy_price) || 0;
  let sellPrice = Number(listing.best_sell_price) || 0;

  if (buyPrice === 0 || sellPrice === 0) {
    const ovr = listing.item?.ovr || 0;
    const isLive = listing.item?.series?.toLowerCase() === 'live' || listing.item?.series_id === 1;
    const { minBuy, maxSell } = getDefaultPrices(ovr, isLive);

    if (buyPrice === 0) buyPrice = minBuy;
    if (sellPrice === 0) sellPrice = maxSell;
  }

  return { buyPrice, sellPrice };
}

export default function Home() {
  const [listingsData, setListingsData] = useState<ListingsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentParams, setCurrentParams] = useState<Record<string, string>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'profit', direction: 'desc' });

  const fetchListings = async (params: Record<string, string>) => {
    if (loading) return;
    setLoading(true);
    setError('');
    // Clear out the previous search data before starting fresh
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
          // Hard cap at 50 pages (500-750 items) to prevent infinite loops and 429 too many requests errors
          totalPages = Math.min(data.total_pages, 50);
        }
        
        newItems.push(...(data.listings || []));
        
        // Progressively append data to the state!
        setListingsData({
          page: 1,
          per_page: newItems.length,
          total_pages: 1,
          listings: [...newItems]
        });

        if (page < totalPages) {
          // Anti-ban delay: prevent hitting rate limits when requesting dozens of pages instantly
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

  const handleSearch = (params: Record<string, string>) => {
    fetchListings(params);
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

        const { buyPrice: aBuy, sellPrice: aSell } = getEffectivePrices(a);
        const { buyPrice: bBuy, sellPrice: bSell } = getEffectivePrices(b);

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
            <p>Scanning marketplace... (This may take a moment for large queries)</p>
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
                    <span className="metric-label">Cards</span>
                    <span className="metric-value">{sortedListings.length}</span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Total Buy Now</span>
                    <span className="metric-value">{sortedListings.reduce((sum, item) => sum + getEffectivePrices(item).buyPrice, 0).toLocaleString()}</span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Total Sell Now</span>
                    <span className="metric-value">{sortedListings.reduce((sum, item) => sum + getEffectivePrices(item).sellPrice, 0).toLocaleString()}</span>
                  </div>
                  <div className="metric mobile-hidden">
                    <span className="metric-label">Total Profit</span>
                    <span className="metric-value">{sortedListings.reduce((sum, item) => {
                      const { buyPrice, sellPrice } = getEffectivePrices(item);
                      return sum + calculateProfit(sellPrice, buyPrice);
                    }, 0).toLocaleString()}</span>
                  </div>
                </div>

                <div className="table-container glass transition-all">
                  <table className="results-table">
                    <thead>
                      <tr>
                        <th className="text-left cursor-pointer transition-all" onClick={() => requestSort('name')}>
                          Player {getSortIcon('name')}
                        </th>
                        <th className="text-right cursor-pointer transition-all" onClick={() => requestSort('buy')}>
                          {getSortIcon('buy')} Buy
                        </th>
                        <th className="text-right cursor-pointer transition-all" onClick={() => requestSort('sell')}>
                          {getSortIcon('sell')} Sell
                        </th>
                        <th className="text-right cursor-pointer transition-all" onClick={() => requestSort('profit')}>
                          {getSortIcon('profit')} Profit
                        </th>
                      </tr>
                    </thead>
                  <tbody>
                    {sortedListings.map((listing, idx) => {
                      const { buyPrice, sellPrice } = getEffectivePrices(listing);
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
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
