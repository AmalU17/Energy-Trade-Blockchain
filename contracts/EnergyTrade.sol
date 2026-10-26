// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title EnergyTrade - Decentralized P2P Renewable Energy Marketplace
 * @notice Self-contained Solidity contract for simulated smart-meter verified P2P solar trading.
 * Designed to compile seamlessly in Remix IDE (no external dependencies required).
 */
contract EnergyTrade {
    // --- Reentrancy Guard (Self-contained for offline/safe Remix IDE compilation) ---
    uint8 private constant _NOT_ENTERED = 1;
    uint8 private constant _ENTERED = 2;
    uint8 private _status;

    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    // --- State Variables & Data Models ---
    address public owner;
    uint256 public listingCounter;
    uint256 public tradeCounter;

    struct SmartMeter {
        address household;
        uint256 solarGenKwh;      // Current solar generation (in kWh)
        uint256 consumptionKwh;   // Current household consumption (in kWh)
        uint8 zoneId;             // Microgrid zone (1 to 5) for transmission loss calculation
        uint256 lastUpdated;
    }

    struct EnergyListing {
        uint256 id;
        address payable seller;
        uint256 energyAmountKwh;  // Available surplus kWh for sale
        uint256 pricePerKwhWei;   // Price in Wei per 1 kWh
        uint8 zoneId;             // Microgrid zone
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

    // Mappings
    mapping(address => SmartMeter) public meters;
    mapping(uint256 => EnergyListing) public listings;
    TradeTransaction[] public tradeHistory;

    // --- Events ---
    event MeterUpdated(address indexed household, uint256 solarGen, uint256 consumption, uint8 zoneId, uint256 timestamp);
    event EnergyListed(uint256 indexed listingId, address indexed seller, uint256 energyAmountKwh, uint256 pricePerKwhWei, uint8 zoneId);
    event EnergyPurchased(uint256 indexed tradeId, uint256 indexed listingId, address indexed seller, address buyer, uint256 energyAmountKwh, uint256 totalCostWei, uint256 timestamp);
    event ListingCancelled(uint256 indexed listingId, address indexed seller);

    constructor() {
        owner = msg.sender;
        _status = _NOT_ENTERED;
    }

    /**
     * @notice Updates or registers the smart-meter telemetry for the sender's household.
     * @param _solarGen Generation in kWh (from smart meter / solar inverter)
     * @param _consumption Consumption in kWh (from smart meter)
     * @param _zoneId Grid locality / cluster ID (1-5)
     */
    function updateMeterReading(uint256 _solarGen, uint256 _consumption, uint8 _zoneId) external {
        require(_zoneId >= 1 && _zoneId <= 5, "Zone must be between 1 and 5");
        
        meters[msg.sender] = SmartMeter({
            household: msg.sender,
            solarGenKwh: _solarGen,
            consumptionKwh: _consumption,
            zoneId: _zoneId,
            lastUpdated: block.timestamp
        });

        emit MeterUpdated(msg.sender, _solarGen, _consumption, _zoneId, block.timestamp);
    }

    /**
     * @notice Lists surplus solar energy for sale in the community marketplace.
     * @param _energyAmountKwh Amount of energy in kWh
     * @param _pricePerKwhWei Price in Wei per 1 kWh
     * @param _zoneId Location zone
     */
    function listEnergy(uint256 _energyAmountKwh, uint256 _pricePerKwhWei, uint8 _zoneId) external returns (uint256) {
        require(_energyAmountKwh > 0, "Energy amount must be greater than zero");
        require(_pricePerKwhWei > 0, "Price per kWh must be greater than zero");
        require(_zoneId >= 1 && _zoneId <= 5, "Invalid microgrid zone");

        listingCounter++;
        listings[listingCounter] = EnergyListing({
            id: listingCounter,
            seller: payable(msg.sender),
            energyAmountKwh: _energyAmountKwh,
            pricePerKwhWei: _pricePerKwhWei,
            zoneId: _zoneId,
            active: true,
            listedAt: block.timestamp
        });

        emit EnergyListed(listingCounter, msg.sender, _energyAmountKwh, _pricePerKwhWei, _zoneId);
        return listingCounter;
    }

    /**
     * @notice Purchases a specified amount of energy from an active listing.
     * @dev Settlements occur instantly in Wei (native ETH/testnet coin) directly to the seller.
     * @param _listingId The ID of the energy listing
     * @param _energyAmountKwh The amount of energy to buy in kWh
     */
    function buyEnergy(uint256 _listingId, uint256 _energyAmountKwh) external payable nonReentrant {
        EnergyListing storage listing = listings[_listingId];

        require(listing.active, "Listing is no longer active");
        require(_energyAmountKwh > 0, "Purchase amount must be > 0");
        require(listing.energyAmountKwh >= _energyAmountKwh, "Insufficient energy available in listing");
        require(msg.sender != listing.seller, "Sellers cannot purchase their own energy");

        uint256 totalCost = listing.pricePerKwhWei * _energyAmountKwh;
        require(msg.value >= totalCost, "Insufficient payment sent");

        // Decrement available energy
        listing.energyAmountKwh -= _energyAmountKwh;
        if (listing.energyAmountKwh == 0) {
            listing.active = false;
        }

        // Record Trade
        tradeCounter++;
        TradeTransaction memory trade = TradeTransaction({
            tradeId: tradeCounter,
            listingId: _listingId,
            seller: listing.seller,
            buyer: msg.sender,
            energyPurchasedKwh: _energyAmountKwh,
            totalCostWei: totalCost,
            settledAt: block.timestamp
        });
        tradeHistory.push(trade);

        // Instant digital settlement to seller
        (bool sentToSeller, ) = listing.seller.call{value: totalCost}("");
        require(sentToSeller, "Digital settlement to seller failed");

        // Refund any excess Wei sent by buyer
        if (msg.value > totalCost) {
            uint256 refund = msg.value - totalCost;
            (bool refundSent, ) = payable(msg.sender).call{value: refund}("");
            require(refundSent, "Refund failed");
        }

        emit EnergyPurchased(tradeCounter, _listingId, listing.seller, msg.sender, _energyAmountKwh, totalCost, block.timestamp);
    }

    /**
     * @notice Cancels an active listing by the seller.
     * @param _listingId ID of the listing to cancel
     */
    function cancelListing(uint256 _listingId) external {
        EnergyListing storage listing = listings[_listingId];
        require(msg.sender == listing.seller || msg.sender == owner, "Only seller or owner can cancel");
        require(listing.active, "Listing is already inactive");

        listing.active = false;
        emit ListingCancelled(_listingId, msg.sender);
    }

    /**
     * @notice Fetches total count of trade transactions.
     */
    function getTradeHistoryCount() external view returns (uint256) {
        return tradeHistory.length;
    }

    /**
     * @notice Fetches the latest N trade transactions.
     */
    function getTradeHistory() external view returns (TradeTransaction[] memory) {
        return tradeHistory;
    }

    /**
     * @notice Returns all active listings for marketplace display.
     */
    function getActiveListings() external view returns (EnergyListing[] memory) {
        uint256 activeCount = 0;
        for (uint256 i = 1; i <= listingCounter; i++) {
            if (listings[i].active && listings[i].energyAmountKwh > 0) {
                activeCount++;
            }
        }

        EnergyListing[] memory activeListings = new EnergyListing[](activeCount);
        uint256 index = 0;
        for (uint256 i = 1; i <= listingCounter; i++) {
            if (listings[i].active && listings[i].energyAmountKwh > 0) {
                activeListings[index] = listings[i];
                index++;
            }
        }
        return activeListings;
    }

    /**
     * @notice Helper to fetch meter details for an account.
     */
    function getMeter(address _household) external view returns (
        uint256 solarGenKwh,
        uint256 consumptionKwh,
        uint8 zoneId,
        uint256 netSurplusKwh,
        uint256 lastUpdated
    ) {
        SmartMeter memory m = meters[_household];
        uint256 surplus = 0;
        if (m.solarGenKwh > m.consumptionKwh) {
            surplus = m.solarGenKwh - m.consumptionKwh;
        }
        return (m.solarGenKwh, m.consumptionKwh, m.zoneId, surplus, m.lastUpdated);
    }
}
