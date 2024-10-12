(function () {
    if (document.readyState !== "loading") {
        initialize();
    } else {
        document.addEventListener("DOMContentLoaded", initialize);
    }

    if ("ResizeObserver" in window) {
        //  FIXME: Safari: ResizeObserver loop completed with undelivered notifications.
        let resizeObserver = new ResizeObserver(sizeContent);
        resizeObserver.observe(document.documentElement);
    } else {
        window.addEventListener("resize", sizeContent);
        window.addEventListener("orientationchange", sizeContent);
    }

    function initialize() {
        sizeContent();
    }

    function positionNotes(viewportWidth, mainRight, fontSize) {
        let footnotes = document.querySelector(".footnotes");  //  Currently only one.
        if (footnotes === null) {return;}

        let sideWidth = viewportWidth - mainRight - fontSize * 3.5;
        let sideLeft = mainRight + Math.max(fontSize * 2.5, Math.floor(sideWidth * 0.1));

        let smallFontSize = fontSize * 0.8125;  //  13
        let smallEms = Math.floor(sideWidth / smallFontSize);
        if (smallEms < 14) {
            sideWidth = 0;
        } else {
            smallEms = Math.min(smallEms, 22);
            sideWidth = smallEms * smallFontSize;
        }

        let lis = footnotes.querySelectorAll(`li[id^="fn"]`);
        let liTops = Array.prototype.map.call(lis, li => {
            if (sideWidth === 0) {return {li, top: NaN};}

            let backlink = li.querySelector("a.footnote-backref");
            if (backlink === null) {return {li, top: NaN};}

            let backtarget = document.querySelector(backlink.hash);
            if (backtarget === null) {return {li, top: NaN};}

            let top = backtarget.offsetTop;
            return {li, top};
        });

        let allSidenotes = true;
        let lastBottom = 0;
        for (let {li, top} of liTops) {
            if (isNaN(top)) {
                li.classList.remove("sidenote");
                li.removeAttribute("style");
                allSidenotes = false;
            } else {
                top = Math.max(top, lastBottom);
                li.classList.add("sidenote");
                li.style.position = "absolute";
                li.style.top = top + "px";
                li.style.left = sideLeft + "px";
                li.style.width = sideWidth + "px";
                lastBottom = top + li.offsetHeight;
            }
        }

        footnotes.classList.toggle("all-sidenotes", allSidenotes);
    }

    function sizeContent(args) {
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
        let times = ("ResizeObserverEntry" in window && args instanceof ResizeObserverEntry) ? 1 : 2;
        for (let i = 0; i < times; i++) {
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
            positionNotes(viewportWidth, mainRight, fontSize);
            prevViewportWidth = viewportWidth;
        }
    };
})();
