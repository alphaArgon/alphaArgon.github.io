/*
 *  _preprocess/js/punctuation.ts
 *  alphaArgon.github.io
 *
 *  Created by alpha on 2025/10/31.
 *  Copyright © 2025 alphaArgon.
 */

const openPunc: RegExp = /[（［｛〔〈《｟【〖「『]+/;
const closePunc: RegExp = /[）］｝〕〉》｠〗】」』．，、。：；！？]+/;
const gPuncCluster: RegExp = new RegExp(`${openPunc.source}|${closePunc.source}|…{2,}|—{2,}`, "g");


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
]);


type PuncState = {
    type: number;
    span: HTMLSpanElement | null;
}


function makePuncState(): PuncState {
    return {type: 0, span: null};
}


function clearPuncState(state: PuncState) {
    state.type = 0;
    state.span = null;
}


export function spacePuncInElement(element: Element, prevEnd?: PuncState) {
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

    spacePuncInNode(element, prevEnd);
}


function spacePuncInNode(node: Node, prevEnd: PuncState) {
    for (let i = 0; i < node.childNodes.length; ++i) {
        let child = node.childNodes[i];

        switch (child.nodeType) {
        case Node.ELEMENT_NODE:
            spacePuncInElement(child as Element, prevEnd);
            break;

        case Node.TEXT_NODE:
            let fragment = splitNodeText((child as Text).data, prevEnd);
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


function splitNodeText(text: string, prevEnd: PuncState): DocumentFragment | null {
    if (text.length === 0) {return null;}

    let lastIndex = 0;
    gPuncCluster.lastIndex = 0;

    let found: RegExpExecArray | null = null;
    let fragment: DocumentFragment | null = null;
    let endsWithPunc = false;

    while ((found = gPuncCluster.exec(text)) !== null) {
        if (fragment === null) {
            fragment = document.createDocumentFragment();
        }

        let cluster = found[0];
        let clusterStart = gPuncCluster.lastIndex - cluster.length;
        if (lastIndex !== clusterStart) {
            fragment.append(text.substring(lastIndex, clusterStart));
        }

        let span = document.createElement("span");
        span.textContent = cluster;
        span.classList.add("cjk-punc");

        let type = openPunc.test(cluster) ? 1
            : closePunc.test(cluster) ? -1 : 0;

        switch (type) {
        case 1: span.classList.add("hwid", "space-before"); break;
        case -1: span.classList.add("hwid", "space-after"); break;
        default: break;
        }

        if (!fragment.hasChildNodes()) {
            joinPunc(prevEnd, type, span);
        }

        fragment.append(span);
        lastIndex = gPuncCluster.lastIndex;

        if (lastIndex === text.length) {
            endsWithPunc = true;
            prevEnd.type = type;
            prevEnd.span = span;
        }
    }

    if (fragment !== null && lastIndex !== text.length) {
        fragment.append(text.substring(lastIndex));
    }
    
    if (!endsWithPunc) {
        clearPuncState(prevEnd);
    }

    return fragment;
}


function joinPunc(prevEnd: PuncState, type: number, span: HTMLElement) {
    if (type === -1 && prevEnd.type === -1) {
        prevEnd.span!.classList.remove("space-after");
    } else if (type === 1 && prevEnd.type === 1) {
        span.classList.remove("space-before");
    }
}
