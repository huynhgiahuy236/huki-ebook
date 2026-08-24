# HTTP Status Codes

## Overview

HTTP status codes used in HUKI EBOOK API.

## 2xx Success

| Code | Name | Usage |
|------|------|-------|
| 200 | OK | Successful GET, PATCH |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |

## 4xx Client Errors

| Code | Name | Usage |
|------|------|-------|
| 400 | Bad Request | Validation error, invalid input |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Valid token but no permission |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate resource |
| 422 | Unprocessable Entity | Valid format but business logic error |
| 429 | Too Many Requests | Rate limit exceeded |

## 5xx Server Errors

| Code | Name | Usage |
|------|------|-------|
| 500 | Internal Server Error | Unexpected server error |
| 502 | Bad Gateway | External service unavailable |
| 503 | Service Unavailable | Maintenance |
| 504 | Gateway Timeout | Service timeout |

## Error Code Mapping

| HTTP Status | Error Code Prefix | Example |
|-------------|-------------------|---------|
| 400 | VALIDATION_* | VALIDATION_EMAIL |
| 401 | AUTH_* | AUTH_TOKEN_INVALID |
| 403 | AUTHZ_* | AUTHZ_FORBIDDEN |
| 404 | *_NOT_FOUND | USER_NOT_FOUND |
| 409 | *_EXISTS, *_ALREADY_* | BOOK_EXISTS |
| 422 | INVENTORY_*, *_LIMIT_* | INVENTORY_INSUFFICIENT |
| 429 | RATE_LIMIT_* | RATE_LIMIT_EXCEEDED |
| 5xx | SYSTEM_* | SYSTEM_ERROR |
