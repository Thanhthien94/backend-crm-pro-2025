// src/swagger/path-groups.ts
/**
 * @swagger
 * components:
 *   pathItems:
 *     StandardCRUD:
 *       get:
 *         summary: Get all {resource}
 *         tags: [{tag}]
 *         description: Retrieves a paginated list of {resource}
 *         security:
 *           - bearerAuth: []
 *         parameters:
 *           - $ref: '#/components/parameters/PageParam'
 *           - $ref: '#/components/parameters/LimitParam'
 *           - $ref: '#/components/parameters/SearchParam'
 *         responses:
 *           200:
 *             description: List of {resource}
 *             content:
 *               application/json:
 *                 schema:
 *                   type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     count:
 *                       type: integer
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/{schema}'
 *           401:
 *             $ref: '#/components/responses/UnauthorizedError'
 *       post:
 *         summary: Create a new {resource}
 *         tags: [{tag}]
 *         description: Creates a new {resource}
 *         security:
 *           - bearerAuth: []
 *         requestBody:
 *           $ref: '#/components/requestBodies/{resourceBody}'
 *         responses:
 *           201:
 *             description: {resource} created successfully
 *             content:
 *               application/json:
 *                 schema:
 *                   type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     data:
 *                       $ref: '#/components/schemas/{schema}'
 *           400:
 *             $ref: '#/components/responses/BadRequestError'
 *           401:
 *             $ref: '#/components/responses/UnauthorizedError'
 */