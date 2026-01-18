import { Scalar, CustomScalar } from '@nestjs/graphql';
import { Kind, ValueNode } from 'graphql';

type DecimalLike = { toString(): string };

// Note: Using a unique type hint to avoid conflicts with String type
@Scalar('Decimal')
export class DecimalScalar implements CustomScalar<string, DecimalLike> {
  description = 'Decimal custom scalar type';

  parseValue(value: unknown): DecimalLike {
    return { toString: () => String(value) };
  }

  serialize(value: unknown): string {
    return (value as DecimalLike).toString();
  }

  parseLiteral(ast: ValueNode): DecimalLike {
    if (
      ast.kind === Kind.STRING ||
      ast.kind === Kind.FLOAT ||
      ast.kind === Kind.INT
    ) {
      const strValue = ast.kind === Kind.STRING ? ast.value : String(ast.value);
      return { toString: () => strValue };
    }
    throw new Error('Decimal must be a string, float, or int');
  }
}
