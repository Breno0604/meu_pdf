---
name: modular-implementation
description: "Skill responsible for transforming the plan into small, clear, isolated, and easy-to-maintain code."
priority: MEDIUM
version: 2.0.0
updated_at: 2026-05-11
scope: [backend, frontend, any]
depends_on: [context-scope, clean-architecture, contracts-dependencies]
---

# MODULAR IMPLEMENTATION

Your function is to write modular and predictable code.

## Function
- Transform the plan into clean code.
- Divide responsibilities.
- Avoid confusing blocks.
- Facilitate testing and maintenance.
- Maintain consistency between files and modules.

## Rules
- One function, one responsibility.
- One class, one main responsibility.
- Avoid large and confusing blocks.
- Avoid multiple tasks in the same file.
- Use clear and consistent names (see naming-conventions).
- Prefer early returns.
- Avoid unnecessary state mutation.
- Avoid excess parameters (maximum 4; above that, use object/DTO).
- Split whatever exceeds the thresholds below.

## Concrete Thresholds
Use these numbers as heuristics — not as absolute rules:
- **Function > 30 lines**: candidate for splitting. Check if it has more than one responsibility.
- **Class > 150 lines**: candidate for splitting by responsibility.
- **File > 200 lines**: candidate for breaking into smaller modules.
- **More than 4 parameters in a function**: group into object/DTO.
- **More than 3 levels of indentation**: sign of excessive complexity, refactor.

## Best Practices
- separate validation from processing
- separate business rules from persistence
- separate dependency assembly from execution
- keep files small and focused
- avoid logic repetition (DRY applied with common sense)

## Limits
- Do not create a function that does everything.
- Do not hide important logic in a generic helper.
- Do not let a file become a code "dump".
- Do not sacrifice clarity to save lines.
- Do not use too much abstraction when a simple solution works.

## Use Cases
- creating a new module
- refactoring a large function
- breaking a monolithic file
- improving readability
- separation by responsibility

## Examples

### ✅ Correct — small functions, single responsibility, early return
```python
def create_order(data: OrderData) -> Order:
    _validate_data(data)
    items = _assemble_items(data.items)
    return Order(client_id=data.client_id, items=items)

def _validate_data(data: OrderData) -> None:
    if not data.client_id:
        raise ValueError("client_id is mandatory")
    if not data.items:
        raise ValueError("Order must contain at least one item")

def _assemble_items(items_raw: list) -> list[OrderItem]:
    return [OrderItem(product_id=i["id"], quantity=i["qty"]) for i in items_raw]
```

### ❌ Wrong — function that does everything, no separation, hard to test
```python
def create_order(client_id, items, db, email_service):
    if not client_id or not items:
        return None
    order = {"client": client_id, "items": []}
    for i in items:
        item = db.query(f"SELECT * FROM products WHERE id = {i['id']}")
        order["items"].append(item)
    db.execute("INSERT INTO orders ...")
    email_service.send(client_id, "Order created")
    return order
```

## Expected Output
- organized code
- small modules
- simple reading
- easy maintenance
- consistent structure