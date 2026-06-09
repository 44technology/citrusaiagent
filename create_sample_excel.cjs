const xlsx = require('xlsx');
const data = [
  { Name: 'John Smith', Phone: '+1 234-567-8900', Email: 'john@example.com', Company: 'Fresh Fruits Ltd.', Department: 'Purchasing', Language: 'English', CapitalBoxCredit: 50000 },
  { Name: 'Maria Garcia', Phone: '+34 600 123 456', Email: 'maria@example.com', Company: 'Mercado Central', Department: 'Management', Language: 'Spanish', CapitalBoxCredit: 0 },
  { Name: 'David Chen', Phone: '+1 987-654-3210', Email: 'david@example.com', Company: 'Global Grocers', Department: 'Import/Export', Language: 'English', CapitalBoxCredit: 120000 },
  { Name: 'Elena Rodriguez', Phone: '+52 55 1234 5678', Email: 'elena@example.com', Company: 'Distribuidora del Sol', Department: 'Sales', Language: 'Spanish', CapitalBoxCredit: 25000 },
  { Name: 'Michael Johnson', Phone: '+44 7911 123456', Email: 'michael@example.com', Company: 'UK Markets', Department: 'Procurement', Language: 'English', CapitalBoxCredit: 0 },
];
const ws = xlsx.utils.json_to_sheet(data);
const wb = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(wb, ws, "Customers");
xlsx.writeFile(wb, "sample_customers.xlsx");
console.log("sample_customers.xlsx created successfully.");
