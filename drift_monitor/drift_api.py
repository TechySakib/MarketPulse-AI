import json

from flask import jsonify

from feature_engineering import create_features
from wasserstein import calculate_drift
from recommendation import get_status
from drift_history import save_history



def drift_endpoint(
        symbol,
        live_dataframe
):


    with open(
        f"drift_baseline/{symbol}.json"
    ) as f:

        training=json.load(f)



    live_features=create_features(
        live_dataframe
    )


    live={}


    for col in training:

        live[col]=(
            live_features[col]
            .tolist()
        )


    result=calculate_drift(
        training,
        live
    )


    status=get_status(
        result["overall"]
    )


    history=save_history(
        symbol,
        result["overall"]
    )


    return jsonify({

        "symbol":symbol,

        "drift_score":
        result["overall"],

        "status":
        status["status"],

        "features":
        result["features"],

        "timeline":
        history,

        "recommendation":
        status["message"]

    })