/*
 *  _preprocess/sources/event.ts
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
}


export function withDOMContentLoaded(callback: () => void): void {
    if (document.readyState !== "loading") {
        callback();
    } else {
        document.addEventListener("DOMContentLoaded", callback);
    }
}


export function setElementWantsHostedMouseEvents(element: HTMLElement, accept: boolean): void {
    accept ? hostedElements.add(element) : hostedElements.delete(element);
}


let hostedElements: WeakSet<HTMLElement> = new WeakSet();
let activeHostedElement: HTMLElement | null = null;


window.addEventListener("mousedown", event => {
    if (event.button !== 0) {return;}
    if (activeHostedElement !== null && activeHostedElement.isConnected) {
        releaseMouseWith(event);
    }

    activeHostedElement = event.target as HTMLElement | null;
    while (activeHostedElement !== null) {
        if (hostedElements.has(activeHostedElement)) {
            let hostedEvent = makeHostedEvent(event, "red.argon.mouseDown");
            activeHostedElement.dispatchEvent(hostedEvent);

            if (!hostedEvent.defaultPrevented) {
                event.preventDefault();
                event.stopPropagation();
                window.addEventListener("mousemove", hostedMouseMove);
                window.addEventListener("mouseup", hostedMouseUp);
                break;
            }
        }
        activeHostedElement = activeHostedElement.parentElement;
    }
});


function hostedMouseMove(event: MouseEvent): void {
    if (activeHostedElement === null) {return;}
    if (!activeHostedElement.isConnected) {
        return cancelMouseWith(event);
    }

    event.preventDefault();
    event.stopPropagation();

    if ((event.buttons & 1) === 0) {
        releaseMouseWith(event);
    } else {
        let hostedEvent = makeHostedEvent(event, "red.argon.mouseDragged");
        activeHostedElement.dispatchEvent(hostedEvent);
    }
}


function hostedMouseUp(event: MouseEvent): void {
    if (activeHostedElement === null) {return;}
    if (!activeHostedElement.isConnected) {
        return cancelMouseWith(event);
    }

    event.preventDefault();
    event.stopPropagation();

    if ((event.buttons & 1) === 0) {
        releaseMouseWith(event);
    }
}


function releaseMouseWith(event: MouseEvent) {
    let hostedEvent = makeHostedEvent(event, "red.argon.mouseUp");
    activeHostedElement!.dispatchEvent(hostedEvent);
    cancelMouseWith(event);
}


function cancelMouseWith(event: MouseEvent) {
    window.removeEventListener("mousemove", hostedMouseMove);
    window.removeEventListener("mouseup", hostedMouseUp);
    activeHostedElement = null;
}


function makeHostedEvent(event: MouseEvent, type: string): HostedMouseEvent {
    let hostedEvent = new MouseEvent(type, {
        cancelable: true,
        bubbles: false,
        view: event.view,
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey,
        button: 0,  //  always left mouse.
        buttons: event.buttons,
        clientX: event.clientX,
        clientY: event.clientY,
        movementX: event.movementX,
        movementY: event.movementY,
        screenX: event.screenX,
        screenY: event.screenY,
    }) as any;

    hostedEvent.leafTarget = event.target;
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

document.addEventListener("load", () => {
    requestAnimationFrame(layoutPage);
}, true /* capture phase */);

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
