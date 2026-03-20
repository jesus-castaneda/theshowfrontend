'use client';

import React, { useState, useEffect } from 'react';
import { Listing, getEffectivePrices } from '@/utils/pricing';

const DB = {
  "American League": {
    "AL East": ["BAL", "BOS", "NYY", "TB", "TOR"],
    "AL Central": ["CWS", "CLE", "DET", "KC", "MIN"],
    "AL West": ["HOU", "LAA", "OAK", "SEA", "TEX"],
  },
  "National League": {
    "NL East": ["ATL", "MIA", "NYM", "PHI", "WAS"],
    "NL Central": ["CHC", "CIN", "MIL", "PIT", "STL"],
    "NL West": ["ARI", "COL", "LAD", "SD", "SF"]
  }
};

export default function LiveSeriesCollections() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cards, setCards] = useState<Listing[]>([]);

  useEffect(() => {
    fetchLiveSeries();
  }, []);

  const fetchLiveSeries = async () => {
    setLoading(true);
    setError('');
    const newItems: Listing[] = [];
    try {
      let page = 1;
      let totalPages = 1;
      // Live Series in MLB26 API is 1337
      const searchParams = { series_id: '1337' };
      while (page <= totalPages) {
        const qs = new URLSearchParams({ ...searchParams, page: page.toString() }).toString();
        const res = await fetch(`/api/listings?${qs}`);
        if (!res.ok) throw new Error(`API Error on page ${page}`);
        const data = await res.json();
        if (page === 1) totalPages = Math.min(data.total_pages, 80); // Ensure complete crawl safely
        newItems.push(...(data.listings || []));
        setCards([...newItems]); // Progressive render gives smooth load

        if (page < totalPages) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        page++;
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred fetching Live Series');
    } finally {
      setLoading(false);
    }
  };

  const getTeamTotals = (teamShort: string) => {
    const teamCards = cards.filter(c => c.item?.team_short_name === teamShort);
    let buy = 0, sell = 0;
    teamCards.forEach(c => {
      const { buyPrice, sellPrice } = getEffectivePrices(c);
      buy += buyPrice;
      sell += sellPrice;
    });
    return { buy, sell, count: teamCards.length };
  };

  const calculateHierarchy = () => {
    let mlbBuy = 0;
    let mlbSell = 0;
    const structure: any = {};

    Object.entries(DB).forEach(([leagueName, divisions]) => {
      structure[leagueName] = { buy: 0, sell: 0, divisions: {} };
      
      Object.entries(divisions).forEach(([divName, teams]) => {
        structure[leagueName].divisions[divName] = { buy: 0, sell: 0, teams: [] };

        teams.forEach(teamShort => {
          const t = getTeamTotals(teamShort);
          structure[leagueName].divisions[divName].teams.push({ ...t, team: teamShort });
          
          structure[leagueName].divisions[divName].buy += t.buy;
          structure[leagueName].divisions[divName].sell += t.sell;
          structure[leagueName].buy += t.buy;
          structure[leagueName].sell += t.sell;
          mlbBuy += t.buy;
          mlbSell += t.sell;
        });
      });
    });

    return { mlbBuy, mlbSell, structure };
  };

  const { mlbBuy, mlbSell, structure } = calculateHierarchy();

  return (
    <div className="collections-view">
      {loading && (
        <div className="loader-container loader-collections">
          <div className="spinner"></div>
          <p>Syncing complete Live Series database... ({cards.length} loaded)</p>
        </div>
      )}
      {error && <div className="error-message glass">{error}</div>}

      {cards.length > 0 && (
        <div className="hierarchy-container transition-all">
          <div className="grand-total glass">
            <h2>MLB Live Series Grand Total</h2>
            <div className="totals-row">
              <div className="totals-box">
                <span className="label">Total Buy Now</span>
                <span className="value buy">{mlbBuy.toLocaleString()}</span>
              </div>
              <div className="totals-box">
                <span className="label">Total Sell Now</span>
                <span className="value sell">{mlbSell.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="leagues-grid">
            {Object.entries(structure).map(([leagueName, leagueData]: any) => (
              <div key={leagueName} className="league-card glass">
                <div className="league-header">
                  <h3>{leagueName}</h3>
                  <div className="league-totals">
                    <span className="sub">Buy:</span> {leagueData.buy.toLocaleString()} &nbsp;|&nbsp; <span className="sub">Sell:</span> {leagueData.sell.toLocaleString()}
                  </div>
                </div>

                <div className="division-list">
                  {Object.entries(leagueData.divisions).map(([divName, divData]: any) => (
                    <div key={divName} className="division-section">
                      <h4 className="division-header">
                        {divName} 
                        <span className="div-totals">({divData.buy.toLocaleString()} / {divData.sell.toLocaleString()})</span>
                      </h4>
                      
                      <table className="results-table teams-table">
                        <thead>
                          <tr>
                            <th className="text-left">Team</th>
                            <th className="text-right">Cards</th>
                            <th className="text-right">Buy</th>
                            <th className="text-right">Sell</th>
                          </tr>
                        </thead>
                        <tbody>
                          {divData.teams.map((t: any) => (
                            <tr key={t.team}>
                              <td className="text-left player-name-cell">{t.team}</td>
                              <td className="text-right">{t.count}</td>
                              <td className="text-right">{t.buy.toLocaleString()}</td>
                              <td className="text-right">{t.sell.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
