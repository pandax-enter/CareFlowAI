import * as XLSX from 'xlsx';
// or if that fails: import XLSX from 'xlsx';
const { readFile, utils } = XLSX;
console.log("Internal XLSX keys:", Object.keys(XLSX));
try {
    console.log("readFile function exists:", typeof readFile);
} catch (e) {
    console.log("Error accessing readFile:", e.message);
}
