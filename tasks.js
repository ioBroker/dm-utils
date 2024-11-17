const { readFileSync, writeFileSync } = require('node:fs');
const axios = require('axios');
const COMMON_FILENAME = `${__dirname}/src/types/common.ts`;
const TYPES_URL = 'https://raw.githubusercontent.com/ioBroker/ioBroker.admin/master/packages/jsonConfig/src/types.d.ts';

async function patchCommonTs() {
    let text = readFileSync(COMMON_FILENAME).toString();
    const response = await axios.get(
        'https://raw.githubusercontent.com/ioBroker/ioBroker.admin/master/packages/jsonConfig/src/types.d.ts',
    );
    const typeLines = response.data.toString().split('\n');

    const lines = text.split('\n');
    const start = [];
    const end = [];
    let found = 0;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('// -- START OF DYNAMIC GENERATED CODE')) {
            start.push(lines[i]);
            found = 1;
            continue;
        }
        if (lines[i].startsWith('// -- STOP OF DYNAMIC GENERATED CODE')) {
            found = 2;
            end.push(lines[i]);
            continue;
        }
        if (found === 0) {
            start.push(lines[i]);
        } else if (found === 2) {
            end.push(lines[i]);
        }
    }

    // skip all lines in typeLines till "export type ConfigItemType ="
    let f = 0;
    while (!typeLines[f].startsWith('export type ConfigItemType =')) {
        f++;
    }
    if (f >= typeLines.length) {
        console.error(`Cannot find "export type ConfigItemType =" in ${TYPES_URL})`);
        process.exit(2);
    }
    typeLines.splice(0, f);

    writeFileSync(COMMON_FILENAME, `${start.join('\n')}\n${typeLines.join('\n')}\n${end.join('\n')}`);
}

patchCommonTs().catch(err => console.error(`Error: ${err}`));
