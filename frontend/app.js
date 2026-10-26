// VoltP2P - Pure MetaMask Web3 & Renewable Energy Marketplace Logic

function isValidEthereumAddress(addr) {
  if (!addr || typeof addr !== "string") return false;
  return /^0x[0-9a-fA-F]{40}$/.test(addr.trim());
}

function normalizeAddress(addr) {
  if (!isValidEthereumAddress(addr)) return addr;
  try {
    return ethers.utils.getAddress(addr.trim().toLowerCase());
  } catch (e) {
    return addr.trim();
  }
}

let provider = null;
let signer = null;
let userAddress = null;
let currentChainId = null;
let energyContract = null;
let activeContractAddress = normalizeAddress(localStorage.getItem("volt_contract_address") || CONFIG.DEFAULT_CONTRACT_ADDRESS);
let currentZone = parseInt(localStorage.getItem("volt_user_zone")) || CONFIG.DEFAULT_ZONE || 1;
let forecastChartInstance = null;
let activeModalListing = null;

// Initial Preview / Fallback listings for demonstration before contract deployment
let demoListings = [
  {
    id: 1,
    seller: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    energyAmountKwh: 15,
    pricePerKwhWei: 80000000000000n, // 0.00008 ETH
    zoneId: 1,
    active: true,
    listedAt: Math.floor(Date.now() / 1000) - 3600,
    isOnChain: false
  },
  {
    id: 2,
    seller: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    energyAmountKwh: 28,
    pricePerKwhWei: 120000000000000n, // 0.00012 ETH
    zoneId: 2,
    active: true,
    listedAt: Math.floor(Date.now() / 1000) - 1800,
    isOnChain: false
  },
  {
    id: 3,
    seller: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    energyAmountKwh: 45,
    pricePerKwhWei: 95000000000000n, // 0.000095 ETH
    zoneId: 4,
    active: true,
    listedAt: Math.floor(Date.now() / 1000) - 900,
    isOnChain: false
  }
];

let demoTrades = [
  {
    tradeId: 1,
    listingId: 1,
    seller: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    buyer: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    energyAmountKwh: 8,
    totalCostWei: 640000000000000n, // 0.00064 ETH
    settledAt: Math.floor(Date.now() / 1000) - 7200,
    isOnChain: false
  }
];

// Simulated Smart Meter State
let currentMeter = {
  solarGen: 4.85,
  consumption: 1.60,
  zone: 1
};

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", async () => {
  setupTabs();
  setupContractConfigUI();
  setupMeterSimulation();
  setupEventListeners();
  loadMLForecast();

  // Restore preferred zone
  const zoneSelect = document.getElementById("userZoneSelect");
  if (zoneSelect) {
    zoneSelect.value = currentZone.toString();
  }

  logToConsole("VoltP2P Renewable Microgrid dApp Initialized.", "info");
  logToConsole("Ready for MetaMask wallet integration.", "normal");

  // Check if MetaMask is available and auto-connect if already unlocked
  if (window.ethereum) {
    logToConsole("🦊 MetaMask extension detected.", "info");
    setupMetaMaskListeners();
    await checkAutoConnect();
  } else {
    logToConsole("MetaMask not detected in browser. Click [Connect MetaMask] to install.", "warn");
    loadMarketplaceListings();
    loadLedgerHistory();
  }
});

// --- LOGGING UTILITY ---
function logToConsole(message, type = "normal", txHash = null) {
  const consoleBody = document.getElementById("consoleBody");
  if (!consoleBody) return;
  const line = document.createElement("div");
  line.className = `log-line ${type}`;
  const time = new Date().toLocaleTimeString();

  if (txHash && currentChainId && CONFIG.SUPPORTED_NETWORKS[currentChainId]?.explorer) {
    const explorerUrl = `${CONFIG.SUPPORTED_NETWORKS[currentChainId].explorer}/tx/${txHash}`;
    line.innerHTML = `[${time}] ${message} <a href="${explorerUrl}" target="_blank" rel="noopener noreferrer" style="color:var(--cyan); text-decoration:underline;">[View on Etherscan ↗]</a>`;
  } else {
    line.textContent = `[${time}] ${message}`;
  }

  consoleBody.prepend(line);
}

// --- ADDRESS FORMATTING HELPER ---
function formatAddress(addr) {
  if (!addr) return "0x000...000";
  return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
}

// --- TAB SWITCHING ---
function setupTabs() {
  const tabBtns = document.querySelectorAll(".tab-btn");
  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      tabBtns.forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));

      btn.classList.add("active");
      const target = document.getElementById(btn.dataset.tab);
      if (target) target.classList.add("active");

      if (btn.dataset.tab === "tab-ml" && forecastChartInstance) {
        forecastChartInstance.resize();
      }
    });
  });
}

// --- CONTRACT CONFIGURATION UI ---
function setupContractConfigUI() {
  const contractInput = document.getElementById("contractAddressInput");
  const saveBtn = document.getElementById("saveContractBtn");

  if (contractInput) {
    contractInput.value = activeContractAddress;
  }

  if (saveBtn) {
    saveBtn.addEventListener("click", async () => {
      const val = contractInput.value.trim();
      if (isValidEthereumAddress(val)) {
        activeContractAddress = normalizeAddress(val);
        contractInput.value = activeContractAddress;
        localStorage.setItem("volt_contract_address", activeContractAddress);
        initContractInstance();
        logToConsole(`Smart Contract address updated to: ${activeContractAddress}`, "success");
        await loadMarketplaceListings();
        await loadLedgerHistory();
        await syncOnChainMeterInfo();
      } else {
        alert("Please enter a valid 42-character Ethereum hex address (0x...)");
      }
    });
  }
}

