import {
  kNofHashBitFields, 
  kArrayIndexValueBits,
  kArrayIndexLengthBits,
} from "../enum";

/**
 * 这是bitmap的扩展 传统bitmap只能接受0或者1两种值
 * bitFiled扩展了bitmap的用法
 * 简单解释如下
 * shift => bit值偏移数
 * size => 当前field需要的空间
 * @example 假设目前有2个bitField代表统计班上的不同性别的成绩概况
 * // 1. 性别分为男、女 => 即只要一个bit位 => 男0女1
 * // 2. 成绩从1 - 100分 => 由于bit位是以2的幂递增 所以最少需要1 << 7的bit位
 * // 那么两个bitField的声明如下
 * let sexBitField = BitField(0, 1); // 偏移量为0 需要的size为1
 * let scoreBitField = BitField(1, 7) // 偏移量为1 需要的size为7
 * // 接下来根据BitField初始化bit值
 * // 1. 小a => 性别男 80分
 * let a = sexBitField.encode(0) | scoreBitField.encode(80); // 1010000 0
 * // 得到的值就保存了该同学的性别与成绩 其中第一位表示性别 其余7位代表成绩
 * // 获取bit中的性别值
 * sexBitField.decode(a);
 * // 更改bit中的成绩
 * scoreBitField.update(a, 90);
 * 
 * @end 整体用法与概念如上所示
 */

/**
 * 模板类
 * template <class T, int shift, int size, class U = int>
 * class BitField {}
 * @param {Number} shift 偏移位数
 * @param {Number} size 类型的枚举数量
 * 
 * @example
 * BitField(0, 6)
 * @description 相当于bitmap 总数量为 (1 << 6) - 1
 */
const BitField = (shift, size) => {
  let kShift = shift;
  let kSize = size;
  let kMask = ((1 << kShift) << kSize) - (1 << kShift);
  return {
    kShift,
    kSize,
    kMask,
    kNext: shift + size,
    encode(value) {
      return (value << kShift) >>> 0;
    },
    update(previous, value) {
      return ((previous & ~kMask) | this.encode(value)) >>> 0;
    },
    decode(value) {
      return ((value & kMask) >> kShift) >>> 0;
    }
  };
}

export const NodeTypeField = BitField(0, 6);

/**
 * 声明形式如下
 * 1.using xxxField = Statement::NextBitField<T, size>;
 * NextBitField会指向一个指定的Next方法中 T、size作为参数带入
 * 2.using xxxBitField = xxx::Next<T, size>
 * Next指向根类BitField的方法 => BitField<T, xxxkShift + xxxSize, size>
 * 转换成JS方法就是BitField(xxxkShift + xxxSize, size)
 * using TokenField = Statement::NextBitField<Token::Value, 8>;
 * @description
 * 1.Statement继承于AstNode
 * AstNode::NextBitField => NodeTypeField::Next<T, size>;
 * 2.NodeTypeField继承于BitField
 * BitField::Next => BitField<T2, kShift + kSize, size2, U>;
 * 即Statement::NextBitField = NodeTypeField::Next<T, size> = BitField<T2, kShift + kSize, size2, U>
 * T2与size2就是初始参数 而kShift+kSize取决于NodeTypeField本身 即0+6
 * 结果是 TokenField = BitField<Token::Value, 6, 8, U>
 * 转换成JS就是 TokenField = BitField(6, 8);
 * 快速解析
 * 1.Statement::NextBitField<T, size> => BitField<T, 6, size, U>
 * 2.xxx::NextBitField<T, size> => BitField<T, xxxkShift + xxxSize, size, U>
 */

/**
 * using TokenField = Statement::NextBitField<Token::Value, 8>;
 */
export const SloppyBlockFunctionStatementTokenField = BitField(6, 8);

/**
 * using BreakableTypeField = Statement::NextBitField<BreakableType, 1>;
 */
export const BreakableTypeField = BitField(6, 1);
/**
 * BreakableStatement::NextBitField = BreakableTypeField::Next<T, size>;
 * using IgnoreCompletionField = BreakableStatement::NextBitField<bool, 1>;
 */
export const IgnoreCompletionField = BitField(7, 1);
/**
 * using IsLabeledField = IgnoreCompletionField::Next<bool, 1>;
 */
export const IsLabeledField = BitField(8, 1);

/**
 * using IsParenthesizedField = AstNode::NextBitField<bool, 1>;
 */
