class Vector3 {
    constructor(X, Y, Z) {
        this.X = X;
        this.Y = Y;
        this.Z = Z;
    }

    static New(val) {
        return new Vector3(val, val, val);
    }

    add(other) {
        if (!(other instanceof Vector3)) {
            throw new Error("Invalid input: add requires Vector3 parameter.");
        }
        return new Vector3(this.X + other.X, this.Y + other.Y, this.Z + other.Z);
    }

    subtract(other) {
        if (!(other instanceof Vector3)) {
            throw new Error("Invalid input: subtract requires Vector3 parameter.");
        }
        return new Vector3(this.X - other.X, this.Y - other.Y, this.Z - other.Z);
    }

    toString() {
        return `(${this.X}, ${this.Y}, ${this.Z})`;
    }

    /**
     * Returns a new Vector3 that is the component-wise minimum of two vectors.
     * Equivalent to C#'s Vector3.Min.
     * @param {Vector3} v1 - The first vector.
     * @param {Vector3} v2 - The second vector.
     * @returns {Vector3} - A new vector with the minimum components.
     */
    static minNumber(v1, v2) {
        if (!(v1 instanceof Vector3) || !(v2 instanceof Vector3)) {
            throw new Error("Vector3.minNumber requires two Vector3 instances as arguments.");
        }
        return new Vector3(
            Math.min(v1.X, v2.X),
            Math.min(v1.Y, v2.Y),
            Math.min(v1.Z, v2.Z)
        );
    }

    /**
     * Returns a new Vector3 that is the component-wise maximum of two vectors.
     * Equivalent to C#'s Vector3.Max.
     * @param {Vector3} v1 - The first vector.
     * @param {Vector3} v2 - The second vector.
     * @returns {Vector3} - A new vector with the maximum components.
     */
    static maxNumber(v1, v2) {
        if (!(v1 instanceof Vector3) || !(v2 instanceof Vector3)) {
            throw new Error("Vector3.maxNumber requires two Vector3 instances as arguments.");
        }
        return new Vector3(
            Math.max(v1.X, v2.X),
            Math.max(v1.Y, v2.Y),
            Math.max(v1.Z, v2.Z)
        );
    }
}
export default Vector3;
