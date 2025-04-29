
# 🪙 ViraGovernedToken

**ViraGovernedToken** is a custom ERC20-compatible token with enhanced governance features. It introduces role-based control (owner, operators, issuers), user registration, balance adjustments, and a democratic redistribution voting mechanism among operators.

## 🔧 Features

- **ERC20 Compatibility**: Built on OpenZeppelin's upgradeable ERC20 token standard.
- **Role Management**:
  - `Owner`: Full control over roles and contract upgrades.
  - `Operators`: Can vote for redistribution and manage blocked users.
  - `Issuers`: Can register users and assign token balances.
- **User Registry**: Only registered users can hold or receive tokens.
- **Balance Adjustment**: Issuers can directly adjust balances.
- **Blocking Mechanism**: Operators can block or unblock users.
- **Redistribution Voting**:
  - Operators can propose a redistribution from a "rich" user.
  - Redistribution is triggered when >50% of operators vote in favor.
  - Proposals expire after a specified duration.

## 📁 Project Structure

```
contracts/
  ViraGovernedToken.sol         # Main token contract
migrations/
  1_deploy_contracts.js         # Deployment script
test/
  vira_token_test.js            # Mocha/Chai tests
```

## 📦 Requirements

- Node.js ≥ 14
- Truffle ≥ 5.4
- Ganache or Hardhat local blockchain
- Solidity ≥ 0.8.0
- OpenZeppelin Contracts (Upgradeable)

## 🚀 Installation

```bash
git clone https://github.com/DragLag/ViraGovernedToken.git
cd ViraGovernedToken

npm install
```

## 🛠️ Compile & Deploy

Compile the contracts:

```bash
truffle compile
```

Run a local blockchain (Ganache or Hardhat), then deploy:

```bash
truffle migrate --reset
```

## 🧪 Running Tests

```bash
truffle test
```

Sample test scenarios include:

- Role assignment (addOperator, addIssuer)
- User registration
- Balance adjustments
- Blocking/unblocking
- Redistribution voting logic
- Expiry of proposals

## 🔐 Security Notes

- Only registered users can receive tokens.
- Redistribution requires >50% operator approval.
- Role-based access ensures proper governance.


