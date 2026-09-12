/* ============================================================
   NDEBE TRADE PRO
   REAL DERIV DEMO EXECUTION ENGINE
   ------------------------------------------------------------
   STRATEGY:
   Triple Digit Differ

   CONTRACT:
   DIGITDIFF
   Duration: 1 tick
   Stake: $10 USD

   IMPORTANT:
   - DEMO ACCOUNT ONLY
   - REAL DERIV DEMO CONTRACTS
   - NO PAPER TRADING
   - NO SIMULATED SETTLEMENT
   ============================================================ */


/* ============================================================
   DERIV API
   ============================================================ */

const PUBLIC_WS_URL =
  "wss://api.derivws.com/trading/v1/options/ws/public";

const ACCOUNTS_URL =
  "https://api.derivws.com/trading/v1/options/accounts";

const OTP_URL_BASE =
  "https://api.derivws.com/trading/v1/options/accounts";

const DEMO_ONLY = true;


/* ============================================================
   REAL CONTRACT SETTINGS
   ============================================================ */

const CONTRACT_TYPE = "DIGITDIFF";
const CONTRACT_DURATION = 1;
const CONTRACT_DURATION_UNIT = "t";
const CONTRACT_CURRENCY = "USD";
const CONTRACT_STAKE = 10;


/* ============================================================
   MARKETS
   ============================================================ */

const MARKETS = [
  {
    symbol: "R_10",
    name: "Volatility 10",
    decimals: 3
  },
  {
    symbol: "R_25",
    name: "Volatility 25",
    decimals: 3
  },
  {
    symbol: "R_50",
    name: "Volatility 50",
    decimals: 4
  },
  {
    symbol: "R_75",
    name: "Volatility 75",
    decimals: 4
  },
  {
    symbol: "R_100",
    name: "Volatility 100",
    decimals: 2
  },
  {
    symbol: "1HZ10V",
    name: "Volatility 10 1s",
    decimals: 2
  },
  {
    symbol: "1HZ25V",
    name: "Volatility 25 1s",
    decimals: 2
  },
  {
    symbol: "1HZ50V",
    name: "Volatility 50 1s",
    decimals: 2
  },
  {
    symbol: "1HZ75V",
    name: "Volatility 75 1s",
    decimals: 2
  },
  {
    symbol: "1HZ100V",
    name: "Volatility 100 1s",
    decimals: 2
  },
  {
    symbol: "JD10",
    name: "Jump 10",
    decimals: 2
  },
  {
    symbol: "JD25",
    name: "Jump 25",
    decimals: 2
  },
  {
    symbol: "JD50",
    name: "Jump 50",
    decimals: 2
  },
  {
    symbol: "JD75",
    name: "Jump 75",
    decimals: 2
  },
  {
    symbol: "JD100",
    name: "Jump 100",
    decimals: 2
  }
];


/* ============================================================
   DOM HELPERS
   ============================================================ */

const $ = (id) =>
  document.getElementById(id);


/* ============================================================
   DOM ELEMENTS
   ============================================================ */

const appIdInput =
  $("appIdInput");

const patInput =
  $("patInput");

const connectBtn =
  $("connectBtn");

const accountSelect =
  $("accountSelect");

const accountType =
  $("accountType");

const accountBalance =
  $("accountBalance");

const accountConnection =
  $("accountConnection");

const connectionMessage =
  $("connectionMessage");

const startBtn =
  $("startBtn");

const stopBtn =
  $("stopBtn");

const stakeInput =
  $("stakeInput");

const systemDot =
  $("systemDot");

const systemStatus =
  $("systemStatus");

const trackerStatus =
  $("trackerStatus");

const trackerDescription =
  $("trackerDescription");

const lockedMarket =
  $("lockedMarket");

const lockedPattern =
  $("lockedPattern");

const entryDigit =
  $("entryDigit");

const nextAction =
  $("nextAction");

const marketsScanned =
  $("marketsScanned");

const ticksReceived =
  $("ticksReceived");

const signalsFound =
  $("signalsFound");

const engineRuntime =
  $("engineRuntime");

const tradingChannel =
  $("tradingChannel");

const marketFeed =
  $("marketFeed");


/* ============================================================
   ENGINE STATE
   ============================================================ */

let publicWebSocket = null;

let demoTradingWebSocket = null;

let engineRunning = false;

let accountConnected = false;

let demoTradingReady = false;

let engineStartedAt = null;

let runtimeTimer = null;

let totalTicks = 0;

let totalSignals = 0;

let tradeCounter = 0;

let accounts = [];

let trades = [];

let globalLock = null;

let requestCounter = 1000;


/* ============================================================
   ACTIVE REAL CONTRACT
   ============================================================ */

let activeContract = null;


/* ============================================================
   MARKET STATE
   ============================================================ */

const marketState = {};


MARKETS.forEach((market) => {

  marketState[market.symbol] = {

    symbol:
      market.symbol,

    name:
      market.name,

    decimals:
      market.decimals,

    digits: [],

    lastQuote:
      "—",

    lastDigit:
      "—",

    tickCount:
      0,

    status:
      "WAITING",

    candidate:
      false

  };

});


/* ============================================================
   REQUEST ID
   ============================================================ */

function getRequestId() {

  requestCounter += 1;

  return requestCounter;

}


/* ============================================================
   LOGGING
   ============================================================ */

function log(message, data = null) {

  const prefix =
    "[NDEBE TRADE PRO]";

  if (data !== null) {

    console.log(
      prefix,
      message,
      data
    );

  } else {

    console.log(
      prefix,
      message
    );

  }

}


/* ============================================================
   HTML ESCAPE
   ============================================================ */