// --- METAMASK WALLET INTEGRATION ---

// Check if user already authorized this dApp previously
async function checkAutoConnect() {
  try {
    provider = new ethers.providers.Web3Provider(window.ethereum);
    const accounts = await provider.listAccounts();
    if (accounts && accounts.length > 0) {
      logToConsole("Found active MetaMask session. Auto-connecting...", "info");
      await handleAccountConnected(accounts[0]);
    } else {
      updateNetworkBadgeOnly();
      loadMarketplaceListings();
      loadLedgerHistory();
    }
  } catch (err) {
    console.warn("Auto-connect check notice:", err);
    loadMarketplaceListings();
    loadLedgerHistory();
  }
}

// Update network badge even before connecting account
async function updateNetworkBadgeOnly() {
  try {
    if (!window.ethereum) return;
    provider = new ethers.providers.Web3Provider(window.ethereum);
    const network = await provider.getNetwork();
    currentChainId = network.chainId;
    const netInfo = CONFIG.SUPPORTED_NETWORKS[currentChainId] || { name: `Chain ${currentChainId}` };
    const badge = document.getElementById("networkBadge");
    if (badge) {
      badge.innerHTML = `<span class="status-dot disconnected" id="networkDot"></span><span>${netInfo.name}</span>`;
    }
  } catch (e) {
    // Ignore early network check error
  }
}

// Prompt user to connect MetaMask
async function connectMetaMask() {
  if (!window.ethereum) {
    const installModal = document.getElementById("metaMaskInstallModal");
    if (installModal) {
      installModal.style.display = "flex";
    } else {
      window.open("https://metamask.io/download/", "_blank");
    }
    return;
  }

  try {
    logToConsole("Requesting MetaMask connection from extension...", "info");
    const connectBtn = document.getElementById("connectWalletBtn");
    if (connectBtn) {
      connectBtn.disabled = true;
      connectBtn.innerHTML = `<span>⏳</span> Connecting...`;
    }

    provider = new ethers.providers.Web3Provider(window.ethereum);
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });

    if (accounts && accounts.length > 0) {
      await handleAccountConnected(accounts[0]);
    }
  } catch (err) {
    console.error("MetaMask connection failed:", err);
    logToConsole(`MetaMask connection error: ${err.message || err}`, "error");
    const connectBtn = document.getElementById("connectWalletBtn");
    if (connectBtn) {
      connectBtn.disabled = false;
      connectBtn.innerHTML = `<span class="btn-icon">🦊</span> Connect MetaMask`;
    }
    if (err.code === 4001) {
      alert("Connection request was rejected in MetaMask.");
    }
  }
}

// Force MetaMask to show Account Selection dialog (EIP-2255)
async function requestAccountSwitch() {
  if (!window.ethereum) return;
  try {
    logToConsole("Requesting MetaMask account picker...", "info");
    const permissions = await window.ethereum.request({
      method: "wallet_requestPermissions",
      params: [{ eth_accounts: {} }]
    });

    if (permissions && permissions.length > 0) {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      if (accounts && accounts.length > 0) {
        await handleAccountConnected(accounts[0]);
      }
    }
  } catch (err) {
    if (err.code === 4001) {
      logToConsole("Account switch canceled.", "warn");
    } else {
      console.warn("Permission request fallback:", err);
      connectMetaMask();
    }
  }
}

// Handle successful account connection
async function handleAccountConnected(account) {
  try {
    userAddress = ethers.utils.getAddress(account);
    signer = provider.getSigner();

    // Fetch network
    const network = await provider.getNetwork();
    currentChainId = network.chainId;
    const netInfo = CONFIG.SUPPORTED_NETWORKS[currentChainId] || {
      name: `Chain ${currentChainId}`,
      currency: "ETH",
      explorer: ""
    };

    // Update UI Elements
    updateWalletUI(userAddress, netInfo);

    // Fetch Balance
    await refreshAccountBalance();

    // Initialize Smart Contract Instance
    initContractInstance();

    // Sync on-chain meter
    await syncOnChainMeterInfo();

    // Load listings & ledger
    await loadMarketplaceListings();
    await loadLedgerHistory();

    logToConsole(`🦊 Connected MetaMask: ${formatAddress(userAddress)} on ${netInfo.name}`, "success");

  } catch (err) {
    console.error("Error setting up connected account:", err);
    logToConsole(`Error processing account: ${err.message || err}`, "error");
  }
}

// Update all wallet-related UI components
function updateWalletUI(address, netInfo) {
  // Update Header Connect Button
  const connectBtn = document.getElementById("connectWalletBtn");
  if (connectBtn) {
    connectBtn.disabled = false;
    connectBtn.innerHTML = `<span>🦊</span> ${formatAddress(address)}`;
    connectBtn.classList.remove("btn-primary");
    connectBtn.classList.add("btn-secondary");
    connectBtn.title = `Connected: ${address}`;
  }

  // Update Network Badge
  const badge = document.getElementById("networkBadge");
  if (badge) {
    badge.innerHTML = `<span class="status-dot connected"></span><span>${netInfo.name}</span>`;
  }

  // Update Account Strip
  const strip = document.getElementById("accountStrip");
  if (strip) strip.style.display = "flex";

  const accAddr = document.getElementById("accountAddress");
  if (accAddr) {
    accAddr.textContent = formatAddress(address);
    accAddr.title = address;
  }

  // Faucet shortcut button for testnets
  const faucetItem = document.getElementById("faucetItem");
  if (faucetItem) {
    if (currentChainId === 11155111 || (netInfo.faucetUrl && netInfo.faucetUrl.length > 0)) {
      faucetItem.style.display = "block";
    } else {
      faucetItem.style.display = "none";
    }
  }
}

