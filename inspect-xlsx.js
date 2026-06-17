// Temporary inspection script to read the structure of the uploaded Excel file
const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'May dod data .xlsx');
console.log(`Reading Excel file from: ${filePath}`);

try {
  const workbook = XLSX.readFile(filePath);
  console.log('Sheet Names:', workbook.SheetNames);
  
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  
  // Convert to JSON
  const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
  console.log(`Total Rows in first sheet ("${firstSheetName}"): ${json.length}`);
  
  if (json.length > 0) {
    console.log('\nColumn Headers:');
    console.log(Object.keys(json[0]));
    
    console.log('\nSample Row (Row 1):');
    console.log(JSON.stringify(json[0], null, 2));
    
    console.log('\nSample Row (Row 2):');
    if (json[1]) console.log(JSON.stringify(json[1], null, 2));
  } else {
    console.log('The sheet appears to be empty.');
  }
} catch (err) {
  console.error('Error reading Excel file:', err);
}