export const IsParenthesizedField = BitField(6, 1);

export const IsPrefixField = BitField(7, 1);
export const CountOperationTokenField = BitField(8, 7);

export const AssignmentTokenField = BitField(7, 7);
export const AssignmentLookupHoistingModeField = BitField(8, 1);

export const TypeField = BitField(7, 4);

export const OperatorField = BitField(7, 7);

/**
 * using IsAssignedField = Expression::NextBitField<bool, 1>;
 * using NextBitField = IsParenthesizedField::Next<T, size>;
 * 依次向下
 */
export const IsAssignedField = BitField(7, 1);
export const IsResolvedField = BitField(8, 1);
export const IsRemovedFromUnresolvedField = BitField(9, 1);
export const IsNewTargetField = BitField(10, 1);
export const HoleCheckModeField = BitField(11, 1);

/**
 * using ArrayIndexValueBits = BitField<unsigned int, kNofHashBitFields, kArrayIndexValueBits>;
 * using ArrayIndexLengthBits = BitField<unsigned int, kNofHashBitFields + kArrayIndexValueBits, kArrayIndexLengthBits>;
 */
export const ArrayIndexValueBits = BitField(kNofHashBitFields, kArrayIndexValueBits);
export const ArrayIndexLengthBits = BitField(kNofHashBitFields + kArrayIndexValueBits, kArrayIndexLengthBits);

/**
 * using IsKeywordBits = BitField8<bool, 0, 1>;
 */
export const IsKeywordBits = BitField(0, 1);
export const IsPropertyNameBits = BitField(1, 1);


/**
 * ObjectLiteral
 * 
 * using HasElementsField = AggregateLiteral::NextBitField<bool, 1> = IsSimpleField::Next<T, size>;
 * using NeedsInitialAllocationSiteField = MaterializedLiteral::NextBitField<bool, 1>;
 * MaterializedLiteral(Expression)::NextBitField = IsParenthesizedField::Next<T, size>;
 * IsParenthesizedField = AstNode::NextBitField<bool, 1> = BitField(6, 1);
 */
export const NeedsInitialAllocationSiteField = BitField(7, 1);
export const IsSimpleField = BitField(8, 1);
export const HasElementsField = BitField(9, 1);
export const HasRestPropertyField = BitField(10, 1);
export const FastElementsField = BitField(11, 1);
export const HasNullPrototypeField = BitField(12, 1);

/**
 * 
 */
export const FunctionSyntaxKindBits = BitField(7, 3);
export const Pretenure = BitField(10, 1);
export const HasDuplicateParameters = BitField(11, 1);
export const DontOptimizeReasonField = BitField(12, 8);
export const RequiresInstanceMembersInitializer = BitField(20, 1);
export const HasBracesField = BitField(21, 1);
export const OneshotIIFEBit = BitField(22, 1);

export const VariableModeField = BitField(0, 4);
export const VariableKindField = BitField(4, 3);
export const LocationField = BitField(7, 3);
export const ForceContextAllocationField = BitField(10, 1);
export const IsUsedField = BitField(11, 1);
export const InitializationFlagField = BitField(12, 1);
export const ForceHoleInitializationField = BitField(13, 1);
export const MaybeAssignedFlagField = BitField(14, 1);
export const IsStaticFlagField = BitField(15, 1);

export const OnAbruptResumeField = BitField(7, 1);

export const ReturnStatementTypeField = BitField(6, 1);

export const IsPossiblyEvalField = BitField(7, 1);
export const IsTaggedTemplateField = BitField(8, 1);

/**
 * class
 */
export const HasNameStaticProperty = BitField(7, 1);
export const HasStaticComputedNames = BitField(8, 1);
export const IsAnonymousExpression = BitField(9, 1);
export const HasPrivateMethods = BitField(10, 1);

/**
 * runtime
 */
export const AllocateDoubleAlignFlag = BitField(0, 1);
export const AllowLargeObjectAllocationFlag = BitField(0, 1);
export const DeclareGlobalsEvalFlag = BitField(0, 1);

/**
 * Source-position
 */
export const IsExternalField = BitField(0, 1);
export const ExternalLineField = BitField(1, 20);
export const ExternalFileIdField = BitField(21, 10);

export const ScriptOffsetField = BitField(1, 30);
export const InliningIdField = BitField(31, 16);

export const MoreBit = BitField(7, 1);
export const ValueBits = BitField(0, 7);