/*
 *  _preprocess/js/punctuation.ts
 *  alphaArgon.github.io
 *
 *  Created by alpha on 2025/10/31.
 *  Copyright © 2025 alphaArgon.
 */

const openPunc: RegExp = /[（［｛〔〈《｟【〖「『]+/;
const closePunc: RegExp = /[）］｝〕〉》｠〗】」』]+/;

const scClosePunc: RegExp = new RegExp(`${closePunc.source}|[．，、。：；！？]`);
const jaClosePunc: RegExp = new RegExp(`${closePunc.source}|[．，、。]`);

const cjAddOns = `……+|——+|·| ?“|” ?| ?‘|’ ?`;

const gPuncCluster = new RegExp(`${openPunc.source}|${closePunc.source}`, "g");
const gTCPuncCluster = new RegExp(`${openPunc.source}|${closePunc.source}|${cjAddOns}`, "g");
const gScPuncCluster = new RegExp(`${openPunc.source}|${scClosePunc.source}|${cjAddOns}`, "g");
const gJaPuncCluster = new RegExp(`${openPunc.source}|${jaClosePunc.source}|${cjAddOns}`, "g");

let ySomeCJIdeo: RegExp;

try {
    ySomeCJIdeo = /(\p{sc=Hani}|\p{sc=Hira}|\p{sc=Kana}|\p{sc=Bopo})+/uy;
} catch {
    ySomeCJIdeo = /[ぁ-ヿㄅ-ㄯ㐀-䶿一-鿿豈-舘]+/y;  //  Some in BMP only.
}


const skipTags: Set<string> = new Set([
    "BASE", "HEAD", "LINK", "META", "TITLE", "STYLE", "SCRIPT",
    "INPUT", "TEXTAREA", "IMG", "VIDEO", "CANVAS", "CODE", "PRE",
    "MATH", "SVG", "EMBED",
]);


const boundaryTags: Set<string> = new Set([
    "ADDRESS", "ARTICLE", "ASIDE", "BLOCKQUOTE", "BODY", "DD", "DIV",
    "DL", "DT", "FIELDSET", "FIGURE", "FIGCAPTION", "FOOTER", "FORM",
    "H1", "H2", "H3", "H4", "H5", "H6", "HEADER", "HR", "LI", "MAIN",
    "NAV", "OL", "P", "SECTION", "TABLE", "TBODY", "TD", "TH", "TR",
    "THEAD", "TFOOT", "UL",
    "BR",
]);


const enum QuickLang {
    other, tc, sc, ja,
}


type PuncState = {
    type: number;  //  1: open, 0: none, -1: close.
    span: HTMLSpanElement | null;
}


function makePuncState(): PuncState {
    return {type: 0, span: null};
}


function clearPuncState(state: PuncState) {
    state.type = 0;
    state.span = null;
}


export function spacePuncInElement(element: Element, prevEnd?: PuncState, lang?: QuickLang) {
    if (prevEnd === undefined) {
        prevEnd = makePuncState();
    }

    if (skipTags.has(element.tagName) || element.classList.contains("cjk-punc")) {
        clearPuncState(prevEnd);
        return;
    }

    if (boundaryTags.has(element.tagName)) {
        clearPuncState(prevEnd);
    }

    if (lang === undefined || element.hasAttribute("lang")) {
        lang = element.matches(":lang(ja)") ? QuickLang.ja
            : element.matches(":lang(zh-Hans), :lang(zh-CN)" /* not for MY or SG */) ? QuickLang.sc
            : element.matches(":lang(zh-Hant), :lang(zh-TW), :lang(zh-HK), :lang(zh-MO)") ? QuickLang.tc
            : QuickLang.other;
    }

    spacePuncInNode(element, prevEnd, lang);
}


function spacePuncInNode(node: Node, prevEnd: PuncState, lang: QuickLang) {
    for (let i = 0; i < node.childNodes.length; ++i) {
        let child = node.childNodes[i];

        switch (child.nodeType) {
        case Node.ELEMENT_NODE:
            spacePuncInElement(child as Element, prevEnd, lang);
            break;

        case Node.TEXT_NODE:
            let fragment = splitNodeText((child as Text).data, prevEnd, lang);
            if (fragment !== null) {
                i += fragment.childNodes.length - 1;
                node.replaceChild(fragment, child);
            }
            break;

        default:
            break;
        }
    }
}


