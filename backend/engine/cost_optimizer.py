from datetime import datetime, timedelta

class CostOptimizer:
    PEAK_RATE = 10.0  # INR/kWh
    OFF_PEAK_RATE = 6.0  # INR/kWh
    SOLAR_RATE = 4.0 # INR/kWh - Cheapest!
    
    PEAK_START = 18
    PEAK_END = 22
    SOLAR_START = 10
    SOLAR_END = 14

    PRIORITY_MULTIPLIERS = {
        'emergency': 1.5,
        'normal': 1.0,
        'flexible': 0.9
    }

    @staticmethod
    def is_peak_hour(dt: datetime) -> bool:
        return CostOptimizer.PEAK_START <= dt.hour < CostOptimizer.PEAK_END

    @staticmethod
    def is_solar_hour(dt: datetime) -> bool:
        return CostOptimizer.SOLAR_START <= dt.hour < CostOptimizer.SOLAR_END

    @staticmethod
    def calculate_cost(kwh: float, start_time: datetime, duration_hours: float, priority: str = 'normal') -> float:
        """
        Calculate cost considering peak/off-peak windows and priority multipliers.
        """
        cost = 0.0
        current_time = start_time
        remaining_duration = duration_hours
        power_kw = kwh / duration_hours if duration_hours > 0 else 0

        # Iterate in 15-minute intervals for better precision
        step_minutes = 15
        step_hours = step_minutes / 60.0
        
        multiplier = CostOptimizer.PRIORITY_MULTIPLIERS.get(priority, 1.0)

        while remaining_duration > 0:
            effective_step = min(step_hours, remaining_duration)
            
            if CostOptimizer.is_peak_hour(current_time):
                rate = CostOptimizer.PEAK_RATE
            elif CostOptimizer.is_solar_hour(current_time):
                rate = CostOptimizer.SOLAR_RATE
            else:
                rate = CostOptimizer.OFF_PEAK_RATE
            
            # Apply priority multiplier to the rate
            final_rate = rate * multiplier
            cost += (power_kw * effective_step) * final_rate
            
            remaining_duration -= effective_step
            current_time += timedelta(minutes=step_minutes)
            
        return cost

    @staticmethod
    def find_optimal_start_time(kwh: float, duration_hours: float, departure_time: datetime, current_time: datetime) -> datetime:
        """
        Find best start time to minimize cost before departure.
        """
        # Latest we can start is departure - duration
        latest_start = departure_time - timedelta(hours=duration_hours)
        
        if latest_start < current_time:
            return current_time # Must start now (or impossible, but let's do best effort)

        best_time = current_time
        min_cost = float('inf')

        # Check every 30 mins from now until latest_start
        check_time = current_time
        
        # Limit lookahead to avoid infinite loops if something is wrong, though logic should hold
        while check_time <= latest_start:
            cost = CostOptimizer.calculate_cost(kwh, check_time, duration_hours)
            if cost < min_cost:
                min_cost = cost
                best_time = check_time
            
            check_time += timedelta(minutes=30)
                
        return best_time
