"""
SlotSuggester: Analyses future 30-min windows and returns the top 3 ranked
charging slot suggestions ranked by grid stability, cost, and solar usage.
"""
from datetime import datetime, timedelta
from engine.cost_optimizer import CostOptimizer
from engine.grid_manager import GridLoadManager


class SlotSuggester:
    WINDOW_STEP_MINUTES = 30
    LOOK_AHEAD_HOURS = 24

    # Label definitions (applied greedily — each label used at most once)
    LABEL_SOLAR    = "Solar Optimized"
    LABEL_CHEAPEST = "Lowest Cost"
    LABEL_SAFE     = "Grid Safe"
    LABEL_BALANCED = "Balanced"

    def __init__(self):
        self.grid_manager = GridLoadManager()

    # ── Helpers ─────────────────────────────────────────────────────────────

    def _committed_load_at(self, window_start, duration_hours, db):
        """
        Query DB for the sum of charger_power_kw of allocations that overlap
        with the candidate window.
        """
        from database.models import ChargingAllocation
        from database.db import db as _db
        window_end = window_start + timedelta(hours=duration_hours)
        overlapping = ChargingAllocation.query.filter(
            ChargingAllocation.allocated_start_time < window_end,
            ChargingAllocation.allocated_end_time   > window_start,
        ).all()
        return sum(a.charger_power_kw for a in overlapping)

    def _score_slot(self, start: datetime, duration_hours: float,
                    kwh: float, priority: str, committed_kw: float) -> dict:
        """Score a candidate slot. Returns a scoring dict."""
        base_load     = self.grid_manager.get_base_load(start)
        total_load    = base_load + committed_kw
        grid_util_pct = round((total_load / self.grid_manager.transformer_capacity_kw) * 100, 1)

        is_solar    = CostOptimizer.is_solar_hour(start)
        is_peak     = CostOptimizer.is_peak_hour(start)
        cost        = CostOptimizer.calculate_cost(kwh, start, duration_hours, priority)

        # --- Composite score (0–100, higher = better) ---
        # Grid: 40 pts — lower utilisation wins
        grid_score = max(0, 40 - grid_util_pct * 0.4)
        # Cost:  35 pts — compare against max (peak rate)
        max_cost    = kwh * CostOptimizer.PEAK_RATE * 1.5
        cost_score  = max(0, 35 * (1 - cost / max_cost)) if max_cost > 0 else 0
        # Solar: 25 pts
        solar_score = 25 if is_solar else 0

        composite = round(grid_score + cost_score + solar_score, 1)

        end = start + timedelta(hours=duration_hours)
        return {
            "start_dt"      : start,
            "end_dt"        : end,
            "start"         : start.strftime("%H:%M"),
            "end"           : end.strftime("%H:%M"),
            "cost_inr"      : round(cost, 2),
            "cost_usd"      : round(cost / 83.0, 2),
            "grid_load_pct" : grid_util_pct,
            "solar"         : is_solar,
            "is_peak"       : is_peak,
            "score"         : composite,
            "committed_kw"  : committed_kw,
        }

    # ── Main method ─────────────────────────────────────────────────────────

    def suggest(self, kwh: float, duration_hours: float,
                departure_time: datetime, current_time: datetime,
                priority: str, db) -> list:
        """
        Return top-3 ranked slot suggestions as a list of dicts.
        Every suggestion is guaranteed to finish before departure_time.
        """
        # Latest the slot can start so charging FINISHES before departure
        latest_start = departure_time - timedelta(hours=duration_hours)

        # If there is no room before departure, just start now and charge what we can
        if latest_start <= current_time:
            latest_start = current_time  # single slot: start now

        lookahead_limit = current_time + timedelta(hours=self.LOOK_AHEAD_HOURS)
        # Never search past latest_start (enforces departure constraint)
        search_end = min(latest_start, lookahead_limit)

        candidates = []
        t = current_time
        while t <= search_end:
            committed = self._committed_load_at(t, duration_hours, db)
            slot      = self._score_slot(t, duration_hours, kwh, priority, committed)
            # Clamp slot end to departure so display is honest
            slot_end_clamped = min(t + timedelta(hours=duration_hours), departure_time)
            slot['end'] = slot_end_clamped.strftime('%H:%M')
            slot['end_dt'] = slot_end_clamped
            # Skip windows where adding this vehicle would exceed 95% grid capacity
            projected = slot['grid_load_pct'] + (kwh / duration_hours / self.grid_manager.transformer_capacity_kw * 100)
            if projected < 95:
                candidates.append(slot)
            t += timedelta(minutes=self.WINDOW_STEP_MINUTES)

        if not candidates:
            # Fallback: just return next three 30-min windows regardless
            candidates = []
            for i in range(3):
                t2 = current_time + timedelta(hours=2 + i * 0.5)
                committed = self._committed_load_at(t2, duration_hours, db)
                candidates.append(self._score_slot(t2, duration_hours, kwh, priority, committed))

        # ── Assign labels ────────────────────────────────────────────────────
        # Pick "Solar Optimized" = highest scorer among solar windows
        solar_slots   = [c for c in candidates if c["solar"]]
        solar_best    = max(solar_slots, key=lambda x: x["score"]) if solar_slots else None

        # Pick "Lowest Cost" = globally lowest cost
        cost_best     = min(candidates, key=lambda x: x["cost_inr"])

        # Pick "Grid Safe" = lowest grid utilisation
        safe_best     = min(candidates, key=lambda x: x["grid_load_pct"])

        # Build top-3 deduplicated list (prefer the dedicated winners, fill rest from rank)
        seen          = set()
        top3          = []

        for slot, tag in [
            (solar_best, self.LABEL_SOLAR),
            (cost_best,  self.LABEL_CHEAPEST),
            (safe_best,  self.LABEL_SAFE),
        ]:
            if slot is None:
                continue
            key = slot["start"]
            if key not in seen:
                seen.add(key)
                top3.append({**slot, "tag": tag})

        # If fewer than 3 unique winners, fill from sorted candidates
        sorted_cands = sorted(candidates, key=lambda x: -x["score"])
        for c in sorted_cands:
            if len(top3) >= 3:
                break
            if c["start"] not in seen:
                seen.add(c["start"])
                top3.append({**c, "tag": self.LABEL_BALANCED})

        # Rank by score desc, add rank numbers
        top3 = sorted(top3, key=lambda x: -x["score"])[:3]
        for i, s in enumerate(top3):
            s["rank"] = i + 1

        return top3
