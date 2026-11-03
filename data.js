// Inventory comes from Supabase (table bm_cars), managed at admin.html.
// The publishable key is safe to ship: row-level security lets visitors read published cars only (read-only).
window.SB_URL = 'https://ntohdxudxfggsmhxhvho.supabase.co';
window.SB_KEY = 'sb_publishable_81P5_TSD4SuHALFDM4Ao-w_W7C5UkuI';
window.CAR_COLS = 'id,make,model,year,sub,price,km,mi,gearbox,engine,power,drive,colour,spec,about,points,note,photos,cover,sort_order';

window.WA_LIVE = '971506686691';
window.WA_TEST = '971564851757'; // 056 485 1757, used when the site is opened with ?test=1
window.WA = window.WA_LIVE;

window.loadCars = function () {
  var url = SB_URL + '/rest/v1/bm_cars?select=' + CAR_COLS + '&published=eq.true&order=sort_order.asc,year.desc';
  return fetch(url, { headers: { apikey: SB_KEY } })
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (rows) {
      return rows.filter(function (c) { return c.photos && c.photos.length; }).map(function (c) {
        c.points = c.points || [];
        c.cover = Math.min(Math.max(c.cover || 0, 0), c.photos.length - 1);
        return c;
      });
    });
};

window.fmtAED = function (n) { return 'AED ' + Number(n).toLocaleString('en-US'); };
window.fmtMiles = function (c) {
  if (c.km != null) return c.km.toLocaleString('en-US') + ' km';
  if (c.mi != null) return c.mi.toLocaleString('en-US') + ' mi';
  return '';
};
// Crop focus set in the admin (fx/fy, 0-100). Numbers only, so it is safe inside a style attribute.
window.carPos = function (p) { return p && p.fx != null ? 'object-position:' + (+p.fx || 0) + '% ' + (+p.fy || 0) + '%' : ''; };
window.carImg = function (c, i, small) { var p = c.photos[i] || c.photos[0]; return small ? (p.sm || p.src) : p.src; };
