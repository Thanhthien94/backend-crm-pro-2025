# Swagger Documentation Guide

## Overview

This document provides guidance on using and maintaining the Swagger (OpenAPI) documentation for the CRM API. Our API documentation is automatically generated from code annotations and made available through a Swagger UI interface.

## Accessing the Swagger Documentation

### Development Environment

When running the server in development mode, the Swagger documentation is available at:

```
http://localhost:5000/api-docs
```

### Authentication in Swagger UI

Most API endpoints require authentication. To test these endpoints in Swagger UI:

1. First, execute the `/auth/login` endpoint to get a token
2. Click the "Authorize" button (🔒) at the top of the page
3. Enter your token in the format: `Bearer {your_token}`
4. For API Key authenticated endpoints, use the `x-api-key` header with your API key

## Structure

Our Swagger documentation is organized by the following resource types:

- **Auth**: Authentication endpoints
- **Users**: User management
- **Customers**: Customer data management
- **Deals**: Deal and opportunity management
- **Tasks**: Task management
- **Analytics**: Reporting and analytics
- **Organizations**: Organization settings
- **Custom Fields**: Custom field configuration
- **Export/Import**: Data export and import functionality
- **Webhooks**: Webhook configuration
- **API Keys**: API key management
- **External API**: External API endpoints (API key authenticated)

## Maintaining Documentation

### File Structure

- `src/config/swagger.ts`: Swagger configuration
- `src/swagger/schemas.ts`: Model definitions
- `src/routes/*.ts`: Route definitions with Swagger annotations

### Adding Documentation for New Endpoints

To document a new endpoint, add JSDoc comments in the routes file before the route declaration:

```javascript
/**
 * @swagger
 * /path/to/endpoint:
 *   http_method:
 *     summary: Brief description
 *     tags: [Tag Name]
 *     description: Detailed description
 *     parameters:
 *       - name: paramName
 *         in: path/query/header
 *         required: true/false
 *         schema:
 *           type: string/number/etc
 *     requestBody:
 *       required: true/false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SchemaName'
 *     responses:
 *       200:
 *         description: Success response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ResponseSchema'
 */
```

### Adding New Models/Schemas

To add a new model definition, extend the `src/swagger/schemas.ts` file with:

```javascript
/**
 * @swagger
 * components:
 *   schemas:
 *     YourModelName:
 *       type: object
 *       required:
 *         - requiredField1
 *         - requiredField2
 *       properties:
 *         property1:
 *           type: string
 *           description: Description of property1
 *         property2:
 *           type: number
 *           description: Description of property2
 *       example:
 *         property1: "Example value"
 *         property2: 100
 */
```

## Best Practices

1. **Keep Docs Updated**: Always update documentation when changing or adding API endpoints
2. **Provide Examples**: Include realistic examples in schema definitions
3. **Consistent Naming**: Use consistent naming conventions across API endpoints
4. **Comprehensive Descriptions**: Write clear descriptions for endpoints and parameters
5. **Document All Responses**: Document both success and error responses
6. **Reference Common Components**: Use `$ref` to reference common schemas and responses

## Testing Endpoints

When testing endpoints via Swagger UI:

1. Expand the endpoint you want to test
2. Click "Try it out"
3. Fill in required parameters
4. Click "Execute"
5. Review the response

## Exporting Documentation

Swagger UI allows you to export the documentation in various formats:

1. Click the "Export" button at the top of the page
2. Choose from export options like OpenAPI JSON or YAML

## Common Issues

- **Authentication Errors**: Ensure your token is properly formatted with `Bearer` prefix
- **Schema References**: If schema references (`$ref`) don't resolve, check for typos in schema names
- **Response Validation**: If responses don't match the documented schema, update either the code or the documentation to match

## Resources

- [OpenAPI Specification](https://swagger.io/specification/)
- [Swagger JSDoc Documentation](https://github.com/Surnet/swagger-jsdoc/blob/master/docs/GETTING-STARTED.md)
- [Swagger UI](https://swagger.io/tools/swagger-ui/)