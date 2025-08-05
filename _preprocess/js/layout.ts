/*
 *  _preprocess/sources/width.ts
 *  alphaArgon.github.io
 *
 *  Created by alpha on 2025/8/2.
 *  Copyright © 2025 alphaArgon.
 */

import { withDOMContentLoaded } from "./event";


let chevron: HTMLElement | null = null;
let flies: NodeListOf<HTMLElement> | null = null;

withDOMContentLoaded(() => {
    chevron = document.querySelector(".hero-chevron-up");
    flies = document.querySelectorAll(".nav-list .fly");
    if (chevron !== null) {
        window.addEventListener("scroll", colorHomeChevron);
        positionHomeChevron();
    }
});


export function sizeMainContent() {
    let main = document.querySelector(".main") as HTMLElement | null;
    if (main === null) {return;}

    let sidebar = document.querySelector(".sidebar-background") as HTMLElement | null;
    if (sidebar === null) {return;}

    let banner = document.querySelector(".page-banner-image") as HTMLElement | null;
    let root = document.documentElement;

    const maxEms = 40;
    const wideMaxEms = 51;
    let wide = main.classList.contains("wide");

    let lastRootWidth = NaN;
    for (let i = 0; i < 4; ++i) {
        let rootWidth = root.clientWidth;
        if (rootWidth === lastRootWidth) {break;}

        let sidebarWidth = sidebar.offsetWidth;  //  0 if not visible.

        let rootStyle = getComputedStyle(root);
        let fontSize = parseFloat(rootStyle.fontSize);

        let mainStyle = getComputedStyle(main);
        let mainPaddingLeft = parseFloat(mainStyle.paddingLeft);
        let mainPaddingRight = parseFloat(mainStyle.paddingRight);

        let mainWidth = rootWidth - mainPaddingLeft - mainPaddingRight - sidebarWidth;
        mainWidth = Math.min(maxEms, Math.floor(mainWidth / fontSize)) * fontSize;

        let visualBias = Math.min(sidebarWidth / 2, mainPaddingLeft);
        let mainFullWidth = mainWidth + mainPaddingLeft + mainPaddingRight;
        let mainLeft = (rootWidth - mainFullWidth) / 2 + visualBias;
        mainLeft = Math.max(sidebarWidth, Math.floor(mainLeft));

        if (wide) {
            mainWidth = rootWidth - mainLeft - mainPaddingLeft - mainPaddingRight - (mainLeft - sidebarWidth);
            mainWidth = Math.min(wideMaxEms, Math.floor(mainWidth / fontSize)) * fontSize;
        }

        main.style.width = mainWidth + "px";
        main.style.marginLeft = (mainLeft - sidebarWidth) + "px";

        if (banner !== null) {
            banner.style.marginLeft = (sidebarWidth - mainLeft - mainPaddingLeft) + "px";
            banner.style.width = (rootWidth - sidebarWidth) + "px";
        }

        if (chevron !== null) {
            positionHomeChevron();
        }

        let mainRight = mainLeft + mainPaddingLeft + mainWidth;  //  No padding-right.
        positionNotes(rootWidth, mainRight, fontSize);

        lastRootWidth = rootWidth;
    }
}


function colorHomeChevron() {
    let fullHeight = document.documentElement.scrollHeight;
    let boxHeight = document.documentElement.clientHeight;
    let scrolled = document.documentElement.scrollTop;
    let percentage = scrolled / Math.min(boxHeight, fullHeight - boxHeight);

    chevron!.style.opacity = Math.max(0, 1 - percentage * 1.1).toString();

    if (flies) {
        for (let fly of flies) {
            fly.style.opacity = Math.max(0, 1 - percentage * 2).toString();
        }
    }
}


function positionHomeChevron() {
    let title = document.querySelector(".hero-title");
    if (title === null) {return;}

    let rootHeight = document.documentElement.clientHeight;
    let bottom = title.getBoundingClientRect().bottom - document.documentElement.getBoundingClientRect().top;
    let height = chevron!.offsetHeight;
    chevron!.style.marginTop = Math.max(0, rootHeight - bottom - height * 2) + "px";

    colorHomeChevron();
}


function positionNotes(rootWidth: number, mainRight: number, fontSize: number) {
    let footnotes = document.querySelector(".footnotes");  //  Currently only one.
    if (footnotes === null) {return;}

    let sideWidth = rootWidth - mainRight - fontSize * 3.5;
    let sideLeft = mainRight + Math.max(fontSize * 2.5, Math.floor(sideWidth * 0.1));

    let smallFontSize = fontSize * 0.8125;  //  13
    let smallEms = Math.floor(sideWidth / smallFontSize);
    if (smallEms < 14) {
        sideWidth = 0;
        footnotes.classList.remove("all-sidenotes");
    } else {
        smallEms = Math.min(smallEms, 22);
        sideWidth = smallEms * smallFontSize;
        footnotes.classList.add("all-sidenotes");
    }

    let lastBottom = 0;
    let listItems = footnotes.querySelectorAll(`li[id^="fn"]`) as NodeListOf<HTMLElement>;
    for (let li of listItems) {
        if (sideWidth === 0) {
            li.classList.remove("sidenote");
            li.removeAttribute("style");
            continue;
        }

        let top = lastBottom;

        let backLink = li.querySelector("a.footnote-backref") as HTMLAnchorElement | null;
        if (backLink !== null) {
            let backTarget = document.querySelector(backLink.hash);
            if (backTarget !== null) {
                //  Reflow should be triggered at most once.
                //  `.all-sidenotes` is positioned absolutely, and won’t affect the main content.
                top = Math.max(top, backTarget.getBoundingClientRect().top + window.scrollY);
            }
        }

        li.classList.add("sidenote");  //  Also makes the note positioned absolutely.
        li.style.top = top + "px";
        li.style.left = sideLeft + "px";
        li.style.width = sideWidth + "px";
        lastBottom = top + li.offsetHeight;
    }
}
