"""
Machine Learning Energy Predictor & Forecaster
Trains Random Forest Regressors to predict:
1. Solar PV Generation (kW) based on hour, temperature, irradiance, cloud cover
2. Household Demand Load (kW) based on hour, day_of_week, weekend status, temperature

Outputs:
- Model performance metrics (R2 score, RMSE)
- Next 24-Hour hourly forecast JSON for the Web3 Dashboard UI
"""

import os
import json
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_squared_error

try:
    from dataset_generator import generate_smart_meter_data
except ImportError:
    from ml_engine.dataset_generator import generate_smart_meter_data

def train_and_forecast():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    data_path = os.path.join(base_dir, "smart_meter_dataset.csv")
    
    if not os.path.exists(data_path):
        print("[Predictor] Dataset not found, generating new synthetic smart-meter dataset...")
        df = generate_smart_meter_data(num_days=90, output_path="smart_meter_dataset.csv")
    else:
        df = pd.read_csv(data_path)

    # 1. Solar Generation Model Features & Target
    solar_features = ["hour", "temperature_c", "irradiance_wm2", "cloud_cover_pct"]
    X_solar = df[solar_features]
    y_solar = df["solar_gen_kwh"]

    X_s_train, X_s_test, y_s_train, y_s_test = train_test_split(X_solar, y_solar, test_size=0.2, random_state=42)
    solar_model = RandomForestRegressor(n_estimators=100, max_depth=12, random_state=42)
    solar_model.fit(X_s_train, y_s_train)

    y_s_pred = solar_model.predict(X_s_test)
    solar_r2 = r2_score(y_s_test, y_s_pred)
    solar_rmse = np.sqrt(mean_squared_error(y_s_test, y_s_pred))

    # 2. Consumption Model Features & Target
    load_features = ["hour", "day_of_week", "is_weekend", "temperature_c"]
    X_load = df[load_features]
    y_load = df["consumption_kwh"]

    X_l_train, X_l_test, y_l_train, y_l_test = train_test_split(X_load, y_load, test_size=0.2, random_state=42)
    load_model = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42)
    load_model.fit(X_l_train, y_l_train)

    y_l_pred = load_model.predict(X_l_test)
    load_r2 = r2_score(y_l_test, y_l_pred)
    load_rmse = np.sqrt(mean_squared_error(y_l_test, y_l_pred))

    print("================ ML MODEL PERFORMANCE METRICS ================")
    print(f"Solar Generation Model -> R2 Score: {solar_r2:.4f} | RMSE: {solar_rmse:.4f} kW")
    print(f"Household Demand Model -> R2 Score: {load_r2:.4f} | RMSE: {load_rmse:.4f} kW")
    print("==============================================================")

    # 3. Generate Next 24-Hour Forecast
    hours = list(range(24))
    forecast_timeline = []

    for h in hours:
        # Simulate tomorrow's weather profiles
        if 6 <= h <= 18:
            sun_val = np.sin((h - 6) / 12.0 * np.pi)
            pred_irradiance = max(0, sun_val * 950)
            pred_temp = 22 + 10 * sun_val
            pred_cloud = 20.0
        else:
            pred_irradiance = 0.0
            pred_temp = 19 - 2 * np.cos(h / 24.0 * np.pi)
            pred_cloud = 15.0

        solar_input = pd.DataFrame([{
            "hour": h,
            "temperature_c": pred_temp,
            "irradiance_wm2": pred_irradiance,
            "cloud_cover_pct": pred_cloud
        }])
        
        load_input = pd.DataFrame([{
            "hour": h,
            "day_of_week": 2, # Wednesday simulation
            "is_weekend": 0,
            "temperature_c": pred_temp
        }])

        pred_solar = max(0.0, round(float(solar_model.predict(solar_input)[0]), 2))
        pred_load = max(0.2, round(float(load_model.predict(load_input)[0]), 2))
        
        net_surplus = round(max(0.0, pred_solar - pred_load), 2)
        net_deficit = round(max(0.0, pred_load - pred_solar), 2)
        
        # Decision recommendation
        if net_surplus > 0.5:
            action = "RECOMMEND_SELL"
            reason = f"Solar surplus of {net_surplus} kWh available. High trading profit window."
        elif net_deficit > 0.5:
            action = "RECOMMEND_BUY"
            reason = f"Deficit of {net_deficit} kWh anticipated. Schedule microgrid P2P purchase."
        else:
            action = "GRID_BALANCED"
            reason = "Generation matches consumption. Zero trade required."

        forecast_timeline.append({
            "hour": f"{h:02d}:00",
            "predicted_solar_kwh": pred_solar,
            "predicted_load_kwh": pred_load,
            "predicted_surplus_kwh": net_surplus,
            "predicted_deficit_kwh": net_deficit,
            "recommendation": action,
            "reason": reason
        })

    forecast_output = {
        "model_metadata": {
            "algorithm": "RandomForestRegressor (Ensemble of 100 Decision Trees)",
            "solar_model_r2": round(solar_r2, 4),
            "solar_model_rmse": round(solar_rmse, 4),
            "load_model_r2": round(load_r2, 4),
            "load_model_rmse": round(load_rmse, 4),
            "training_samples": len(df)
        },
        "forecast_24h": forecast_timeline
    }

    # Save to ml_engine and frontend directory
    ml_output_path = os.path.join(base_dir, "forecast_results.json")
    frontend_dir = os.path.join(os.path.dirname(base_dir), "frontend")
    frontend_output_path = os.path.join(frontend_dir, "forecast_results.json")

    with open(ml_output_path, "w") as f:
        json.dump(forecast_output, f, indent=2)

    os.makedirs(frontend_dir, exist_ok=True)
    with open(frontend_output_path, "w") as f:
        json.dump(forecast_output, f, indent=2)

    print(f"[Predictor] 24-Hour Forecast successfully saved to:\n - {ml_output_path}\n - {frontend_output_path}")
    return forecast_output

if __name__ == "__main__":
    train_and_forecast()
