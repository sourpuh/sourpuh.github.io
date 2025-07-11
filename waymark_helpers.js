import Waymark from "./waymark.js";

export function getWaymarkName(value) {
    switch (value) {
        case Waymark.A: return "A";
        case Waymark.B: return "B";
        case Waymark.C: return "C";
        case Waymark.D: return "D";
        case Waymark.One: return "1";
        case Waymark.Two: return "2";
        case Waymark.Three: return "3";
        case Waymark.Four: return "4";
        default: return "?";
    }
}

export function getWaymarkSize(value) {
    switch (value) {
        case Waymark.A:
        case Waymark.B:
        case Waymark.C:
        case Waymark.D:
            return 2.5;
        case Waymark.One:
        case Waymark.Two:
        case Waymark.Three:
        case Waymark.Four:
            return 2.2;
    }
}

export function getWaymarkBorderRadius(value) {
    switch (value) {
        case Waymark.A:
        case Waymark.B:
        case Waymark.C:
        case Waymark.D:
            return "50%";
        case Waymark.One:
        case Waymark.Two:
        case Waymark.Three:
        case Waymark.Four:
            return "0%";
    }
}

export function getWaymarkClass(value) {
    switch (value) {
        case Waymark.A:
        case Waymark.One:
            return "waymark-a1";
        case Waymark.B:
        case Waymark.Two:
            return "waymark-b2";
        case Waymark.Three:
        case Waymark.C:
            return "waymark-c3";
        case Waymark.Four:
        case Waymark.D:
            return "waymark-d4";
        default: return "";
    }
}