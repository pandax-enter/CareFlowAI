import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';

const INPUT_CSV = path.join(process.cwd(), 'datasets', 'Final_Augmented_dataset_Diseases_and_Symptoms.csv');
const OUTPUT_JSON = path.join(process.cwd(), 'datasets', 'Symptoms_Compact.json');

async function cleanDataset() {
    console.log('--- Starting Dataset Compression (190MB -> JSON) ---');
    
    if (!fs.existsSync(INPUT_CSV)) {
        console.error('Source CSV not found at:', INPUT_CSV);
        process.exit(1);
    }

    const compactData = {};
    let headers = [];
    let count = 0;

    const parser = fs.createReadStream(INPUT_CSV)
        .pipe(parse({ delimiter: ',', from_line: 1 }));

    for await (const row of parser) {
        if (headers.length === 0) {
            headers = row;
            continue;
        }

        const disease = row[0];
        const symptoms = [];

        // For each symptoms column, if value is 1, add the header name to the list
        for (let i = 1; i < row.length; i++) {
            if (row[i] === '1') {
                symptoms.push(headers[i]);
            }
        }

        if (symptoms.length > 0) {
            compactData[disease] = symptoms;
        }

        count++;
        if (count % 1000 === 0) process.stdout.write(`.` );
    }

    console.log('\n--- Compression Complete. Saving... ---');
    fs.writeFileSync(OUTPUT_JSON, JSON.stringify(compactData, null, 2));
    const stats = fs.statSync(OUTPUT_JSON);
    console.log(`Saved to ${OUTPUT_JSON} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
}

cleanDataset().catch(console.error);