// Refresh ETH balance from MetaMask provider
async function refreshAccountBalance() {
  if (!provider || !userAddress) return;
  try {
    const balWei = await provider.getBalance(userAddress);
    const balEth = ethers.utils.formatEther(balWei);
    const formatted = parseFloat(balEth) < 0.0001 && parseFloat(balEth) > 0 
      ? "< 0.0001" 
      : parseFloat(balEth).toFixed(4);
    
    const balEl = document.getElementById("accountBalance");
    if (balEl) balEl.textContent = `${formatted} ETH`;
  } catch (e) {
    console.warn("Could not refresh balance:", e);
  }
}

// Disconnect wallet UI state
function disconnectWalletUI() {
  userAddress = null;
  signer = null;
  energyContract = null;

  const connectBtn = document.getElementById("connectWalletBtn");
  if (connectBtn) {
    connectBtn.disabled = false;
    connectBtn.innerHTML = `<span class="btn-icon">🦊</span> Connect MetaMask`;
    connectBtn.classList.remove("btn-secondary");
    connectBtn.classList.add("btn-primary");
  }

  const badge = document.getElementById("networkBadge");
  if (badge) {
    badge.innerHTML = `<span class="status-dot disconnected"></span><span>MetaMask Disconnected</span>`;
  }

  const strip = document.getElementById("accountStrip");
  if (strip) strip.style.display = "none";

  logToConsole("MetaMask disconnected.", "normal");
  loadMarketplaceListings();
}

// Listen to MetaMask account and network changes
function setupMetaMaskListeners() {
  if (!window.ethereum) return;

  window.ethereum.on("accountsChanged", async (accounts) => {
    if (!accounts || accounts.length === 0) {
      disconnectWalletUI();
    } else {
      logToConsole(`MetaMask account switched to ${formatAddress(accounts[0])}`, "info");
      await handleAccountConnected(accounts[0]);
    }
  });

  window.ethereum.on("chainChanged", (chainId) => {
    logToConsole(`MetaMask network changed. Reloading dApp...`, "info");
    window.location.reload();
  });
}

// --- CONTRACT INITIALIZATION ---
function initContractInstance() {
  try {
    const signerOrProvider = signer || provider;
    if (activeContractAddress && isValidEthereumAddress(activeContractAddress) && signerOrProvider) {
      const normalized = normalizeAddress(activeContractAddress);
      activeContractAddress = normalized;
      energyContract = new ethers.Contract(normalized, ENERGY_TRADE_ABI, signerOrProvider);
      logToConsole(`Smart Contract initialized at ${formatAddress(normalized)}`, "info");
      listenToContractEvents();
    } else {
      energyContract = null;
    }
  } catch (err) {
    console.warn("Contract initialization error:", err);
  }
}

// Real-time Blockchain Event Listeners
function listenToContractEvents() {
  if (!energyContract) return;
  try {
    energyContract.removeAllListeners();

    energyContract.on("EnergyListed", (listingId, seller, amount, price, zone) => {
      const priceEth = ethers.utils.formatEther(price);
      logToConsole(`⚡ [Event: EnergyListed] Listing #${listingId} by ${formatAddress(seller)}: ${amount} kWh @ ${priceEth} ETH (Zone ${zone})`, "success");
      loadMarketplaceListings();
    });

    energyContract.on("EnergyPurchased", (tradeId, listingId, seller, buyer, amount, totalCost) => {
      const costEth = ethers.utils.formatEther(totalCost);
      logToConsole(`🎉 [Event: EnergyPurchased] Trade #${tradeId}! ${formatAddress(buyer)} bought ${amount} kWh from ${formatAddress(seller)} for ${costEth} ETH`, "success");
      loadMarketplaceListings();
      loadLedgerHistory();
      refreshAccountBalance();
    });

    energyContract.on("ListingCancelled", (listingId, seller) => {
      logToConsole(`🚫 [Event: ListingCancelled] Listing #${listingId} cancelled by ${formatAddress(seller)}`, "warn");
      loadMarketplaceListings();
    });

    energyContract.on("MeterUpdated", (household, solar, consumption, zone, timestamp) => {
      logToConsole(`📟 [Event: MeterUpdated] Household ${formatAddress(household)}: Gen ${solar} kWh, Load ${consumption} kWh (Zone ${zone})`, "info");
      if (userAddress && household.toLowerCase() === userAddress.toLowerCase()) {
        syncOnChainMeterInfo();
      }
    });
  } catch (e) {
    console.warn("Event listener attachment warning:", e);
  }
}

