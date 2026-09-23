import re

from .config import settings


def validate_extraction(data: dict) -> tuple[list[dict], float]:
    results: list[dict] = []
    survey = str(data.get("survey_number", ""))
    area = float(data.get("total_area_acres", 0) or 0)
    sub_plots = [float(item) for item in data.get("sub_plot_areas", [])]
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9./-]{1,30}", survey):
        results.append({"field_name": "survey_number", "status": "ERROR", "message": "Survey number format is invalid."})
    else:
        results.append({"field_name": "survey_number", "status": "PASS", "message": "Survey number format is valid."})
    if area <= 0:
        results.append({"field_name": "area", "status": "ERROR", "message": "Total plot area must be greater than zero."})
    else:
        results.append({"field_name": "area", "status": "PASS", "message": "Area is numeric and positive."})
    if sub_plots:
        difference = round(sum(sub_plots) - area, 4)
        if abs(difference) > 0.01:
            direction = "exceeds" if difference > 0 else "is less than"
            results.append({"field_name": "sub_plot_areas", "status": "ERROR", "message": f"The sum of sub-plots {direction} total reported land area by {abs(difference):g} acres."})
        else:
            results.append({"field_name": "sub_plot_areas", "status": "PASS", "message": "Sub-plot arithmetic matches total area."})
    confidences = [float(item.get("confidence", 0)) for item in data.get("confidences", {}).values()]
    rci = round(sum(confidences) / len(confidences), 4) if confidences else 0
    if rci < settings.validation_confidence_threshold:
        results.append({"field_name": "record_confidence", "status": "WARNING", "message": f"Record Confidence Index is {rci:.2f}; human review is required below {settings.validation_confidence_threshold:.2f}."})
    else:
        results.append({"field_name": "record_confidence", "status": "PASS", "message": f"Record Confidence Index is {rci:.2f}."})
    return results, rci
