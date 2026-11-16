// Single source of truth for product/variety catalogue — used by
// OrderModal, AddShipmentModal, ShipmentDetailModal, GrowersPage.
export const PRODUCTS = {
  'Mandarin': ['Nadorcott', 'W Murcott', 'Clementines', 'Tango', 'Other'],
  'Orange':   ['Navel', 'Valencia', 'Maroc Late', 'Blood Orange', 'Cara Cara', 'Other'],
  'Lemon':    ['Eureka', 'Lisbon', 'Meyer', 'Other'],
  'Lime':     ['Persian', 'Key Lime', 'Kaffir', 'Other'],
  'Grape':    ['Sweet Globe', 'M. Beauty', 'Allison', 'Candy Snap', 'Sugar Crisp', 'Sable', 'Timco', 'Autumn Crisp', 'Other'],
};

// Flat, de-duplicated list of every variety (single "Other")
export const ALL_VARIETIES = [...new Set(Object.values(PRODUCTS).flat())];

// Standard box weights — a container can mix several of these.
// 4.5 / 5 / 8.2 / 9 KG are the usual table-grape cartons (8.2 KG = 18 lb);
// 10–18 KG are the citrus boxes.
export const PACK_OPTIONS = ['4.5 KG', '5 KG', '8.2 KG', '9 KG', '10 KG', '15 KG', '16 KG', '17 KG', '18 KG'];
