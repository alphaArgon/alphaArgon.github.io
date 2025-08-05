/*
 *  _preprocess/sources/slideshow.ts
 *  alphaArgon.github.io
 *
 *  Created by alpha on 2025/7/31.
 *  Copyright © 2025 alphaArgon.
 */

import { setElementWantsHostedMouseEvents } from "./event";
import { initializeScroller } from "./scroller";


let globalSlideshow: SlideshowContext | null = null;
const fadeInDuration: number = 550;
const fadeOutDuration: number = 450;


export function beginSlideshow(search: Element, body: Element, animated: boolean, endingAction: (() => void) | null): void {
    if (globalSlideshow === null) {
        globalSlideshow = new SlideshowContext();
    }
    globalSlideshow.begin(search, body, animated, endingAction);
}


export function endSlideshow(animated: boolean): void {
    if (globalSlideshow === null) {return;}
    globalSlideshow.end(animated);
}


const enum Visibility {
    hidden, showing, shown, hiding,
}


type SafeDOMRect = {
    readonly top: number,
    readonly left: number,
    readonly width: number,
    readonly height: number,
};


class SlideshowContext {

    private readonly root: HTMLElement;

    private readonly wrapper: HTMLElement;
    private readonly title: HTMLElement;
    private readonly meta: HTMLElement;
    private readonly body: HTMLElement;
    private readonly transImage: HTMLImageElement;

    private readonly updateScroller: () => void;

    private visibility: Visibility;
    private sourceImage: HTMLImageElement | null;
    private requestedFrame: number | null;
    private transitionTimer: number | null;

    private endingAction: (() => void) | null;

    public constructor() {
        this.root = document.createElement("aside");
        this.root.className = "slideshow";

        this.root.innerHTML =
            `<div class="slideshow-wrapper">` +
                `<div class="slideshow-content">` +
                    `<header class="slideshow-header">` +
                        `<button class="slideshow-exit"></button>` +
                        `<h1 class="slideshow-title"></h1>` +
                        `<div class="slideshow-meta"></div>` +
                    `</header>` +
                    `<main class="slideshow-body"></main>` +
                    `<aside class="slideshow-scroller">` +
                        `<button class="slideshow-scroller-knob"></button>` +
                    `</aside>` +
                `</div>` +
                `<img class="slideshow-transimage">` +
            `</div>`;

        this.wrapper = this.root.querySelector(".slideshow-wrapper")!;

        this.title = this.root.querySelector(".slideshow-title")!;
        this.meta = this.root.querySelector(".slideshow-meta")!;
        this.body = this.root.querySelector(".slideshow-body")!;
        this.transImage = this.root.querySelector(".slideshow-transimage")!;

        this.updateScroller = initializeScroller(
            this.body, this.root.querySelector(".slideshow-scroller-knob")!,
            "horizontal", pseudoSumWidth,
        );

        this.visibility = Visibility.hidden;
        this.sourceImage = null;
        this.requestedFrame = null;
        this.transitionTimer = null;

        this.endingAction = null;

        let makeHoriWheel = false;
        let lastWheelTime = -Infinity;
        this.body.addEventListener("wheel", event => {
            if (event.timeStamp - lastWheelTime > 80) {
                makeHoriWheel = Math.abs(event.deltaY) > Math.abs(event.deltaX);
            }

            if (makeHoriWheel) {
                this.body.scrollLeft += event.deltaY;
                event.preventDefault();
            }

            lastWheelTime = event.timeStamp;
        });

        let mouseDownAt: [number, number] | null = null;
        setElementWantsHostedMouseEvents(this.wrapper, true);

        this.wrapper.addEventListener("red.argon.mouseDown", event => {
            mouseDownAt = null;

            let first = true;
            let canExit = true;
            let element = event.leafTarget as HTMLElement | null;
            while (element !== null && element !== this.root) {
                let classList = element.classList;
                if (classList.contains("slideshow-exit")) {break;}
                if (classList.contains("slideshow-title")) {canExit = false; break;}
                if (classList.contains("slideshow-meta")) {canExit = false; break;}
                if (classList.contains("work-slide-image")) {canExit = false; break;}
                if (classList.contains("slideshow-scroller")) {canExit = false; break;}
                if (!first && classList.contains("work-slide-title")) {canExit = false; break;}
                element = element.parentElement;
                first = false;
            }

            if (!canExit) {
                event.preventDefault();
            } else {
                mouseDownAt = [event.screenX, event.screenY];
            }
        });

        this.wrapper.addEventListener("red.argon.mouseUp", event => {
            if (mouseDownAt === null) {return;}
            
            let [x, y] = [event.screenX, event.screenY];
            if (Math.hypot(x - mouseDownAt[0], y - mouseDownAt[1]) < 4) {
                if (this.endingAction !== null) {
                    this.endingAction();
                }
                this.end(true);
            }
        });

        this.wrapper.addEventListener("keydown", event => {
            if (event.key === "Escape") {
                event.stopPropagation();
                if (this.endingAction !== null) {
                    this.endingAction();
                }
                this.end(true);
            }
        });

        window.addEventListener("red.argon.pageLayout", this.updateScroller);
    }