function escapeHTML(value) {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


/* ============================================================
   TIME
   ============================================================ */

function formatTime(timestamp) {

  if (!timestamp) {

    return "—";

  }

  return new Date(
    timestamp
  ).toLocaleTimeString();

}


/* ============================================================
   SYSTEM STATUS
   ============================================================ */

function setSystemStatus(
  status,
  type = "offline"
) {

  if (systemStatus) {

    systemStatus.textContent =
      status;

  }

  if (systemDot) {

    systemDot.className =
      `status-dot ${type}`;

  }

}


/* ============================================================
   CONNECTION MESSAGE
   ============================================================ */

function showMessage(
  message,
  type = "normal"
) {

  if (!connectionMessage) {

    return;

  }

  connectionMessage.textContent =
    message;

  if (type === "error") {

    connectionMessage.style.color =
      "var(--red)";

  } else if (type === "success") {

    connectionMessage.style.color =
      "var(--green)";

  } else {

    connectionMessage.style.color =
      "var(--muted)";

  }

}


/* ============================================================
   UPDATE HTML TO REAL DEMO MODE
   ============================================================ */

function configureRealDemoUI() {

  const headings =
    document.querySelectorAll(
      ".control-panel .section-heading p"
    );

  headings.forEach((element) => {

    element.textContent =
      "Automatic market scanning and REAL DEMO contract execution.";

  });


  const stakeLabel =
    document.querySelector(
      'label[for="stakeInput"]'
    );

  const allLabels =
    document.querySelectorAll(
      ".control-panel label"
    );

  allLabels.forEach((label) => {

    if (
      label.textContent
        .toUpperCase()
        .includes("PAPER TRADE")
    ) {

      label.textContent =
        "DEMO TRADE AMOUNT";

    }

  });


  if (stakeInput) {

    stakeInput.value =
      CONTRACT_STAKE;

    stakeInput.min =
      CONTRACT_STAKE;

    stakeInput.step =
      CONTRACT_STAKE;

    stakeInput.readOnly =
      true;

  }


  if (startBtn) {

    startBtn.textContent =
      "▶ START DEMO ENGINE";

  }


  document
    .querySelectorAll(".safety-note")
    .forEach((element) => {

      element.innerHTML = `
        <strong>REAL DEMO MODE:</strong>
        Triple Digit Differ signals can purchase actual
        ${CONTRACT_CURRENCY} ${CONTRACT_STAKE} Deriv DEMO
        DIGITDIFF contracts. No real-money account is permitted.
      `;

    });


  document
    .querySelectorAll(".stats-panel .section-heading p")
    .forEach((element) => {

      element.textContent =
        "Actual DEMO contract results returned by Deriv.";

    });


  document
    .querySelectorAll(".channel-panel .section-heading p")
    .forEach((element) => {

      element.textContent =
        "Actual DEMO contract activity and settlement results.";

    });


  document
    .querySelectorAll(".strategy-description .rule-list div")
    .forEach((element) => {

      if (
        element.textContent.includes(
          "simulated entry digit"
        )
      ) {

        element.innerHTML = `
          <span>03</span>
          Use the repeated digit as the DIGITDIFF barrier.
        `;

      }

      if (
        element.textContent.includes(
          "Different fourth digit"
        )
      ) {

        element.innerHTML = `
          <span>05</span>
          Different next tick digit = actual Deriv WIN.
        `;

      }

      if (
        element.textContent.includes(
          "Same fourth digit"
        )
      ) {

        element.innerHTML = `
          <span>06</span>
          Same next tick digit = actual Deriv LOSS.
        `;

      }

    });

}


/* ============================================================
   MARKET FEED
   ============================================================ */

function initializeMarketFeed() {

  marketFeed.innerHTML =
    MARKETS
      .map((market) => {

        return `
          <div
            class="market-card"
            id="market-${market.symbol}"
          >

            <div class="market-card-header">

              <div class="market-name">
                ${escapeHTML(market.name)}
              </div>

              <div
                class="market-state"
                id="state-${market.symbol}"
              >
                WAITING
              </div>

            </div>

            <div
              class="market-quote"
              id="quote-${market.symbol}"
            >
              —
            </div>

            <div class="market-bottom">

              <span>
                Final digit:
                <strong
                  class="market-digit"
                  id="digit-${market.symbol}"
                >
                  —
                </strong>
              </span>

              <span
                id="ticks-${market.symbol}"
              >
                0 ticks
              </span>

            </div>

          </div>
        `;

      })
      .join("");

  marketsScanned.textContent =
    MARKETS.length;

}


/* ============================================================
   UPDATE MARKET CARD
   ============================================================ */

function updateMarketFeed(symbol) {

  const state =
    marketState[symbol];

  if (!state) {

    return;

  }

  const quoteElement =
    $(`quote-${symbol}`);

  const digitElement =
    $(`digit-${symbol}`);

  const tickElement =
    $(`ticks-${symbol}`);

  const stateElement =
    $(`state-${symbol}`);

  const cardElement =
    $(`market-${symbol}`);


  if (quoteElement) {

    quoteElement.textContent =
      state.lastQuote;

  }


  if (digitElement) {

    digitElement.textContent =
      state.lastDigit;

  }


  if (tickElement) {

    tickElement.textContent =
      `${state.tickCount} ticks`;

  }


  if (stateElement) {

    stateElement.textContent =
      state.status;

  }


  if (cardElement) {

    cardElement.classList.toggle(
      "locked",
      !!(
        globalLock &&
        globalLock.symbol === symbol
      )
    );

  }

}


/* ============================================================
   TRACKER
   ============================================================ */

function resetTracker() {

  if (!trackerStatus) {

    return;

  }

  trackerStatus.textContent =
    engineRunning
      ? "ANALYZING"
      : "WAITING TO START";

  trackerStatus.style.color =
    engineRunning
      ? "var(--cyan)"
      : "var(--text)";


  trackerDescription.textContent =
    engineRunning
      ? "Scanning configured markets for three identical final digits."
      : "Connect your DEMO account and start the DEMO engine.";


  lockedMarket.textContent =
    "NONE";

  lockedPattern.textContent =
    "—";

  entryDigit.textContent =
    "—";


  nextAction.textContent =
    engineRunning
      ? "SCAN MARKETS"
      : "CONNECT DEMO";

}


/* ============================================================
   TRACKER - SIGNAL
   ============================================================ */

function updateTrackerForSignal(lock) {

  trackerStatus.textContent =
    "SIGNAL DETECTED";

  trackerStatus.style.color =
    "var(--yellow)";


  trackerDescription.textContent =
    "Triple Digit Differ detected. Requesting real DEMO DIGITDIFF contract.";


  lockedMarket.textContent =
    lock.marketName;

  lockedPattern.textContent =
    lock.pattern;

  entryDigit.textContent =
    lock.entryDigit;

  nextAction.textContent =
    "REQUESTING CONTRACT";

}


/* ============================================================
   TRACKER - BUYING
   ============================================================ */

function updateTrackerBuying() {

  trackerStatus.textContent =
    "BUYING DEMO CONTRACT";

  trackerStatus.style.color =
    "var(--cyan)";


  trackerDescription.textContent =
    "Deriv proposal received. Purchasing the $10 DEMO contract.";


  nextAction.textContent =
    "BUYING";

}


/* ============================================================
   TRACKER - CONTRACT ACTIVE
   ============================================================ */

function updateTrackerActive() {

  trackerStatus.textContent =
    "CONTRACT ACTIVE";

  trackerStatus.style.color =
    "var(--green)";


  trackerDescription.textContent =
    "Real DEMO DIGITDIFF contract purchased. Waiting for Deriv settlement.";


  nextAction.textContent =
    "WAIT FOR SETTLEMENT";

}


/* ============================================================
   RUNTIME
   ============================================================ */

function updateRuntime() {

  if (
    !engineStartedAt ||
    !engineRunning
  ) {

    engineRuntime.textContent =
      "00:00:00";

    return;

  }


  const elapsed =
    Math.floor(
      (Date.now() - engineStartedAt) /
      1000
    );


  const hours =
    String(
      Math.floor(
        elapsed / 3600
      )
    ).padStart(2, "0");


  const minutes =
    String(
      Math.floor(
        (elapsed % 3600) / 60
      )
    ).padStart(2, "0");


  const seconds =
    String(
      elapsed % 60
    ).padStart(2, "0");


  engineRuntime.textContent =
    `${hours}:${minutes}:${seconds}`;

}


/* ============================================================
   STATS
   ============================================================ */

function updateStats() {

  const pending =
    trades.filter(
      (trade) =>
        trade.status === "PENDING"
    ).length;


  const opened =
    trades.filter(
      (trade) =>
        trade.openedAt
    ).length;


  const closed =
    trades.filter(
      (trade) =>
        trade.status === "CLOSED"
    ).length;


  const wins =
    trades.filter(
      (trade) =>
        trade.result === "WIN"
    ).length;


  const losses =
    trades.filter(
      (trade) =>
        trade.result === "LOSS"
    ).length;


  const totalStake =
    trades.reduce(
      (sum, trade) =>
        sum +
        Number(
          trade.stake || 0
        ),
      0
    );


  const totalWin =
    trades.reduce(
      (sum, trade) =>
        sum +
        Number(
          trade.winAmount || 0
        ),
      0
    );


  const totalLoss =
    trades.reduce(
      (sum, trade) =>
        sum +
        Number(
          trade.lossAmount || 0
        ),
      0
    );


  $("pendingCount").textContent =
    pending;

  $("openedCount").textContent =
    opened;

  $("closedCount").textContent =
    closed;

  $("winsCount").textContent =
    wins;

  $("lossesCount").textContent =
    losses;

  $("totalStake").textContent =
    totalStake.toFixed(2);

  $("totalWinAmount").textContent =
    totalWin.toFixed(2);

  $("totalLossAmount").textContent =
    totalLoss.toFixed(2);


  ticksReceived.textContent =
    totalTicks;

  signalsFound.textContent =
    totalSignals;

}


/* ============================================================
   TRADING CHANNEL
   ============================================================ */

function renderTradingChannel() {

  if (!trades.length) {

    tradingChannel.innerHTML = `
      <div class="empty-state">
        No DEMO contracts yet.
        Start the engine and wait for a valid Triple Digit Differ signal.
      </div>
    `;

    updateStats();

    return;

  }


  tradingChannel.innerHTML =
    trades
      .slice()
      .reverse()
      .map((trade) => {

        const isWin =
          trade.result === "WIN";

        const isLoss =
          trade.result === "LOSS";


        const cardClass =
          isWin
            ? "trade-win"
            : isLoss
              ? "trade-loss"
              : "";


        const statusClass =
          isWin
            ? "win"
            : isLoss
              ? "loss"
              : "";


        const resultText =
          trade.result ||
          trade.status;


        return `

          <div class="trade-card ${cardClass}">

            <div class="trade-header">

              <div>

                <div class="trade-title">
                  ${escapeHTML(trade.marketName)}
                </div>

                <div class="trade-id">
                  Trade #${trade.id}
                  // REAL DEMO DIGITDIFF
                </div>

              </div>

              <div
                class="trade-status ${statusClass}"
              >
                ${escapeHTML(resultText)}
              </div>

            </div>


            <div class="trade-details">

              <div class="trade-detail">
                <span>MARKET</span>
                <strong>
                  ${escapeHTML(trade.symbol)}
                </strong>
              </div>


              <div class="trade-detail">
                <span>PATTERN</span>
                <strong>
                  ${escapeHTML(trade.pattern)}
                </strong>
              </div>


              <div class="trade-detail">
                <span>ENTRY DIGIT</span>
                <strong>
                  ${escapeHTML(trade.entryDigit)}
                </strong>
              </div>


              <div class="trade-detail">
                <span>EXIT DIGIT</span>
                <strong>
                  ${escapeHTML(
                    trade.exitDigit ?? "—"
                  )}
                </strong>
              </div>


              <div class="trade-detail">
                <span>OPENED</span>
                <strong>
                  ${formatTime(
                    trade.openedAt
                  )}
                </strong>
              </div>


              <div class="trade-detail">
                <span>CLOSED</span>
                <strong>
                  ${formatTime(
                    trade.closedAt
                  )}
                </strong>
              </div>


              <div class="trade-detail">
                <span>STAKE</span>
                <strong>
                  $${Number(
                    trade.stake
                  ).toFixed(2)}
                </strong>
              </div>


              <div class="trade-detail">
                <span>ENTRY QUOTE</span>
                <strong>
                  ${escapeHTML(
                    trade.entryQuote || "—"
                  )}
                </strong>
              </div>


              <div class="trade-detail">
                <span>EXIT QUOTE</span>
                <strong>
                  ${escapeHTML(
                    trade.exitQuote || "—"
                  )}
                </strong>
              </div>


              <div class="trade-detail">
                <span>PAYOUT</span>
                <strong>
                  $${Number(
                    trade.payout || 0
                  ).toFixed(2)}
                </strong>
              </div>


              <div class="trade-detail">
                <span>PROFIT</span>
                <strong>
                  ${
                    Number(
                      trade.profit || 0
                    ) >= 0
                      ? "+"
                      : ""
                  }$${Number(
                    trade.profit || 0
                  ).toFixed(2)}
                </strong>
              </div>


              <div class="trade-detail">
                <span>CONTRACT ID</span>
                <strong>
                  ${
                    trade.contractId
                      ? `#${escapeHTML(
                          trade.contractId
                        )}`
                      : "—"
                  }
                </strong>
              </div>

            </div>

          </div>

        `;

      })
      .join("");


  updateStats();

}


