/*
 *  _preprocess/js/underline.ts
 *  alphaArgon.github.io
 *
 *  Created by alpha on 2025/11/1.
 *  Copyright © 2025 alphaArgon.
 */


const quickLatin: RegExp = /^[!-~–—“”‘’\s]+$/;


export function makeProperUnderlines(element: Element) {
    for (let a of element.querySelectorAll("a:lang(zh), a:lang(ja), u:lang(zh), u:lang(ja)")) {
        if (!a.hasAttribute("lang") && quickLatin.test(a.textContent)) {
            a.classList.add("latin-underline");
        }
    }
}
