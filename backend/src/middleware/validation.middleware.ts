import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../utils/errors.js';

type ValidationTarget = 'body' | 'query' | 'params';

/**
 * Generic validation middleware factory
 */
export const validate = (schema: ZodSchema, target: ValidationTarget = 'body') => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const dataToValidate = req[target];
      const validatedData = schema.parse(dataToValidate);

      // Replace request data with validated (and transformed) data
      req[target] = validatedData;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = formatZodErrors(error);
        next(new ValidationError({ errors: formattedErrors }));
      } else {
        next(error);
      }
    }
  };
};

/**
 * Validate request body
 */
export const validateBody = (schema: ZodSchema) => validate(schema, 'body');

/**
 * Validate request query parameters
 */
export const validateQuery = (schema: ZodSchema) => validate(schema, 'query');

/**
 * Validate request URL parameters
 */
export const validateParams = (schema: ZodSchema) => validate(schema, 'params');

/**
 * Format Zod validation errors into a user-friendly format
 */
const formatZodErrors = (error: ZodError): Record<string, string> => {
  const errors: Record<string, string> = {};

  error.errors.forEach((err) => {
    const path = err.path.join('.');
    if (!errors[path]) {
      errors[path] = err.message;
    }
  });

  return errors;
};

/**
 * Validate multiple schemas at once
 */
export const validateMultiple = (schemas: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const errors: Record<string, Record<string, string>> = {};

      if (schemas.body) {
        try {
          req.body = schemas.body.parse(req.body);
        } catch (error) {
          if (error instanceof ZodError) {
            errors.body = formatZodErrors(error);
          }
        }
      }

      if (schemas.query) {
        try {
          req.query = schemas.query.parse(req.query);
        } catch (error) {
          if (error instanceof ZodError) {
            errors.query = formatZodErrors(error);
          }
        }
      }

      if (schemas.params) {
        try {
          req.params = schemas.params.parse(req.params);
        } catch (error) {
          if (error instanceof ZodError) {
            errors.params = formatZodErrors(error);
          }
        }
      }

      if (Object.keys(errors).length > 0) {
        next(new ValidationError({ errors }));
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
