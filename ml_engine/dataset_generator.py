"""
Synthetic Smart-Meter Dataset Generator
Simulates realistic microgrid smart-meter time-series data:
- Solar photovoltaic generation (peaking at solar noon ~12:00-14:00, zero at night)
- Household load consumption (morning peak ~07:00-09:00, evening peak ~18:00-22:00)
- Environmental factors: Solar irradiance (W/m2), ambient temperature (°C), cloud cover (%)
"""

import pandas as pd
import numpy as np
import os

def generate_smart_meter_data(num_days=60, output_path="smart_meter_dataset.csv"):
    np.random.seed(42)
    timestamps = pd.date_range(start="2026-01-01 00:00", periods=num_days * 24, freq="h")
    
    records = []
    
    for ts in timestamps:
        hour = ts.hour
        day_of_week = ts.dayofweek
        is_weekend = 1 if day_of_week >= 5 else 0
        
        # Environmental simulation
        # Solar radiation roughly follows a bell curve during daytime (06:00 to 18:00)
        if 6 <= hour <= 18:
            sun_angle = np.sin((hour - 6) / 12.0 * np.pi)
            cloud_cover = np.clip(np.random.normal(25, 20), 0, 100)
            irradiance = max(0, sun_angle * 1000 * (1 - cloud_cover / 120.0) + np.random.normal(0, 20))
            temp = 20 + 12 * sun_angle + np.random.normal(0, 2)
        else:
            cloud_cover = np.clip(np.random.normal(20, 15), 0, 100)
            irradiance = 0.0
            temp = 18 - 3 * np.cos(hour / 24.0 * np.pi) + np.random.normal(0, 1)

        # Solar PV Generation (kW) for typical 5kW rooftop system
        # Efficiency ~18%, inverter clipping, panel temperature derating
        temp_derate = max(0.8, 1 - 0.004 * max(0, temp - 25))
        solar_gen = (irradiance / 1000.0) * 5.0 * temp_derate * np.random.uniform(0.92, 1.0)
        solar_gen = max(0.0, round(float(solar_gen), 2))
        
        # Household Consumption (kW)
        # Baseline standby load: ~0.4 kW
        # Morning peak (07:00-09:00): breakfast, hot water, getting ready -> +1.8-2.5 kW
        # Evening peak (18:00-22:00): cooking, AC/heating, entertainment -> +2.5-4.0 kW
        base_load = 0.45 + np.random.normal(0, 0.05)
        
        morning_peak = 2.0 * np.exp(-((hour - 8)**2) / 2.0)
        evening_peak = 3.2 * np.exp(-((hour - 20)**2) / 3.5)
        weekend_boost = 0.5 if is_weekend and (10 <= hour <= 17) else 0.0
        
        consumption = base_load + morning_peak + evening_peak + weekend_boost + np.random.normal(0, 0.2)
        consumption = max(0.2, round(float(consumption), 2))
        
        # Net balance: positive = surplus (prosumer), negative = deficit (consumer)
        net_balance = round(solar_gen - consumption, 2)
        surplus = max(0.0, net_balance)
        deficit = max(0.0, -net_balance)
        
        records.append({
            "timestamp": str(ts),
            "hour": hour,
            "day_of_week": day_of_week,
            "is_weekend": is_weekend,
            "temperature_c": round(float(temp), 1),
            "irradiance_wm2": round(float(irradiance), 1),
            "cloud_cover_pct": round(float(cloud_cover), 1),
            "solar_gen_kwh": solar_gen,
            "consumption_kwh": consumption,
            "surplus_kwh": surplus,
            "deficit_kwh": deficit
        })
        
    df = pd.DataFrame(records)
    current_dir = os.path.dirname(os.path.abspath(__file__))
    full_path = os.path.join(current_dir, output_path)
    df.to_csv(full_path, index=False)
    print(f"[Dataset Generator] Successfully generated {len(df)} records at: {full_path}")
    return df

if __name__ == "__main__":
    generate_smart_meter_data()
