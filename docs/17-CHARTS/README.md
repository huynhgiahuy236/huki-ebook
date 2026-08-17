# 📊 Architecture Diagrams

Links to architecture diagrams (draw.io files).

## Diagrams Location

All diagrams are stored in: [draw.io](./draw.io/)

## Available Diagrams

### Architecture

| File | Description |
|------|-------------|
| [system-context.drawio](./draw.io/system-context.drawio) | System context diagram |
| [microservices-architecture.drawio](./draw.io/microservices-architecture.drawio) | Microservices overview |
| [data-flow.drawio](./draw.io/data-flow.drawio) | Data flow between services |
| [deployment.drawio](./draw.io/deployment.drawio) | Production deployment |

### Workflows

| File | Description |
|------|-------------|
| [auth-flow.drawio](./draw.io/auth-flow.drawio) | Authentication flow |
| [checkout-flow.drawio](./draw.io/checkout-flow.drawio) | Checkout process |
| [order-flow.drawio](./draw.io/order-flow.drawio) | Order lifecycle |
| [payment-flow.drawio](./draw.io/payment-flow.drawio) | Payment process |
| [reading-flow.drawio](./draw.io/reading-flow.drawio) | Digital reading flow |

### Database

| File | Description |
|------|-------------|
| [erd.drawio](./draw.io/erd.drawio) | Entity Relationship Diagram |
| [identity-db.drawio](./draw.io/identity-db.drawio) | Identity database schema |
| [commerce-db.drawio](./draw.io/commerce-db.drawio) | Commerce database schema |
| [community-db.drawio](./draw.io/community-db.drawio) | Community (MongoDB) schema |

### UI

| File | Description |
|------|-------------|
| [wireframes/](./draw.io/wireframes/) | Page wireframes |
| [mockups/](./draw.io/mockups/) | Design mockups |

## Opening Diagrams

1. Go to [app.diagrams.net](https://app.diagrams.net) or install draw.io desktop app
2. Open the .drawio file
3. Edit as needed
4. Export to PNG/SVG for documentation

## Contributing Diagrams

When creating new diagrams:

1. Use consistent colors:
   - Primary: `#0ea5e9` (Blue)
   - Secondary: `#8b5cf6` (Purple)
   - Success: `#22c55e` (Green)
   - Warning: `#eab308` (Yellow)
   - Error: `#ef4444` (Red)

2. Use consistent shapes:
   - Services: Rounded rectangles
   - Databases: Cylinders
   - External Systems: Hexagons
   - Users: Circles
   - APIs: Rectangles with thick border

3. Include:
   - Title
   - Legend
   - Version
   - Last updated date
