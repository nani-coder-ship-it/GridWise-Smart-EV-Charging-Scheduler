class FairnessEngine:
    @staticmethod
    def update_fairness_score(vehicle_id: str, current_score: float, was_delayed: bool) -> float:
        """
        If delayed/shifted for grid benefit, increase score (higher priority next time).
        If served immediately during peak, decrease score slightly.
        """
        if was_delayed:
            return min(5.0, current_score + 0.5)
        else:
            return max(0.5, current_score - 0.1)

    @staticmethod
    def calculate_priority_score(request) -> float:
        """
        Composite score for sorting queue.
        Base points: Emergency=100, Normal=50, Flexible=10
        + Fairness Score * 10
        - Battery % (Lower battery = higher priority)
        """
        base_points = {
            'emergency': 100,
            'normal': 50,
            'flexible': 10
        }.get(request.priority_level, 10)
        
        # Lower battery adds points (e.g. 20% -> +80 points, 90% -> +10 points)
        battery_points = (100 - request.current_battery_percent)
        
        fairness_points = request.fairness_score * 10
        
        return base_points + battery_points + fairness_points