// --- SMART METER SIMULATION LOGIC ---
function setupMeterSimulation() {
  const solarSlider = document.getElementById("solarSlider");
  const loadSlider = document.getElementById("loadSlider");
  const solarVal = document.getElementById("solarSliderVal");
  const loadVal = document.getElementById("loadSliderVal");

  function updateMeters(solar, load) {
    currentMeter.solarGen = parseFloat(solar);
    currentMeter.consumption = parseFloat(load);

    if (solarSlider) solarSlider.value = currentMeter.solarGen;
    if (loadSlider) loadSlider.value = currentMeter.consumption;
    if (solarVal) solarVal.textContent = currentMeter.solarGen.toFixed(2);
    if (loadVal) loadVal.textContent = currentMeter.consumption.toFixed(2);

    const solarEl = document.getElementById("meterSolarVal");
    const loadEl = document.getElementById("meterLoadVal");
    if (solarEl) solarEl.innerHTML = `${currentMeter.solarGen.toFixed(2)} <span class="unit">kW</span>`;
    if (loadEl) loadEl.innerHTML = `${currentMeter.consumption.toFixed(2)} <span class="unit">kW</span>`;

    const net = currentMeter.solarGen - currentMeter.consumption;
    const netEl = document.getElementById("meterNetVal");
    const netLabel = document.getElementById("netBalanceLabel");
    const helper = document.getElementById("meterSurplusHelper");

    if (net >= 0) {
      if (netEl) {
        netEl.innerHTML = `+${net.toFixed(2)} <span class="unit">kW</span>`;
        netEl.style.color = "var(--emerald)";
      }
      if (netLabel) netLabel.textContent = "Net Surplus (Prosumer Seller)";
      if (helper) helper.textContent = `Current Smart Meter Surplus: ${net.toFixed(2)} kWh`;
    } else {
      if (netEl) {
        netEl.innerHTML = `${net.toFixed(2)} <span class="unit">kW</span>`;
        netEl.style.color = "#ef4444";
      }
      if (netLabel) netLabel.textContent = "Net Deficit (Grid Consumer)";
      if (helper) helper.textContent = `No Surplus (Deficit of ${Math.abs(net).toFixed(2)} kWh)`;
    }
  }

  if (solarSlider && loadSlider) {
    solarSlider.addEventListener("input", (e) => updateMeters(e.target.value, loadSlider.value));
    loadSlider.addEventListener("input", (e) => updateMeters(solarSlider.value, e.target.value));
  }

  // Presets
  document.querySelectorAll(".btn-preset").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".btn-preset").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const preset = btn.dataset.preset;
      if (preset === "night") updateMeters(0.0, 0.5);
      else if (preset === "morning") updateMeters(1.8, 2.8);
      else if (preset === "noon") updateMeters(5.0, 1.5);
      else if (preset === "evening") updateMeters(0.0, 3.8);
    });
  });

  // Sync to blockchain button via MetaMask
  const syncBtn = document.getElementById("syncMeterBtn");
  if (syncBtn) {
    syncBtn.addEventListener("click", async () => {
      if (!userAddress || !signer) {
        connectMetaMask();
        return;
      }

      if (!energyContract) {
        alert("Please set a valid deployed EnergyTrade contract address in the header bar above!");
        return;
      }

      const solarInt = Math.round(currentMeter.solarGen);
      const loadInt = Math.round(currentMeter.consumption);
      const zone = currentZone;

      try {
        logToConsole(`Submitting updateMeterReading(${solarInt} kW gen, ${loadInt} kW load, Zone ${zone}) to MetaMask...`, "info");
        syncBtn.disabled = true;
        syncBtn.textContent = "🦊 Confirm in MetaMask...";

        const tx = await energyContract.updateMeterReading(solarInt, loadInt, zone);
        logToConsole(`Telemetry tx broadcast: ${tx.hash}. Mining block confirmation...`, "warn", tx.hash);
        syncBtn.textContent = "Mining on Blockchain...";

        const receipt = await tx.wait();
        logToConsole(`📡 Smart-meter telemetry confirmed in block #${receipt.blockNumber}!`, "success", tx.hash);
        syncBtn.disabled = false;
        syncBtn.textContent = "📡 Sync Meter Telemetry to Blockchain Smart Contract";

        await syncOnChainMeterInfo();
      } catch (err) {
        console.error("Meter sync error:", err);
        logToConsole(`Meter sync error: ${err.message || err}`, "error");
        syncBtn.disabled = false;
        syncBtn.textContent = "📡 Sync Meter Telemetry to Blockchain Smart Contract";
      }
    });
  }

  // Use Surplus Auto-Fill
  const surplusBtn = document.getElementById("useSurplusBtn");
  if (surplusBtn) {
    surplusBtn.addEventListener("click", () => {
      const surplus = Math.max(0, currentMeter.solarGen - currentMeter.consumption);
      if (surplus > 0) {
        const kwhInput = document.getElementById("listKwh");
        if (kwhInput) kwhInput.value = surplus.toFixed(1);
      } else {
        alert("No surplus currently available on your simulated meter.");
      }
    });
  }

  updateMeters(4.85, 1.60);
}

// Read on-chain meter state for connected MetaMask account
async function syncOnChainMeterInfo() {
  if (!energyContract || !userAddress) return;
  try {
    const data = await energyContract.getMeter(userAddress);
    const householdEl = document.getElementById("contractMeterHousehold");
    const solarEl = document.getElementById("contractMeterSolar");
    const consEl = document.getElementById("contractMeterConsumption");
    const surplusEl = document.getElementById("contractMeterSurplus");
    const timeEl = document.getElementById("contractMeterTimestamp");

    if (householdEl) householdEl.textContent = formatAddress(userAddress);
    if (solarEl) solarEl.textContent = `${data[0].toString()} kWh`;
    if (consEl) consEl.textContent = `${data[1].toString()} kWh`;
    if (surplusEl) surplusEl.textContent = `${data[3].toString()} kWh`;
    
    const ts = data[4].toNumber ? data[4].toNumber() : Number(data[4]);
    if (timeEl) timeEl.textContent = ts > 0 ? new Date(ts * 1000).toLocaleTimeString() : "Never";
  } catch (e) {
    // Meter reading might not exist yet on-chain for this account
  }
}

