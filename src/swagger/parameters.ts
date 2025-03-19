// src/swagger/parameters.ts
/**
 * @swagger
 * components:
 *   parameters:
 *     PageParam:
 *       in: query
 *       name: page
 *       schema:
 *         type: integer
 *         default: 1
 *       description: Số trang
 *     
 *     LimitParam:
 *       in: query
 *       name: limit
 *       schema:
 *         type: integer
 *         default: 10
 *       description: Số lượng bản ghi trên mỗi trang
 *     
 *     SearchParam:
 *       in: query
 *       name: search
 *       schema:
 *         type: string
 *       description: Từ khóa tìm kiếm
 *     
 *     StatusParam:
 *       in: query
 *       name: status
 *       schema:
 *         type: string
 *         enum: [active, inactive]
 *       description: Lọc theo trạng thái
 *     
 *     CustomerTypeParam:
 *       in: query
 *       name: type
 *       schema:
 *         type: string
 *         enum: [lead, prospect, customer, churned]
 *       description: Lọc theo loại khách hàng
 *     
 *     DealStageParam:
 *       in: query
 *       name: stage
 *       schema:
 *         type: string
 *         enum: [lead, qualified, proposal, negotiation, closed-won, closed-lost]
 *       description: Lọc theo giai đoạn deal
 *     
 *     TaskPriorityParam:
 *       in: query
 *       name: priority
 *       schema:
 *         type: string
 *         enum: [low, medium, high]
 *       description: Lọc theo độ ưu tiên task
 *     
 *     TaskStatusParam:
 *       in: query
 *       name: status
 *       schema:
 *         type: string
 *         enum: [pending, in_progress, completed, canceled]
 *       description: Lọc theo trạng thái task
 *     
 *     AssignedToParam:
 *       in: query
 *       name: assignedTo
 *       schema:
 *         type: string
 *       description: Lọc theo người được giao
 *     
 *     IdParam:
 *       in: path
 *       name: id
 *       required: true
 *       schema:
 *         type: string
 *       description: ID của bản ghi
 */