/* ============================================================
   FINAL DIGIT EXTRACTION
   ============================================================ */

function getFinalDigit(
  rawQuote,
  decimals
) {

  const numericQuote =
    Number(rawQuote);


  if (
    !Number.isFinite(
      numericQuote
    )
  ) {

    return null;

  }


  const formattedQuote =
    numericQuote.toFixed(
      decimals
    );


  return {

    formattedQuote,

    finalDigit:
      formattedQuote.charAt(
        formattedQuote.length - 1
      )

  };

}


/* ============================================================
   TRIPLE PATTERN
   ============================================================ */

function isTriplePattern(
  digits
) {

  if (
    digits.length < 3
  ) {

    return false;

  }


  const lastThree =
    digits.slice(-3);


  return (
    lastThree[0] ===
      lastThree[1] &&
    lastThree[1] ===
      lastThree[2]
  );

}


/* ============================================================
   DEMO ACCOUNT DETECTION
   ============================================================ */

function isDemoAccount(
  account
) {

  if (!account) {

    return false;

  }


  const accountType =
    String(
      account.account_type ||
      ""
    ).toLowerCase();


  const group =
    String(
      account.group ||
      ""
    ).toLowerCase();


  const accountId =
    String(
      account.account_id ||
      account.loginid ||
      account.login_id ||
      account.id ||
      ""
    ).toUpperCase();


  return (
    accountType === "demo" ||
    accountType === "virtual" ||
    group === "demo" ||
    group === "virtual" ||
    account.is_virtual === true ||
    accountId.startsWith("VRTC") ||
    accountId.startsWith("VR")
  );

}


