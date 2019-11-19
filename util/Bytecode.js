import { 
  Bytecode_kJump, 
  Bytecode_kJumpIfJSReceiver,
  Bytecode_kSwitchOnSmiNoFeedback,
  Bytecode_kSwitchOnGeneratorState,
} from "../enum";

export const Bytecodes_IsJump = (bytecode) => bytecode >= Bytecode_kJump && bytecode <= Bytecode_kJumpIfJSReceiver;

export const Bytecodes_IsSwitch = (bytecode) => bytecode === Bytecode_kSwitchOnSmiNoFeedback || bytecode === Bytecode_kSwitchOnGeneratorState;