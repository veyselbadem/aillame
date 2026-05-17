export interface SchemaDefinition {
  id: string;
  name: string;
  fields: Record<string, {
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    required?: boolean;
    items?: 'string' | 'number' | 'boolean' | 'object'; // For arrays
  }>;
}

export class SchemaRegistry {
  private static schemas: Map<string, SchemaDefinition> = new Map();

  static registerSchema(schema: SchemaDefinition) {
    this.schemas.set(schema.id, schema);
  }

  static getSchema(id: string): SchemaDefinition | undefined {
    return this.schemas.get(id);
  }

  static hasSchema(id: string): boolean {
    return this.schemas.has(id);
  }

  static listSchemas(): SchemaDefinition[] {
    return Array.from(this.schemas.values());
  }
}