    public begin(search: Element, body: Element, animated: boolean, endingAction: (() => void) | null): void {
        this.endingAction = endingAction;

        let image = search.querySelector(`.work-entry-image`) as HTMLImageElement | null;
        let title = search.querySelector(`.work-entry-title`);
        let meta = search.querySelector(`.work-entry-meta`);

        this.switchSourceImage(image);
        this.title.innerHTML = title === null ? "" : title.innerHTML;
        this.meta.innerHTML = meta === null ? "" : meta.innerHTML;
        this.body.innerHTML = body.innerHTML;

        switch (this.visibility) {
        case Visibility.hidden:
            document.body.appendChild(this.root);

            //  Fall through.
        case Visibility.hiding:
            this.root.classList.remove("animating");

            if (this.requestedFrame !== null) {
                cancelAnimationFrame(this.requestedFrame);
                this.requestedFrame = null;
            }

            if (this.transitionTimer !== null) {
                clearTimeout(this.transitionTimer);
                this.transitionTimer = null;
            }

            if (!animated) {
                if (image !== null) {
                    image.style.visibility = "hidden";
                }

                this.visibility = Visibility.shown;
                break;
            }

            this.visibility = Visibility.showing;
            this.root.classList.add("out");

            this.requestedFrame = requestAnimationFrame(() => {
                this.requestedFrame = null;

                if (this.sourceImage !== null) {
                    this.transformWrapperTo(this.sourceImage);
                }

                //  Safari has a delay on <img> even if the resource is already loaded.
                //  Therefore here we use `setTimeout` instead of `requestAnimationFrame`.
                this.transitionTimer = setTimeout(() => {
                    this.root.classList.add("animating");
                    this.root.classList.remove("out");
                    this.transformWrapperTo(null);

                    if (this.sourceImage !== null) {
                        this.sourceImage.style.visibility = "hidden";
                    }

                    this.transitionTimer = setTimeout(() => {
                        this.transitionTimer = null;
                        this.root.classList.remove("animating");
                        this.visibility = Visibility.shown;
                    }, fadeInDuration - 60);
                }, 50);
            });

            break;

        case Visibility.showing:
        case Visibility.shown:
            if (this.sourceImage !== null) {
                this.sourceImage.style.visibility = "hidden";
            }
            break;
        }

        this.updateScroller();
    }

    public end(animated: boolean): void {
        this.endingAction = null;

        switch (this.visibility) {
        case Visibility.hidden:
        case Visibility.hiding:
            break;

        case Visibility.shown:
        case Visibility.showing:
            this.root.classList.remove("animating");

            if (this.requestedFrame !== null) {
                cancelAnimationFrame(this.requestedFrame);
                this.requestedFrame = null;
            }

            if (this.transitionTimer !== null) {
                clearTimeout(this.transitionTimer);
                this.transitionTimer = null;
            }

            if (!animated) {
                this.switchSourceImage(null);
                this.visibility = Visibility.hidden;
                this.root.remove();
                return;
            }

            this.visibility = Visibility.hiding;
            this.root.classList.add("animating");

            if (this.sourceImage !== null) {
                this.transformWrapperTo(this.sourceImage);
            }

            this.root.classList.add("out");

            this.transitionTimer = setTimeout(() => {
                this.transitionTimer = null;
                this.root.classList.remove("animating");
                this.root.classList.remove("out");
                this.visibility = Visibility.hidden;
                this.root.remove();
                this.transformWrapperTo(null);
                this.switchSourceImage(null);
            }, fadeOutDuration);

            break;
        }
    }

    private transformWrapperTo(element: HTMLElement | null): void {
        if (element === null) {
            this.wrapper.style.transform = "";
            return;
        }

        let fromRect = element.getBoundingClientRect() as SafeDOMRect;
        let toRect = this.transImage.getBoundingClientRect() as SafeDOMRect;

        //  In case of a transition is running.
        let match = getComputedStyle(this.wrapper).transform.match(/^matrix\((.+),(.+),(.+),(.+),(.+),(.+)\)$/);
        let [a, _b, _c, d, tx, ty] = match === null ? [1, 0, 0, 1, 0, 0] : match.slice(1).map(parseFloat);

        toRect = {
            top: toRect.top / d - ty / d,
            left: toRect.left / a - tx / a,
            width: toRect.width / a,
            height: toRect.height / d,
        };

        let sourceRect = this.root.getBoundingClientRect() as SafeDOMRect;
        let ox = sourceRect.left;
        let oy = sourceRect.top;

        let scale = fromRect.width / toRect.width;
        let dx = (fromRect.left - ox) - (toRect.left - ox) * scale;
        let dy = (fromRect.top - oy) - (toRect.top - oy) * scale;

        this.wrapper.style.transform = `matrix(${scale}, 0, 0, ${scale}, ${dx}, ${dy})`;
        this.wrapper.style.transformOrigin = "top left";
    }

    private switchSourceImage(image: HTMLImageElement | null): void {
        if (this.sourceImage !== null) {
            this.sourceImage.style.visibility = "";
            this.sourceImage = null;
        }

        if (image !== null) {
            this.sourceImage = image;
        }

        this.transImage.src = image?.getAttribute("src") ?? "";
    }
}


function pseudoSumWidth(element: HTMLElement) {
    let before = parseFloat(getComputedStyle(element, "::before").width);
    let after = parseFloat(getComputedStyle(element, "::after").width);
    let width = before + after;
    return width === width ? width : 0;
}