function splitNodeText(text: string, prevEnd: PuncState, lang: QuickLang): DocumentFragment | null {
    if (text.length === 0) {return null;}

    const anyOpen = openPunc;
    const anyClose = scClosePunc;
    let tester: RegExp;
    switch (lang) {
    case QuickLang.other: tester = gPuncCluster; break;
    case QuickLang.tc: tester = gTCPuncCluster; break;
    case QuickLang.sc: tester = gScPuncCluster; break;
    case QuickLang.ja: tester = gJaPuncCluster; break;
    }

    let lastIndex = 0;
    tester.lastIndex = 0;

    let found: RegExpExecArray | null = null;
    let fragment: DocumentFragment | null = null;

    //  When to check consecutive?
    //    1) At beginning if punc,
    //    2) at open quote, or
    //    3) after close quote.
    let checkConsecutive = false;
    let pairingQuotes = false;

    while ((found = tester.exec(text)) !== null) {
        if (fragment === null) {
            fragment = document.createDocumentFragment();
        }

        let cluster = found[0];
        let clusterStart = tester.lastIndex - cluster.length;

        if (cluster === "·") {
            let before = text[clusterStart - 1];
            let after = text[clusterStart + 1];
            ySomeCJIdeo.lastIndex = 0;

            if (before !== undefined && !ySomeCJIdeo.test(before)
             || after !== undefined && !ySomeCJIdeo.test(after)) {
                tester.lastIndex += 1;
                continue;
            }
        }

        let firstChar = cluster[0];
        let isCloseQuote = firstChar === '”' || firstChar === '’';
        if (!pairingQuotes && isCloseQuote) {
            tester.lastIndex += 1;
            continue;
        }

        let lastChar = cluster[cluster.length - 1];
        let isOpenQuote = lastChar === '“' || lastChar === '‘';
        if (isOpenQuote) {
            let close = lastChar === '“' ? '”' : '’';
            ySomeCJIdeo.lastIndex = tester.lastIndex;
            if (ySomeCJIdeo.test(text) && text[ySomeCJIdeo.lastIndex] === close) {
                pairingQuotes = true;
            } else {
                tester.lastIndex += 1;
                continue;
            }
        }

        if (lastIndex !== clusterStart) {
            checkConsecutive = false;

            fragment.append(text.substring(lastIndex, clusterStart));
            if (prevEnd.type === -1 && text[lastIndex] === ' ') {
                prevEnd.span!.classList.remove("space-after");
            }

            clearPuncState(prevEnd);

        } else if (isOpenQuote) {
            checkConsecutive = true;
        }

        let type = (isOpenQuote || anyOpen.test(cluster)) ? 1
            : (isCloseQuote || anyClose.test(cluster)) ? -1
            : 0;

        lastIndex = tester.lastIndex;

        let span = document.createElement("span");
        span.textContent = cluster;
        span.classList.add("cjk-punc");

        switch (type) {
        case 1:
            span.classList.add("hwid");
            if (firstChar !== ' ') {
                span.classList.add("space-before");
            }
            if (checkConsecutive && prevEnd.type === 1) {
                span.classList.remove("space-before");
            }
            break;
        case -1:
            span.classList.add("hwid");
            if (lastChar !== ' ') {
                span.classList.add("space-after");
            }
            if (checkConsecutive && prevEnd.type === -1) {
                prevEnd.span!.classList.remove("space-after");
            }
            break;
        default:
            break;
        }

        pairingQuotes = isOpenQuote;

        if (isCloseQuote) {
            checkConsecutive = true;
        }

        fragment.append(span);
        prevEnd.type = type;
        prevEnd.span = span;
    }

    if (fragment !== null) {
        if (lastIndex !== text.length) {
            fragment.append(text.substring(lastIndex));
            if (prevEnd.type === -1 && text[lastIndex] === ' ') {
                prevEnd.span!.classList.remove("space-after");
            }

            clearPuncState(prevEnd);
        }
    }

    return fragment;
}
