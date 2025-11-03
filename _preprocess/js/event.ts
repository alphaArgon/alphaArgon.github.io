/*
 *  _preprocess/js/event.ts
 *  alphaArgon.github.io
 *
 *  Created by alpha on 2025/7/31.
 *  Copyright © 2025 alphaArgon.
 */


declare global {

    interface GlobalEventHandlersEventMap {
        "red.argon.mouseDown": HostedMouseEvent;
        "red.argon.mouseDragged": HostedMouseEvent;
        "red.argon.mouseUp": HostedMouseEvent;
    }

    interface WindowEventMap {
        "red.argon.pageLayout": Event;
    }
}


export interface HostedMouseEvent extends MouseEvent {

    readonly leafTarget: EventTarget;
    /** @deprecated Always zero. */ readonly movementX: number;
    /** @deprecated Always zero. */ readonly movementY: number;
}


export function withDOMContentLoaded(callback: () => void): void {
    if (document.readyState !== "loading") {
        callback();
    } else {
        document.addEventListener("DOMContentLoaded", callback);
    }
}


/** Establishes an AppKit-like left mouse handling mechanism for the element. If the element doesn’t
  * accept the mouse session, that is, explicitly pass the event to its nearest ancestor who also
  * wants hosted mouse events, call `preventDefault` on the mouse down event. */
export function setElementWantsHostedMouseEvents(element: HTMLElement, accept: boolean): void {
    accept ? hostedElements.add(element) : hostedElements.delete(element);
}


let hostedElements: WeakSet<HTMLElement> = new WeakSet();

let activeHostedMouse: {
    readonly element: HTMLElement,
    readonly touchIdentifier: number | null,
    lastEvent: HostedMouseEvent,
} | null = null;


let nonpassive = {passive: false};

window.addEventListener("mousedown", hostedMouseDown, nonpassive);
window.addEventListener("touchstart", hostedMouseDown, nonpassive);


function hostedMouseDown(event: MouseEvent | TouchEvent): void {
    let touch: Touch | null;

    if ("button" in event) {
        if (event.button !== 0) {return;}
        touch = null;
    } else {
        let touches = event.touches;
        if (touches.length !== 1) {return;}
        touch = touches[0];
    }

    if (activeHostedMouse !== null && activeHostedMouse.element.isConnected) {
        releaseMouseWith(null);
    } else {
        abortlMouseWith(event);
    }

    let element = event.target as HTMLElement | null;
    while (element !== null) {
        if (hostedElements.has(element)) {
            let hostedEvent = touch === null
                ? makeHostedEvent("red.argon.mouseDown", event as MouseEvent, null)
                : makeHostedEvent("red.argon.mouseDown", event as TouchEvent, null, touch);
            element.dispatchEvent(hostedEvent);

            if (!hostedEvent.defaultPrevented) {
                activeHostedMouse = {
                    element: element,
                    touchIdentifier: touch === null ? null : touch.identifier,
                    lastEvent: hostedEvent,
                }

                event.preventDefault();
                event.stopPropagation();

                window.addEventListener("mousemove", hostedMouseMove, nonpassive);
                window.addEventListener("touchmove", hostedMouseMove, nonpassive);
                window.addEventListener("mouseup", hostedMouseUp, nonpassive);
                window.addEventListener("touchend", hostedMouseUp, nonpassive);
                window.addEventListener("touchcancel", hostedMouseUp, nonpassive);
                break;
            }
        }

        element = element.parentElement;
    }
}


function hostedMouseMove(event: MouseEvent | TouchEvent): void {
    if (activeHostedMouse === null) {return;}
    if (!activeHostedMouse.element.isConnected) {
        return abortlMouseWith(event);
    }

    event.preventDefault();
    event.stopPropagation();

    if ("button" in event) {
        if ((event.buttons & 1) === 0) {
            releaseMouseWith(event);
        } else {
            let hostedEvent = makeHostedEvent("red.argon.mouseDragged", event, activeHostedMouse.lastEvent);
            activeHostedMouse.element.dispatchEvent(hostedEvent);
            activeHostedMouse.lastEvent = hostedEvent;
        }
    } else {
        for (let touch of event.touches) {
            if (touch.identifier !== activeHostedMouse.touchIdentifier) {continue;}
            let hostedEvent = makeHostedEvent("red.argon.mouseDragged", event, activeHostedMouse.lastEvent, touch);
            activeHostedMouse.element.dispatchEvent(hostedEvent);
            activeHostedMouse.lastEvent = hostedEvent;
            return;
        }
        releaseMouseWith(null);
    }
}


