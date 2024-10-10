(function () {
    if (document.readyState !== 'loading') {
        sizeContent();
    } else {
        document.addEventListener('DOMContentLoaded', sizeContent);
    }

    if ("ResizeObserver" in window) {
        //  FIXME: Safari: ResizeObserver loop completed with undelivered notifications.
        let resizeObserver = new ResizeObserver(sizeContent);
        resizeObserver.observe(document.documentElement);
    } else {
        window.addEventListener('resize', sizeContent);
        window.addEventListener('orientationchange', sizeContent);
    }

    function sizeContent() {
        let main = document.querySelector('.main');
        if (main === null) {return;}
        
        let banner = document.querySelector('.page-banner-image');
        let root = document.documentElement;
        let rootStyle = getComputedStyle(root);
        let mainStyle = getComputedStyle(main);

        let compactWidth = 960;
        let viewportWidth = root.clientWidth;

        let fontSize = parseFloat(rootStyle.fontSize);  //  16
        let maxEms = 42;

        let mainPaddingLeft = parseFloat(mainStyle.paddingLeft);
        let mainPaddingRight = parseFloat(mainStyle.paddingRight);
        let mainWidth = viewportWidth - mainPaddingLeft - mainPaddingRight;

        let bannerExtension = 0;
        let bannerWidth = 0;

        if (viewportWidth > compactWidth) {
            let sidebarWidth = Math.max(280, Math.floor(viewportWidth * 0.25));
            root.style.setProperty('--sidebar-width', sidebarWidth + 'px');

            mainWidth -= sidebarWidth;
            mainWidth = Math.min(Math.floor(mainWidth / fontSize), maxEms) * fontSize;
            main.style.width = mainWidth + 'px';

            let mainMarginLeft = Math.round((viewportWidth - mainWidth) / 2);
            mainMarginLeft = Math.max(mainMarginLeft, sidebarWidth);
            main.style.marginLeft = mainMarginLeft + 'px';

            bannerExtension = mainPaddingLeft + mainMarginLeft - sidebarWidth;
            bannerWidth = viewportWidth - sidebarWidth;

        } else {
            root.style.setProperty('--sidebar-width', '0');

            mainWidth = Math.min(Math.floor(mainWidth / fontSize), maxEms) * fontSize;
            main.style.width = mainWidth + 'px';

            let mainMarginLeft = Math.round((viewportWidth - mainWidth - mainPaddingLeft - mainPaddingRight) / 2);
            main.style.marginLeft = mainMarginLeft + 'px';

            bannerExtension = mainPaddingLeft + mainMarginLeft;
            bannerWidth = viewportWidth;
        }

        if (banner !== null) {
            banner.style.marginLeft = -bannerExtension + 'px';
            banner.style.width = bannerWidth + 'px';
        }
    };
})();
