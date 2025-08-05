/*
 *  _preprocess/sources/works.ts
 *  alphaArgon.github.io
 *
 *  Created by alpha on 2025/7/30.
 *  Copyright © 2025 alphaArgon.
 */

import { withDOMContentLoaded } from "./event";
import { sizeMainContent } from "./layout";
import { addWBRsToInlineCode } from "./wbr";
import { beginSlideshow, endSlideshow } from "./slideshow";


function beginSlideshowForHash(animated: boolean): boolean {
    let anchor = document.querySelector(`a[href="${location.hash}"]`);
    if (anchor === null) {return false;}

    let body = document.querySelector(`[data-slideshow-for="${location.hash}"]`);
    if (body === null) {return false;}

    beginSlideshow(anchor, body, animated, resetHash);
    return true;
}


withDOMContentLoaded(() => {
    beginSlideshowForHash(false);

    let main = document.querySelector(".main");
    if (main !== null) {
        addWBRsToInlineCode(main);
    }
});


window.addEventListener("red.argon.pageLayout", sizeMainContent);


let prevURLHasHash = false;

window.addEventListener("hashchange", event => {
    if (beginSlideshowForHash(true)) {
        prevURLHasHash = event.oldURL.includes("#");
    } else {
        endSlideshow(true);
    }
});


function resetHash() {
    let url = location.href;
    let index = url.indexOf("#");
    if (index === -1) {return;}

    if (prevURLHasHash) {
        history.pushState(history.state, "", url.substring(0, index));
    } else {
        history.back();
    }
    prevURLHasHash = false;
}
