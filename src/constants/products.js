// Single source of truth for product/variety catalogue — used by
// OrderModal, AddShipmentModal, ShipmentDetailModal, GrowersPage.
export const PRODUCTS = {
  'Mandarin': ['Nadorcott', 'W Murcott', 'Clementines', 'Tango', 'Other'],
  'Orange':   ['Navel', 'Valencia', 'Maroc Late', 'Blood Orange', 'Cara Cara', 'Other'],
  'Lemon':    ['Eureka', 'Lisbon', 'Meyer', 'Other'],
  'Lime':     ['Persian', 'Key Lime', 'Kaffir', 'Other'],
};

// Flat, de-duplicated list of every variety (single "Other")
export const ALL_VARIETIES = [...new Set(Object.values(PRODUCTS).flat())];