/* ============================================================
   ACCOUNT ID
   ============================================================ */

function getAccountId(
  account
) {

  return (
    account?.account_id ||
    account?.loginid ||
    account?.login_id ||
    account?.id ||
    ""
  );

}


/* ============================================================
   LOAD DEMO ACCOUNTS
   ============================================================ */

async function loadAccounts(
  pat,
  appId
) {

  log(
    "Loading Options trading accounts..."
  );


  const response =
    await fetch(
      ACCOUNTS_URL,
      {
        method: "GET",

        headers: {

          "Authorization":
            `Bearer ${pat}`,

          "Deriv-App-ID":
            appId,

          "Accept":
            "application/json"

        }

      }
    );


  const payload =
    await response.json();


  if (!response.ok) {

    throw new Error(
      payload?.message ||
      payload?.error?.message ||
      payload?.errors?.[0]?.message ||
      `Account request failed (${response.status})`
    );

  }


  const returnedAccounts =
    Array.isArray(
      payload.data
    )
      ? payload.data
      : Array.isArray(
          payload.accounts
        )
          ? payload.accounts
          : [];


  if (
    !returnedAccounts.length
  ) {

    throw new Error(
      "Deriv returned no Options trading accounts."
    );

  }


  accounts =
    returnedAccounts;


  log(
    `Received ${accounts.length} Options account(s).`
  );


  return accounts;

}


/* ============================================================
   POPULATE ACCOUNT SELECT
   ============================================================ */

function populateAccounts() {

  accountSelect.innerHTML = "";


  accounts.forEach(
    (account, index) => {

      const id =
        getAccountId(
          account
        );


      const demo =
        isDemoAccount(
          account
        );


      const option =
        document.createElement(
          "option"
        );


      option.value =
        String(id);


      option.dataset.index =
        String(index);


      option.textContent =
        `${id} ${
          demo
            ? "(DEMO)"
            : "(REAL)"
        }`;


      accountSelect.appendChild(
        option
      );

    }
  );


  const demoIndex =
    accounts.findIndex(
      isDemoAccount
    );


  if (
    demoIndex < 0
  ) {

    throw new Error(
      "No DEMO Options account was returned by Deriv."
    );

  }


  accountSelect.selectedIndex =
    demoIndex;


  accountSelect.disabled =
    false;


  updateSelectedAccount();

}


/* ============================================================
   UPDATE SELECTED ACCOUNT
   ============================================================ */

function updateSelectedAccount() {

  const option =
    accountSelect.options[
      accountSelect.selectedIndex
    ];


  if (!option) {

    accountType.textContent =
      "NOT CONNECTED";

    accountBalance.textContent =
      "—";

    return;

  }


  const index =
    Number(
      option.dataset.index
    );


  const account =
    accounts[index];


  if (!account) {

    return;

  }


  const demo =
    isDemoAccount(
      account
    );


  const balance =
    account.balance ??
    account.available_balance ??
    account.equity ??
    null;


  const currency =
    account.currency ||
    CONTRACT_CURRENCY;


  accountType.textContent =
    demo
      ? "DEMO"
      : "REAL";


  accountBalance.textContent =
    balance === null
      ? "—"
      : `${Number(
          balance
        ).toFixed(2)} ${currency}`;


  if (!demo) {

    accountConnection.textContent =
      "BLOCKED";

  }

}


/* ============================================================
   CONNECT ACCOUNT
   ============================================================ */

async function connectAccount() {

  const appId =
    appIdInput.value.trim();

  const pat =
    patInput.value.trim();


  if (!appId || !pat) {

    showMessage(
      "Enter both your App ID and PAT token.",
      "error"
    );

    return;

  }


  if (engineRunning) {

    stopEngine();

  }


  connectBtn.disabled =
    true;


  accountConnection.textContent =
    "CONNECTING";


  setSystemStatus(
    "CONNECTING",
    "warning"
  );


  showMessage(
    "Loading Deriv DEMO account..."
  );


  try {

    /*
     * Save credentials only in memory.
     */

    window.NDEBE_AUTH = {

      appId,

      pat

    };


    await loadAccounts(
      pat,
      appId
    );


    populateAccounts();


    const selected =
      accounts[
        accountSelect.selectedIndex
      ];


    if (
      !selected ||
      !isDemoAccount(
        selected
      )
    ) {

      throw new Error(
        "A DEMO account must be selected. REAL accounts are blocked."
      );

    }


    accountConnected =
      true;


    accountConnection.textContent =
      "DEMO ACCOUNT";


    showMessage(
      "DEMO account loaded. Establishing authenticated trading connection...",
      "success"
    );


    await connectDemoTradingSocket();


    showMessage(
      "DEMO account connected and ready for real DEMO contracts.",
      "success"
    );


  } catch (error) {

    console.error(
      "CONNECT ERROR:",
      error
    );


    accountConnected =
      false;

    demoTradingReady =
      false;


    accountConnection.textContent =
      "FAILED";


    setSystemStatus(
      "CONNECTION FAILED",
      "offline"
    );


    showMessage(
      error.message ||
      "Unable to connect to Deriv.",
      "error"
    );


  } finally {

    connectBtn.disabled =
      false;

  }

}


/* ============================================================
   GET DEMO OTP URL
   ============================================================ */

async function getDemoWebSocketURL() {

  const auth =
    window.NDEBE_AUTH;


  if (!auth) {

    throw new Error(
      "Authentication credentials are missing."
    );

  }


  const selected =
    accounts[
      accountSelect.selectedIndex
    ];


  if (
    !selected ||
    !isDemoAccount(
      selected
    )
  ) {

    throw new Error(
      "SAFETY BLOCK: only a DEMO account may be used."
    );

  }


  const accountId =
    getAccountId(
      selected
    );


  if (!accountId) {

    throw new Error(
      "DEMO account ID is missing."
    );

  }


  log(
    `Requesting DEMO OTP for ${accountId}...`
  );


  const response =
    await fetch(
      `${OTP_URL_BASE}/${encodeURIComponent(
        accountId
      )}/otp`,
      {

        method: "POST",

        headers: {

          "Authorization":
            `Bearer ${auth.pat}`,

          "Deriv-App-ID":
            auth.appId,

          "Content-Type":
            "application/json",

          "Accept":
            "application/json"

        },

        body:
          JSON.stringify({})

      }
    );


  const payload =
    await response.json();


  if (!response.ok) {

    throw new Error(
      payload?.message ||
      payload?.error?.message ||
      payload?.errors?.[0]?.message ||
      `OTP request failed (${response.status})`
    );

  }


  const url =
    payload?.data?.url;


  if (!url) {

    throw new Error(
      "Deriv did not return a WebSocket URL."
    );

  }


  /*
   * HARD SAFETY CHECK.
   */

  if (
    DEMO_ONLY &&
    !url.includes(
      "/ws/demo"
    )
  ) {

    throw new Error(
      "SAFETY BLOCK: Deriv did not return a DEMO WebSocket."
    );

  }


  return url;

}