// --- MULTI-OBJECTIVE MATCHING ALGORITHM ---
function calculateLossAndScore(buyerZone, requestedKwh, listing) {
  const sellerZone = Number(listing.zoneId || 1);
  const priceWei = BigInt(listing.pricePerKwhWei.toString());
  const availableKwh = Number(listing.energyAmountKwh);

  // Transmission line loss formula: Loss% = min(25%, 4% * |sellerZone - buyerZone|^1.3)
  const zoneDiff = Math.abs(sellerZone - buyerZone);
  const lossPct = Math.min(0.25, 0.04 * Math.pow(zoneDiff, 1.3));
  const lossScore = Math.max(0, 100 - (lossPct * 300));

  // Price Score (Normalized around 0.0001 ETH = 1e14 wei)
  const refWei = 100000000000000n;
  const priceRatio = Number(priceWei) / Number(refWei);
  const priceScore = Math.max(10, Math.min(100, 100 - (priceRatio - 1.0) * 40));

  // Volume fulfillment score
  const volumeScore = availableKwh >= requestedKwh ? 100 : (availableKwh / requestedKwh) * 80;

  // Composite multi-objective score (40% Price + 35% Grid Efficiency + 25% Volume match)
  const matchScore = Math.round(0.40 * priceScore + 0.35 * lossScore + 0.25 * volumeScore);

  let rankBadge = "";
  if (matchScore >= 85) rankBadge = `<span class="badge badge-emerald">BEST MATCH ⭐</span>`;
  else if (matchScore >= 70) rankBadge = `<span class="badge badge-cyan">GOOD MATCH</span>`;
  else rankBadge = `<span class="badge badge-gold">STANDARD</span>`;

  return {
    lossPct: (lossPct * 100).toFixed(1),
    matchScore,
    rankBadge
  };
}

