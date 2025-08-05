/*
 *  _preprocess/lightning.mjs
 *  alphaArgon.github.io
 *
 *  Created by alpha on 2025/8/5.
 *  Copyright © 2025 alphaArgon.
 */

import { transform } from "lightningcss";
import { readFileSync, writeFileSync } from "fs";


let transpiled = transform({
    filename: "style.css",
    code: readFileSync("./css/style.css"),
    minify: true,
    targets: {
        safari: 11 << 16,
        ios_saf: 11 << 16,
        chrome: 49 << 16,
        firefox: 52 << 16,
        edge: 15 << 16,
    }
}).code;


writeFileSync("../assets/style.css", transpiled);
