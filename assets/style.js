const nextTickDo = (function () {
    if ("queueMicrotask" in window) {
        return queueMicrotask;
    }

    if ("Promise" in window) {
        return function (callback) {Promise.resolve().then(callback);}
    }

    return function (callback) {setTimeout(callback, 0);}
})();

(function () {
    if (document.readyState !== "loading") {
        initializeCallback();
    } else {
        document.addEventListener("DOMContentLoaded", initializeCallback);
    }

    function initializeCallback() {
        relayoutCallback();

        if ("ResizeObserver" in window) {
            //  It’s also possible to add `ResizeObserver` to other elements that may affect the layout,
            //  or footnote back targets, but that’s too massive. The page is basically static.
            //  FIXME: Safari: ResizeObserver loop completed with undelivered notifications.
            let resizeObserver = new ResizeObserver(relayoutCallback);
            resizeObserver.observe(document.documentElement);
        } else {
            window.addEventListener("resize", relayoutCallback);
            window.addEventListener("orientationchange", relayoutCallback);
        }

        //  Images loading may affect the layout. Capture all `load` events.
        document.addEventListener("load", () => {
            setTimeout(relayoutCallback, 0);  //  Not sure if the layout is done by now.
        }, true);
    }

    let _layoutPageRequested = 0;
    function relayoutCallback(arg) {
        if (!_layoutPageRequested) {
            nextTickDo(() => {
                _sizeContent(_layoutPageRequested);
                _layoutPageRequested = 0;
            });
        }

        let times = ("ResizeObserverEntry" in window && arg instanceof ResizeObserverEntry) ? 1 : 2;
        _layoutPageRequested = Math.max(_layoutPageRequested, times);
    }

    function _sizeContent(times = 1) {
        let main = document.querySelector(".main");
        if (main === null) {return;}

        let siteBadge = main.querySelector(".site-badge");
        if (siteBadge === null) {return;}

        let banner = document.querySelector(".page-banner-image");
        let root = document.documentElement;
        let rootStyle = getComputedStyle(root);
        let mainStyle = getComputedStyle(main);
        let siteBadgeStyle = getComputedStyle(siteBadge);

        let prevViewportWidth = NaN;
        for (let i = 0; i < times; ++i) {
            let viewportWidth = root.clientWidth;
            if (prevViewportWidth === viewportWidth) {break;}

            let fontSize = parseFloat(rootStyle.fontSize);  //  16
            let maxEms = 40;

            let mainPaddingLeft = parseFloat(mainStyle.paddingLeft);
            let mainPaddingRight = parseFloat(mainStyle.paddingRight);
            let mainWidth = viewportWidth - mainPaddingLeft - mainPaddingRight;
            let mainMarginLeft = 0;
            let bannerExtension = 0;
            let bannerWidth = 0;

            //  The `display` property of the site badge is controlled by CSS media queries.
            //  The defination of `max-width` may not be based on the viewport width. For example,
            //  Safari is not consistent with Chrome and Firefox in the calculation of `max-width`.
            //  Therefore, We should not rely on `viewportWidth` to determine the layout.
            let isCompactLayout = siteBadgeStyle.display === "none";

            if (!isCompactLayout) {
                let sidebarWidth = Math.max(280, Math.floor(viewportWidth * 0.24));
                root.style.setProperty("--sidebar-width", sidebarWidth + "px");

                mainWidth -= sidebarWidth;
                mainWidth = Math.min(Math.floor(mainWidth / fontSize), maxEms) * fontSize;
                main.style.width = mainWidth + "px";
                main.style.maxWidth = "none";

                mainMarginLeft = Math.round((viewportWidth - mainWidth) / 2);
                mainMarginLeft = Math.max(mainMarginLeft, sidebarWidth);
                main.style.marginLeft = mainMarginLeft + "px";

                bannerExtension = mainPaddingLeft + mainMarginLeft - sidebarWidth;
                bannerWidth = viewportWidth - sidebarWidth;

            } else {
                root.style.setProperty("--sidebar-width", "0");

                mainWidth = Math.min(Math.floor(mainWidth / fontSize), maxEms) * fontSize;
                main.style.width = mainWidth + "px";
                main.style.maxWidth = "none";

                mainMarginLeft = Math.round((viewportWidth - mainWidth - mainPaddingLeft - mainPaddingRight) / 2);
                main.style.marginLeft = mainMarginLeft + "px";

                bannerExtension = mainPaddingLeft + mainMarginLeft;
                bannerWidth = viewportWidth;
            }

            if (banner !== null) {
                banner.style.marginLeft = -bannerExtension + "px";
                banner.style.width = bannerWidth + "px";
            }

            let mainRight = mainMarginLeft + mainPaddingLeft + mainWidth;  //  No padding-right.
            _positionNotes(viewportWidth, mainRight, fontSize);
            prevViewportWidth = viewportWidth;
        }
    };

    function _positionNotes(viewportWidth, mainRight, fontSize) {
        let footnotes = document.querySelector(".footnotes");  //  Currently only one.
        if (footnotes === null) {return;}

        let sideWidth = viewportWidth - mainRight - fontSize * 3.5;
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
        footnotes.querySelectorAll(`li[id^="fn"]`).forEach(li => {
            if (sideWidth === 0) {
                li.classList.remove("sidenote");
                li.removeAttribute("style");
                return;
            }

            let top = lastBottom;

            let backLink = li.querySelector("a.footnote-backref");
            if (backLink !== null) {
                let backTarget = document.querySelector(backLink.hash);
                if (backTarget !== null) {
                    //  Reflow should be triggered at most once.
                    //  `.all-sidenotes` is positioned absolutely, and won’t affect the main content.
                    top = Math.max(top, backTarget.offsetTop);
                }
            }

            li.classList.add("sidenote");  //  Also makes the note positioned absolutely.
            li.style.top = top + "px";
            li.style.left = sideLeft + "px";
            li.style.width = sideWidth + "px";
            lastBottom = top + li.offsetHeight;
        });
    }
})();
