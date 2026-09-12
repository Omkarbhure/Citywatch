/**
 * Generic request validation middleware using Zod schemas.
 * 
 * Note on Zod error property access:
 * In Zod v4+, validation issue details are placed on `result.error.issues`, whereas older
 * versions or alternative wrappers place them on `result.error.errors`. We use a defensive
 * fallback (`result.error.issues ?? result.error.errors ?? []`) to prevent runtime TypeErrors
 * across different Zod releases while extracting field paths and messages.
 * 
 * @param {import('zod').ZodSchema} schema - The Zod validation schema
 * @param {'body' | 'query' | 'params'} [source='body'] - The property of req to validate
 * @returns {import('express').RequestHandler} Express middleware handler
 */
export const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const dataToValidate = req[source] ?? req.body;
    const result = schema.safeParse(dataToValidate);

    if (!result.success) {
      // Defensive property access across Zod versions (issues vs errors)
      const rawIssues = result.error.issues ?? result.error.errors ?? [];
      const formattedErrors = rawIssues.map((err) => ({
        field: Array.isArray(err.path) ? err.path.join('.') : String(err.path || ''),
        message: err.message
      }));

      return res.status(400).json({
        message: formattedErrors[0]?.message || 'Validation error',
        errors: formattedErrors
      });
    }

    req[source] = result.data;
    next();
  };
};

export default validate;
