import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';

// Helper to resolve paths from the project root
const getDatasetPath = (filename) => path.join(process.cwd(), 'datasets', filename);

/**
 * Reads bed utilization and parses fully in memory (since it's <10KB).
 */
export const getHospitalCapacities = () => {
  return new Promise((resolve, reject) => {
    const csvPath = getDatasetPath('bedutil_facility.csv');
    if (!fs.existsSync(csvPath)) {
        return resolve([{ hospital: "Hospital Kuala Lumpur", state: "Kuala Lumpur", beds: 500, util: 85 }]);
    }
    const results = [];
    fs.createReadStream(csvPath)
      .pipe(parse({ columns: true, skip_empty_lines: true }))
      .on('data', (data) => {
        // e.g. hospital, state, beds_nonicu, util_nonicu, beds_icu, util_icu
        results.push({
          hospital: data.hospital,
          state: data.state,
          beds_nonicu: parseFloat(data.beds_nonicu) || 0,
          util_nonicu: parseFloat(data.util_nonicu) || 0,
          beds_icu: parseFloat(data.beds_icu) || 0,
          util_icu: parseFloat(data.util_icu) || 0
        });
      })
      .on('end', () => resolve(results))
      .on('error', reject);
  });
};
