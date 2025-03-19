# CRM API Documentation

## Overview

The CRM API provides a comprehensive set of endpoints for managing customers, deals, tasks, and other resources in the CRM system. This document outlines how to access and use the API documentation.

## Accessing the Documentation

### Development Environment

When running the server in development mode, the API documentation is available at:

```
http://localhost:5000/api-docs
```

The documentation is generated using Swagger (OpenAPI) and provides an interactive interface to explore and test API endpoints.

## Authentication

Most API endpoints require authentication. The CRM API supports two authentication methods:

### JWT Authentication

For user access through the web application or direct API calls:

1. Call the `/auth/login` endpoint with valid credentials
2. Use the returned JWT token in subsequent requests:
   - As a bearer token in the Authorization header: `Authorization: Bearer <token>`
   - As an HTTP-only cookie (automatically handled by browsers)

### API Key Authentication

For machine-to-machine integrations and external systems:

1. Create an API key through the web interface (Settings → API Keys) or via the API
2. Use the API key in the `x-api-key` header for requests to `/api/v1/api/*` endpoints

## API Structure

The API is organized into the following resource groups:

### Authentication and User Management
- **Auth**: Registration, login, and session management
- **Users**: User administration and profile management

### Core CRM Resources
- **Customers**: Manage customers, leads, and prospects
- **Deals**: Manage sales opportunities and deals
- **Tasks**: Manage to-dos and activities

### Configuration and Settings
- **Organizations**: Organization settings and customization
- **Custom Fields**: Define custom fields for various entities
- **Webhooks**: Set up notification webhooks for events
- **API Keys**: Manage API keys for external integrations

### Data and Analytics
- **Analytics**: Reports and dashboard statistics
- **Export**: Export data to CSV format
- **Import**: Import data from CSV files

### External API Access
- **API**: External API endpoints authenticated by API keys

## Response Format

All API responses follow a consistent format:

### Success Responses

```json
{
  "success": true,
  "data": {
    // Resource data or response payload
  }
}
```

For paginated resources, additional pagination metadata is included:

```json
{
  "success": true,
  "count": 10,
  "pagination": {
    "total": 100,
    "page": 1,
    "pages": 10
  },
  "data": [
    // Array of resources
  ]
}
```

### Error Responses

```json
{
  "success": false,
  "error": "Error message description"
}
```

## Common HTTP Status Codes

- **200 OK**: Request succeeded
- **201 Created**: Resource created successfully
- **400 Bad Request**: Invalid input or request
- **401 Unauthorized**: Authentication required or failed
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Server-side error

## Permissions

API access is controlled by user roles:

- **User**: Basic access to assigned resources
- **Admin**: Full access to organization resources
- **Superadmin**: System-wide access (not available via API)

For API keys, permissions are specified when creating the key:
- **read**: Read-only access
- **write**: Create and update access
- **delete**: Delete access

## Rate Limiting

The API implements rate limiting to prevent abuse. By default, clients are limited to 100 requests per 10-minute window.

## Examples

See the interactive documentation in Swagger UI for full examples of requests and responses for each endpoint.

## Documentation Updates

The API documentation is automatically generated from the codebase and always reflects the current implementation. As the API evolves, the documentation is updated accordingly.

For more detailed information about using Swagger documentation, see [SWAGGER.md](./SWAGGER.md).