// --- MARKETPLACE LISTINGS DISPLAY ---
async function loadMarketplaceListings() {
  const tableBody = document.getElementById("listingsTableBody");
  if (!tableBody) return;

  let listings = [];
  let fetchedFromContract = false;

  try {
    if (energyContract) {
      const onChain = await energyContract.getActiveListings();
      if (onChain && onChain.length > 0) {
        listings = onChain.map(l => ({
          id: l.id.toNumber ? l.id.toNumber() : Number(l.id),
          seller: l.seller,
          energyAmountKwh: l.energyAmountKwh.toNumber ? l.energyAmountKwh.toNumber() : Number(l.energyAmountKwh),
          pricePerKwhWei: l.pricePerKwhWei,
          zoneId: Number(l.zoneId),
          active: l.active,
          listedAt: l.listedAt.toNumber ? l.listedAt.toNumber() : Number(l.listedAt),
          isOnChain: true
        }));
        fetchedFromContract = true;
      }
    }
  } catch (err) {
    console.warn("Could not query active listings from contract:", err);
  }

  // Fallback to demo listings if no on-chain listings found
  if (listings.length === 0) {
    listings = demoListings.filter(l => l.active && l.energyAmountKwh > 0);
  }

  const buyerZone = parseInt(document.getElementById("buyerZoneSelect")?.value) || currentZone || 1;
  const requestedKwh = parseFloat(document.getElementById("matchNeededKwh")?.value) || 10;
  const isSmartMatching = document.getElementById("smartMatchingToggle")?.checked ?? true;

  // Process & Score Listings
  const processedListings = listings.map(l => {
    const meta = calculateLossAndScore(buyerZone, requestedKwh, l);
    return { ...l, ...meta };
  });

  if (isSmartMatching) {
    processedListings.sort((a, b) => b.matchScore - a.matchScore);
  }

  tableBody.innerHTML = "";

  if (processedListings.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="8" class="text-center py-4">No active listings available. Be the first prosumer to list surplus solar energy!</td></tr>`;
    return;
  }

  processedListings.forEach(l => {
    const tr = document.createElement("tr");
    const priceEth = ethers.utils.formatEther(l.pricePerKwhWei.toString());
    const isOwner = userAddress && l.seller.toLowerCase() === userAddress.toLowerCase();
    const onChainBadge = l.isOnChain 
      ? `<span class="badge badge-emerald" title="Live On-Chain Listing">⛓️ On-Chain</span>`
      : `<span class="badge badge-gold" title="Sample Preview Offer">Preview</span>`;

    tr.innerHTML = `
      <td class="mono font-bold">#${l.id} ${onChainBadge}</td>
      <td class="mono">${formatAddress(l.seller)} ${isOwner ? '<span class="badge badge-purple">You</span>' : ''}</td>
      <td><strong>${l.energyAmountKwh}</strong> kWh</td>
      <td class="text-gold mono">${priceEth} ETH</td>
      <td><span class="badge badge-cyan">Zone ${l.zoneId}</span></td>
      <td><span class="text-cyan">${l.lossPct}%</span></td>
      <td>${l.rankBadge} <small class="text-muted">(${l.matchScore}/100)</small></td>
      <td>
        ${isOwner ? 
          `<button class="btn-sm btn-danger" style="background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); cursor: pointer;" onclick="cancelListingPrompt(${l.id}, ${l.isOnChain})">🚫 Cancel</button>` :
          `<button class="btn-sm btn-emerald" onclick="openBuyModal(${l.id}, '${l.seller}', '${priceEth}', ${l.energyAmountKwh}, ${l.zoneId}, '${l.lossPct}', ${l.isOnChain})">Buy Energy</button>`
        }
      </td>
    `;
    tableBody.appendChild(tr);
  });
}

// --- SETUP EVENT LISTENERS ---
function setupEventListeners() {
  // Prosumer List Energy Form submission with MetaMask
  const listForm = document.getElementById("listEnergyForm");
  if (listForm) {
    listForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!userAddress || !signer) {
        connectMetaMask();
        return;
      }

      if (!energyContract) {
        alert("Please set a valid deployed EnergyTrade contract address in the header input before listing!");
        return;
      }

      const kwh = Math.round(parseFloat(document.getElementById("listKwh").value));
      const priceEth = document.getElementById("listPrice").value;
      const zone = parseInt(document.getElementById("listZone").value);

      if (kwh <= 0 || !priceEth || parseFloat(priceEth) <= 0) {
        alert("Please enter valid energy quantity and price per kWh.");
        return;
      }

      const submitBtn = document.getElementById("submitListingBtn");

      try {
        const priceWei = ethers.utils.parseEther(priceEth.toString());
        logToConsole(`Submitting listEnergy(${kwh} kWh @ ${priceEth} ETH/kWh, Zone ${zone}) to MetaMask...`, "info");
        
        submitBtn.disabled = true;
        submitBtn.textContent = "🦊 Confirm in MetaMask...";

        const tx = await energyContract.listEnergy(kwh, priceWei, zone);
        logToConsole(`Listing transaction broadcast: ${tx.hash}. Mining block...`, "warn", tx.hash);
        submitBtn.textContent = "Mining on Blockchain...";

        const receipt = await tx.wait();
        logToConsole(`🎉 Listing confirmed in block #${receipt.blockNumber}! Gas used: ${receipt.gasUsed.toString()}`, "success", tx.hash);

        submitBtn.disabled = false;
        submitBtn.textContent = "🚀 List on Blockchain";
        listForm.reset();

        await loadMarketplaceListings();

      } catch (err) {
        console.error("Listing error:", err);
        logToConsole(`Listing failed: ${err.message || err}`, "error");
        submitBtn.disabled = false;
        submitBtn.textContent = "🚀 List on Blockchain";
      }
    });
  }

  // Filter Changes
  document.getElementById("buyerZoneSelect")?.addEventListener("change", loadMarketplaceListings);
  document.getElementById("matchNeededKwh")?.addEventListener("input", loadMarketplaceListings);
  document.getElementById("smartMatchingToggle")?.addEventListener("change", loadMarketplaceListings);
  document.getElementById("refreshListingsBtn")?.addEventListener("click", loadMarketplaceListings);

  // Connect Wallet Button
  document.getElementById("connectWalletBtn")?.addEventListener("click", () => {
    connectMetaMask();
  });

  // Disconnect Button
  document.getElementById("disconnectBtn")?.addEventListener("click", () => {
    disconnectWalletUI();
  });

  // Switch Account Button (Prompts MetaMask account selection)
  document.getElementById("switchAccountBtn")?.addEventListener("click", () => {
    requestAccountSwitch();
  });

  // Copy Address Button
  document.getElementById("copyAddressBtn")?.addEventListener("click", () => {
    if (userAddress) {
      navigator.clipboard.writeText(userAddress).then(() => {
        logToConsole(`Copied address to clipboard: ${userAddress}`, "info");
      });
    }
  });

  // Refresh Balance Button
  document.getElementById("refreshBalanceBtn")?.addEventListener("click", async () => {
    await refreshAccountBalance();
    logToConsole("Wallet balance refreshed from blockchain.", "info");
  });

  // User Zone Selection
  document.getElementById("userZoneSelect")?.addEventListener("change", (e) => {
    currentZone = parseInt(e.target.value);
    localStorage.setItem("volt_user_zone", currentZone.toString());
    const buyerZoneSelect = document.getElementById("buyerZoneSelect");
    if (buyerZoneSelect) buyerZoneSelect.value = currentZone.toString();
    const listZoneSelect = document.getElementById("listZone");
    if (listZoneSelect) listZoneSelect.value = currentZone.toString();
    loadMarketplaceListings();
  });

  // Close Install MetaMask Modal
  document.getElementById("closeInstallModalBtn")?.addEventListener("click", () => {
    const modal = document.getElementById("metaMaskInstallModal");
    if (modal) modal.style.display = "none";
  });

  // Purchase Modal Events
  document.getElementById("closeModalBtn")?.addEventListener("click", closeBuyModal);
  document.getElementById("modalBuyKwh")?.addEventListener("input", updateModalCalculations);
  document.getElementById("confirmBuyBtn")?.addEventListener("click", executePurchase);

  // Ledger & Console
  document.getElementById("refreshLedgerBtn")?.addEventListener("click", loadLedgerHistory);
  document.getElementById("clearConsoleBtn")?.addEventListener("click", () => {
    const body = document.getElementById("consoleBody");
    if (body) body.innerHTML = "";
  });
}

// --- PURCHASE MODAL & METAMASK EXECUTION ---
window.openBuyModal = function(id, seller, priceEth, availableKwh, zoneId, lossPct, isOnChain) {
  activeModalListing = { id, seller, priceEth, availableKwh, zoneId, lossPct, isOnChain };

  document.getElementById("modalListingId").textContent = `#${id} ${isOnChain ? '(On-Chain)' : '(Preview)'}`;
  document.getElementById("modalSeller").textContent = seller;
  document.getElementById("modalUnitPrice").textContent = `${priceEth} ETH/kWh`;
  document.getElementById("modalSellerZone").textContent = `Zone ${zoneId}`;
  document.getElementById("modalLoss").textContent = `${lossPct}%`;

  const buyInput = document.getElementById("modalBuyKwh");
  buyInput.max = availableKwh;
  buyInput.value = Math.min(5, availableKwh);

  updateModalCalculations();
  document.getElementById("purchaseModal").style.display = "flex";
};

