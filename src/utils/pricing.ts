export interface ListingItem {
  uuid: string;
  name: string;
  ovr?: number;
  series?: string;
  series_id?: number;
  team_short_name?: string;
  team?: string;
}

export interface Listing {
  listing_name: string;
  best_sell_price: number;
  best_buy_price: number;
  item: ListingItem;
}

export function calculateProfit(sellPrice: number, buyPrice: number) {
  if (sellPrice === 0 || buyPrice === 0) return 0;
  const tax = Math.floor(sellPrice * 0.10);
  return sellPrice - tax - buyPrice;
}

export function getDefaultPrices(ovr: number, isLive: boolean) {
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

export function getEffectivePrices(listing: Listing) {
  let buyPrice = Number(listing.best_buy_price) || 0;
  let sellPrice = Number(listing.best_sell_price) || 0;

  if (buyPrice === 0 || sellPrice === 0) {
    const ovr = listing.item?.ovr || 0;
    const isLive = listing.item?.series?.toLowerCase() === 'live' || listing.item?.series_id === 1337;
    const { minBuy, maxSell } = getDefaultPrices(ovr, isLive);

    if (buyPrice === 0) buyPrice = minBuy;
    if (sellPrice === 0) sellPrice = maxSell;
  }

  return { buyPrice, sellPrice };
}
