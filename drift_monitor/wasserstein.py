from scipy.stats import wasserstein_distance


def calculate_drift(
        training,
        live
):

    score={}


    for feature in training:


        score[feature]=round(

            wasserstein_distance(

                training[feature],

                live[feature]

            ),

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