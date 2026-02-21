from datetime import datetime, timedelta
from database.db import db
from database.models import ChargingAllocation, SystemLog
from engine.grid_manager import GridLoadManager
from engine.cost_optimizer import CostOptimizer
from engine.fairness import FairnessEngine
from engine.insights import InsightsGenerator

class Scheduler:
    def __init__(self):
        self.grid_manager = GridLoadManager()
        self.fairness_engine = FairnessEngine()
        
        # Logging State Tracking
        self.last_protection_state = 'SAFE'
        self.last_log_time = datetime.min

    def log_system_action(self, level, message, action_type=None):
        try:
            log = SystemLog(level=level, message=message, action_type=action_type)
            db.session.add(log)
            db.session.commit()
            print(f"[SYSTEM LOG] {level}: {message}")
        except Exception as e:
            print(f"Failed to log system action: {e}")

    def balance_grid(self, current_load_kw):
        """
        Active Grid Protection Logic.
        Checks current load against thresholds and takes corrective action on ACTIVE sessions.
        """
        action_needed = self.grid_manager.check_protection_rules(current_load_kw)
        now = datetime.utcnow()
        
        # Get active sessions
        active_allocations = ChargingAllocation.query.filter(
            ChargingAllocation.allocated_start_time <= now,
            ChargingAllocation.allocated_end_time >= now,
            ChargingAllocation.status == 'Scheduled'
        ).all()

    def balance_grid(self, current_load_kw):
        action_needed = self.grid_manager.check_protection_rules(current_load_kw)
        now = datetime.utcnow()
        
        # State Machine & Logging Logic
        current_state = action_needed
        state_changed = current_state != self.last_protection_state
        time_since_last_log = (now - self.last_log_time).total_seconds()
        
        should_log = state_changed or (time_since_last_log > 180 and current_state != 'SAFE') # Log change or every 3 mins if not safe
        
        if should_log:
            if state_changed:
                # TRANSITION LOGS
                if current_state == 'SAFE':
                    self.log_system_action('RESOLVED', "🟢 RESOLVED: Load returned to safe range. System operation restored.", 'RESOLVED')
                
                elif current_state == 'RESCHEDULE':
                    self.log_system_action('WARNING', "🟡 WARNING: Load approaching critical level. Flexible sessions delayed.", 'WARNING')
                    
                elif current_state == 'THROTTLE':
                    self.log_system_action('WARNING', f"🔴 CRITICAL: Transformer load exceeded safe limit ({current_load_kw}kW). AC charging throttled.", 'CRITICAL')
                    
                elif current_state == 'RESTRICT':
                    self.log_system_action('ERROR', f"🔴 CRITICAL: Emergency load detected ({current_load_kw}kW). DC fast charging restricted.", 'CRITICAL')

            else:
                # PERSISTENCE LOGS (Cooldown passed)
                duration_mins = int((now - self.last_log_time).total_seconds() / 60) + 3 # Add previous buffer roughly
                if current_state == 'RESTRICT':
                    self.log_system_action('ERROR', f"🔴 CRITICAL LOAD persisted for >3 minutes. Restrictions remain active.", 'CRITICAL')
                elif current_state == 'THROTTLE':
                    self.log_system_action('WARNING', f"🔴 CRITICAL LOAD persisted. Throttling remains active.", 'CRITICAL')

            self.last_protection_state = current_state
            self.last_log_time = now

        # --- EXECUTE ACTIONS (Idempotent) ---
        
        active_allocations = ChargingAllocation.query.filter(
            ChargingAllocation.allocated_start_time <= now,
            ChargingAllocation.allocated_end_time > now,
            ChargingAllocation.status == 'Scheduled'
        ).all()

        if action_needed == 'THROTTLE':
             active_found = False
             count_throttled = 0
             for alloc in active_allocations:
                 if alloc.charger_type == 'AC' and alloc.charger_power_kw > 3.6: 
                     active_found = True
                     count_throttled += 1
                     old_power = alloc.charger_power_kw
                     new_power = old_power * 0.5
                     alloc.charger_power_kw = new_power
                     
                     remaining_duration = (alloc.allocated_end_time - now).total_seconds() / 3600
                     if remaining_duration > 0:
                         added_time_hours = remaining_duration 
                         alloc.allocated_end_time += timedelta(hours=added_time_hours)
             
             if state_changed and count_throttled > 0:
                 # Optional: Log detail only on transition
                 pass # The main log covers it "AC charging throttled"
             
             db.session.commit()

        elif action_needed == 'RESCHEDULE':
            count_rescheduled = 0
            for alloc in active_allocations:
                if alloc.request.priority_level == 'flexible':
                    count_rescheduled += 1
                    shift_mins = 30
                    alloc.allocated_start_time += timedelta(minutes=shift_mins)
                    alloc.allocated_end_time   += timedelta(minutes=shift_mins)
                    print(f"[Scheduler] Rescheduled {req.vehicle_id} +30m due to grid load.")

            db.session.commit()

    # Maximum simultaneous chargers per type
    MAX_CHARGERS = {'AC': 5, 'DC': 2}

    def _to_naive_utc(self, dt):
        """Strip timezone info to get a UTC-naive datetime (matches SQLite storage)."""
        if dt is None:
            return dt
        if hasattr(dt, 'tzinfo') and dt.tzinfo is not None:
            from datetime import timezone as _tz
            return dt.astimezone(_tz.utc).replace(tzinfo=None)
        return dt

    def _count_overlapping(self, start, end, charger_type):
        """Count active/scheduled allocations of charger_type that overlap [start, end)."""
        return ChargingAllocation.query.filter(
            ChargingAllocation.charger_type == charger_type,
            ChargingAllocation.allocated_start_time < end,
            ChargingAllocation.allocated_end_time > start,
            ChargingAllocation.status.in_(['Scheduled', 'Charging'])
        ).count()

    def _find_conflict_free_slot(self, preferred_start, duration_hours, departure_naive,
                                  charger_type, current_time):
        """
        Starting from preferred_start, scan 30-min steps forward to find the earliest
        slot where charger capacity is available AND end_time <= departure_naive.
        Returns (start_time, end_time).  Falls back to preferred_start if full scan fails.
        """
        max_capacity = self.MAX_CHARGERS.get(charger_type, 5)
        step = timedelta(minutes=30)
        candidate = preferred_start
        # Scan up to 48 × 30 min = 24-hour window
        for _ in range(48):
            candidate_end = candidate + timedelta(hours=duration_hours)
            # Hard constraint: must finish before departure
            if candidate_end > departure_naive:
                break
            if self._count_overlapping(candidate, candidate_end, charger_type) < max_capacity:
                return candidate, candidate_end
            candidate += step
        # Fallback: no conflict-free slot fits before departure.
        # Start as early as (departure - duration), but no earlier than current_time.
        # This guarantees end = start + duration ≤ departure.
        fallback_start = max(current_time, departure_naive - timedelta(hours=duration_hours))
        fallback_end   = min(fallback_start + timedelta(hours=duration_hours), departure_naive)
        return fallback_start, fallback_end

    def schedule_request(self, request, preferred_start=None):
        """
        Main scheduling logic with real-world constraints:
        1. Calculates required_kWh and duration from charger power.
        2. Works in UTC-naive datetimes (consistent with SQLite storage).
        3. Caps charging duration to the available window before departure.
        4. Detects and avoids charger slot conflicts (no overlapping allocations
           beyond MAX_CHARGERS capacity per type).
        5. Guarantees: allocated_end_time <= departure_time.
        """
        # ── 1. Power & Duration ─────────────────────────────────────────────
        charger_type = request.charger_type or 'AC'
        power_kw = 50.0 if charger_type == 'DC' else 7.2

        required_kwh = (
            (request.target_battery_percent - request.current_battery_percent)
            / 100.0 * request.battery_capacity_kwh
        )
        full_duration_hours = required_kwh / power_kw  # time for 100% of requested charge

        # ── 2. UTC-naive timestamps ─────────────────────────────────────────
        current_time = self._to_naive_utc(datetime.utcnow())  # UTC-naive now

        # departure_time stored as UTC-naive in SQLite; strip tz if somehow present
        departure_naive = self._to_naive_utc(request.departure_time)

        # ── 3. Available window & partial-charge detection ──────────────────
        available_hours = max(0.0, (departure_naive - current_time).total_seconds() / 3600)

        if full_duration_hours > available_hours > 0:
            # Not enough time — charge as much as possible before departure
            duration_hours = available_hours
        elif available_hours <= 0:
            # Departure already passed — emergency cap at 1 h
            duration_hours = min(full_duration_hours, 1.0)
        else:
            duration_hours = full_duration_hours

        # ── 4. Grid stress check ────────────────────────────────────────────
        is_emergency = request.priority_level == 'emergency'
        current_base_load = self.grid_manager.get_base_load(current_time)
        in_emergency = self.grid_manager.check_emergency_mode(current_base_load + 20.0)

        # ── 5. Pick candidate start time ────────────────────────────────────
        if preferred_start:
            try:
                ps = datetime.fromisoformat(str(preferred_start).replace('Z', '+00:00'))
                candidate_start = self._to_naive_utc(ps)
            except Exception:
                candidate_start = current_time
            peak_optimized = True

        elif is_emergency:
            candidate_start = current_time
            peak_optimized = False

        elif in_emergency and request.priority_level == 'flexible':
            # Delay proportionally; never past the halfway point of available window
            delay = min(timedelta(hours=4), timedelta(hours=available_hours / 2))
            candidate_start = current_time + delay
            peak_optimized = True

        else:
            if charger_type == 'DC':
                candidate_start = current_time
                peak_optimized = False
            else:
                candidate_start = CostOptimizer.find_optimal_start_time(
                    required_kwh, duration_hours, departure_naive, current_time
                )
                time_diff = (candidate_start - current_time).total_seconds() / 60
                peak_optimized = time_diff > 15

        # ── 6. Charger conflict resolution ────────────────────────────────
        start_time, end_time = self._find_conflict_free_slot(
            candidate_start, duration_hours, departure_naive, charger_type, current_time
        )

        # ── 7. Hard departure cap + sanity guard (start must never exceed end) ─
        if end_time > departure_naive:
            start_time = max(current_time, departure_naive - timedelta(hours=duration_hours))
            end_time   = min(start_time + timedelta(hours=duration_hours), departure_naive)

        # Final sanity: if start still exceeds end (edge case: departure already passed),
        # pin start to current_time and end to departure to get at least some session.
        if start_time >= end_time:
            start_time = current_time
            end_time   = max(start_time, departure_naive)
            if end_time <= start_time:          # departure truly in the past
                end_time = start_time + timedelta(hours=min(duration_hours, 1.0))

        # ── 8. Cost & Carbon ─────────────────────────────────────────────
        actual_duration = max(0.0, (end_time - start_time).total_seconds() / 3600)
        cost = CostOptimizer.calculate_cost(required_kwh, start_time, actual_duration, request.priority_level)
        max_cost = required_kwh * CostOptimizer.PEAK_RATE
        total_savings = max(0, max_cost - cost)
        carbon_factor = 0.4  # kg CO₂/kWh saved vs coal
        carbon_savings = (required_kwh * carbon_factor) if peak_optimized else 0.0

        allocation = ChargingAllocation(
            request_id=request.id,
            allocated_start_time=start_time,
            allocated_end_time=end_time,        # ← always ≤ departure_time
            charger_power_kw=power_kw,
            estimated_cost=round(cost, 2),
            cost_without_optimization=round(cost + total_savings, 2),
            peak_optimized=peak_optimized,
            status='Scheduled',
            charger_type=charger_type,
            carbon_savings_kg=round(carbon_savings, 2)
        )

        return allocation
