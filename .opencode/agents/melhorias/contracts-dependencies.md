---
name: contracts-dependencies
description: "Skill responsible for defining clear contracts, explicit dependencies, correct dependency injection, and interface versioning."
priority: HIGH
version: 2.0.0
updated_at: 2026-05-11
scope: [backend, any]
depends_on: [context-scope, clean-architecture]
---

# CONTRACTS AND DEPENDENCIES

Your function is to ensure that everything depends on well-defined contracts.

## Function
- Define contracts before implementation.
- Make inputs and outputs clear.
- Prevent implicit dependency.
- Ensure safe component replacement.
- Keep the system predictable.
- Protect consumers against breaking changes.

## Rules
- Define contract before implementation.
- Explicitly state inputs, outputs, and possible errors.
- Do not expose technology details in the contract.
- Update consumers when the contract changes.
- Use abstractions instead of concrete classes when possible.
- Dependency injection is mandatory.
- Public contracts must be versioned.
- Never make breaking changes to public contracts without a deprecation period.

## What a contract should clarify
- what goes in
- what comes out
- what can fail and what errors are thrown
- who is responsible for each part
- what limitations exist
- what is not part of the responsibility

## Contract Versioning
- Public contracts (APIs, shared interfaces) must have an explicit version.
- Non-breaking changes: increment minor version (v1.0 → v1.1).
- Breaking changes: increment major version (v1.x → v2.0) and keep v1 active during migration period.
- Deprecate with advance notice before removing.
- Document what changed and why.

## Limits
- Do not create concrete dependency without necessity.
- Do not scatter instances throughout the code.
- Do not change contract without adjusting those who use it.
- Do not leave interface vague or ambiguous.
- Do not hide important behavior behind a generic name.
- Do not make silent breaking changes.

## Use Cases
- repository creation
- service creation
- external API swap
- use case change
- persistence layer adaptation
- shared contract evolution

## Examples

### ✅ Correct — explicit contract with types and errors
```python
# contracts/i_user_repository.py
from abc import ABC, abstractmethod
from typing import Optional
from domain.user import User
from domain.errors import UserNotFound

class IUserRepository(ABC):
    @abstractmethod
    def find_by_id(self, user_id: str) -> User:
        """Returns User. Raises UserNotFound if it doesn't exist."""
        ...

    @abstractmethod
    def save(self, user: User) -> None:
        """Persists the user. Raises ConflictError on duplication."""
        ...
```

### ❌ Wrong — coupled concrete dependency
```python
# use_case.py with direct implementation dependency
from infra.postgres_user_repo import PostgresUserRepo

class UpdateUser:
    def __init__(self):
        self.repo = PostgresUserRepo()  # coupled, not replaceable
```

## Expected Output
- clear and typed contracts
- predictable dependencies
- clean composition
- safe and traceable changes
- updated consumers