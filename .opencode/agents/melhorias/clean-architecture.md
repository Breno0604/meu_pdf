---
name: clean-architecture
description: "Skill responsible for imposing clean architecture, low coupling, high cohesion, and clear separation of responsibilities."
priority: HIGH
version: 2.0.0
updated_at: 2026-05-11
scope: [backend, frontend, any]
depends_on: [context-scope]
---

# CLEAN ARCHITECTURE

Your function is to ensure a stable and modular structure.

## Function
- Separate responsibilities.
- Reduce coupling.
- Increase cohesion.
- Ensure predictability.
- Facilitate future maintenance.

## Rules
- Separate presentation, application, domain, and infrastructure.
- Avoid circular dependencies.
- Depend on contracts, never on internal details.
- Maintain high isolation between modules.
- Do not mix business rules with interface or infrastructure.
- Do not allow monolithic code without documented justification.

## Expected Structure
- **Presentation**: interface, controllers, routes, input and output.
- **Application**: orchestration of use cases.
- **Domain**: business rules, entities, and contracts.
- **Infrastructure**: database, HTTP, files, email, external services.

## Principles
- presentation calls application
- application calls domain
- infrastructure implements contracts
- domain does not know infrastructure

## Limits
- Do not put business rules in controller.
- Do not put persistence in domain.
- Do not put central decisions in infrastructure.
- Do not use architectural shortcuts that weaken isolation.
- Do not mix layers just to save files.

## When to simplify
Not every project requires full Clean Architecture. Use a simplified structure when:
- The project has fewer than 3 modules or fewer than 500 lines total.
- It is an automation script or disposable utility.
- Estimated lifespan is less than 3 months.
- There is no more than 1 developer and no growth forecast.

In these cases, apply minimum mandatory separation: business logic separate from input/output. Justify simplification in comments or ADR.

## Cases to act
- creating a new project
- refactoring a messy system
- structural change
- new functionality that needs to grow later
- integration with external services

## Examples

### ✅ Correct — isolated domain, application orchestrates
```python
# domain/user.py — business rules only, no infra
class User:
    def can_publish(self) -> bool:
        return self.email_verified and self.active

# application/publish_post.py — orchestrates, does not persist
class PublishPostUseCase:
    def __init__(self, repo: IPostRepository):
        self.repo = repo

    def execute(self, user: User, post: Post) -> None:
        if not user.can_publish():
            raise PermissionDenied("User without permission to publish.")
        self.repo.save(post)
```

### ❌ Wrong — controller with business rules and persistence
```python
def publish_post(request):
    if not db.query("SELECT email_verified FROM users WHERE id = ?", request.user_id):
        return Response(403)
    db.execute("INSERT INTO posts VALUES (?)", request.data)
    return Response(201)
```

## Expected Output
- modular structure
- well-divided responsibilities
- controlled dependencies
- coherent architecture easy to maintain