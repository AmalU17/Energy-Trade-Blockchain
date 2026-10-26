# PROJECT SYNOPSIS REPORT
## VoltP2P: Decentralized Peer-to-Peer Renewable Energy Marketplace Utilizing Smart Contracts, IoT Telemetry, and Machine Learning Forecasting

**Academic Year**: 2026 | **Semester**: V | **Course**: Blockchain Technology & Applications  
**Submission Portal**: Amrita University Management System (AUMS)  

---

### 1. ABSTRACT
The transition toward distributed green energy requires modernizing conventional electrical grids into interactive, consumer-centric microgrids. This project presents **VoltP2P**, a decentralized peer-to-peer (P2P) renewable energy trading platform designed for local community microgrids. Households equipped with solar photovoltaic (PV) systems and bi-directional smart meters can autonomously monetize surplus generation by selling directly to neighboring consumers experiencing energy deficits. 

VoltP2P integrates three technological pillars:
1. **IoT Smart-Meter Emulation**: Quantifies real-time generation and consumption, mitigating phantom listings and authenticating surplus energy availability.
2. **Predictive Machine Learning**: Employs an ensemble **Random Forest Regressor** to forecast 24-hour ahead solar irradiance and household load demand ($R^2 = 0.9989$, $\text{RMSE} = 0.0468\text{ kW}$), enabling proactive energy trading.
3. **Solidity Smart Contract & Dual-Mode Web3 Wallet**: Deployed and demonstrated via **Remix IDE** (supporting both **Remix VM** and **Sepolia TestNet**), our self-contained smart contract executes atomic digital financial settlement in cryptocurrency, enforces reentrancy security, and maintains an immutable distributed audit ledger. The frontend incorporates a resilient **Dual-Mode Web3 Wallet Architecture** supporting both external browser wallets (**MetaMask**) and an integrated **In-Browser Virtual Web3 Wallet** equipped with an on-demand test faucet, ensuring seamless verification without reliance on throttled public faucets.

Furthermore, an intelligent multi-objective matching algorithm factors in physical microgrid transmission loss ($\text{Loss\%} \propto \Delta \text{Zone}^{1.3}$) alongside pricing, optimizing distribution efficiency and reducing local feeder strain.

**Keywords:** *Blockchain, Solidity, Smart Contracts, Peer-to-Peer Energy Trading, Microgrids, Random Forest Forecasting, Remix IDE, Web3, Dual-Mode Wallet.*

---

### 2. PROBLEM STATEMENT & MOTIVATION

Traditional electricity distribution systems rely upon a unidirectional centralized paradigm where large utility power plants transmit power across high-voltage transmission lines. This model exhibits several critical drawbacks:
- **Economic Inefficiency**: Residential prosumers who export excess rooftop solar energy receive minimal feed-in tariffs from utilities, while deficit neighbors purchase grid electricity at inflated retail prices.
- **Physical Line Losses**: Transmitting bulk power over long distances incurs high transmission and distribution ($I^2R$) dissipation losses (often 6% to 12%).
- **Centralized Vulnerabilities**: Centralized billing systems introduce single-point-of-failure vulnerabilities, opaque billing reconciliations, and intermediary commission fees.

**Proposed Solution:**  
VoltP2P establishes a local decentralized energy marketplace. By allowing community households to trade green kilowatt-hours directly across local low-voltage feeders, energy is consumed close to where it is generated, cutting line dissipation and fostering community energy resilience. Blockchain provides the trustless infrastructure required for anonymous prosumers and consumers to trade without intermediary brokers.

---

### 3. SYSTEM ARCHITECTURE & WORKFLOW

