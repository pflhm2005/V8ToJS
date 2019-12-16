const builtin_count = 1478;

export const Builtins_IsBuiltinId = (maybe_id) => {
  return 0 <= maybe_id && maybe_id < builtin_count;
}