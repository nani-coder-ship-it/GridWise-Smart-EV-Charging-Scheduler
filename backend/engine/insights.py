class InsightsGenerator:
    @staticmethod
    def generate_insight(request, allocation):
        if allocation.peak_optimized:
             return {
                "message": f"Dynamic Load Redistribution shifted charging to {allocation.allocated_start_time.strftime('%H:%M')}, reducing peak stress and saving ${allocation.cost_without_optimization - allocation.estimated_cost:.2f}.",
                "type": "success"
             }
        elif request.priority_level == 'emergency':
             return {
                "message": "Emergency priority active. Immediate allocation granted despite grid load.",
                "type": "warning"
             }
        else:
            return {
                "message": "Standard allocation based on grid availability.",
                "type": "info"
            }
