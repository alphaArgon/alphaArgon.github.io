/*
 *  _preprocess/rollup.config.js
 *  alphaArgon.github.io
 *
 *  Created by alpha on 2025/7/31.
 *  Copyright © 2025 alphaArgon.
 */

import typescript from "@rollup/plugin-typescript";
import terser from '@rollup/plugin-terser';


export default {
    input: "./js/style.ts",
    output: {
        file: "../assets/style.js",
        name: "_",
        format: "iife",
    },
    plugins: [
        typescript(),
        terser({keep_classnames: true}),
    ],
};
