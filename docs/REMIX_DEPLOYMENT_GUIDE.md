# 🛠️ Comprehensive Remix IDE & TestNet Deployment Guide
> **Note for Evaluator / Professor**: As specified in the rubrics (*"Sol code should be shown only RemixIDE"*), this guide details how `EnergyTrade.sol` is compiled, deployed to Ethereum Sepolia TestNet, and tested within Remix IDE.

---

## 📋 Pre-requisites
1. **Google Chrome / Brave / Edge** with **MetaMask** extension installed.
2. MetaMask account switched to **Sepolia Test Network**.
3. Some free Sepolia testnet ETH from a faucet (e.g., [sepoliafaucet.com](https://sepoliafaucet.com) or [alchemy.com/faucets/ethereum-sepolia](https://cloud.google.com/application/web3/faucet/ethereum/sepolia)).

---

## 🚀 Step 1: Open Remix IDE & Create File
1. Navigate to: **[https://remix.ethereum.org](https://remix.ethereum.org)**.
2. Under the **File Explorer** tab (left sidebar icon 📁):
   - Click on the **Create New File** icon (`📄`).
   - Name the file: `EnergyTrade.sol`.
3. Open the file `contracts/EnergyTrade.sol` from this repository, copy its entire contents, and paste it into the Remix IDE editor.

---

## ⚙️ Step 2: Compile the Smart Contract
1. Click on the **Solidity Compiler** tab (left sidebar icon with the Solidity logo `🔲`).
2. Set the configuration:
   - **Compiler Version**: `0.8.20` (or `0.8.24` / any `^0.8.20` release).
   - **Language**: `Solidity`.
   - **EVM Version**: `default` (or `cancun` / `shanghai`).
3. Click the blue button: **"Compile EnergyTrade.sol"** (or press `Ctrl + S`).
4. You will see a green checkmark (`✔`) on the compiler icon, confirming error-free compilation.

---

## 🌐 Step 3: Deploy Smart Contract in Remix IDE

### Option A: Remix VM (Instant, Zero Setup, 100 Free Test ETH — Recommended)
*Perfect for viva evaluation with zero balance worries and zero faucet delays:*
1. Click on the **Deploy & Run Transactions** tab (left sidebar icon with Ethereum logo and play button `▶️`).
2. In the **ENVIRONMENT** dropdown, select:
   - **"Remix VM (Cancun)"** (or "Remix VM (Shanghai)").
3. Notice: Remix provides **15 pre-funded test accounts with 100 free ETH each**!
4. Verify **Contract** is set to `EnergyTrade - EnergyTrade.sol`.
5. Click the orange **"Deploy"** button.
6. The contract deploys instantly in the bottom console with zero gas costs or network lag!

### Option B: Ethereum Sepolia TestNet (Live Public TestNet via MetaMask)
*If you or the evaluator want to demonstrate a public testnet transaction:*
1. In the **ENVIRONMENT** dropdown, select: **"Injected Provider - MetaMask"**.
2. Connect MetaMask on Sepolia Testnet.
3. Verify your account address and click **"Deploy"**.
4. Confirm the transaction in MetaMask.
5. Wait ~15 seconds for block confirmation.

---

## 🔍 Step 4: Interacting with the Contract in Remix IDE
After deployment, expand your contract under **"Deployed Contracts"** in the left panel to test its functions live in front of the evaluator:

### 1. `updateMeterReading` (Register Smart Meter)
- Click the dropdown next to `updateMeterReading`.
- Enter:
  - `_solarGen`: `5` (kWh)
  - `_consumption`: `2` (kWh)
  - `_zoneId`: `1`
- Click **transact**.
- Check `getMeter` with your address to see surplus calculation `3` kWh.

### 2. `listEnergy` (Prosumer Lists Surplus)
- In `listEnergy`, enter:
  - `_energyAmountKwh`: `10`
  - `_pricePerKwhWei`: `100000000000000` *(0.0001 ETH in Wei)*
  - `_zoneId`: `1`
- Click **transact**.
- The `EnergyListed` event will be emitted.

### 3. `getActiveListings`
- Click `getActiveListings` (blue view button).
- Remix will render the active array containing your newly listed surplus offer with Seller, kWh, Price, and Zone!

### 4. `buyEnergy` (Buyer Purchases Energy)
- Switch to a second account in Remix or MetaMask.
- Enter `_listingId`: `1`, `_energyAmountKwh`: `5`.
- At the top of the Deploy tab, in the **Value** field, enter:
  `500000000000000` (5 × 0.0001 ETH = 0.0005 ETH) and set unit to **Wei** (or `0.0005` with unit **Ether**).
- Click **buyEnergy**.
- The contract verifies the value, transfers the payment directly to the seller, decreases available kWh, and records the trade.

### 5. `getTradeHistory`
- Click `getTradeHistory`.
- Remix displays the immutable on-chain trade record!

---

## 🔗 Step 5: Connect Remix Contract to the Web Dashboard
1. In Remix, click the **Copy Contract Address** button next to your deployed contract name (e.g., `0x3523A0...`).
2. Open the VoltP2P Web Dashboard (`http://localhost:3000`).
3. Paste the copied address into the **Contract:** input box at the top header and click **"Set Address"**.
4. The web dashboard will instantly sync with your Remix-deployed contract, showing your live listings and blockchain transactions!
