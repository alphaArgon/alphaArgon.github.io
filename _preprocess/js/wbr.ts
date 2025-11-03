/*
 *  _preprocess/js/wbr.ts
 *  alphaArgon.github.io
 *
 *  Created by alpha on 2025/8/1.
 *  Copyright © 2025 alphaArgon.
 */


/** Hints line breaks in inline code. For example, `CTFontCreateWithFontDescriptor` would be
  * `CTFont·Create·With·Font·Descriptor`, and `some_long_name` would be `some_·long_·name`. */
export function addWBRsToInlineCode(container: Element) {
    for (let code of container.querySelectorAll("code")) {
        if (code.parentElement!.tagName === "PRE") {continue;}
        mapEachTextNodeIn(code, node => {
            let fragment = null;
            let prevBreakIndex = 0;

            //  0: whitespace, 1: lowercase, 2: uppercase, 3: digit, 4: bar, 5: other
            let prevCharType = 0;
            let text = node.data;
            for (let i = 0; i < text.length; ++i) {
                let c = text[i];
                let charType = 0;
                if (c.trim() === "") {charType = 0;}
                else if (c >= 'a' && c <= 'z') {charType = 1;}
                else if (c >= 'A' && c <= 'Z') {charType = 2;}
                else if (c >= '0' && c <= '9') {charType = 3;}
                else if (c === '-' || c === '_' || c === '/') {charType = 4;}
                else {charType = 5;}

                switch (prevCharType * 10 + charType) {
                case 12: case 13: case 23:
                case 41: case 42: case 43:
                    let slice = text.substring(prevBreakIndex, i);
                    if (slice.trim().length < 3) {
                        break;  //  Avoid short segments, for example a single prefix `k`.
                    }

                    if (fragment === null) {
                        fragment = document.createDocumentFragment();
                    } else {
                        fragment.appendChild(document.createElement("wbr"));
                    }

                    fragment.append(slice);
                    prevBreakIndex = i;
                }

                prevCharType = charType;
            }

            if (fragment !== null) {
                fragment.appendChild(document.createElement("wbr"));
                fragment.append(text.substring(prevBreakIndex));
                return fragment;
            }

            return /* void */;
        });
    }
}


/** Traverses all text nodes in an element, and replaces them in place if necessary. */
function mapEachTextNodeIn(element: Element, replacer: (node: Text) => void | null | string | Node) {
    let node: Node | null;
    let walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let prevNode: Text | null = null;
    while ((node = walker.nextNode()) || prevNode !== null) {
        if (prevNode !== null) {
            let replacement = replacer(prevNode);
            switch (true) {
            case replacement === null || replacement === "":
                prevNode.remove();
                break;
            case typeof replacement === "string":
                prevNode.data = replacement;
                break;
            case replacement instanceof Node:
                prevNode.replaceWith(replacement);
                break;
            }
        }

        prevNode = node as Text;
    }
}
