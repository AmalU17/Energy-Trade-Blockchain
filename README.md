# ⚡ VoltP2P: Decentralized Peer-to-Peer Renewable Energy Marketplace

> **5th Semester B.Tech Blockchain Project**  
> Complete end-to-end implementation tailored to academic rubrics:
> 1. **Output & Execution (5 Marks)**: Live web dashboard, real-time smart meter simulation, ML forecasting, and live P2P marketplace.
> 2. **Tools Integration (5 Marks)**: MetaMask Web3 Wallet + Responsive UI + Solidity Smart Contract + Sepolia TestNet + **Solidity code strictly formatted for Remix IDE**.
> 3. **Oral Presentation (3 Marks - Binary 0/3)**: Word-for-word pitch script + 10 tough viva defense questions & answers.
> 4. **Report (2 Marks)**: 5-Page formal academic project synopsis report formatted for AUMS submission.

---

## 📁 Repository Structure
```
energy/
├── contracts/
│   └── EnergyTrade.sol          # Production Solidity Smart Contract (for Remix IDE)
├── ml_engine/
│   ├── dataset_generator.py     # Simulates realistic smart-meter time-series data
│   ├── energy_predictor.py      # Random Forest regression model (Solar & Load forecast)
│   ├── matching_engine.py       # Multi-objective matching algorithm with line-loss penalty
│   ├── smart_meter_dataset.csv  # 2,160 synthetic hourly meter data records
│   └── forecast_results.json    # Precomputed 24h ML forecast results
├── frontend/
│   ├── index.html               # Web3 Cyber-Solar Dashboard
│   ├── style.css                # Glassmorphic UI stylesheet
│   ├── app.js                   # Pure MetaMask Web3 logic & smart contract event handling
│   ├── abi.js                   # EnergyTrade Contract ABI definition
│   ├── config.js                # Contract address & network configurations (Sepolia / Mainnet / Localhost)
│   └── forecast_results.json    # Synced ML predictions for Chart.js
├── docs/
│   ├── REMIX_DEPLOYMENT_GUIDE.md # Step-by-step Remix IDE & Sepolia TestNet deployment
│   ├── ORAL_PRESENTATION_SCRIPT.md # 3-Minute Verbal Pitch + 10 Viva Defense Q&As
│   └── PROJECT_SYNOPSIS_REPORT.md  # 5-Page formal synopsis report for AUMS
├── server.js                    # Zero-dependency local Node.js web server
├── package.json                 # Project metadata & npm script shortcuts
└── README.md                    # Project overview & quickstart
```

---

## ⚡ Quick Start: Running the Project in 60 Seconds

### Step 1: Start the Web Dashboard
Open your terminal in `energy`:
```bash
npm start
```
*Or:*
```bash
node server.js
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser!

### Step 2: Show Smart Contract in Remix IDE *(Rubric Requirement)*
1. Open **[https://remix.ethereum.org](https://remix.ethereum.org)**.
2. Create a new file: `EnergyTrade.sol`.
3. Copy and paste the code from [`contracts/EnergyTrade.sol`](contracts/EnergyTrade.sol).
4. Compile with Solidity version `0.8.20`.
5. In the **Deploy & Run Transactions** tab:
   - Select **"Injected Provider - MetaMask"** (for Sepolia TestNet) or **"Remix VM"** (for instant testing).
   - Click **Deploy**.
   - Copy the deployed contract address.
6. Paste the contract address into the top input bar on the VoltP2P Web Dashboard and click **"Set Address"**!

*(Detailed instructions are available in [`docs/REMIX_DEPLOYMENT_GUIDE.md`](docs/REMIX_DEPLOYMENT_GUIDE.md).)*

### Step 3: Run / Retrain Machine Learning Engine *(Optional)*
The ML predictions are already pre-computed and bundled into the UI. To retrain or inspect the models:
```bash
python ml_engine/energy_predictor.py
```
**Model Accuracy:**
- Solar PV Generation: $R^2 = 0.9989$ | $\text{RMSE} = 0.0468\text{ kW}$
- Household Consumption: $R^2 = 0.9510$ | $\text{RMSE} = 0.2090\text{ kW}$

---

## 🎯 Key Features Demonstrated in the UI

1. **Native MetaMask Web3 Wallet Integration**:
   - **Direct 1-Click Connection**: Integrates seamlessly with personal MetaMask browser extensions on Sepolia TestNet (no Ganache required).
   - **Reactive Account & Network Switching**: Automatically detects active address, ETH balance, and network changes (`accountsChanged`, `chainChanged`).
   - **Cryptographic Signing**: All blockchain actions (listing surplus solar, purchasing energy with atomic Wei transfer, syncing smart-meter telemetry) are signed securely through MetaMask.

2. **Smart-Meter IoT Simulator**:
   - Live gauges for Solar Generation (kW), Household Load (kW), and Net Balance (Surplus/Deficit).
   - Quick time-of-day presets: **Night (02:00)**, **Morning (08:00)**, **Solar Noon (13:00)**, **Evening Peak (20:00)**.
   - Fine-tuning sliders to test edge cases.
   - **Sync to Blockchain**: Submits reading to `updateMeterReading()` on the smart contract via MetaMask.

3. **ML 24-Hour Solar & Demand Forecaster**:
   - Dynamic Chart.js interactive visualization.
   - Highlights surplus solar trading windows (11:00 AM - 3:00 PM).
   - Displays predictive recommendation cards (`RECOMMEND_SELL`, `RECOMMEND_BUY`, `GRID_BALANCED`).

4. **Multi-Objective P2P Marketplace**:
   - Prosumers list surplus energy via `listEnergy(...)`.
   - **Grid Loss-Aware Matching Engine**: Calculates line dissipation:
     $$\text{Loss\%} = \min\left(25\%, 4\% \times |\text{Zone}_{\text{seller}} - \text{Zone}_{\text{buyer}}|^{1.3}\right)$$
   - Dynamically highlights **"BEST MATCH"** sellers to minimize transmission loss.
   - Buyers purchase energy using `buyEnergy(...)` with atomic ETH transfer to the seller.

5. **Immutable Blockchain Ledger**:
   - Queries `getTradeHistory()` from the contract.
   - Displays real-time verified transaction hashes, energy transferred, ETH values, and timestamps.

6. **Web3 Event Console**:
   - Live stream at the bottom of the page capturing contract events (`EnergyListed`, `EnergyPurchased`, `MeterUpdated`, `ListingCancelled`) with direct links to Etherscan.

---

## 📚 Evaluation & Viva Resources
- 📄 **AUMS Synopsis Report (Max 5 Pages)**: [`docs/PROJECT_SYNOPSIS_REPORT.md`](docs/PROJECT_SYNOPSIS_REPORT.md)
- 🎙️ **Oral Presentation & Viva Script (3 Marks Binary)**: [`docs/ORAL_PRESENTATION_SCRIPT.md`](docs/ORAL_PRESENTATION_SCRIPT.md)
- 🛠️ **Remix IDE Deployment Guide**: [`docs/REMIX_DEPLOYMENT_GUIDE.md`](docs/REMIX_DEPLOYMENT_GUIDE.md)
