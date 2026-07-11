import pandas as pd
import numpy as np


def create_features(df):

    df = df.copy()

    df["return"] = (
        df["close"]
        .pct_change()
    )


    df["ma20"] = (
        df["close"]
        .rolling(20)
        .mean()
    )


    df["ma50"] = (
        df["close"]
        .rolling(50)
        .mean()
    )


    df["volatility"] = (
        df["return"]
        .rolling(20)
        .std()
    )


    delta = df["close"].diff()

    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)


    avg_gain = gain.rolling(14).mean()
    avg_loss = loss.rolling(14).mean()


    rs = avg_gain / avg_loss

    df["rsi"] = (
        100 -
        (100/(1+rs))
    )


    return (
        df
        .dropna()
        .reset_index(drop=True)
    )
