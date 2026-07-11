
def get_status(score):

    if score < 0.10:

        return {
        "status":"Stable",
        "message":
        "Market behavior matches training distribution."
        }


    elif score <0.25:

        return {
        "status":"Mild Drift",
        "message":
        "Small market behavior change detected."
        }


    elif score <0.50:

        return {
        "status":"Moderate Drift",
        "message":
        "Market pattern changed. Monitor prediction confidence."
        }


    else:

        return {
        "status":"High Drift",
        "message":
        "Retraining recommended."
        }