import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from app import app
from database.db import db
from database.models import ChargingRequest, ChargingAllocation, GridStatus, SystemLog
from datetime import datetime, timedelta

with app.app_context():
    errors = []
    print("\n=== GridWise DB Health Check ===\n")

    # ── 1. Table counts ────────────────────────────────────
    req_count   = ChargingRequest.query.count()
    alloc_count = ChargingAllocation.query.count()
    log_count   = SystemLog.query.count()
    grid_count  = GridStatus.query.count()
    print(f"[OK] ChargingRequest rows  : {req_count}")
    print(f"[OK] ChargingAllocation rows: {alloc_count}")
    print(f"[OK] SystemLog rows        : {log_count}")
    print(f"[OK] GridStatus rows       : {grid_count}")

    # ── 2. Orphan allocations (allocation without a request) ─
    orphans = (
        ChargingAllocation.query
        .outerjoin(ChargingRequest, ChargingAllocation.request_id == ChargingRequest.id)
        .filter(ChargingRequest.id == None)
        .count()
    )
    if orphans:
        errors.append(f"WARN: {orphans} orphan allocation(s) found (no parent request)")
    else:
        print(f"[OK] No orphan allocations found")

    # ── 3. Orphan requests (request without an allocation) ───
    orphan_reqs = (
        ChargingRequest.query
        .outerjoin(ChargingAllocation, ChargingRequest.id == ChargingAllocation.request_id)
        .filter(ChargingAllocation.id == None)
        .filter(ChargingRequest.status == 'scheduled')
        .count()
    )
    if orphan_reqs:
        errors.append(f"WARN: {orphan_reqs} 'scheduled' request(s) with no allocation")
    else:
        print(f"[OK] No scheduled requests without allocations")

    # ── 4. Battery capacity constraint (1–200 kWh) ───────────
    bad_capacity = ChargingRequest.query.filter(
        (ChargingRequest.battery_capacity_kwh < 1) |
        (ChargingRequest.battery_capacity_kwh > 200)
    ).count()
    if bad_capacity:
        errors.append(f"WARN: {bad_capacity} request(s) with battery_capacity outside 1-200 kWh")
    else:
        print(f"[OK] All battery capacities within 1–200 kWh")

    # ── 5. No negative costs ──────────────────────────────────
    neg_cost = ChargingAllocation.query.filter(ChargingAllocation.estimated_cost < 0).count()
    if neg_cost:
        errors.append(f"WARN: {neg_cost} allocation(s) with negative estimated cost")
    else:
        print(f"[OK] All estimated costs are non-negative")

    # ── 6. End time > start time ──────────────────────────────
    bad_times = ChargingAllocation.query.filter(
        ChargingAllocation.allocated_end_time <= ChargingAllocation.allocated_start_time
    ).count()
    if bad_times:
        errors.append(f"ERROR: {bad_times} allocation(s) where end_time <= start_time")
    else:
        print(f"[OK] All allocations have valid time ranges (end > start)")

    # ── 7. WRITE TEST: insert + read + delete a dummy request ─
    try:
        dummy = ChargingRequest(
            vehicle_id="__health_check__",
            current_battery_percent=10.0,
            target_battery_percent=80.0,
            battery_capacity_kwh=60.0,
            departure_time=datetime.utcnow() + timedelta(hours=3),
            priority_level='normal',
            required_kwh=42.0,
            estimated_duration_minutes=350.0,
            status='pending',
            charger_type='AC',
        )
        db.session.add(dummy)
        db.session.flush()
        dummy_id = dummy.id
        assert dummy_id is not None, "Row insert did not return an ID"

        fetched = ChargingRequest.query.get(dummy_id)
        assert fetched.vehicle_id == "__health_check__", "Read-back mismatch"

        db.session.delete(fetched)
        db.session.commit()
        assert ChargingRequest.query.get(dummy_id) is None, "Delete did not work"
        print(f"[OK] Write → Read → Delete cycle passed (used temporary id={dummy_id})")
    except Exception as e:
        db.session.rollback()
        errors.append(f"ERROR: Write test failed — {e}")

    # ── 8. Summary ───────────────────────────────────────────
    print("\n=== Summary ===")
    if errors:
        for e in errors:
            print(f"  ⚠  {e}")
        print(f"\nResult: {len(errors)} issue(s) found — see above.")
        sys.exit(1)
    else:
        print("  ✅ All checks passed — DB is healthy and ready.")
        sys.exit(0)
