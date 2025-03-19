/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - password
 *         - role
 *         - organization
 *       properties:
 *         _id:
 *           type: string
 *           description: User ID (auto-generated)
 *         name:
 *           type: string
 *           description: User's full name
 *         email:
 *           type: string
 *           description: User's email address
 *           format: email
 *         password:
 *           type: string
 *           description: User's hashed password (not returned in responses)
 *         role:
 *           type: string
 *           description: User's role
 *           enum: [user, admin, superadmin]
 *         organization:
 *           type: string
 *           description: Organization ID the user belongs to
 *         isActive:
 *           type: boolean
 *           description: Whether the user account is active
 *           default: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       example:
 *         _id: "60d21b4667d0d8992e610c85"
 *         name: "John Doe"
 *         email: "john@example.com"
 *         role: "admin"
 *         organization: "60d21b4667d0d8992e610c80"
 *         isActive: true
 *         createdAt: "2023-04-15T12:00:00Z"
 *         updatedAt: "2023-04-15T12:00:00Z"
 *     
 *     UserInput:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - password
 *         - role
 *       properties:
 *         name:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *           format: password
 *           minLength: 6
 *         role:
 *           type: string
 *           enum: [user, admin]
 *       example:
 *         name: "Jane Smith"
 *         email: "jane@example.com"
 *         password: "password123"
 *         role: "user"
 *     
 *     Organization:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         _id:
 *           type: string
 *           description: Organization ID (auto-generated)
 *         name:
 *           type: string
 *           description: Organization name
 *         domain:
 *           type: string
 *           description: Organization domain
 *         address:
 *           type: string
 *           description: Organization address
 *         phone:
 *           type: string
 *           description: Organization phone number
 *         plan:
 *           type: string
 *           description: Subscription plan
 *           enum: [free, basic, pro, enterprise]
 *           default: free
 *         isActive:
 *           type: boolean
 *           description: Organization status
 *           default: true
 *         settings:
 *           type: object
 *           description: Organization settings
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       example:
 *         _id: "60d21b4667d0d8992e610c80"
 *         name: "Acme Inc"
 *         domain: "acme.com"
 *         plan: "pro"
 *         isActive: true
 *         settings:
 *           theme: "light"
 *           modules:
 *             customers: true
 *             deals: true
 *             tasks: true
 *             reports: true
 *         createdAt: "2023-04-15T12:00:00Z"
 *         updatedAt: "2023-04-15T12:00:00Z"
 *     
 *     Customer:
 *       type: object
 *       required:
 *         - name
 *         - organization
 *         - assignedTo
 *       properties:
 *         _id:
 *           type: string
 *           description: Customer ID (auto-generated)
 *         name:
 *           type: string
 *           description: Customer name
 *         email:
 *           type: string
 *           description: Customer email
 *           format: email
 *         phone:
 *           type: string
 *           description: Customer phone
 *         company:
 *           type: string
 *           description: Customer company
 *         type:
 *           type: string
 *           description: Customer type
 *           enum: [lead, prospect, customer, churned]
 *           default: lead
 *         status:
 *           type: string
 *           description: Customer status
 *           enum: [active, inactive]
 *           default: active
 *         source:
 *           type: string
 *           description: Lead source
 *         assignedTo:
 *           type: string
 *           description: User ID assigned to this customer
 *         organization:
 *           type: string
 *           description: Organization ID
 *         notes:
 *           type: string
 *           description: Customer notes
 *         customFields:
 *           type: object
 *           description: Custom fields data
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       example:
 *         _id: "60d21b4667d0d8992e610c90"
 *         name: "Acme Corp"
 *         email: "contact@acme.com"
 *         phone: "+1-555-123-4567"
 *         company: "Acme Corporation"
 *         type: "customer"
 *         status: "active"
 *         source: "website"
 *         assignedTo: "60d21b4667d0d8992e610c85"
 *         organization: "60d21b4667d0d8992e610c80"
 *         notes: "Key enterprise client"
 *         customFields:
 *           industry: "Technology"
 *           size: "Enterprise"
 *         createdAt: "2023-04-15T12:00:00Z"
 *         updatedAt: "2023-04-15T12:00:00Z"
 *     
 *     CustomerInput:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         phone:
 *           type: string
 *         company:
 *           type: string
 *         type:
 *           type: string
 *           enum: [lead, prospect, customer, churned]
 *         status:
 *           type: string
 *           enum: [active, inactive]
 *         source:
 *           type: string
 *         assignedTo:
 *           type: string
 *         notes:
 *           type: string
 *         customFields:
 *           type: object
 *       example:
 *         name: "Global Tech"
 *         email: "info@globaltech.com"
 *         phone: "+1-555-987-6543"
 *         company: "Global Technologies Inc"
 *         type: "prospect"
 *         status: "active"
 *         source: "referral"
 *         assignedTo: "60d21b4667d0d8992e610c85"
 *         notes: "Interested in our enterprise plan"
 *         customFields:
 *           industry: "Technology"
 *           size: "Medium"
 *     
 *     Deal:
 *       type: object
 *       required:
 *         - title
 *         - customer
 *         - assignedTo
 *         - organization
 *       properties:
 *         _id:
 *           type: string
 *           description: Deal ID (auto-generated)
 *         title:
 *           type: string
 *           description: Deal title
 *         customer:
 *           type: string
 *           description: Customer ID
 *         value:
 *           type: number
 *           description: Deal value
 *           default: 0
 *         currency:
 *           type: string
 *           description: Currency
 *           default: "USD"
 *         stage:
 *           type: string
 *           description: Deal stage
 *           enum: [lead, qualified, proposal, negotiation, closed-won, closed-lost]
 *           default: lead
 *         status:
 *           type: string
 *           description: Deal status
 *           enum: [active, inactive]
 *           default: active
 *         probability:
 *           type: number
 *           description: Win probability (%)
 *           default: 0
 *           minimum: 0
 *           maximum: 100
 *         expectedCloseDate:
 *           type: string
 *           format: date-time
 *           description: Expected close date
 *         assignedTo:
 *           type: string
 *           description: User ID assigned to this deal
 *         organization:
 *           type: string
 *           description: Organization ID
 *         products:
 *           type: array
 *           description: Products in the deal
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *               quantity:
 *                 type: number
 *         notes:
 *           type: string
 *           description: Deal notes
 *         activities:
 *           type: array
 *           description: Deal activities
 *           items:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [note, call, meeting, email, task]
 *               description:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date-time
 *               user:
 *                 type: string
 *         customFields:
 *           type: object
 *           description: Custom fields data
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       example:
 *         _id: "60d21b4667d0d8992e610c95"
 *         title: "Annual SaaS Subscription"
 *         customer: "60d21b4667d0d8992e610c90"
 *         value: 25000
 *         currency: "USD"
 *         stage: "proposal"
 *         status: "active"
 *         probability: 50
 *         expectedCloseDate: "2023-06-30T00:00:00Z"
 *         assignedTo: "60d21b4667d0d8992e610c85"
 *         organization: "60d21b4667d0d8992e610c80"
 *         products:
 *           - name: "Enterprise License"
 *             price: 12500
 *             quantity: 2
 *         notes: "Preparing final proposal"
 *         activities:
 *           - type: "call"
 *             description: "Initial discovery call"
 *             date: "2023-04-15T14:00:00Z"
 *             user: "60d21b4667d0d8992e610c85"
 *         customFields:
 *           priority: "High"
 *         createdAt: "2023-04-15T12:00:00Z"
 *         updatedAt: "2023-05-01T10:30:00Z"
 *     
 *     Task:
 *       type: object
 *       required:
 *         - title
 *         - assignedTo
 *         - organization
 *         - createdBy
 *       properties:
 *         _id:
 *           type: string
 *           description: Task ID (auto-generated)
 *         title:
 *           type: string
 *           description: Task title
 *         description:
 *           type: string
 *           description: Task description
 *         dueDate:
 *           type: string
 *           format: date-time
 *           description: Due date
 *         priority:
 *           type: string
 *           description: Task priority
 *           enum: [low, medium, high]
 *           default: medium
 *         status:
 *           type: string
 *           description: Task status
 *           enum: [pending, in_progress, completed, canceled]
 *           default: pending
 *         assignedTo:
 *           type: string
 *           description: User ID assigned to this task
 *         organization:
 *           type: string
 *           description: Organization ID
 *         relatedTo:
 *           type: object
 *           description: Related entity
 *           properties:
 *             model:
 *               type: string
 *               enum: [Customer, Deal]
 *             id:
 *               type: string
 *         reminderDate:
 *           type: string
 *           format: date-time
 *           description: Reminder date
 *         completedDate:
 *           type: string
 *           format: date-time
 *           description: Completion date
 *         completedBy:
 *           type: string
 *           description: User ID who completed the task
 *         createdBy:
 *           type: string
 *           description: User ID who created the task
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       example:
 *         _id: "60d21b4667d0d8992e610c99"
 *         title: "Follow up on proposal"
 *         description: "Call client to discuss proposal details"
 *         dueDate: "2023-05-20T14:00:00Z"
 *         priority: "high"
 *         status: "pending"
 *         assignedTo: "60d21b4667d0d8992e610c85"
 *         organization: "60d21b4667d0d8992e610c80"
 *         relatedTo:
 *           model: "Deal"
 *           id: "60d21b4667d0d8992e610c95"
 *         reminderDate: "2023-05-19T14:00:00Z"
 *         createdBy: "60d21b4667d0d8992e610c85"
 *         createdAt: "2023-05-15T09:30:00Z"
 *         updatedAt: "2023-05-15T09:30:00Z"
 *     
 *     CustomField:
 *       type: object
 *       required:
 *         - name
 *         - label
 *         - type
 *         - entity
 *         - organization
 *       properties:
 *         _id:
 *           type: string
 *           description: Custom field ID (auto-generated)
 *         name:
 *           type: string
 *           description: Field name (no spaces, lowercase)
 *         label:
 *           type: string
 *           description: Display label
 *         type:
 *           type: string
 *           description: Field type
 *           enum: [text, number, date, dropdown, checkbox, email, phone, url]
 *         entity:
 *           type: string
 *           description: Entity type this field belongs to
 *           enum: [customer, deal, task]
 *         required:
 *           type: boolean
 *           description: Whether field is required
 *           default: false
 *         default:
 *           type: string
 *           description: Default value
 *         options:
 *           type: array
 *           description: Options for dropdown fields
 *           items:
 *             type: string
 *         organization:
 *           type: string
 *           description: Organization ID
 *         isActive:
 *           type: boolean
 *           description: Whether field is active
 *           default: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       example:
 *         _id: "60d21b4667d0d8992e610c70"
 *         name: "industry"
 *         label: "Industry"
 *         type: "dropdown"
 *         entity: "customer"
 *         required: false
 *         options: ["Technology", "Finance", "Healthcare", "Retail", "Manufacturing"]
 *         organization: "60d21b4667d0d8992e610c80"
 *         isActive: true
 *         createdAt: "2023-04-10T08:15:00Z"
 *         updatedAt: "2023-04-10T08:15:00Z"
 *     
 *     ApiKey:
 *       type: object
 *       required:
 *         - name
 *         - organization
 *         - createdBy
 *       properties:
 *         _id:
 *           type: string
 *           description: API key ID (auto-generated)
 *         name:
 *           type: string
 *           description: Key name
 *         key:
 *           type: string
 *           description: API key value
 *         organization:
 *           type: string
 *           description: Organization ID
 *         permissions:
 *           type: array
 *           description: Permissions array
 *           items:
 *             type: string
 *             enum: [read, write, delete]
 *         isActive:
 *           type: boolean
 *           description: Whether key is active
 *           default: true
 *         expiresAt:
 *           type: string
 *           format: date-time
 *           description: Expiration date
 *         lastUsed:
 *           type: string
 *           format: date-time
 *           description: Last used date
 *         createdBy:
 *           type: string
 *           description: User ID who created the key
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       example:
 *         _id: "60d21b4667d0d8992e610c65"
 *         name: "Integration Key"
 *         key: "crm_1234567890abcdef1234567890abcdef"
 *         organization: "60d21b4667d0d8992e610c80"
 *         permissions: ["read", "write"]
 *         isActive: true
 *         expiresAt: "2024-04-15T12:00:00Z"
 *         lastUsed: "2023-05-01T09:45:00Z"
 *         createdBy: "60d21b4667d0d8992e610c85"
 *         createdAt: "2023-04-15T12:00:00Z"
 *         updatedAt: "2023-05-01T09:45:00Z"
 *     
 *     Webhook:
 *       type: object
 *       required:
 *         - name
 *         - url
 *         - events
 *         - organization
 *         - createdBy
 *       properties:
 *         _id:
 *           type: string
 *           description: Webhook ID (auto-generated)
 *         name:
 *           type: string
 *           description: Webhook name
 *         url:
 *           type: string
 *           description: Target URL
 *         events:
 *           type: array
 *           description: Events to trigger webhook
 *           items:
 *             type: string
 *         status:
 *           type: string
 *           description: Webhook status
 *           enum: [active, inactive, failed]
 *           default: active
 *         secretKey:
 *           type: string
 *           description: Secret key for signature
 *         organization:
 *           type: string
 *           description: Organization ID
 *         headers:
 *           type: object
 *           description: Custom headers
 *         createdBy:
 *           type: string
 *           description: User ID who created the webhook
 *         lastTriggered:
 *           type: string
 *           format: date-time
 *           description: Last triggered date
 *         failureCount:
 *           type: integer
 *           description: Consecutive failures
 *           default: 0
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       example:
 *         _id: "60d21b4667d0d8992e610c60"
 *         name: "New Customer Notification"
 *         url: "https://example.com/webhooks/crm"
 *         events: ["customer.created", "customer.updated"]
 *         status: "active"
 *         secretKey: "9876543210abcdef9876543210abcdef"
 *         organization: "60d21b4667d0d8992e610c80"
 *         headers:
 *           "X-Custom-Header": "Custom-Value"
 *         createdBy: "60d21b4667d0d8992e610c85"
 *         lastTriggered: "2023-05-01T15:30:00Z"
 *         failureCount: 0
 *         createdAt: "2023-04-15T12:00:00Z"
 *         updatedAt: "2023-05-01T15:30:00Z"
 *     
 *     AuthResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         token:
 *           type: string
 *           description: JWT token
 *         user:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             name:
 *               type: string
 *             email:
 *               type: string
 *             role:
 *               type: string
 *             organization:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 plan:
 *                   type: string
 *       example:
 *         success: true
 *         token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *         user:
 *           id: "60d21b4667d0d8992e610c85"
 *           name: "John Doe"
 *           email: "john@example.com"
 *           role: "admin"
 *           organization:
 *             id: "60d21b4667d0d8992e610c80"
 *             name: "Acme Inc"
 *             plan: "pro"
 *     
 *     LoginInput:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *           format: password
 *       example:
 *         email: "john@example.com"
 *         password: "password123"
 *     
 *     RegisterInput:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - password
 *         - organizationName
 *       properties:
 *         name:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *           format: password
 *           minLength: 6
 *         organizationName:
 *           type: string
 *       example:
 *         name: "John Doe"
 *         email: "john@example.com"
 *         password: "password123"
 *         organizationName: "My Organization"
 *     Pagination:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *           description: Tổng số bản ghi
 *           example: 100
 *         page:
 *           type: integer
 *           description: Trang hiện tại
 *           example: 1
 *         pages:
 *           type: integer
 *           description: Tổng số trang
 *           example: 10
 *     Error:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         error:
 *           type: string
 *           description: Thông báo lỗi
 *           example: Not authorized to access this route
 *     DashboardStats:
 *       type: object
 *       properties:
 *         customers:
 *           type: object
 *           properties:
 *             total:
 *               type: integer
 *               example: 150
 *             lead:
 *               type: integer
 *               example: 45
 *             prospect:
 *               type: integer
 *               example: 35
 *             customer:
 *               type: integer
 *               example: 65
 *             churned:
 *               type: integer
 *               example: 5
 *         deals:
 *           type: object
 *           properties:
 *             total:
 *               type: integer
 *               example: 50
 *             totalValue:
 *               type: number
 *               example: 250000
 *             lead:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                   example: 10
 *                 value:
 *                   type: number
 *                   example: 50000
 *             qualified:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                   example: 12
 *                 value:
 *                   type: number
 *                   example: 65000
 *             proposal:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                   example: 15
 *                 value:
 *                   type: number
 *                   example: 80000
 *             negotiation:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                   example: 8
 *                 value:
 *                   type: number
 *                   example: 45000
 *             closed-won:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                   example: 3
 *                 value:
 *                   type: number
 *                   example: 15000
 *             closed-lost:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                   example: 2
 *                 value:
 *                   type: number
 *                   example: 10000
 *         tasks:
 *           type: object
 *           properties:
 *             total:
 *               type: integer
 *               example: 75
 *             pending:
 *               type: integer
 *               example: 30
 *             in_progress:
 *               type: integer
 *               example: 20
 *             completed:
 *               type: integer
 *               example: 20
 *             canceled:
 *               type: integer
 *               example: 5
 *             overdue:
 *               type: integer
 *               example: 10
 *             dueToday:
 *               type: integer
 *               example: 8
 *         forecast:
 *           type: object
 *           properties:
 *             totalValue:
 *               type: number
 *               example: 350000
 *             weightedValue:
 *               type: number
 *               example: 200000
 *         recentActivity:
 *           type: object
 *           properties:
 *             newCustomers:
 *               type: integer
 *               example: 15
 *             newDeals:
 *               type: integer
 *               example: 10
 *             closedDeals:
 *               type: integer
 *               example: 5 
 */