class CostOptimizer:
    PEAK_RATE = 0.25  # $/kWh
    OFF_PEAK_RATE = 0.12  # $/kWh
    PEAK_START = 18
    PEAK_END = 22

    @staticmethod
    def is_peak_hour(hour: int) -> bool:
        return CostOptimizer.PEAK_START <= hour < CostOptimizer.PEAK_END

    @staticmethod
    def calculate_cost(kwh: float, start_hour: int, duration_hours: float) -> float:
        """
        Calculate cost considering peak/off-peak windows.
        Simple approximation: if start is in peak, assume mostly peak? 
        Or weighted average? Let's do simple for now or a bit smarter.
        """
        cost = 0.0
        current_hour = start_hour
        remaining_duration = duration_hours
        
        # We can simulate hour by hour
        while remaining_duration > 0:
            step = min(1.0, remaining_duration) # 1 hour steps
            rate = CostOptimizer.PEAK_RATE if CostOptimizer.is_peak_hour(int(current_hour) % 24) else CostOptimizer.OFF_PEAK_RATE
            cost += step * (kwh / duration_hours) * rate # distribute kwh per hour
            remaining_duration -= step
            current_hour += step
            
        return cost

    @staticmethod
    def find_optimal_start_time(kwh: float, duration_hours: float, departure_hour: int, current_hour: int) -> int:
        """
        Find best start hour to minimize cost before departure.
        Simple heuristic: check all possible start times.
        """
        best_hour = current_hour
        min_cost = float('inf')
        
        # We can start anytime from now until (departure - duration)
        latest_start = int(departure_hour - duration_hours)
        if latest_start < current_hour:
            return current_hour # Can't optimize, must start now
            
        for start_h in range(current_hour, latest_start + 1):
            cost = CostOptimizer.calculate_cost(kwh, start_h, duration_hours)
            if cost < min_cost:
                min_cost = cost
                best_hour = start_h
                
        return best_hour
