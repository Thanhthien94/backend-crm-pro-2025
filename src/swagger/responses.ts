// src/swagger/responses.ts
/**
 * @swagger
 * components:
 *   responses:
 *     UnauthorizedError:
 *       description: Không được phép truy cập (token không hợp lệ hoặc hết hạn)
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Error'
 *     
 *     ForbiddenError:
 *       description: Không có quyền truy cập vào tài nguyên này
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Error'
 *     
 *     NotFoundError:
 *       description: Tài nguyên không tồn tại
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Error'
 *     
 *     BadRequestError:
 *       description: Dữ liệu đầu vào không hợp lệ
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Error'
 *     
 *     InternalServerError:
 *       description: Lỗi máy chủ nội bộ
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Error'
 */