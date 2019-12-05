export const kIsNotArrayIndexMask = 1 << 1;
export const kNofHashBitFields = 2;

export const kHashShift = kNofHashBitFields;

export const kHashBitMask = 0xffffffff >> kHashShift;

export const kArrayIndexValueBits = 24;

export const kMaxArrayIndexSize = 10;

export const kMaxHashCalcLength = 16383;

export const kZeroHash = 27;

export const ArrayIndexValueBits_kShift = kNofHashBitFields; // 2
export const ArrayIndexLengthBits_kShift = kNofHashBitFields + kArrayIndexValueBits; // 26

const kIntSize = 4; // sizeof(int);
const kBitsPerByte = 8;
const kBitsPerInt = kIntSize * kBitsPerByte;
export const kArrayIndexLengthBits = kBitsPerInt - kArrayIndexValueBits - kNofHashBitFields;