window.closeBuyModal = function() {
  document.getElementById("purchaseModal").style.display = "none";
  activeModalListing = null;
};

function updateModalCalculations() {
  if (!activeModalListing) return;
  const kwh = parseFloat(document.getElementById("modalBuyKwh").value) || 0;
  const lossFactor = 1 - (parseFloat(activeModalListing.lossPct) / 100);
  const delivered = (kwh * lossFactor).toFixed(2);
  const totalEth = (kwh * parseFloat(activeModalListing.priceEth)).toFixed(6);

  document.getElementById("modalDeliveredKwh").textContent = `${delivered} kWh (after line loss)`;
  document.getElementById("modalTotalEth").textContent = `${totalEth} ETH`;
}

// Execute purchase transaction using MetaMask
async function executePurchase() {
  if (!userAddress || !signer) {
    closeBuyModal();
    connectMetaMask();
    return;
  }

  if (!activeModalListing) return;

  if (userAddress && activeModalListing.seller.toLowerCase() === userAddress.toLowerCase()) {
    alert("Smart contract rule: Sellers cannot purchase their own energy listings.");
    return;
  }

  const buyKwh = Math.round(parseFloat(document.getElementById("modalBuyKwh").value));
  if (buyKwh <= 0 || buyKwh > activeModalListing.availableKwh) {
    alert("Please enter a valid purchase quantity within available limits.");
    return;
  }

  const unitPriceWei = ethers.utils.parseEther(activeModalListing.priceEth);
  const totalWei = unitPriceWei.mul(buyKwh);
  const totalEth = ethers.utils.formatEther(totalWei);

  // Check user balance
  try {
    const userBalWei = await provider.getBalance(userAddress);
    if (userBalWei.lt(totalWei)) {
      alert(`Insufficient ETH in your MetaMask wallet!\nRequired: ${totalEth} ETH\nAvailable: ${ethers.utils.formatEther(userBalWei)} ETH\nUse the Sepolia Faucet link in the header to get free test ETH.`);
      return;
    }
  } catch (e) {
    console.warn("Balance check warning:", e);
  }

  // If this is a preview/demo listing (contract not yet deployed or empty)
  if (!activeModalListing.isOnChain) {
    if (!energyContract) {
      alert("This is a preview listing. Please deploy EnergyTrade.sol in Remix IDE using MetaMask and enter its address above to execute live blockchain trades!");
      return;
    }
    alert("This is a preview listing not currently present on the smart contract. Use the 'List Surplus Solar Energy' panel on the left to list real energy with your MetaMask wallet, then purchase it!");
    return;
  }

  // Real On-Chain Purchase via MetaMask
  const confirmBtn = document.getElementById("confirmBuyBtn");
  try {
    logToConsole(`Initiating buyEnergy(#${activeModalListing.id}, ${buyKwh} kWh) with value ${totalEth} ETH in MetaMask...`, "info");
    confirmBtn.disabled = true;
    confirmBtn.textContent = "🦊 Confirm in MetaMask...";

    const tx = await energyContract.buyEnergy(activeModalListing.id, buyKwh, {
      value: totalWei
    });

    logToConsole(`Purchase tx submitted: ${tx.hash}. Awaiting block confirmation...`, "warn", tx.hash);
    confirmBtn.textContent = "Mining on Blockchain...";

    const receipt = await tx.wait();
    logToConsole(`🎉 Trade confirmed in block #${receipt.blockNumber}! ${buyKwh} kWh successfully purchased from ${formatAddress(activeModalListing.seller)}!`, "success", tx.hash);

    closeBuyModal();
    confirmBtn.disabled = false;
    confirmBtn.textContent = "🦊 Confirm & Sign with MetaMask";

    await loadMarketplaceListings();
    await loadLedgerHistory();
    await refreshAccountBalance();

  } catch (err) {
    console.error("Purchase error:", err);
    logToConsole(`Purchase failed: ${err.message || err}`, "error");
    confirmBtn.disabled = false;
    confirmBtn.textContent = "🦊 Confirm & Sign with MetaMask";
  }
}

// Cancel a listing on-chain via MetaMask
window.cancelListingPrompt = async function(id, isOnChain) {
  if (!userAddress || !signer) {
    connectMetaMask();
    return;
  }

  if (!confirm(`Are you sure you want to cancel listing #${id}?`)) return;

  if (!isOnChain) {
    const item = demoListings.find(l => l.id === id);
    if (item) item.active = false;
    logToConsole(`Preview listing #${id} removed.`, "info");
    loadMarketplaceListings();
    return;
  }

  try {
    logToConsole(`Submitting cancelListing(#${id}) to MetaMask...`, "info");
    const tx = await energyContract.cancelListing(id);
    logToConsole(`Cancel tx broadcast: ${tx.hash}. Mining...`, "warn", tx.hash);
    const receipt = await tx.wait();
    logToConsole(`🚫 Listing #${id} cancelled in block #${receipt.blockNumber}.`, "success", tx.hash);
    await loadMarketplaceListings();
  } catch (err) {
    console.error("Cancel listing error:", err);
    logToConsole(`Cancellation error: ${err.message || err}`, "error");
  }
};

