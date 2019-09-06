import {
  kNofHashBitFields, 
  kArrayIndexValueBits,
  kArrayIndexLengthBits,
} from "../enum";

/**
 * 这个类是一个模板类
 * template <class T, int shift, int size, class U = int>
 * class BitField {}
 */
const BitField = (shift, size) => {
  let kShift = shift;
  let kSize = size;
  let kMask = ((1 << kShift) << kSize) - (1 << kShift);
  let kNumValues = 1 << kSize;
  let kMax = kNumValues - 1;
  return {
    kNext: shift + size,
    encode(value) {
      return value << kShift;
    },
    update(previous, value) {
      return (previous & ~kMask) | this.encode(value);
    },
    decode(value) {
      return (value & kMask) >> kShift;
    }
  };
}

/**
 * shift =>0 size => 6
 * kMax => (1 << 6) - 1 => 1000000 - 1 => 111111
 * 当shift为0时 kMask === KMax
 * 当shift为2时 
 * kMask => ((1 << 6) << 2) - (1 << 2) => 100000000 - 100 => 11111100
 * 相当于kMax左移两位
 */
export const NodeTypeField = BitField(0, 6);

/**
 * 声明形式如下
 * 1.using xxxField = Statement::NextBitField<T, size>;
 * NextBitField会指向一个指定的Next方法中 T、size作为参数带入
 * 2.using xxxBitField = xxx::Next<T, size>
 * Next指向根类BitField的方法 => BitField<T, xxxkShift + xxxSize, size>
 * 转换成JS方法就是BitField(xxxkShift + xxxSize, size)
 * @example
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
export const TokenField = BitField(6, 8);

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
export const ArrayIndexValueBits = BitField(kNofHashBitFields + kArrayIndexValueBits, kArrayIndexLengthBits);

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
