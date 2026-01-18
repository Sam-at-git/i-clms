import { Scalar, CustomScalar } from '@nestjs/graphql';
import { Kind, ValueNode, ObjectValueNode, ListValueNode } from 'graphql';

@Scalar('JSON')
export class JSONScalar implements CustomScalar<unknown, unknown> {
  description = 'JSON custom scalar type';

  parseValue(value: unknown): unknown {
    return value;
  }

  serialize(value: unknown): unknown {
    return value;
  }

  parseLiteral(ast: ValueNode): unknown {
    switch (ast.kind) {
      case Kind.STRING:
        return ast.value;
      case Kind.INT:
        return parseInt(ast.value, 10);
      case Kind.FLOAT:
        return parseFloat(ast.value);
      case Kind.BOOLEAN:
        return ast.value;
      case Kind.NULL:
        return null;
      case Kind.LIST:
        return (ast as ListValueNode).values.map((v) => this.parseLiteral(v));
      case Kind.OBJECT:
        return (ast as ObjectValueNode).fields.reduce(
          (acc, field) => {
            acc[field.name.value] = this.parseLiteral(field.value);
            return acc;
          },
          {} as Record<string, unknown>
        );
      default:
        return null;
    }
  }
}
