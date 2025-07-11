class WaymarkMask {
    constructor(mask) {
        this.mask = mask;
    }

    isSet(pos) {
        return (this.mask & (1 << pos)) != 0;
    }
}
export default WaymarkMask;
