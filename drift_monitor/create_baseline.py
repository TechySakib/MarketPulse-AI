import os
import json
import pandas as pd

from feature_engineering import create_features


DATA_PATH="training_data/"
OUTPUT="drift_baseline/"


os.makedirs(
    OUTPUT,
    exist_ok=True
)


companies=os.listdir(DATA_PATH)


for company in companies:


    file=f"{DATA_PATH}/{company}.csv"


    df=pd.read_csv(file)


    features=create_features(df)


    baseline={}


    columns=[
        "close",
        "volume",
        "return",
        "ma20",
        "ma50",
        "volatility",
        "rsi"
    ]


    for col in columns:

        baseline[col]=(
            features[col]
            .tolist()
        )


    with open(
        f"{OUTPUT}/{company}.json",
        "w"
    ) as f:

        json.dump(
            baseline,
            f
        )


    print(
        company,
        "saved"
    )