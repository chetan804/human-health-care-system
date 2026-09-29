"""Small SQLAlchemy repository. No transaction commits below the execution boundary."""

import hashlib
from sqlalchemy import select, func, text, update


class Store:
    def __init__(self, db):
        self.db = db

    def one(self, model, *conditions, lock=False):
        query = select(model).where(*conditions)
        if lock:
            query = query.with_for_update()
        return self.db.scalar(query.limit(1))

    def get(self, model, identifier, lock=False):
        return self.one(model, model.id == identifier, lock=lock)

    def list(self, model, *conditions, limit=50, offset=0, order=None, lock=False):
        query = (
            select(model)
            .where(*conditions)
            .order_by(order if order is not None else model.created_at.desc(), model.id)
            .limit(limit)
            .offset(offset)
        )
        if lock:
            query = query.with_for_update(skip_locked=True)
        return list(self.db.scalars(query))

    def count(self, model, *conditions):
        return self.db.scalar(select(func.count()).select_from(model).where(*conditions))

    def add(self, entity):
        self.db.add(entity)
        self.db.flush()
        return entity

    def advisory_lock(self, namespace: str):
        number = int.from_bytes(hashlib.sha256(namespace.encode()).digest()[:8], "big", signed=True)
        self.db.execute(text("SELECT pg_advisory_xact_lock(:key)"), {"key": number})

    def compare_and_swap(self, model, identifier, version, **values):
        result = self.db.execute(
            update(model)
            .where(model.id == identifier, model.version == version)
            .values(version=version + 1, **values)
        )
        return result.rowcount == 1