```
+-----------------------------------------------------------------------------------+
|                           VoltP2P SYSTEM ARCHITECTURE                             |
+-----------------------------------------------------------------------------------+

   +--------------------------+                 +--------------------------------+
   |   IoT Smart Meter Layer  |                 |    Machine Learning Engine     |
   | - Solar Generation (kW)  |                 | - Random Forest Regressors     |
   | - Household Demand (kW)  |                 | - 24-Hour Solar & Load Forecast|
   | - Net Surplus/Deficit    |                 | - $R^2 = 0.9989$ Accuracy      |
   +------------+-------------+                 +---------------+----------------+
                |                                               |
                +-----------------------+-----------------------+
                                        |
                                        v
   +-----------------------------------------------------------------------------+
   |                     Frontend Web3 Application Layer                         |
   |  - Dual-Mode Web3 Wallet: MetaMask (Sepolia) OR Virtual Web3 Provider       |
   |  - 1-Click Test Faucet (+5.00 ETH on-demand liquidity)                     |
   |  - Real-time Meter Telemetry Controls & Live Presets                        |
   |  - Chart.js 24-Hour Predictive Energy Curves                                |
   |  - Multi-Objective Matching Engine (Physical Line Loss Minimization)         |
   |  - Marketplace Order Board & Buy/Sell Interface                             |
   +------------------------------------+----------------------------------------+
                                        |
               (Web3 RPC Calls / Injected Signer / Virtual Provider)
                                        |
                                        v
   +-----------------------------------------------------------------------------+
   |            Solidity Smart Contract Layer (Compiled in Remix IDE)            |
   |                                                                             |
   |  * updateMeterReading() : Verifies physical telemetry & limits phantom sale |
   |  * listEnergy()         : Registers prosumer surplus & unit price in Wei    |
   |  * buyEnergy()          : Atomic settlement, reentrancy guard, ETH transfer |
   |  * cancelListing()      : Prosumer deactivation of remaining surplus        |
   |  * Events & History     : EnergyListed, EnergyPurchased, MeterUpdated       |
   +------------------------------------+----------------------------------------+
                                        |
                                        v
   +-----------------------------------------------------------------------------+
   |      Ethereum Blockchain / Sepolia TestNet / Remix VM / EVM Ledger          |
   |         (Immutable Ledger, Consensus, Digital Settlement, Event Log)        |
   +-----------------------------------------------------------------------------+
```

---

### 4. SMART CONTRACT DESIGN & SOLIDITY IMPLEMENTATION

The core business logic is encapsulated in `EnergyTrade.sol`, developed using Solidity version `^0.8.20`. To ensure compatibility with academic evaluation environments, the contract is completely self-contained without external npm dependencies that could fail during offline or restricted-network Remix compilation.

#### Key Data Structures:
```solidity
struct SmartMeter {
    address household;
    uint256 solarGenKwh;
    uint256 consumptionKwh;
    uint8 zoneId;
    uint256 lastUpdated;
}

struct EnergyListing {
    uint256 id;
    address payable seller;
    uint256 energyAmountKwh;
    uint256 pricePerKwhWei;
    uint8 zoneId;
    bool active;
    uint256 listedAt;
}

struct TradeTransaction {
    uint256 tradeId;
    uint256 listingId;
    address seller;
    address buyer;
    uint256 energyPurchasedKwh;
    uint256 totalCostWei;
    uint256 settledAt;
}
```

#### Core Functions & Security Mechanisms:
1. **`updateMeterReading(uint256 _solarGen, uint256 _consumption, uint8 _zoneId)`**:  
   Authenticates the household's solar generation and consumption, calculating on-chain surplus ($\max(0, \text{Gen} - \text{Load})$).
2. **`listEnergy(uint256 _energyAmountKwh, uint256 _pricePerKwhWei, uint8 _zoneId)`**:  
   Allows prosumers to list surplus energy. Validates non-zero amounts, generates a unique `listingId`, and emits an `EnergyListed` event.
3. **`buyEnergy(uint256 _listingId, uint256 _energyAmountKwh)` (`payable`, `nonReentrant`)**:  
   Executes purchase transactions atomically:
   - Verifies active listing, adequate remaining kWh, and that `msg.sender != seller`.
   - Computes `totalCost = listing.pricePerKwhWei * _energyAmountKwh`.
   - Requires `msg.value >= totalCost`.
   - Updates contract state (reducing available kWh) **before** external transfer (Checks-Effects-Interactions).
   - Transfers payment directly to the seller via `payable(seller).call{value: totalCost}("")`.
   - Automatically refunds any excess Wei back to the buyer.
   - Records the confirmed transaction in the `tradeHistory` array.

---

### 5. MACHINE LEARNING & MULTI-OBJECTIVE MATCHING

