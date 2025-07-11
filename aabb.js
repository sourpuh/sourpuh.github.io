import Vector3 from "./vector3.js";

class AABB {
    constructor(Min = Vector3.New(Number.MAX_VALUE), Max = Vector3.New(-Number.MAX_VALUE)) {
        this.Min = Min;
        this.Max = Max;
    }

    getCenter() {
        return new Vector3(
            (this.Min.X + this.Max.X) / 2,
            (this.Min.Y + this.Max.Y) / 2,
            (this.Min.Z + this.Max.Z) / 2,
        );
    }

    getLongAxisLength() {
        const diff = this.Max.subtract(this.Min);
        return Math.max(diff.X, diff.Z)
    };

    contains(v) {
        return v.X > this.Min.X &&
               v.Y > this.Min.Y &&
               v.Z > this.Min.Z &&
               v.X < this.Max.X &&
               v.Y < this.Max.Y &&
               v.Z < this.Max.Z;
    }

    add(v) {
        if (!(v instanceof Vector3)) {
            throw new Error("Invalid input: add requires Vector3 parameter.");
        }
        this.Min = Vector3.minNumber(this.Min, v);
        this.Max = Vector3.maxNumber(this.Max, v);
    }
}
export default AABB;