/* ============================================================
   CONNECT DEMO TRADING SOCKET
   ============================================================ */

async function connectDemoTradingSocket() {

  const url =
    await getDemoWebSocketURL();


  return new Promise(
    (resolve, reject) => {

      let settled =
        false;


      if (
        demoTradingWebSocket
      ) {

        try {

          demoTradingWebSocket.close();

        } catch (_) {}

      }


      demoTradingWebSocket =
        new WebSocket(
          url
        );


      demoTradingWebSocket.addEventListener(
        "open",
        () => {

          log(
            "Authenticated DEMO trading WebSocket connected."
          );


          demoTradingReady =
            true;


          setSystemStatus(
            "DEMO READY",
            "online"
          );


          accountConnection.textContent =
            "DEMO READY";


          /*
           * Request current balance.
           */

          requestDemoBalance();


          if (!settled) {

            settled =
              true;

            resolve();

          }

        }
      );


      demoTradingWebSocket.addEventListener(
        "message",
        (event) => {

          handleDemoMessage(
            event.data
          );

        }
      );


      demoTradingWebSocket.addEventListener(
        "error",
        (error) => {

          console.error(
            "DEMO SOCKET ERROR:",
            error
          );


          demoTradingReady =
            false;


          if (!settled) {

            settled =
              true;

            reject(
              new Error(
                "DEMO trading WebSocket connection failed."
              )
            );

          }

        }
      );


      demoTradingWebSocket.addEventListener(
        "close",
        () => {

          demoTradingReady =
            false;


          if (!engineRunning) {

            setSystemStatus(
              accountConnected
                ? "DEMO DISCONNECTED"
                : "SYSTEM OFFLINE",
              accountConnected
                ? "warning"
                : "offline"
            );

          }

        }
      );

    }
  );

}


/* ============================================================
   DEMO SOCKET MESSAGE ROUTER
   ============================================================ */

function handleDemoMessage(
  rawMessage
) {

  let data;


  try {

    data =
      JSON.parse(
        rawMessage
      );

  } catch (error) {

    console.error(
      "Invalid DEMO message:",
      rawMessage
    );

    return;

  }


  if (data.error) {

    handleDemoError(
      data
    );

    return;

  }


  switch (
    data.msg_type
  ) {

    case "balance":

      handleDemoBalance(
        data
      );

      break;


    case "proposal":

      handleProposal(
        data
      );

      break;


    case "buy":

      handleBuy(
        data
      );

      break;


    case "proposal_open_contract":

      handleContractUpdate(
        data
      );

      break;


    default:

      break;

  }

}


/* ============================================================
   DEMO ERROR
   ============================================================ */

function handleDemoError(
  data
) {

  const error =
    data.error || {};


  const message =
    error.message ||
    "Unknown Deriv error";


  console.error(
    "DERIV ERROR:",
    error
  );


  log(
    `DERIV ERROR: ${message}`
  );


  if (
    data.msg_type ===
      "proposal" ||
    data.req_id ===
      activeContract?.proposalReqId
  ) {

    if (activeContract) {

      const trade =
        trades.find(
          (item) =>
            item.id ===
            activeContract.tradeId
        );


      if (trade) {

        trade.status =
          "ERROR";

        trade.error =
          message;

      }


      activeContract =
        null;

      globalLock =
        null;

      resetTracker();

      renderTradingChannel();

    }

  }

}


/* ============================================================
   BALANCE REQUEST
   ============================================================ */

function requestDemoBalance() {

  if (
    !demoTradingWebSocket ||
    demoTradingWebSocket.readyState !==
      WebSocket.OPEN
  ) {

    return;

  }


  demoTradingWebSocket.send(
    JSON.stringify({

      balance: 1,

      subscribe: 0,

      req_id:
        getRequestId()

    })
  );

}


/* ============================================================
   BALANCE UPDATE
   ============================================================ */

function handleDemoBalance(
  data
) {

  const balanceData =
    data.balance;


  if (!balanceData) {

    return;

  }


  const balance =
    Number(
      balanceData.balance
    );


  const currency =
    balanceData.currency ||
    CONTRACT_CURRENCY;


  if (
    Number.isFinite(
      balance
    )
  ) {

    accountBalance.textContent =
      `${balance.toFixed(
        2
      )} ${currency}`;

  }


  log(
    `DEMO BALANCE: ${balance.toFixed(
      2
    )} ${currency}`
  );

}


/* ============================================================
   CREATE SIGNAL
   ============================================================ */

function createSignal(
  symbol,
  entryQuote,
  digit
) {

  if (
    !engineRunning ||
    globalLock ||
    activeContract
  ) {

    return;

  }


  if (
    !demoTradingReady
  ) {

    log(
      "Signal ignored: DEMO trading connection is not ready."
    );

    return;

  }


  const state =
    marketState[symbol];


  if (!state) {

    return;

  }


  tradeCounter +=
    1;

  totalSignals +=
    1;


  const trade = {

    id:
      tradeCounter,

    symbol,

    marketName:
      state.name,

    pattern:
      `${digit}${digit}${digit}`,

    entryDigit:
      digit,

    exitDigit:
      null,

    entryQuote,

    exitQuote:
      null,

    stake:
      CONTRACT_STAKE,

    status:
      "PENDING",

    result:
      null,

    openedAt:
      null,

    closedAt:
      null,

    payout:
      0,

    profit:
      0,

    winAmount:
      0,

    lossAmount:
      0,

    contractId:
      null,

    proposalId:
      null,

    error:
      null

  };


  trades.push(
    trade
  );


  globalLock = {

    symbol,

    marketName:
      state.name,

    pattern:
      trade.pattern,

    entryDigit:
      digit,

    tradeId:
      trade.id,

    entryQuote

  };


  state.status =
    "SIGNAL";


  updateTrackerForSignal(
    globalLock
  );


  updateMarketFeed(
    symbol
  );


  renderTradingChannel();


  /*
   * IMPORTANT:
   *
   * We DO NOT wait for a locally calculated
   * fourth digit anymore.
   *
   * We now request the actual Deriv
   * DIGITDIFF contract.
   */

  requestDigitDiffProposal(
    trade
  );

}


