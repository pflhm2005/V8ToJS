export const REFLECT_APPLY_INDEX = 0;

export const SCOPE_INFO_INDEX = 0;
export const PREVIOUS_INDEX = 1;
export const EXTENSION_INDEX = 2;

//TODO
const JS_ARRAY_PACKED_SMI_ELEMENTS_MAP_INDEX = 50;

export const OPTIMIZED_CODE_LIST = 0;
export const DEOPTIMIZED_CODE_LIST = 1;
export const NEXT_CONTEXT_LINK = 2;
export const NATIVE_CONTEXT_SLOTS = 3;
export const FIRST_WEAK_SLOT = OPTIMIZED_CODE_LIST;
export const FIRST_JS_ARRAY_MAP_SLOT = JS_ARRAY_PACKED_SMI_ELEMENTS_MAP_INDEX;
export const MIN_CONTEXT_SLOTS = EXTENSION_INDEX;
export const MIN_CONTEXT_EXTENDED_SLOTS = EXTENSION_INDEX + 1;
export const THROWN_OBJECT_INDEX = MIN_CONTEXT_SLOTS;
export const WRAPPED_CONTEXT_INDEX = MIN_CONTEXT_EXTENDED_SLOTS;
export const BLACK_LIST_INDEX = MIN_CONTEXT_EXTENDED_SLOTS + 1;