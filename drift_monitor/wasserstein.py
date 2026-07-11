import numpy as np
from scipy.stats import wasserstein_distance


def calculate_drift(
        training,
        live
):

    score={}


    for feature in training:

        train_vals = training[feature]
        live_vals = live[feature]

        # Calculate raw Wasserstein distance
        raw_dist = wasserstein_distance(
            train_vals,
            live_vals
        )

        # Normalize by standard deviation of training values
        std_train = np.std(train_vals)
        if std_train > 1e-8:
            norm_dist = raw_dist / std_train
        else:
            norm_dist = raw_dist

        score[feature]=round(
            norm_dist,
            4
        )


    overall=sum(
        score.values()
    ) / len(score)


    return {

        "features":score,

        "overall":round(
            overall,
            4
        )

    }