/* ============================================================
   REQUEST REAL DIGITDIFF PROPOSAL
   ============================================================ */

function requestDigitDiffProposal(
  trade
) {

  if (
    !demoTradingWebSocket ||
    demoTradingWebSocket.readyState !==
      WebSocket.OPEN
  ) {

    failTrade(
      trade.id,
      "DEMO trading WebSocket is not connected."
    );

    return;

  }


  const reqId =
    getRequestId();


  trade.proposalReqId =
    reqId;


  activeContract = {

    tradeId:
      trade.id,

    proposalReqId:
      reqId,

    proposalId:
      null,

    contractId:
      null,

    symbol:
      trade.symbol,

    barrier:
      String(
        trade.entryDigit
      )

  };


  const request = {

    proposal: 1,

    amount:
      CONTRACT_STAKE,

    basis:
      "stake",

    contract_type:
      CONTRACT_TYPE,

    currency:
      CONTRACT_CURRENCY,

    duration:
      CONTRACT_DURATION,

    duration_unit:
      CONTRACT_DURATION_UNIT,

    underlying_symbol:
      trade.symbol,

    barrier:
      String(
        trade.entryDigit
      ),

    req_id:
      reqId

  };


  log(
    `REQUESTING REAL DEMO DIGITDIFF | ${trade.symbol} | barrier=${trade.entryDigit} | stake=$10 | duration=1 tick`
  );


  updateTrackerBuying();


  demoTradingWebSocket.send(
    JSON.stringify(
      request
    )
  );

}


/* ============================================================
   PROPOSAL RESPONSE
   ============================================================ */

function handleProposal(
  data
) {

  const proposal =
    data.proposal;


  if (!proposal) {

    return;

  }


  if (!activeContract) {

    log(
      "Received proposal without an active trade."
    );

    return;

  }


  if (
    data.req_id !==
    activeContract.proposalReqId
  ) {

    return;

  }


  const trade =
    trades.find(
      (item) =>
        item.id ===
        activeContract.tradeId
    );


  if (!trade) {

    return;

  }


  const proposalId =
    proposal.id;


  const askPrice =
    Number(
      proposal.ask_price
    );


  const payout =
    Number(
      proposal.payout
    );


  if (
    !proposalId ||
    !Number.isFinite(
      askPrice
    )
  ) {

    failTrade(
      trade.id,
      "Invalid proposal returned by Deriv."
    );

    return;

  }


  trade.proposalId =
    proposalId;


  trade.askPrice =
    askPrice;


  trade.proposalPayout =
    payout;


  activeContract.proposalId =
    proposalId;


  log(
    `PROPOSAL RECEIVED | ID=${proposalId} | ASK=$${askPrice.toFixed(2)} | PAYOUT=$${payout.toFixed(2)}`
  );


  /*
   * Buy the exact proposal.
   */

  const buyReqId =
    getRequestId();


  activeContract.buyReqId =
    buyReqId;


  trade.buyReqId =
    buyReqId;


  updateTrackerBuying();


  demoTradingWebSocket.send(
    JSON.stringify({

      buy:
        String(
          proposalId
        ),

      price:
        askPrice,

      req_id:
        buyReqId

    })
  );


  log(
    `BUY REQUEST SENT | proposal=${proposalId} | price=$${askPrice.toFixed(2)}`
  );

}


/* ============================================================
   BUY RESPONSE
   ============================================================ */

function handleBuy(
  data
) {

  const buy =
    data.buy;


  if (!buy) {

    return;

  }


  if (!activeContract) {

    return;

  }


  if (
    data.req_id !==
    activeContract.buyReqId
  ) {

    return;

  }


  const trade =
    trades.find(
      (item) =>
        item.id ===
        activeContract.tradeId
    );


  if (!trade) {

    return;

  }


  const contractId =
    buy.contract_id;


  if (!contractId) {

    failTrade(
      trade.id,
      "Deriv buy response did not contain a contract ID."
    );

    return;

  }


  activeContract.contractId =
    contractId;


  trade.contractId =
    contractId;


  trade.openedAt =
    new Date().toISOString();


  trade.status =
    "OPEN";


  log(
    `REAL DEMO CONTRACT PURCHASED | #${contractId}`
  );


  updateTrackerActive();


  renderTradingChannel();


  /*
   * Subscribe to actual contract updates.
   */

  const monitorReqId =
    getRequestId();


  activeContract.monitorReqId =
    monitorReqId;


  demoTradingWebSocket.send(
    JSON.stringify({

      proposal_open_contract:
        1,

      contract_id:
        contractId,

      subscribe:
        1,

      req_id:
        monitorReqId

    })
  );


  log(
    `MONITORING CONTRACT #${contractId}`
  );

}


/* ============================================================
   REAL CONTRACT UPDATE
   ============================================================ */

function handleContractUpdate(
  data
) {

  const contract =
    data.proposal_open_contract;


  if (!contract) {

    return;

  }


  if (!activeContract) {

    return;

  }


  if (
    String(
      contract.contract_id
    ) !==
    String(
      activeContract.contractId
    )
  ) {

    return;

  }


  const trade =
    trades.find(
      (item) =>
        item.id ===
        activeContract.tradeId
    );


  if (!trade) {

    return;

  }


  /*
   * Keep the latest quote data.
   */

  if (
    contract.entry_tick !==
    undefined
  ) {

    trade.entryTick =
      contract.entry_tick;

  }


  if (
    contract.exit_spot !==
    undefined
  ) {

    trade.exitQuote =
      String(
        contract.exit_spot
      );

  }


  if (
    contract.exit_tick !==
    undefined
  ) {

    trade.exitTick =
      contract.exit_tick;

  }


  /*
   * Contract still active.
   */

  const status =
    String(
      contract.status ||
      ""
    ).toLowerCase();


  const isFinished =
    contract.is_sold === true ||
    status === "won" ||
    status === "lost" ||
    status === "sold";


  if (!isFinished) {

    renderTradingChannel();

    return;

  }


  settleRealContract(
    trade,
    contract
  );

}


/* ============================================================
   REAL CONTRACT SETTLEMENT
   ============================================================ */

