/*
 *  _preprocess/sources/scroller.ts
 *  alphaArgon.github.io
 *
 *  Created by alpha on 2025/7/31.
 *  Copyright © 2025 alphaArgon.
 */

import { setElementWantsHostedMouseEvents } from "./event";


type ScrollAxisData = {hori: boolean, knobs: Set<HTMLElement>, inset: ((container: HTMLElement) => number) | null};
let scrollContainerBindings: WeakMap<HTMLElement, {update: () => void, axes: [hori: ScrollAxisData | null, vert: ScrollAxisData | null]}> = new WeakMap();


export function initializeScroller(
    container: HTMLElement, knob: HTMLElement,
    axis: "hori" | "horizontal" | "vert" | "vertical",
    insetGetter?: (container: HTMLElement) => number,
): () => void {
    let hori = axis[0] === "h";

    let containerBinding = scrollContainerBindings.get(container);
    if (containerBinding === undefined) {
        let axes: [hori: ScrollAxisData | null, vert: ScrollAxisData | null] = [null, null];
        let update = makeScrollContainerUpdater(container, axes);

        scrollContainerBindings.set(container, containerBinding = {axes, update});
        container.addEventListener("scroll", containerBinding.update, {passive: true});
        container.addEventListener("wheel", containerBinding.update, {passive: true});
        container.addEventListener("touchmove", containerBinding.update, {passive: true});
    }

    let axisData = containerBinding.axes[hori ? 0 : 1];
    if (axisData === null) {
        containerBinding.axes[hori ? 0 : 1] = axisData = {
            hori: hori,
            knobs: new Set(),
            inset: insetGetter === undefined ? null : insetGetter,
        };
    }

    axisData.knobs.add(knob);

    let track = knob.parentElement!;
    setElementWantsHostedMouseEvents(track, true);

    let handler = makeScrollTrackDraggingHandler(track, container, axisData);
    track.addEventListener("red.argon.mouseDown", handler);
    track.addEventListener("red.argon.mouseDragged", handler);
    track.addEventListener("red.argon.mouseUp", handler);

    containerBinding.update();
    return containerBinding.update;
}


function makeScrollContainerUpdater(container: HTMLElement, axes: [hori: ScrollAxisData | null, vert: ScrollAxisData | null]): () => void {
    let updateFrame: number | null = null;

    return () => {
        if (updateFrame !== null) {return;}
        updateFrame = requestAnimationFrame(() => {
            updateFrame = null;

            for (let axis of axes) {
                if (axis === null) {continue;}

                let locaData = scrollLocationDataOf(container, axis);

                for (let knob of axis.knobs) {
                    if (locaData[0] === locaData[1] && locaData[2] === 0) {
                        knob.style.visibility = "hidden";
                        continue;
                    }

                    let track = knob.parentElement!;
                    let trackSize = axis.hori ? track.clientWidth : track.clientHeight;
                    let {translate, size} = scrollerKnobFrameWith(locaData, trackSize);

                    knob.style.visibility = "";
                    if (axis.hori) {
                        knob.style.left = translate + "px";
                        knob.style.width = size + "px";
                    } else {
                        knob.style.top = translate + "px";
                        knob.style.height = size + "px";
                    }
                }
            }
        });
    };
}


function makeScrollTrackDraggingHandler(track: HTMLElement, container: HTMLElement, axis: ScrollAxisData): (event: MouseEvent) => void {
    let centerMinCoord = 0;
    let centerMaxCoord = 0;
    let maxScrollOffset = 0;

    return event => {
        switch (event.type) {
        case "red.argon.mouseDown":
            let trackBounds = track.getBoundingClientRect();
            let trackOrigin = axis.hori ? trackBounds.x : trackBounds.y;

            let locaData = scrollLocationDataOf(container, axis);
            maxScrollOffset = locaData[0] - locaData[1];

            let trackSize = axis.hori ? track.clientWidth : track.clientHeight;
            let {translate: knobOffset, size: knobSize} = scrollerKnobFrameWith(locaData, trackSize);

            centerMinCoord = trackOrigin + knobSize / 2;
            centerMaxCoord = trackOrigin + trackSize - knobSize / 2;

            let downAt = axis.hori ? event.clientX : event.clientY;
            let eccentric = trackOrigin + knobOffset + knobSize / 2 - downAt;
            if (Math.abs(eccentric) < knobSize / 2) {
                centerMinCoord -= eccentric;
                centerMaxCoord -= eccentric;
                break;
            }

            //  Fall through.
        case "red.argon.mouseDragged":
        case "red.argon.mouseUp":
            let coord = axis.hori ? event.clientX : event.clientY;
            let prop = (coord - centerMinCoord) / (centerMaxCoord - centerMinCoord);

            let scrollOffset = prop * maxScrollOffset;
            axis.hori
                ? container.scrollLeft = scrollOffset
                : container.scrollTop = scrollOffset;

            break;
        }
    };
}


function scrollLocationDataOf(container: HTMLElement, axis: ScrollAxisData): [fullSize: number, boxSize: number, offset: number] {
    let fullSize = axis.hori ? container.scrollWidth : container.scrollHeight;
    let boxSize = axis.hori ? container.clientWidth : container.clientHeight;
    let offset = axis.hori ? container.scrollLeft : container.scrollTop;

    if (axis.inset !== null) {
        let inset = axis.inset(container);
        fullSize -= inset;
        boxSize -= inset;
    }

    return [fullSize, boxSize, offset];
}


function scrollerKnobFrameWith(locaData: [fullSize: number, boxSize: number, offset: number], trackSize: number): {translate: number, size: number} {
    let [fullSize, boxSize, offset] = locaData;

    let prop: number;
    let loca: number;

    if (offset >= fullSize - boxSize) {
        prop = boxSize / (offset + boxSize);
        loca = 1;
    } else if (offset <= 0) {
        prop = boxSize / (fullSize - offset);
        loca = 0;
    } else {
        prop = boxSize / fullSize;
        loca = offset / (fullSize - boxSize);
    }

    const minKnobSize = 20;
    let knobSize = Math.min(trackSize, Math.max(minKnobSize, trackSize * prop));

    let restTrackSize = trackSize - knobSize;
    let knobOffset = loca * restTrackSize;

    return {
        translate: knobOffset,
        size: knobSize,
    };
}
