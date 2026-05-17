import { SchemaRegistry, SchemaDefinition } from "./schema-registry.service";

export interface ValidationError {
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export class SchemaValidator {
  static validate(schemaId: string, data: any): ValidationResult {
    const schema = SchemaRegistry.getSchema(schemaId);
    if (!schema) {
      return {
        valid: false,
        errors: [{ path: "schema", message: `Schema not found: ${schemaId}` }]
      };
    }

    const errors: ValidationError[] = [];

    for (const [field, config] of Object.entries(schema.fields)) {
      const value = data[field];

      // Check required
      if (config.required && (value === undefined || value === null)) {
        errors.push({ path: field, message: `${field} is required.` });
        continue;
      }

      if (value === undefined || value === null) continue;

      // Check type
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== config.type) {
        errors.push({ path: field, message: `${field} must be of type ${config.type}, but got ${actualType}.` });
        continue;
      }

      // Check array items if applicable
      if (config.type === 'array' && config.items && Array.isArray(value)) {
        value.forEach((item, index) => {
          if (typeof item !== config.items) {
            errors.push({ path: `${field}[${index}]`, message: `${field} items must be of type ${config.items}.` });
          }
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
