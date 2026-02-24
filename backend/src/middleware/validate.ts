import { Request, Response, NextFunction } from "express";
import Joi from "joi";

/**
 * Express middleware factory that validates req.body against a Joi schema.
 * Returns 400 with the first validation error message on failure.
 */
export function validate(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: true,      // stop on first error
      stripUnknown: true,    // remove unknown fields
    });

    if (error) {
      const message = error.details[0].message;
      res.status(400).json({ message });
      return;
    }

    // Replace body with validated & sanitized value
    req.body = value;
    next();
  };
}
