import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import ApiError from '../utils/ApiError';

/**
 * Middleware factory validating Express request parts against Zod schemas
 */
export const validateRequest = (schema: ZodSchema) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = await schema.safeParseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      if (!parsed.success) {
        // Collect validation errors and form user-friendly field mappings
        const errorDetails = parsed.error.errors.map((err) => ({
          field: err.path.slice(1).join('.'), // Remove "body", "query", or "params" prefix
          message: err.message,
        }));
        
        throw new ApiError(422, 'Validation failed', errorDetails);
      }

      // Re-assign validated & coerced values back
      req.body = parsed.data.body;
      req.query = parsed.data.query;
      req.params = parsed.data.params;

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to parse flat multipart form data keys (e.g. visitor[name]) into nested structures.
 * Handles boolean coercion, number coercion, empty string cleanup, and bracket notation.
 */
export const parseMultipartForm = (req: Request, _res: Response, next: NextFunction): void => {
  if (!req.body || typeof req.body !== 'object') {
    return next();
  }

  const parsedBody: any = {};

  for (const [key, value] of Object.entries(req.body)) {
    // Skip array values (already parsed by multer for repeated fields like allowedGates)
    if (Array.isArray(value)) {
      parsedBody[key] = value;
      continue;
    }

    let coercedValue: any = value;

    // Coerce string booleans
    if (value === 'true') {
      coercedValue = true;
    } else if (value === 'false') {
      coercedValue = false;
    }

    // Convert empty strings to null for optional fields
    if (typeof value === 'string' && value.trim() === '') {
      coercedValue = null;
    }

    // Parse bracket notation: parent[child]
    const match = key.match(/^([^\[]+)\[([^\]]+)\]$/);
    if (match) {
      const parent = match[1];
      const child = match[2];

      // Coerce numeric fields inside nested objects
      if (child === 'plannedNights' && typeof value === 'string' && value.trim() !== '') {
        coercedValue = parseInt(value, 10);
      }

      // Re-apply empty string → null for nested fields too
      if (typeof value === 'string' && value.trim() === '') {
        coercedValue = null;
      }

      if (!parsedBody[parent]) {
        parsedBody[parent] = {};
      }
      parsedBody[parent][child] = coercedValue;
    } else {
      // Coerce top-level numeric fields
      if (key === 'plannedNights' && typeof value === 'string' && value.trim() !== '') {
        coercedValue = parseInt(value, 10);
      }
      parsedBody[key] = coercedValue;
    }
  }

  // Coerce allowedGates to array if it is a single string
  if (parsedBody.allowedGates && typeof parsedBody.allowedGates === 'string') {
    parsedBody.allowedGates = [parsedBody.allowedGates];
  } else if (!parsedBody.allowedGates) {
    parsedBody.allowedGates = [];
  }

  // Remove null fields from visitor/vehicleDetails/hostelDetails that are truly optional
  // This allows Zod .optional() validators to work correctly
  const cleanNulls = (obj: any) => {
    if (!obj || typeof obj !== 'object') return;
    for (const k of Object.keys(obj)) {
      if (obj[k] === null) {
        // Keep null - it's already handled by .nullable() in validators
      }
    }
  };
  cleanNulls(parsedBody.visitor);
  cleanNulls(parsedBody.vehicleDetails);
  cleanNulls(parsedBody.hostelDetails);

  req.body = parsedBody;
  next();
};

export default validateRequest;
