import json
import os
from datetime import datetime

PATH = "drift_history/"

os.makedirs(
    PATH,
    exist_ok=True
)


def save_history(symbol, score):
    file = f"{PATH}/{symbol}.json"
    data = []

    if os.path.exists(file):
        try:
            with open(file, "r") as f:
                data = json.load(f)
        except Exception:
            data = []

    # Ensure overall score is float
    try:
        score = float(score)
    except ValueError:
        score = 0.0

    data.append({
        "date": str(datetime.now().date()),
        "score": round(score, 4)
    })

    data = data[-90:]

    with open(file, "w") as f:
        json.dump(data, f)

    return data