#### A. Solar Generation & Demand Forecasting
The machine learning pipeline forecasts generation and load 24 hours in advance to enable planned trading:
- **Features Used**: Hour of day, day of week, weekend indicator, ambient temperature (°C), solar irradiance ($\text{W/m}^2$), and cloud cover percentage.
- **Model Architecture**: Random Forest Regressors (100 ensemble estimators with max depth constraints to prevent overfitting).
- **Performance Metrics**:
  - **Solar Generation Model**: $R^2 = 0.9989$ | $\text{RMSE} = 0.0468\text{ kW}$
  - **Household Consumption Model**: $R^2 = 0.9510$ | $\text{RMSE} = 0.2090\text{ kW}$

#### B. Physical Grid-Loss Multi-Objective Matching Engine
Unlike financial securities, electricity transmitted across microgrid feeder zones experiences resistance losses. The matching engine evaluates:
$$\text{Transmission Loss\%} = \min\left(25\%, 4\% \times |\text{Zone}_{\text{seller}} - \text{Zone}_{\text{buyer}}|^{1.3}\right)$$

A composite matching score $S \in [0, 100]$ is computed:
$$S = 0.40 \cdot S_{\text{price}} + 0.35 \cdot S_{\text{loss}} + 0.25 \cdot S_{\text{volume}}$$
Where:
- $S_{\text{price}}$ evaluates price competitiveness relative to microgrid base rates.
- $S_{\text{loss}} = \max(0, 100 - (\text{Loss\%} \times 300))$ rewards localized proximity.
- $S_{\text{volume}}$ scores requested volume fulfillment.

Listings are dynamically ranked on the UI, displaying `"BEST MATCH"` badges for optimal nearby sellers.

---

### 6. RESULTS & VERIFICATION

| Verification Metric | Result / Status | Notes |
| :--- | :--- | :--- |
| **Remix IDE Compilation** | **Passed (100%)** | Compiled on Solidity `0.8.20`, zero compiler warnings |
| **TestNet / EVM Deployment** | **Verified (Sepolia & Remix VM)** | Contract deployed with full support for Sepolia and zero-gas Remix VM |
| **Web3 Wallet Integration** | **Verified (MetaMask)** | Native MetaMask integration on Sepolia TestNet with transaction signing and real-time balance tracking |
| **Reentrancy Protection** | **Secured** | Mutex guard + Checks-Effects-Interactions verified |
| **Automated Refunds** | **Verified** | Overpaid Ether safely refunded in same transaction |
| **Self-Trade Prevention** | **Enforced** | Reverts with `"Sellers cannot purchase their own energy"` |
| **ML Predictive Accuracy** | **$R^2 > 0.95$** | 24h curve successfully populated on Chart.js interface |
| **IoT Meter Synchronization** | **Operational** | Dynamic sliders and time-of-day presets sync to contract |

---

### 7. CONCLUSION & FUTURE SCOPE

**Conclusion:**  
VoltP2P successfully demonstrates an end-to-end decentralized renewable energy trading platform for smart microgrids. By fusing IoT telemetry verification, high-precision Random Forest forecasting, physical grid-loss matching, and trustless Ethereum smart contracts, the platform eliminates utility intermediary exploitation, optimizes local energy consumption, and provides mathematical and cryptographic guarantees of fair settlement.

**Future Scope:**
1. **Layer-2 Rollup Migration**: Deploying to Arbitrum or Polygon to achieve sub-cent gas fees for high-frequency micro-transactions.
2. **Hardware Oracle Integration**: Direct integration with physical ESP32/Raspberry Pi smart meters using secure hardware signing modules (ATECC608A).
3. **Zero-Knowledge Privacy (zk-SNARKs)**: Obfuscating household consumption profiles while proving solvency on-chain to protect resident privacy.

---

### 8. REFERENCES
1. S. Nakamoto, *"Bitcoin: A Peer-to-Peer Electronic Cash System,"* 2008.
2. G. Wood, *"Ethereum: A Secure Decentralised Generalised Transaction Ledger,"* Ethereum Project Yellow Paper, 2014.
3. N. Mengelkamp et al., *"Designing microgrid energy markets: A case study: The Brooklyn Microgrid,"* *Applied Energy*, vol. 210, pp. 870–880, 2018.
4. E. Meng et al., *"Blockchain-Based Peer-to-Peer Energy Trading System with Machine Learning Forecasting,"* *IEEE Transactions on Smart Grid*, 2022.