function settleRealContract(
  trade,
  contract
) {

  if (
    trade.status ===
      "CLOSED"
  ) {

    return;

  }


  const profit =
    Number(
      contract.profit || 0
    );


  const payout =
    Number(
      contract.payout || 0
    );


  const exitSpot =
    contract.exit_spot;


  const exitDigit =
    extractExitDigit(
      exitSpot,
      trade.symbol
    );


  trade.exitDigit =
    exitDigit;


  trade.exitQuote =
    exitSpot !== undefined
      ? String(
          exitSpot
        )
      : trade.exitQuote;


  trade.payout =
    Number.isFinite(
      payout
    )
      ? payout
      : 0;


  trade.profit =
    Number.isFinite(
      profit
    )
      ? profit
      : 0;


  trade.closedAt =
    new Date().toISOString();


  if (
    profit > 0
  ) {

    trade.result =
      "WIN";

    trade.winAmount =
      profit;

    trade.lossAmount =
      0;

  } else if (
    profit < 0
  ) {

    trade.result =
      "LOSS";

    trade.winAmount =
      0;

    trade.lossAmount =
      Math.abs(
        profit
      );

  } else {

    trade.result =
      "ZERO";

    trade.winAmount =
      0;

    trade.lossAmount =
      0;

  }


  trade.status =
    "CLOSED";


  log(
    "========================================"
  );


  log(
    `CONTRACT SETTLED #${trade.contractId}`
  );


  log(
    `RESULT: ${trade.result}`
  );


  log(
    `PROFIT: ${
      profit >= 0
        ? "+"
        : ""
    }$${profit.toFixed(2)}`
  );


  log(
    `PAYOUT: $${payout.toFixed(2)}`
  );


  if (
    exitSpot !== undefined
  ) {

    log(
      `EXIT SPOT: ${exitSpot}`
    );

  }


  log(
    "========================================"
  );


  /*
   * Clear active contract.
   */

  activeContract =
    null;


  globalLock =
    null;


  /*
   * Reset market states.
   */

  Object.values(
    marketState
  ).forEach(
    (state) => {

      state.digits =
        [];

      state.candidate =
        false;

      if (
        state.status ===
          "SIGNAL" ||
        state.status ===
          "LOCKED"
      ) {

        state.status =
          engineRunning
            ? "LIVE"
            : "STOPPED";

      }

    }
  );


  MARKETS.forEach(
    (market) => {

      updateMarketFeed(
        market.symbol
      );

    }
  );


  /*
   * Refresh account balance.
   */

  requestDemoBalance();


  /*
   * Reset tracker.
   */

  if (engineRunning) {

    trackerStatus.textContent =
      "ANALYZING";

    trackerStatus.style.color =
      "var(--cyan)";


    trackerDescription.textContent =
      "Contract settled. Scanning for the next Triple Digit Differ pattern.";


    lockedMarket.textContent =
      "NONE";

    lockedPattern.textContent =
      "—";

    entryDigit.textContent =
      "—";

    nextAction.textContent =
      "SCAN MARKETS";

  } else {

    resetTracker();

  }


  renderTradingChannel();

}


/* ============================================================
   EXTRACT EXIT DIGIT
   ============================================================ */

function extractExitDigit(
  exitSpot,
  symbol
) {

  if (
    exitSpot === undefined ||
    exitSpot === null
  ) {

    return null;

  }


  const state =
    marketState[symbol];


  if (!state) {

    return null;

  }


  const result =
    getFinalDigit(
      exitSpot,
      state.decimals
    );


  return result
    ? result.finalDigit
    : null;

}


/* ============================================================
   FAILED TRADE
   ============================================================ */

function failTrade(
  tradeId,
  message
) {

  const trade =
    trades.find(
      (item) =>
        item.id ===
        tradeId
    );


  if (trade) {

    trade.status =
      "ERROR";

    trade.error =
      message;

  }


  log(
    `TRADE FAILED: ${message}`
  );


  activeContract =
    null;

  globalLock =
    null;


  resetTracker();


  renderTradingChannel();

}


/* ============================================================
   PROCESS PUBLIC TICK
   ============================================================ */

function processTick(
  tickData
) {

  if (
    !engineRunning ||
    !tickData
  ) {

    return;

  }


  const symbol =
    tickData.symbol;


  if (
    !symbol ||
    !marketState[symbol]
  ) {

    return;

  }


  const state =
    marketState[symbol];


  const quoteData =
    getFinalDigit(
      tickData.quote,
      state.decimals
    );


  if (!quoteData) {

    return;

  }


  state.lastQuote =
    quoteData.formattedQuote;


  state.lastDigit =
    quoteData.finalDigit;


  state.tickCount +=
    1;


  totalTicks +=
    1;


  /*
   * Keep the last three/four digits.
   */

  state.digits.push(
    quoteData.finalDigit
  );


  if (
    state.digits.length > 4
  ) {

    state.digits.shift();

  }


  state.status =
    "LIVE";


  /*
   * If a real contract is active,
   * we DO NOT generate another signal.
   */

  if (
    globalLock ||
    activeContract
  ) {

    updateMarketFeed(
      symbol
    );

    updateStats();

    return;

  }


  /*
   * Triple Digit Differ.
   */

  if (
    isTriplePattern(
      state.digits
    )
  ) {

    const repeatedDigit =
      state.digits[
        state.digits.length - 1
      ];


    if (
      !state.candidate
    ) {

      state.candidate =
        true;


      createSignal(
        symbol,
        quoteData.formattedQuote,
        repeatedDigit
      );

    }

  } else {

    state.candidate =
      false;

  }


  updateMarketFeed(
    symbol
  );


  updateStats();

}


/* ============================================================
   SUBSCRIBE TO PUBLIC MARKETS
   ============================================================ */

function subscribeToMarkets() {

  if (
    !publicWebSocket ||
    publicWebSocket.readyState !==
      WebSocket.OPEN
  ) {

    return;

  }


  MARKETS.forEach(
    (market) => {

      publicWebSocket.send(
        JSON.stringify({

          ticks:
            market.symbol,

          subscribe:
            1,

          req_id:
            getRequestId()

        })
      );

    }
  );


  log(
    `Subscribed to ${MARKETS.length} live markets.`
  );

}


/* ============================================================
   OPEN PUBLIC MARKET WEBSOCKET
   ============================================================ */

function openPublicWebSocket() {

  if (
    publicWebSocket
  ) {

    try {

      publicWebSocket.close();

    } catch (_) {}

  }


  publicWebSocket =
    new WebSocket(
      PUBLIC_WS_URL
    );


  publicWebSocket.addEventListener(
    "open",
    () => {

      log(
        "Public live tick WebSocket connected."
      );


      setSystemStatus(
        "LIVE DEMO ENGINE",
        "online"
      );


      subscribeToMarkets();

    }
  );


  publicWebSocket.addEventListener(
    "message",
    (event) => {

      try {

        const data =
          JSON.parse(
            event.data
          );


        if (
          data.error
        ) {

          console.error(
            "PUBLIC DERIV ERROR:",
            data.error
          );

          return;

        }


        if (
          data.tick
        ) {

          processTick(
            data.tick
          );

        }

      } catch (error) {

        console.error(
          "Tick parsing error:",
          error
        );

      }

    }
  );


  publicWebSocket.addEventListener(
    "error",
    (error) => {

      console.error(
        "PUBLIC WS ERROR:",
        error
      );


      setSystemStatus(
        "TICK STREAM ERROR",
        "warning"
      );

    }
  );


  publicWebSocket.addEventListener(
    "close",
    () => {

      if (
        engineRunning
      ) {

        setSystemStatus(
          "TICK STREAM CLOSED",
          "warning"
        );

      }

    }
  );

}


