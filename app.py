from flask import Flask, render_template, request, jsonify
import pandas as pd
import joblib
import os
import random
from datetime import datetime

app = Flask(__name__)

# --- STEP 1: LOAD MODELS & DATA ---
try:
    regressor = joblib.load('cyber_regressor.pkl')
    le_district = joblib.load('district_encoder.pkl')
    crime_columns = joblib.load('crime_columns.pkl')
    df_historical = pd.read_pickle('historical_data.pkl')
    print("✅ Strategic Intelligence & Historical Data Loaded")
except Exception as e:
    print(f"❌ Error loading files: {e}")

# --- STEP 2: SCALABLE DEFENSE ENGINE (HOD REQUESTED LOGIC) ---
def run_realtime_defense(district_name, risk_level):
    """
    Filters traffic based on risk level.
    HIGH Risk: Scaled attacks (many blocks).
    MEDIUM Risk: Moderate attacks.
    LOW Risk: Minimal attacks (1-2 blocks) to show protection is always ON.
    """
    BLACKLIST_IPS = ["103.25.12.1", "45.77.10.5", "182.16.0.1", "110.45.2.3", "190.12.5.1"]
    ABNORMAL_LIMIT = 50 
    
    # Scale number of logs based on Risk Level
    if risk_level == "HIGH":
        num_packets = 25
        attack_count = 8  # Show many blocked attempts
    elif risk_level == "MEDIUM":
        num_packets = 15
        attack_count = 4  # Show moderate blocked attempts
    else:  # LOW risk
        num_packets = 10
        attack_count = 2  # Show only 1-2 blocked attempts to prove filter works

    logs = []
    
    for i in range(num_packets):
        # Force specific number of 'attack' packets based on scale above
        is_attack = (i < attack_count)
        
        if is_attack:
            # Attacks are either blacklisted IPs or high volume bursts
            ip = random.choice(BLACKLIST_IPS)
            count = random.randint(80, 300)
        else:
            # Normal traffic
            ip = f"192.168.1.{random.randint(10, 255)}"
            count = random.randint(1, 15)
        
        # --- THE FILTER (Log Analysis + Detection) ---
        if ip in BLACKLIST_IPS:
            action = "❌ BLOCKED: Blacklisted IP"
            status = "Danger"
        elif count > ABNORMAL_LIMIT:
            action = "🚨 ALERT: Swarm Attack Detected"
            status = "Warning"
        else:
            action = "✅ ALLOWED: Normal Traffic"
            status = "Safe"
            
        logs.append({
            "timestamp": datetime.now().strftime("%H:%M:%S.%f")[:-3],
            "ip": ip,
            "requests": count,
            "action": action,
            "status": status
        })
    
    # Shuffle so attacks don't all appear at the top
    random.shuffle(logs)
    return logs

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json
    district_name = data.get('district', '').strip()

    dist_col = df_historical.columns[2] 
    actual_data = df_historical[df_historical[dist_col].astype(str).str.lower() == district_name.lower()]
    
    result = {"found": False}
    
    if len(actual_data) > 0:
        found_real_name = actual_data[dist_col].values[0]
        row_idx = actual_data.index[0]
        
        result["found"] = True
        result["actual_total"] = int(actual_data.iloc[0, -1]) 
        result["actual_risk"] = str(actual_data.at[row_idx, 'Risk_Level'])
        
        # Clean up column names for display (HOD tip)
        raw_issue = str(actual_data.at[row_idx, 'Dominant_Crime_Label'])
        result["top_issue"] = raw_issue.split('(')[0].replace('Offences under', '').strip()

        # ML Prediction
        if found_real_name in le_district.classes_:
            dist_code = le_district.transform([found_real_name])[0]
            prediction = regressor.predict([[dist_code]])
            pred_series = pd.Series(prediction[0], index=crime_columns)
            top_5 = pred_series.sort_values(ascending=False).head(5)
            
            result["pred_labels"] = [label.split('(')[0][:30] for label in top_5.index.tolist()]
            result["pred_values"] = [round(num, 2) for num in top_5.values.tolist()]

        # Scaled Defense Logs
        result["defense_logs"] = run_realtime_defense(found_real_name, result["actual_risk"])
        
    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True, use_reloader=False)