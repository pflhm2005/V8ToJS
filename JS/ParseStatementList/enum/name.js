export const kHashNotComputedMask = 1;
export const kIsNotArrayIndexMask = 1 << 1;
export const kNofHashBitFields = 2;
export const kHashShift = kNofHashBitFields;

export const kHashBitMask = 0xffffffff >> kHashShift;

export const kMaxCachedArrayIndexLength = 7;
export const kMaxArrayIndexSize = 10;
export const kArrayIndexValueBits = 24;