function hostedMouseUp(event: MouseEvent | TouchEvent): void {
    if (activeHostedMouse === null) {return;}
    if (!activeHostedMouse.element.isConnected) {
        return abortlMouseWith(event);
    }

    event.preventDefault();
    event.stopPropagation();

    if ("button" in event) {
        if ((event.buttons & 1) === 0) {
            releaseMouseWith(event);
        }
    } else {
        for (let touch of event.touches) {
            if (touch.identifier === activeHostedMouse.touchIdentifier) {return;}
        }
        releaseMouseWith(null);
    }
}


function releaseMouseWith(event: MouseEvent | null) {
    let event_ = event === null ? activeHostedMouse!.lastEvent : event;
    let hostedEvent = makeHostedEvent("red.argon.mouseUp", event_, activeHostedMouse!.lastEvent);
    activeHostedMouse!.element.dispatchEvent(hostedEvent);
    abortlMouseWith(event_);
}


function abortlMouseWith(event: MouseEvent | TouchEvent) {
    window.removeEventListener("mousemove", hostedMouseMove);
    window.removeEventListener("touchmove", hostedMouseMove);
    window.removeEventListener("mouseup", hostedMouseUp);
    window.removeEventListener("touchend", hostedMouseUp);
    window.removeEventListener("touchcancel", hostedMouseUp);
    activeHostedMouse = null;
}


function makeHostedEvent(type: string, event: MouseEvent, lastEvent: HostedMouseEvent | null): HostedMouseEvent;
function makeHostedEvent(type: string, event: TouchEvent, lastEvent: HostedMouseEvent | null, touch: Touch): HostedMouseEvent;
function makeHostedEvent(type: string, event: MouseEvent | TouchEvent, lastEvent: HostedMouseEvent | null, touch?: Touch): HostedMouseEvent {
    let locationSource: MouseEvent | Touch = touch === undefined ? event as MouseEvent : touch;
    let hostedEvent = new MouseEvent(type, {
        cancelable: true,
        bubbles: false,
        view: event.view,
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey,
        button: 0,  //  always left mouse.
        buttons: type === "red.argon.mouseUp" ? 0 : 1,  //  always left mouse.
        movementX: lastEvent === null ? 0 : locationSource.screenX - lastEvent.screenX,
        movementY: lastEvent === null ? 0 : locationSource.screenY - lastEvent.screenY,
        clientX: locationSource.clientX,
        clientY: locationSource.clientY,
        screenX: locationSource.screenX,
        screenY: locationSource.screenY,
    }) as HostedMouseEvent;

    (hostedEvent as any).leafTarget = "leafTarget" in event ? event.leafTarget : event.target;
    return hostedEvent;
}


if (("ResizeObserver" as string) in window) {
    //  It’s also possible to add `ResizeObserver` on other elements that may affect the layout,
    //  or footnote back targets, but too massive. The page is basically static.
    //  FIXME: Safari: ResizeObserver loop completed with undelivered notifications.
    let resizeObserver = new ResizeObserver(layoutPage);
    resizeObserver.observe(document.documentElement);
} else {
    window.addEventListener("resize", layoutPage);
    window.addEventListener("orientationchange", layoutPage);
}


function delayedLayoutPage() {
    requestAnimationFrame(layoutPage);
}

window.addEventListener("load", delayedLayoutPage);
document.addEventListener("load", delayedLayoutPage, true /* capture phase */);
document.addEventListener("error", event => {
    if (event.target instanceof Element) {
        delayedLayoutPage();
    }
}, true /* capture phase */);

if (document.fonts !== undefined) {
    document.fonts.addEventListener("loadingdone", delayedLayoutPage);
    document.fonts.ready.then(delayedLayoutPage);
}

if (document.readyState === "complete") {
    layoutPage();
}


let layoutRequested = false;

function layoutPage() {
    if (layoutRequested) {return;}
    layoutRequested = true;

    nextTickDo(() => {
        layoutRequested = false;
        let event = new Event("red.argon.pageLayout");
        window.dispatchEvent(event);
    });
}


const nextTickDo: ((callback: () => void) => void) = (function () {
    if ("queueMicrotask" in window) {
        return queueMicrotask;
    }

    if ("Promise" in window) {
        return function (callback) {Promise.resolve().then(callback);}
    }

    return function (callback) {setTimeout(callback, 0);}
})();
