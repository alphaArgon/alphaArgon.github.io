/*
 *  _preprocess/js/works.ts
 *  alphaArgon.github.io
 *
 *  Created by alpha on 2025/7/30.
 *  Copyright © 2025 alphaArgon.
 */

import { withDOMContentLoaded } from "./event";
import { sizeMainContent } from "./layout";
import { addWBRsToInlineCode } from "./wbr";
import { beginSlideshow, endSlideshow } from "./slideshow";
import { spacePuncInElement } from "./punctuation";


window.addEventListener("red.argon.pageLayout", sizeMainContent);


function beginSlideshowForHash(hash: string, animated: boolean): boolean {
    let anchor = document.querySelector(`a[href="${hash}"]`);
    if (anchor === null) {return false;}

    let body = document.querySelector(`[data-slideshow-for="${hash}"]`);
    if (body === null) {return false;}

    beginSlideshow(anchor, body, animated, userExitSlideshow);
    return true;
}


withDOMContentLoaded(() => {
    spacePuncInElement(document.body);
    beginSlideshowForHash(location.hash, false);

    let main = document.querySelector(".main");
    if (main !== null) {
        addWBRsToInlineCode(main);
    }
});


window.addEventListener("hashchange", () => {
    if (!beginSlideshowForHash(location.hash, true)) {
        endSlideshow(true);
    }
});


window.addEventListener("click", event => {
    let element = event.target as HTMLElement | null;
    while (element !== null && element.tagName !== "A") {
        element = element.parentElement;
    }

    if (element === null) {return;}

    //  On mobile browsers `hashchange` will trigger the location bar showing.
    let href = element.getAttribute("href");
    if (href !== null && href[0] === '#' && beginSlideshowForHash(href, true)) {
        event.preventDefault();
        let hasHash = location.href.includes('#');
        let full = (element as HTMLAnchorElement).href;
        history.pushState({isPrevURLBare: !hasHash}, "", full);
    }
});


function userExitSlideshow() {
    let url = location.href;
    let index = url.indexOf("#");
    if (index === -1) {return;}

    if (history.state && history.state.isPrevURLBare) {
        let {scrollTop, scrollLeft} = document.documentElement;
        history.back();

        doAndDo(() => {
            document.documentElement.scrollTo({
                top: scrollTop,
                left: scrollLeft,
                behavior: "instant",
            });
        });

    } else {
        history.pushState({isPrevURLBare: false}, "", url.substring(0, index));
    }
}


function doAndDo(body: () => void) {
    body();
    requestAnimationFrame(body);
    setTimeout(body, 0);
}