/* ============================================================
   START ENGINE
   ============================================================ */

function startEngine() {

  if (
    engineRunning
  ) {

    return;

  }


  /*
   * Must be connected to DEMO first.
   */

  if (
    !accountConnected ||
    !demoTradingReady
  ) {

    showMessage(
      "Connect a DEMO account before starting the engine.",
      "error"
    );

    setSystemStatus(
      "DEMO CONNECTION REQUIRED",
      "warning"
    );

    return;

  }


  /*
   * Confirm selected account is still DEMO.
   */

  const selected =
    accounts[
      accountSelect.selectedIndex
    ];


  if (
    !selected ||
    !isDemoAccount(
      selected
    )
  ) {

    showMessage(
      "SAFETY BLOCK: a DEMO account must be selected.",
      "error"
    );

    return;

  }


  engineRunning =
    true;


  engineStartedAt =
    Date.now();


  totalTicks =
    0;


  totalSignals =
    0;


  globalLock =
    null;


  activeContract =
    null;


  Object.values(
    marketState
  ).forEach(
    (state) => {

      state.status =
        "LIVE";

      state.digits =
        [];

      state.candidate =
        false;

      state.tickCount =
        0;

    }
  );


  startBtn.disabled =
    true;

  stopBtn.disabled =
    false;


  trackerStatus.textContent =
    "STARTING";


  trackerDescription.textContent =
    "Opening live market streams...";


  nextAction.textContent =
    "CONNECTING";


  setSystemStatus(
    "STARTING DEMO ENGINE",
    "warning"
  );


  runtimeTimer =
    setInterval(
      updateRuntime,
      1000
    );


  updateRuntime();


  openPublicWebSocket();


  showMessage(
    "REAL DEMO engine started. Waiting for Triple Digit Differ signals.",
    "success"
  );

}


/* ============================================================
   STOP ENGINE
   ============================================================ */

function stopEngine() {

  engineRunning =
    false;


  /*
   * IMPORTANT:
   *
   * If a real contract is already active,
   * DO NOT delete it.
   *
   * It will still be monitored until settlement.
   */

  if (
    publicWebSocket
  ) {

    try {

      publicWebSocket.close();

    } catch (_) {}

    publicWebSocket =
      null;

  }


  if (
    runtimeTimer
  ) {

    clearInterval(
      runtimeTimer
    );

    runtimeTimer =
      null;

  }


  Object.values(
    marketState
  ).forEach(
    (state) => {

      state.status =
        "STOPPED";

      state.candidate =
        false;

      state.digits =
        [];

    }
  );


  MARKETS.forEach(
    (market) => {

      updateMarketFeed(
        market.symbol
      );

    }
  );


  startBtn.disabled =
    false;


  stopBtn.disabled =
    true;


  if (
    activeContract
  ) {

    setSystemStatus(
      "DEMO CONTRACT ACTIVE",
      "warning"
    );


    trackerStatus.textContent =
      "CONTRACT ACTIVE";

    trackerStatus.style.color =
      "var(--yellow)";


    trackerDescription.textContent =
      "Engine stopped for new signals. Existing DEMO contract is still being monitored.";

    nextAction.textContent =
      "WAIT FOR SETTLEMENT";

  } else {

    setSystemStatus(
      demoTradingReady
        ? "DEMO READY"
        : "DEMO DISCONNECTED",
      demoTradingReady
        ? "online"
        : "warning"
    );


    resetTracker();

  }


  log(
    "New signal generation stopped."
  );

}


/* ============================================================
   ACCOUNT SELECT CHANGE
   ============================================================ */

function handleAccountChange() {

  const selected =
    accounts[
      accountSelect.selectedIndex
    ];


  if (
    !selected
  ) {

    return;

  }


  updateSelectedAccount();


  if (
    !isDemoAccount(
      selected
    )
  ) {

    /*
     * HARD SAFETY BLOCK.
     */

    if (
      engineRunning
    ) {

      stopEngine();

    }


    accountConnection.textContent =
      "BLOCKED";


    setSystemStatus(
      "REAL ACCOUNT BLOCKED",
      "warning"
    );


    showMessage(
      "SAFETY BLOCK: NDEBE TRADE PRO is DEMO-ONLY.",
      "error"
    );


    accountSelect.selectedIndex =
      accounts.findIndex(
        isDemoAccount
      );


    updateSelectedAccount();

    return;

  }


  accountConnection.textContent =
    demoTradingReady
      ? "DEMO READY"
      : "DEMO SELECTED";


  showMessage(
    "DEMO account selected.",
    "success"
  );

}


/* ============================================================
   EVENTS
   ============================================================ */

connectBtn.addEventListener(
  "click",
  connectAccount
);


accountSelect.addEventListener(
  "change",
  handleAccountChange
);


startBtn.addEventListener(
  "click",
  startEngine
);


stopBtn.addEventListener(
  "click",
  stopEngine
);


/* ============================================================
   PAGE CLOSE
   ============================================================ */

window.addEventListener(
  "beforeunload",
  () => {

    if (
      publicWebSocket
    ) {

      try {

        publicWebSocket.close();

      } catch (_) {}

    }


    /*
     * Do not intentionally close the authenticated
     * socket while a real DEMO contract is active.
     *
     * The browser closing will terminate the session,
     * but Deriv owns the contract and its settlement.
     */

  }
);


/* ============================================================
   INITIALIZATION
   ============================================================ */

function initialize() {

  configureRealDemoUI();

  initializeMarketFeed();

  resetTracker();

  renderTradingChannel();

  updateStats();


  marketsScanned.textContent =
    MARKETS.length;


  $("footerTime").textContent =
    new Date().toLocaleDateString();


  setSystemStatus(
    "SYSTEM OFFLINE",
    "offline"
  );


  log(
    "NDEBE TRADE PRO initialized."
  );


  log(
    "Mode: REAL DERIV DEMO"
  );


  log(
    "Contract: DIGITDIFF"
  );


  log(
    "Stake: $10 USD"
  );


  log(
    "Duration: 1 tick"
  );

}


/* ============================================================
   START
   ============================================================ */

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    initialize
  );

} else {

  initialize();

}


/* ============================================================
   GLOBAL DEBUG ACCESS
   ============================================================ */

window.NdebeTradePro = {

  startEngine,

  stopEngine,

  connectAccount,

  requestDemoBalance,

  processTick,

  getState() {

    return {

      engineRunning,

      accountConnected,

      demoTradingReady,

      totalTicks,

      totalSignals,

      activeContract,

      globalLock,

      trades

    };

  }

};
