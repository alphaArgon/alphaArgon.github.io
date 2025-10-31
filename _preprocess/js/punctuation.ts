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


type InOut<T> = {inout: T};


export function spacePuncInElement(element: Element, prevEndsWithClose?: InOut<boolean>) {
    if (prevEndsWithClose === undefined) {
        prevEndsWithClose = {inout: false};
    }

    if (skipTags.has(element.tagName) || element.classList.contains("cjk-punc")) {
        prevEndsWithClose.inout = false;
        return;
    }

    if (boundaryTags.has(element.tagName)) {
        prevEndsWithClose.inout = false;
    }

    spacePuncInNode(element, prevEndsWithClose);
}


function spacePuncInNode(node: Node, prevEndsWithClose: InOut<boolean>) {
    for (let i = 0; i < node.childNodes.length; ++i) {
        let child = node.childNodes[i];

        switch (child.nodeType) {
        case Node.TEXT_NODE:
            let fragment = splitNodeText((child as Text).data, prevEndsWithClose);
            if (fragment !== null) {
                i += fragment.childNodes.length - 1;
                node.replaceChild(fragment, child);
            }
            break;

        case Node.ELEMENT_NODE:
            spacePuncInElement(child as Element, prevEndsWithClose);
            break;

        default:
            prevEndsWithClose.inout = false;
            break;
        }
    }
}


function splitNodeText(text: string, prevEndsWithClose: InOut<boolean>): DocumentFragment | null {
    if (text.length === 0) {return null;}

    let spaceFirstOpen = prevEndsWithClose.inout;
    prevEndsWithClose.inout = false;

    let lastIndex = 0;
    gPuncCluster.lastIndex = 0;

    let found: RegExpExecArray | null = null;
    let fragment: DocumentFragment | null = null;

    while ((found = gPuncCluster.exec(text)) !== null) {
        let atFirstPunc = false;

        if (fragment === null) {
            fragment = document.createDocumentFragment();
            atFirstPunc = true;
        }

        let cluster = found[0];
        let clusterStart = gPuncCluster.lastIndex - cluster.length;
        if (lastIndex !== clusterStart) {
            fragment.append(text.substring(lastIndex, clusterStart));
            atFirstPunc = false;
        }

        let span = document.createElement("span");
        span.textContent = cluster;
        span.classList.add("cjk-punc");

        if (openPunc.test(cluster)) {
            span.classList.add("hwid");
            if (!atFirstPunc || spaceFirstOpen) {
                span.classList.add("space-before");
            }
        } else if (closePunc.test(cluster)) {
            span.classList.add("hwid");
            if (gPuncCluster.lastIndex !== text.length) {
                span.classList.add("space-after");
            } else {
                prevEndsWithClose.inout = true;
            }
        }

        fragment.append(span);
        lastIndex = gPuncCluster.lastIndex;
    }

    if (fragment !== null && lastIndex !== text.length) {
        fragment.append(text.substring(lastIndex));
    }

    return fragment;
}
