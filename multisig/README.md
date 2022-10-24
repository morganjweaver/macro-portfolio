# Multisig Project

## Deliverables

My Gnosis Safe can be found here: `gor:0xE7385453AE757f345245D25E8Ea757538440289a`

Contracts have been deployed to Goerli at the following addresses:

| Contract | Address Etherscan Link | Transaction Etherscan Link |
| -------- | ------- | --------- |
| Multisig | `https://goerli.etherscan.io/address/0xE7385453AE757f345245D25E8Ea757538440289a` | `https://goerli.etherscan.io/address/0xE7385453AE757f345245D25E8Ea757538440289a#internaltx` |
| Proxy | `https://goerli.etherscan.io/address/0x7EcCAb0b8B507336612367e4dbDA4d678890fB19` | `https://goerli.etherscan.io/address/0x7EcCAb0b8B507336612367e4dbDA4d678890fB19#internaltx`|
| Logic | `https://goerli.etherscan.io/address/0x4ac54776d2e98F444C456f52eb64974b4155c120` | `https://goerli.etherscan.io/address/0x4ac54776d2e98F444C456f52eb64974b4155c120#internaltx` |
| LogicImproved | `https://goerli.etherscan.io/address/0xBb06F610e7831F2c2bAb8af1E168B0d3f9897183` | `https://goerli.etherscan.io/address/0xBb06F610e7831F2c2bAb8af1E168B0d3f9897183#internaltx` |

Transaction for transferring the ownership of the **Proxy** contract to the multisig:

| Contract | Transaction Etherscan Link |
| -------- | -- |
| Proxy | `https://goerli.etherscan.io/tx/0xa304a4d3f62764c20158720b5716cde28137a767d1e1e2f24890b6cd05777c24` |

Transaction calling `upgrade(address)` to upgrade the **Proxy** from **Logic** -> **LogicImproved**
| Contract | Function called | Transaction Etherscan Link |
| --------------- | --------------- | -- |
| Proxy | `upgrade` | `https://goerli.etherscan.io/tx/0x00139ea34a8083b6591a2f70040994b9b49e6182f3827870f89d72e4e1a2cbc8` |

# Design exercise

> Consider and write down the positive and negative tradeoffs of the following configurations for a multisig wallet. In particular, consider how each configuration handles the common failure modes of wallet security.

> - 1-of-N
> - M-of-N (where M: such that 1 < M < N)
> - N-of-N

## 1-of-N

### Advantages

* Easy; anyone in a group can share the wallet and make decisions
* Good when multiple people need to administer a wallet but not all of them are available
* If multiple parties lose their keys, it's ok--only one is needed to sign


### Disadvantages

* Immense amount of trust placed on each individual to not misuse their authority
* No consensus needed--any key-holder can violate trust
* Attacker only needs to steal 1 key to drain the wallet

### M-of-N (where M: such that 1 < M < N)

### Advantages

* Partial consensus may be acceptable for many cases
* Recovery possible if a signer loses their key
* Attacker still has to obtain > 1 key to drain wallet
* Useful when not all members are available to sign

### Disadvantages

* Partial consensus may not be acceptable in some cases
* Lower M of N is arguable less secure than higher M of N or N of N

### N-of-N

### Advantages

* Requires complete consensus which may be desirable for some operations
* Attacker will have a more difficult time stealing all keys for larger N
* Extremely secure for large N

### Disadvantages

* Only a single signer needs to lose a key to render the multisig useless
* No recovery mechanism
* Consensus may be difficult to reach for large N
