// Inventory. Photos live in img/cars/<id>/NN.jpg (1600px) and NN-sm.jpg (640px).
window.CARS = [
  {
    id: 'porsche-panamera-turbo-2010', make: 'Porsche', model: 'Panamera Turbo', year: 2010,
    sub: 'Platinum Silver · Two collector owners', price: 129000, km: 51000,
    gearbox: '7-speed PDK', engine: '4.8 twin-turbo V8', power: '500 hp', drive: 'AWD',
    colour: 'Platinum Silver / Espresso leather', spec: 'German', photos: 20, cover: 3,
    about: 'First-generation 970 Turbo, delivered new to a collector in Abu Dhabi at launch. Two owners, both collectors.',
    points: ['Full service history', 'Bose sound, two keys', '21" Rotiform wheels', 'Thule roof box and rails included']
  },
  {
    id: 'porsche-cayman-s-2006', make: 'Porsche', model: 'Cayman S · Zeus Safari', year: 2006,
    sub: 'Widebody safari build · Manual', price: 180000, km: 177000,
    gearbox: '6-speed manual', engine: '3.4 flat-six', power: '295 PS', drive: 'RWD',
    colour: 'Custom PPF livery', spec: 'GCC', photos: 7, cover: 1,
    about: 'A 987 Cayman S built into a mid-engined safari car by Zeus Offroad in Dubai. Registered, road legal and RTA approved as a build.',
    points: ['AED 123,000+ in documented build receipts', 'Long-travel Zeus coilovers, skid plate, recovery points', 'Radiators moved to the front boot', 'Two keys, full build file']
  },
  {
    id: 'lotus-evora-s-2015', make: 'Lotus', model: 'Evora S · GTE facelift', year: 2015,
    sub: 'Dealer-installed GTE facelift', price: 220000, km: 38000,
    gearbox: 'Automatic', engine: '3.5 supercharged V6', drive: 'RWD',
    colour: 'Factory two-tone', photos: 5, cover: 1,
    about: 'Supercharged Evora S with a GTE facelift installed and painted by the Lotus dealer in Dubai. Looks new, drives new.',
    points: ['Full dealer service history', 'Wider track, wheel studs', 'Headlights restored and PPF-protected', 'Interior presents as new']
  },
  {
    id: 'mercedes-560sl-1986', make: 'Mercedes-Benz', model: '560 SL (R107)', year: 1986,
    sub: 'AED 15,000 just spent · Original hardtop', price: 95000, mi: 61277,
    gearbox: 'Automatic', engine: '5.5 V8 (M117)', drive: 'RWD',
    colour: 'White', photos: 20, cover: 1,
    about: 'The biggest-engined R107, never sold in Europe. Every common V8 leak has just been resealed on genuine parts.',
    points: ['Oil pan, steering box and gearbox resealed', 'Fuel system renewed and pressure tested', 'Four-wheel alignment, new battery', 'Original hardtop included']
  },
  {
    id: 'mercedes-230-1967', make: 'Mercedes-Benz', model: '230 Fintail (W110)', year: 1967,
    sub: 'Twin carb · Four-speed floor shift', price: 80000, mi: 55000,
    gearbox: '4-speed manual', engine: '2.3 inline-six, twin Zenith', power: '118 hp', drive: 'RWD',
    colour: 'White', spec: 'US', photos: 20, cover: 1,
    about: 'An unrestored survivor with the rare manual and twin-carb combination. Fewer than one in ten W110 230s left the factory this way.',
    points: ['Original chrome, trim and interior', 'Clean title, smooth service history', 'Left-hand drive', 'Ready for export or UAE registration']
  },
  {
    id: 'cadillac-de-ville-1959', make: 'Cadillac', model: 'Sedan De Ville 6-Window', year: 1959,
    sub: 'Georgian Blue · Factory air', price: 145000, mi: 36153,
    gearbox: 'Automatic', engine: 'V8', drive: 'RWD',
    colour: 'Georgian Blue / off-white leather', photos: 7, cover: 1,
    about: 'The most iconic design year Cadillac ever built, in the six-window four-door hardtop body collectors chase.',
    points: ['Factory air conditioning', 'Off-white leather with blue piping', 'Discreet hidden Android screen', 'Ready to drive']
  },
  {
    id: 'corvette-c3-1979', make: 'Chevrolet', model: 'Corvette C3 RestoMod', year: 1979,
    sub: 'Olive Green · New 5.7 crate V8', price: 69000, km: 80000,
    gearbox: '3-speed automatic', engine: '5.7 V8 (crate)', drive: 'RWD',
    colour: 'Olive Green / tartan', spec: 'US', photos: 5, cover: 1,
    about: 'Rebuilt by a Dubai muscle-car specialist. Around AED 70,000 of work has gone in, before the price of the car.',
    points: ['Full respray and retrim', 'Digital instruments, Kenwood audio', 'Removable twin roof panels'],
    note: 'Price firm. US import, not yet registered in the UAE. Mileage is indicated, not documented.'
  },
  {
    id: 'toyota-lc70-1991', make: 'Toyota', model: 'Land Cruiser 70', year: 1991,
    sub: 'Mountain Edition inspired', price: 129000, km: 91000,
    gearbox: 'Manual', engine: '4.0 petrol', drive: '4WD',
    colour: 'Maroon', spec: 'GCC', photos: 7, cover: 1,
    about: 'An LC70 upgraded in the spirit of the Mountain Edition, keeping all of its rugged character.',
    points: ['Accident-free', 'Full service history', 'GCC specification']
  },
  {
    id: 'audi-s8-1999', make: 'Audi', model: 'S8 4.2 quattro (D2)', year: 1999,
    sub: 'Dark blue · Full history from new', price: 45000, km: 48000,
    gearbox: 'Tiptronic', engine: '4.2 V8', power: '360 PS', drive: 'quattro',
    colour: 'Dark blue / grey leather', spec: 'German', photos: 12, cover: 1,
    about: 'One-owner D2 S8, delivered through Wolfsburg and serviced by Audi in Germany, the UK and the UAE. Engine replaced by Audi UK.',
    points: ['Complete history file from new', 'Original keys and spare', 'Open to third-party inspection'],
    note: 'Sold as it stands. Needs mechanical and cosmetic work, and the price reflects it.'
  },
  {
    id: 'porsche-cayenne-2008', make: 'Porsche', model: 'Cayenne (957) V6', year: 2008,
    sub: 'Widebody · Japan import', price: 28000, km: 132000,
    gearbox: '6-speed Tiptronic S', engine: '3.6 V6', power: '290 hp', drive: 'AWD',
    colour: 'Sand White / black leather', spec: 'US', photos: 5, cover: 1,
    about: 'Clean-title US car that spent most of its life in Japan. The buyer is its first UAE owner.',
    points: ['Widebody kit painted to match', '22" Sportec wheels and exhaust', 'Independent inspection report available'],
    note: 'Sold as is. Brakes are due and the inspection lists minor wear. One key.'
  }
];

window.fmtPrice = function (n) { return 'AED ' + n.toLocaleString('en-US'); };
window.fmtMiles = function (c) { return c.km != null ? c.km.toLocaleString('en-US') + ' km' : c.mi.toLocaleString('en-US') + ' mi'; };
window.carImg = function (c, i, small) { return 'img/cars/' + c.id + '/' + String(i).padStart(2, '0') + (small ? '-sm' : '') + '.jpg'; };
window.WA = '971506686691';
