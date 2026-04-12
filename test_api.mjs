import fetch from 'node-fetch';

async function test() {
  const queryName = encodeURIComponent("Aaron Judge");
  try {
    const res = await fetch(`https://mlb26.theshow.com/apis/listings.json?type=mlb_card&name=${queryName}`);
    const data = await res.json();
    if (data.listings && data.listings.length > 0) {
       const uuid = data.listings[0].item.uuid;
       console.log("Found UUID:", uuid);
       const res2 = await fetch(`https://mlb26.theshow.com/apis/listing.json?uuid=${uuid}`);
       const d2 = await res2.json();
       console.log(Object.keys(d2));
       if (d2.is_completed === undefined) { // just print some structure
         // find where orders are
       }
       console.log(JSON.stringify(d2).substring(0, 500));
    }
  } catch (e) {
    console.error(e);
  }
}
test();