// --- BLOCKCHAIN AUDIT LEDGER ---
async function loadLedgerHistory() {
  const tableBody = document.getElementById("ledgerTableBody");
  if (!tableBody) return;

  let trades = [];

  try {
    if (energyContract) {
      const onChainTrades = await energyContract.getTradeHistory();
      if (onChainTrades && onChainTrades.length > 0) {
        trades = onChainTrades.map(t => ({
          tradeId: t.tradeId.toNumber ? t.tradeId.toNumber() : Number(t.tradeId),
          listingId: t.listingId.toNumber ? t.listingId.toNumber() : Number(t.listingId),
          seller: t.seller,
          buyer: t.buyer,
          energyAmountKwh: t.energyPurchasedKwh.toNumber ? t.energyPurchasedKwh.toNumber() : Number(t.energyPurchasedKwh),
          totalCostWei: t.totalCostWei,
          settledAt: t.settledAt.toNumber ? t.settledAt.toNumber() : Number(t.settledAt),
          isOnChain: true
        }));
      }
    }
  } catch (e) {
    console.warn("Could not fetch trade history from contract:", e);
  }

  if (trades.length === 0) {
    trades = demoTrades;
  }

  tableBody.innerHTML = "";

  trades.forEach(t => {
    const tr = document.createElement("tr");
    const costEth = ethers.utils.formatEther(t.totalCostWei.toString());
    const dateStr = new Date(t.settledAt * 1000).toLocaleString();
    const kwhDelivered = t.energyAmountKwh !== undefined ? t.energyAmountKwh : 0;
    const badge = t.isOnChain 
      ? `<span class="badge badge-emerald">✔ Verified Block</span>`
      : `<span class="badge badge-gold">Sample Audit</span>`;

    tr.innerHTML = `
      <td class="mono font-bold text-emerald">#TX-${t.tradeId}</td>
      <td class="mono">Listing #${t.listingId}</td>
      <td class="mono">${formatAddress(t.seller)}</td>
      <td class="mono">${formatAddress(t.buyer)}</td>
      <td><strong>${kwhDelivered}</strong> kWh</td>
      <td class="text-gold mono">${costEth} ETH</td>
      <td>${dateStr}</td>
      <td>${badge}</td>
    `;
    tableBody.appendChild(tr);
  });
}

// --- MACHINE LEARNING FORECAST CHART & PREDICTOR ---
async function loadMLForecast() {
  try {
    const res = await fetch("forecast_results.json");
    if (!res.ok) throw new Error("Could not load forecast_results.json");
    const data = await res.json();

    // Update Model Metrics
    if (data.model_metadata) {
      const solarR2 = document.getElementById("mlSolarR2");
      const loadR2 = document.getElementById("mlLoadR2");
      if (solarR2) solarR2.textContent = data.model_metadata.solar_model_r2;
      if (loadR2) loadR2.textContent = data.model_metadata.load_model_r2;
    }

    const timeline = data.forecast_24h || [];
    const labels = timeline.map(t => t.hour);
    const solarVals = timeline.map(t => t.predicted_solar_kwh);
    const loadVals = timeline.map(t => t.predicted_load_kwh);

    // Render Chart.js
    const chartCanvas = document.getElementById("forecastChart");
    if (!chartCanvas) return;
    const ctx = chartCanvas.getContext("2d");
    if (forecastChartInstance) forecastChartInstance.destroy();

    forecastChartInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Predicted Solar PV Generation (kW)",
            data: solarVals,
            borderColor: "#10b981",
            backgroundColor: "rgba(16, 185, 129, 0.15)",
            borderWidth: 3,
            fill: true,
            tension: 0.35,
            pointRadius: 3
          },
          {
            label: "Predicted Household Consumption Load (kW)",
            data: loadVals,
            borderColor: "#06b6d4",
            backgroundColor: "rgba(6, 182, 212, 0.1)",
            borderWidth: 2,
            borderDash: [5, 5],
            fill: true,
            tension: 0.35,
            pointRadius: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            labels: { color: "#f8fafc", font: { family: "Plus Jakarta Sans" } }
          },
          tooltip: {
            callbacks: {
              afterBody: function(items) {
                const idx = items[0].dataIndex;
                const rec = timeline[idx];
                return `Action: ${rec.recommendation}\n${rec.reason}`;
              }
            }
          }
        },
        scales: {
          x: {
            ticks: { color: "#94a3b8" },
            grid: { color: "rgba(255, 255, 255, 0.05)" }
          },
          y: {
            ticks: { color: "#94a3b8" },
            grid: { color: "rgba(255, 255, 255, 0.05)" },
            title: { display: true, text: "Active Power (kW)", color: "#94a3b8" }
          }
        }
      }
    });

    // Populate Key Forecast Highlights Cards
    const cardsGrid = document.getElementById("forecastCardsGrid");
    if (cardsGrid) {
      cardsGrid.innerHTML = "";
      const targetHours = ["08:00", "13:00", "19:00", "23:00"];
      const filtered = timeline.filter(t => targetHours.includes(t.hour));

      filtered.forEach(item => {
        const card = document.createElement("div");
        card.className = "f-card";
        let badgeClass = item.recommendation === "RECOMMEND_SELL" ? "badge-emerald" : 
                        (item.recommendation === "RECOMMEND_BUY" ? "badge-cyan" : "badge-gold");
        
        card.innerHTML = `
          <div class="f-card-time">⏰ ${item.hour} Window</div>
          <div class="f-card-val text-gold">☀️ ${item.predicted_solar_kwh} kW Gen</div>
          <div class="f-card-val text-cyan">💡 ${item.predicted_load_kwh} kW Load</div>
          <span class="f-card-badge ${badgeClass}">${item.recommendation.replace("_", " ")}</span>
          <p style="font-size:0.75rem; color:var(--text-muted); margin-top:0.4rem;">${item.reason}</p>
        `;
        cardsGrid.appendChild(card);
      });
    }

  } catch (err) {
    console.error("Error loading ML Forecast JSON:", err);
  }
}
